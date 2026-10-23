import {randomBytes, timingSafeEqual} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {createBeeAdapter, sampleConversation} from './adapter.mjs';
import {createReviewStore, effectiveTurns, fingerprint} from './store.mjs';
import {transcriptMap, validateAgentMap} from './mindmap.mjs';
const fail = (status, message) => {
  throw Object.assign(new Error(message), {status});
};
export function createBeeService({
  adapter = createBeeAdapter(),
  store = createReviewStore(
    fileURLToPath(new URL('../../.bee-private/reviews', import.meta.url)),
  ),
  accessCode = process.env.BEE_ACCESS_CODE || '',
  agentEnabled = process.env.BEE_AGENT_ENABLED === '1',
  now = Date.now,
} = {}) {
  const sessions = new Map(),
    attempts = new Map();
  const publicConversation = (conversation, review) => ({
    ...conversation,
    fingerprint: fingerprint(conversation),
    review: {
      revision: review?.revision || 0,
      corrections:
        review?.fingerprint === fingerprint(conversation)
          ? review.corrections
          : {},
    },
    turns: effectiveTurns(
      conversation,
      review?.fingerprint === fingerprint(conversation) ? review : null,
    ),
  });
  return async (req, url, readJson) => {
    for (const [key, s] of sessions)
      if (now() > s.expires) sessions.delete(key);
    const route = url.pathname.slice('/api/bee'.length);
    if (route === '/connect' && req.method === 'POST') {
      const body = await readJson(req),
        demo = body.demo === true;
      if (!demo) {
        const ip = req.socket.remoteAddress;
        const attempt = attempts.get(ip);
        if (attempt && now() - attempt.time < 60000 && attempt.count >= 5)
          fail(
            429,
            'Please wait a minute before trying your pairing code again.',
          );
        for (const [key, value] of attempts)
          if (now() - value.time >= 60000) attempts.delete(key);
        attempts.set(ip, {
          time:
            attempt?.time && now() - attempt.time < 60000
              ? attempt.time
              : now(),
          count:
            attempt && now() - attempt.time < 60000 ? attempt.count + 1 : 1,
        });
        if (accessCode.length < 8)
          fail(
            503,
            'Connect Bee on your computer first, or explore the sample.',
          );
        const input = Buffer.from(
          typeof body.code === 'string' ? body.code : '',
        );
        const expected = Buffer.from(accessCode);
        if (
          input.length !== expected.length ||
          !timingSafeEqual(input, expected)
        )
          fail(401, 'That pairing code doesn’t match. Try again.');
      }
      if (sessions.size >= 20)
        fail(
          429,
          'There are too many Bee screens open. Lock one and try again.',
        );
      const token = randomBytes(32).toString('hex'),
        account = demo ? 'sample' : await adapter.account();
      const session = {
        demo,
        account,
        store: demo ? createReviewStore(null) : store,
        cache: new Map(),
        expires: now() + 30 * 60 * 1000,
      };
      sessions.set(token, session);
      return {
        status: 201,
        data: {
          token,
          demo,
          expiresAt: session.expires,
          agentEnabled: !demo && agentEnabled,
        },
      };
    }
    const token = (req.headers.authorization || '').replace(/^Bearer /, '');
    const session = sessions.get(token);
    if (!session)
      fail(
        401,
        'Your private Bee session is locked. Connect again to continue.',
      );
    if (route === '/lock' && req.method === 'POST') {
      sessions.delete(token);
      return {data: {ok: true}};
    }
    if (route === '/conversations' && req.method === 'GET') {
      const cursor = url.searchParams.get('cursor');
      if (cursor && cursor.length > 512)
        fail(400, 'Please refresh your recordings.');
      return {
        data: session.demo
          ? {
              items: [
                {
                  id: sampleConversation.id,
                  title: sampleConversation.title,
                  summary: sampleConversation.summary,
                  startedAt: null,
                },
              ],
              cursor: null,
            }
          : await adapter.list(cursor),
      };
    }
    const match = route.match(
      /^\/conversations\/([a-zA-Z0-9-]{1,80})(?:\/(review|mindmap))?$/,
    );
    if (!match) fail(404, 'This Bee page is unavailable.');
    const [, id, action] = match;
    if (req.method === 'GET' && !action) {
      if (session.demo && id !== sampleConversation.id)
        fail(404, 'Choose the sample conversation.');
      const conversation = session.demo
        ? structuredClone(sampleConversation)
        : await adapter.get(id);
      if (session.cache.size >= 20)
        session.cache.delete(session.cache.keys().next().value);
      session.cache.set(id, conversation);
      const review = await session.store.read(session.account, id);
      return {data: publicConversation(conversation, review)};
    }
    const conversation = session.cache.get(id);
    if (!conversation) fail(409, 'Open this recording first.');
    if (req.method === 'POST' && action === 'review') {
      const input = await readJson(req);
      const review = await session.store.save(
        session.account,
        conversation,
        input,
      );
      return {data: publicConversation(conversation, review)};
    }
    if (req.method === 'POST' && action === 'mindmap') {
      const review = await session.store.read(session.account, id),
        turns = effectiveTurns(
          conversation,
          review?.fingerprint === fingerprint(conversation) ? review : null,
        );
      if (!turns.length)
        fail(409, 'This recording has no transcript yet. Try another one.');
      let map = null;
      if (agentEnabled && !session.demo) {
        try {
          map = validateAgentMap(
            await adapter.mindmap(conversation, turns),
            conversation,
            turns,
          );
        } catch {
          /* The source-based map remains available to all Bee accounts. */
        }
      }
      return {
        data: {
          ...(map || transcriptMap(conversation, turns)),
          reviewRevision: review?.revision || 0,
          turns,
        },
      };
    }
    fail(405, 'This action is unavailable.');
  };
}
