// Common error object and code-to-status mapping (SAD §4.3).
export const STATUS = Object.freeze({
  VALIDATION_FAILED: 400,
  INVALID_TARGET: 400,
  UNAUTHENTICATED: 401,
  FORBIDDEN: 403,
  BOARD_NOT_FOUND: 404,
  VERSION_NOT_FOUND: 404,
  LINK_NOT_FOUND: 404,
  OBJECT_NOT_FOUND: 404,
  MEMBER_NOT_FOUND: 404,
  NOT_FOUND: 404,
  EMAIL_TAKEN: 409,
  IDEMPOTENCY_KEY_REUSED: 409,
  LINK_EXPIRED: 410,
  LINK_REVOKED: 410,
  PAYLOAD_TOO_LARGE: 413,
  RATE_LIMITED: 429,
  BOARD_FULL: 507,
  INTERNAL: 500,
  UNAVAILABLE: 503,
});

const DEFAULT_MESSAGES = {
  VALIDATION_FAILED: 'The request is invalid.',
  INVALID_TARGET: 'Only a registered Editor or Viewer member of this board can become its Owner.',
  UNAUTHENTICATED: 'You are not logged in or your session has expired.',
  FORBIDDEN: 'Your role on this board does not permit this action.',
  BOARD_NOT_FOUND: 'Board not found.',
  VERSION_NOT_FOUND: 'Version not found.',
  LINK_NOT_FOUND: 'This share link is not valid.',
  OBJECT_NOT_FOUND: 'The object no longer exists.',
  MEMBER_NOT_FOUND: 'Member not found.',
  NOT_FOUND: 'Not found.',
  EMAIL_TAKEN: 'An account with this e-mail address already exists.',
  IDEMPOTENCY_KEY_REUSED: 'This Idempotency-Key was already used for a different version.',
  LINK_EXPIRED: 'This share link has expired.',
  LINK_REVOKED: 'This share link has been revoked.',
  PAYLOAD_TOO_LARGE: 'The request is too large.',
  RATE_LIMITED: 'Too many requests. Please wait and try again.',
  BOARD_FULL: 'Board is full: the change would exceed the 15 MiB board size limit.',
  INTERNAL: 'An unexpected error occurred.',
  UNAVAILABLE: 'Service unavailable.',
};

export class AppError extends Error {
  constructor(code, message, extra = {}) {
    super(message || DEFAULT_MESSAGES[code] || code);
    this.code = code;
    this.status = STATUS[code] || 500;
    Object.assign(this, extra);
  }
}

export function errorBody(err, requestId) {
  const code = err instanceof AppError ? err.code : 'INTERNAL';
  const message = err instanceof AppError ? err.message : DEFAULT_MESSAGES.INTERNAL;
  return { code, message, requestId };
}
