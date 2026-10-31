// Shared assertions and REST/Socket.IO helpers for the integration tests.
import { canonicalState } from '@wb/shared/objects';
import { connectSocket, emitAck, restClient, waitEvent } from './harness.js';

/** restClient plus call(method, path, token, body, headers) against /api/v1. Accepts a test server or a URL/app. */
export function apiClient(target) {
  const rest = restClient(target.app ?? target);
  return {
    ...rest,
    call(method, path, token, body, headers = {}) {
      let req = rest.agent()[method](`/api/v1${path}`);
      if (token) req = req.set('Authorization', `Bearer ${token}`);
      for (const [k, v] of Object.entries(headers)) req = req.set(k, v);
      return body === undefined ? req : req.send(body);
    },
  };
}

/** Asserts status and error code, and that the body is only the common error object. */
export function expectError(res, status, code) {
  expect({ status: res.status, code: res.body?.error?.code }).toEqual({ status, code });
  expect(Object.keys(res.body)).toEqual(['error']);
  expect(res.body.error.requestId).toEqual(expect.any(String));
}

/** Resolves with the next occurrence of a SyncClient event kind. */
export function onceKind(sc, kind) {
  return new Promise((resolve) => {
    const unsub = sc.sync.subscribe((k, data) => {
      if (k === kind) {
        unsub();
        resolve(data);
      }
    });
  });
}

export function securityEvents(srv, event) {
  return srv.parsedLogs().filter((l) => l.security && l.event === event);
}

export function logEvents(srv, event) {
  return srv.parsedLogs().filter((l) => l.event === event);
}

export function expectNoSecrets(srv, secrets) {
  const all = srv.logs.join('\n');
  for (const s of secrets) expect(all.includes(s)).toBe(false);
}

/**
 * State from a fresh `board:join` on a new connection, in exportState() form. The connection
 * stays open until `close()` so that it does not count as "last participant left".
 */
export async function freshJoin(url, token, boardId) {
  const socket = connectSocket(url, token, { reconnection: false });
  await waitEvent(socket, 'connect');
  const ack = await emitAck(socket, 'board:join', { boardId });
  if (!ack.ok) {
    socket.close();
    throw new Error(`fresh join failed: ${JSON.stringify(ack.error)}`);
  }
  return {
    lastSeq: ack.state.seq,
    objects: canonicalState(new Map(ack.state.objects.map((o) => [o.id, o]))),
    participants: ack.participants,
    role: ack.role,
    close: () => socket.close(),
  };
}
