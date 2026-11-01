// Shared error-code contract (SAD §4.3, issue #9): the single list of error codes used by the
// server (HTTP status + default message in the common error object) and by the browser client
// (the text shown to the user). Adding a code here makes it available on both sides; the unit test
// shared/tests/errorCodes.test.js checks that every code is complete.
//
// Every response error has the same shape: { error: { code, message, requestId } }
//   status            HTTP status the server sends for the code
//   message           default server message (used when the code is thrown without a message)
//   userMessage       text the client shows for the code
//   useServerMessage  true when the server's own message is more specific than userMessage and safe
//                     to show (server messages are always written by us, never raw exception text)
//   showReference     true when the client appends the requestId, so a user can report the failure

const define = (status, message, userMessage, extra = {}) =>
  Object.freeze({ status, message, userMessage, useServerMessage: false, showReference: false, ...extra });

export const ERROR_CODES = Object.freeze({
  VALIDATION_FAILED: define(400, 'The request is invalid.', 'Some of the information is not valid. Check it and try again.', {
    useServerMessage: true,
  }),
  INVALID_TARGET: define(
    400,
    'Only a registered Editor or Viewer member of this board can become its Owner.',
    'Only a registered Editor or Viewer member of this board can become its Owner.',
    { useServerMessage: true },
  ),
  UNAUTHENTICATED: define(401, 'You are not logged in or your session has expired.', 'You are not logged in or your session has expired. Please log in again.', {
    useServerMessage: true,
  }),
  FORBIDDEN: define(403, 'Your role on this board does not permit this action.', 'Your role on this board does not permit this action.'),
  BOARD_NOT_FOUND: define(404, 'Board not found.', 'Board not found, or you do not have access to it.'),
  VERSION_NOT_FOUND: define(404, 'Version not found.', 'This version no longer exists. Only the 20 newest versions are kept.'),
  LINK_NOT_FOUND: define(404, 'This share link is not valid.', 'This share link is not valid.'),
  OBJECT_NOT_FOUND: define(404, 'The object no longer exists.', 'The object no longer exists. Someone else may have deleted it.'),
  MEMBER_NOT_FOUND: define(404, 'Member not found.', 'This person is no longer a member of the board.', { useServerMessage: true }),
  NOT_FOUND: define(404, 'Not found.', 'The requested item was not found.'),
  EMAIL_TAKEN: define(409, 'An account with this e-mail address already exists.', 'An account with this e-mail address already exists.'),
  CONFLICT: define(409, 'The change conflicts with existing data.', 'This change conflicts with existing data. Refresh and try again.'),
  IDEMPOTENCY_KEY_REUSED: define(
    409,
    'This Idempotency-Key was already used for a different version.',
    'This restore request was already used for a different version. Please try again.',
  ),
  LINK_EXPIRED: define(410, 'This share link has expired.', 'This share link has expired. Ask the board Owner for a new link.'),
  LINK_REVOKED: define(410, 'This share link has been revoked.', 'This share link has been revoked. Ask the board Owner for a new link.'),
  PAYLOAD_TOO_LARGE: define(413, 'The request is too large.', 'This change is too large to send.'),
  RATE_LIMITED: define(429, 'Too many requests. Please wait and try again.', 'You are making changes too quickly. Please slow down.'),
  BOARD_FULL: define(507, 'Board is full: the change would exceed the 15 MiB board size limit.', 'Board is full: this change would exceed the 15 MiB board size limit.'),
  INTERNAL: define(500, 'An unexpected error occurred.', 'Something went wrong on the server. Please try again.', { showReference: true }),
  UNAVAILABLE: define(503, 'Service unavailable.', 'The service is temporarily unavailable. Please try again shortly.', { showReference: true }),
});

/** Codes produced only by the client (never sent by the server). */
export const CLIENT_ERROR_CODES = Object.freeze({
  NETWORK: define(0, 'The server cannot be reached.', 'The server cannot be reached. Check your connection and try again.'),
});

export const GENERIC_ERROR_MESSAGE = 'Something went wrong. Please try again.';

/** Definition of a server or client code, or null for an unknown code. */
export function errorDefinition(code) {
  if (typeof code !== 'string') return null;
  return Object.hasOwn(ERROR_CODES, code) ? ERROR_CODES[code] : Object.hasOwn(CLIENT_ERROR_CODES, code) ? CLIENT_ERROR_CODES[code] : null;
}

/**
 * Error code for an HTTP response that carried no common error object (for example a proxy's
 * HTML error page while the server is down).
 */
export function codeForStatus(status) {
  if (status === 502 || status === 503 || status === 504) return 'UNAVAILABLE';
  if (status === 413) return 'PAYLOAD_TOO_LARGE';
  if (status === 429) return 'RATE_LIMITED';
  return 'INTERNAL';
}

/**
 * User-facing text for an error object { code, message?, requestId? } (an ApiError or the `error`
 * of a Socket.IO acknowledgement). Never returns an empty string.
 */
export function userMessageFor(err) {
  if (!err) return GENERIC_ERROR_MESSAGE;
  const def = errorDefinition(err.code);
  if (!def) return (typeof err.message === 'string' && err.message) || GENERIC_ERROR_MESSAGE;
  let text = def.useServerMessage && typeof err.message === 'string' && err.message ? err.message : def.userMessage;
  if (def.showReference && typeof err.requestId === 'string' && err.requestId) text += ` (reference: ${err.requestId})`;
  return text;
}
