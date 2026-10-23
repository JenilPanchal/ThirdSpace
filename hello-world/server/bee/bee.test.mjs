import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createRoomServer} from '../room-server.mjs';
import {
  createBeeAdapter,
  normalizeConversation,
  sampleConversation,
} from './adapter.mjs';
import {createReviewStore, fingerprint} from './store.mjs';
import {validateAgentMap} from './mindmap.mjs';

test('Bee CLI adapter uses documented JSON commands and the finished transcript', async () => {
  const calls = [];
  const raw = {
    conversation: {
      id: 42,
      short_summary: 'Class',
      transcriptions: [
        {realtime: true, utterances: [{id: 1, text: 'Draft', speaker: 'Me'}]},
        {
          realtime: false,
          utterances: [
            {id: 2, text: 'Second', speaker: 'Me', spoken_at: 20},
            {id: 3, text: 'First', speaker: 'Friend', spoken_at: 10},
          ],
        },
      ],
    },
  };
  const adapter = createBeeAdapter({
    profileKey: 'private-profile',
    run: async (args) => {
      calls.push(args);
      return args[0] === 'me'
        ? {first_name: 'Owner'}
        : args[1] === 'list'
        ? {
            conversations: [{id: 42, summary: 'Class', start_time: 10}],
            next_cursor: 'next',
          }
        : raw;
    },
  });
  assert.match(await adapter.account(), /^[a-f0-9]{64}$/);
  assert.equal((await adapter.list()).cursor, 'next');
  const conversation = await adapter.get('42');
  assert.deepEqual(
    conversation.utterances.map((t) => t.text),
    ['First', 'Second'],
  );
  assert.equal(
    conversation.utterances.some((t) => t.text === 'Draft'),
    false,
  );
  assert.deepEqual(calls.at(-1), ['conversations', 'get', '42', '--json']);
  await assert.rejects(adapter.get('42; malicious'), {status: 400});
  assert.equal(normalizeConversation(raw).id, '42');
  assert.equal(
    validateAgentMap(
      {
        branches: [
          {
            label: 'Invented',
            items: [{text: 'No source', sourceIds: ['missing']}],
          },
        ],
      },
      conversation,
      conversation.utterances,
    ),
    null,
  );
});

async function start(t, bee) {
  const server = createRoomServer({bee});
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const base = `http://127.0.0.1:${server.address().port}`;
  return async (path, token = '', body) => {
    const response = await fetch(base + path, {
      method: body === undefined ? 'GET' : 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + token,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    return {status: response.status, data: await response.json()};
  };
}

test('private Bee sessions isolate transcripts from shared rooms, validate splits, save and build traceable maps', async (t) => {
  let clock = Date.now(),
    account = 'owner-1';
  const directory = await mkdtemp(join(tmpdir(), 'third-space-bee-'));
  t.after(() => rm(directory, {recursive: true, force: true}));
  const store = createReviewStore(directory);
  const source = {...structuredClone(sampleConversation), id: '42'};
  const adapter = {
    account: async () => account,
    list: async () => ({items: [{id: '42', title: 'Class'}], cursor: null}),
    get: async () => structuredClone(source),
  };
  const call = await start(t, {
    adapter,
    store,
    accessCode: 'private-pair-code',
    now: () => clock,
  });
  assert.equal((await call('/api/bee/conversations')).status, 401);
  assert.equal(
    (await call('/api/bee/connect', '', {code: 'incorrect'})).status,
    401,
  );
  const connected = await call('/api/bee/connect', '', {
    code: 'private-pair-code',
  });
  assert.equal(connected.status, 201);
  const token = connected.data.token;
  const room = await call('/api/rooms/PRIVATE/join', '', {
    name: 'Other player',
    bench: 2,
  });
  assert.equal(
    (await call('/api/bee/conversations', room.data.token)).status,
    401,
  );
  assert.equal(JSON.stringify(room.data.room).includes('Biology'), false);
  const recording = (await call('/api/bee/conversations/42', token)).data;
  const text = recording.utterances[0].text,
    words = text.split(' ');
  const segments = [
    {text: words.slice(0, 4).join(' '), speaker: 'Me'},
    {text: words.slice(4).join(' '), speaker: 'Alex'},
  ];
  const body = {
    revision: 0,
    fingerprint: recording.fingerprint,
    correction: {utteranceId: 's1', segments},
  };
  const invalid = await call('/api/bee/conversations/42/review', token, {
    ...body,
    correction: {
      utteranceId: 's1',
      segments: [{text: 'Changed original words', speaker: 'Alex'}],
    },
  });
  assert.equal(invalid.status, 400);
  const saved = await call('/api/bee/conversations/42/review', token, body);
  assert.equal(saved.status, 200);
  assert.equal(saved.data.review.revision, 1);
  assert.equal(saved.data.turns[1].speaker, 'Alex');
  assert.equal(saved.data.utterances[0].text, text);
  assert.equal(
    (await call('/api/bee/conversations/42/review', token, body)).status,
    409,
  );
  const map = (await call('/api/bee/conversations/42/mindmap', token, {})).data;
  assert.equal(map.engine, 'transcript');
  assert.ok(
    map.branches.some((b) => b.items.some((item) => item.speaker === 'Alex')),
  );
  assert.ok(
    map.branches.every((b) =>
      b.items.every((item) =>
        item.sourceIds.every((id) =>
          recording.utterances.some((turn) => turn.id === id),
        ),
      ),
    ),
  );
  const stored = await createReviewStore(directory).read('owner-1', '42');
  assert.equal(stored.revision, 1);
  assert.equal(stored.fingerprint, fingerprint(source));
  account = 'owner-2';
  const another = (
    await call('/api/bee/connect', '', {code: 'private-pair-code'})
  ).data;
  assert.equal(
    (await call('/api/bee/conversations/42', another.token)).data.review
      .revision,
    0,
  );
  await call('/api/bee/lock', token, {});
  assert.equal((await call('/api/bee/conversations', token)).status, 401);
  clock += 31 * 60 * 1000;
  assert.equal(
    (await call('/api/bee/conversations', another.token)).status,
    401,
  );
});

test('sample flow never contacts Bee and PIN attempts are bounded', async (t) => {
  let reads = 0;
  const call = await start(t, {
    accessCode: 'private-pair-code',
    adapter: {
      account: async () => {
        reads++;
        throw Error('Must not run for sample');
      },
    },
  });
  const a = (await call('/api/bee/connect', '', {demo: true})).data,
    b = (await call('/api/bee/connect', '', {demo: true})).data;
  const list = await call('/api/bee/conversations', a.token);
  assert.equal(list.data.items[0].id, 'sample-class');
  const c = (await call('/api/bee/conversations/sample-class', a.token)).data;
  await call('/api/bee/conversations/sample-class/review', a.token, {
    revision: 0,
    fingerprint: c.fingerprint,
    correction: {
      utteranceId: 's2',
      segments: [{text: c.utterances[1].text, speaker: 'Alex'}],
    },
  });
  assert.equal(
    (await call('/api/bee/conversations/sample-class', b.token)).data.review
      .revision,
    0,
  );
  assert.equal(reads, 0);
  for (let i = 0; i < 5; i++)
    await call('/api/bee/connect', '', {code: 'wrong'});
  assert.equal(
    (await call('/api/bee/connect', '', {code: 'wrong'})).status,
    429,
  );
});
