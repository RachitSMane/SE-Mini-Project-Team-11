// REST client for API-02 and API-03. Errors carry the server's common error object.
export class ApiError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
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
  if (!res.ok) throw new ApiError(res.status, data?.error?.code || 'INTERNAL', data?.error?.message || `Request failed (${res.status}).`);
  return data;
}

/** User-facing text for error codes whose server message is not specific enough. */
export function describeError(err) {
  switch (err?.code) {
    case 'BOARD_FULL':
      return 'Board is full: this change would exceed the 15 MiB board size limit.';
    case 'RATE_LIMITED':
      return 'You are making changes too quickly. Please slow down.';
    case 'FORBIDDEN':
      return 'Your role on this board does not permit this action.';
    default:
      return err?.message || 'Something went wrong.';
  }
}
