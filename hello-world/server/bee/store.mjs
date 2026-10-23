import {mkdir, readFile, writeFile, rename} from 'node:fs/promises';
import {createHash, randomUUID} from 'node:crypto';
import {join} from 'node:path';
export function fingerprint(conversation) {
  return createHash('sha256')
    .update(JSON.stringify(conversation.utterances))
    .digest('hex');
}
export function effectiveTurns(conversation, review) {
  return conversation.utterances.flatMap((turn) =>
    (
      review?.corrections?.[turn.id]?.segments || [
        {text: turn.text, speaker: turn.speaker},
      ]
    ).map((segment, i) => ({
      ...segment,
      id: turn.id,
      part: i,
      originalSpeaker: turn.speaker,
    })),
  );
}
export function validateCorrection(conversation, correction) {
  const turn = conversation.utterances.find(
    (u) => u.id === correction.utteranceId,
  );
  const segments = correction.segments;
  if (
    !turn ||
    !Array.isArray(segments) ||
    !segments.length ||
    segments.length > 8
  )
    throw Object.assign(new Error('Choose a valid transcript turn.'), {
      status: 400,
    });
  if (
    segments.some(
      (s) =>
        typeof s.text !== 'string' ||
        typeof s.speaker !== 'string' ||
        !s.speaker.trim() ||
        s.speaker.trim().length > 40,
    )
  )
    throw Object.assign(
      new Error('Give each part a speaker name of up to 40 characters.'),
      {status: 400},
    );
  const normalize = (text) => text.trim().replace(/\s+/g, ' ');
  if (normalize(segments.map((s) => s.text).join(' ')) !== normalize(turn.text))
    throw Object.assign(
      new Error('A split must keep all the original words, in order.'),
      {status: 400},
    );
  return {
    utteranceId: turn.id,
    segments: segments.map((s) => ({
      text: s.text.trim(),
      speaker: s.speaker.trim(),
    })),
  };
}
export function createReviewStore(directory) {
  const pending = new Map(),
    memory = new Map();
  const path = (account, id) =>
    join(
      directory || '.',
      createHash('sha256')
        .update(account + ':' + id)
        .digest('hex') + '.json',
    );
  const read = async (account, id) => {
    if (!directory) return memory.get(path(account, id)) || null;
    try {
      return JSON.parse(await readFile(path(account, id), 'utf8'));
    } catch (e) {
      if (e.code === 'ENOENT') return null;
      throw e;
    }
  };
  return {
    read,
    async save(account, conversation, input) {
      const key = path(account, conversation.id),
        previous = pending.get(key) || Promise.resolve();
      const operation = previous
        .catch(() => {})
        .then(async () => {
          const current = await read(account, conversation.id);
          if (input.revision !== (current?.revision || 0))
            throw Object.assign(
              new Error(
                'This review changed on another screen. Reopen it to continue.',
              ),
              {status: 409},
            );
          const fp = fingerprint(conversation);
          if (input.fingerprint !== fp)
            throw Object.assign(
              new Error(
                'Bee updated this transcript. Reopen it before saving.',
              ),
              {status: 409},
            );
          const correction = validateCorrection(conversation, input.correction);
          const corrections =
            current?.fingerprint === fp ? {...current.corrections} : {};
          corrections[correction.utteranceId] = correction;
          const value = {
            conversationId: conversation.id,
            fingerprint: fp,
            revision: (current?.revision || 0) + 1,
            updatedAt: Date.now(),
            corrections,
          };
          if (!directory) {
            memory.set(key, value);
            return value;
          }
          await mkdir(directory, {recursive: true, mode: 0o700});
          const temporary = key + '.' + randomUUID() + '.tmp';
          await writeFile(temporary, JSON.stringify(value), {mode: 0o600});
          await rename(temporary, key);
          return value;
        });
      pending.set(key, operation);
      try {
        return await operation;
      } finally {
        if (pending.get(key) === operation) pending.delete(key);
      }
    },
  };
}
