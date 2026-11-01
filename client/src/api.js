// REST client for API-02 and API-03. Errors carry the server's common error object
// { code, message, requestId }; the codes and their user-facing texts come from the shared
// error-code contract (shared/src/errorCodes.js, issue #9).
import { codeForStatus, userMessageFor } from '@wb/shared/errors';

export class ApiError extends Error {
  constructor(status, code, message, requestId = null) {
    super(message);
    this.status = status;
    this.code = code;
    this.requestId = requestId;
  }
}

export async function api(method, path, { token, body, headers = {} } = {}) {
  let res;
  try {
    res = await fetch(`/api/v1${path}`, {
      method,
      headers: {
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...headers,
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError(0, 'NETWORK', 'The server cannot be reached. Check your connection and try again.');
  }
  if (res.status === 204) return null;
  let data = null;
  try {
    data = await res.json();
  } catch {
    // non-JSON body (e.g. proxy error page)
  }
  if (!res.ok) {
    const error = data?.error;
    // No common error object (e.g. a proxy's error page while the server is down): derive the code
    // from the HTTP status so the user still gets a meaningful message.
    const code = typeof error?.code === 'string' ? error.code : codeForStatus(res.status);
    const requestId = error?.requestId || res.headers.get('X-Request-Id') || null;
    throw new ApiError(res.status, code, error?.message || `Request failed (${res.status}).`, requestId);
  }
  return data;
}

/**
 * User-facing text for an ApiError or the `error` of a Socket.IO acknowledgement. Every code of the
 * shared contract has a text; unexpected server errors include the request ID as a reference.
 */
export function describeError(err) {
  return userMessageFor(err);
}
