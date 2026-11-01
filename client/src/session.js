// Token storage. Session tokens (24 h) stay in localStorage; guest tokens are kept in
// sessionStorage so that they end with the browser session (FR-046, SAD §3.9.2).
const SESSION_KEY = 'wb.session';
const PENDING_JOIN_KEY = 'wb.pendingJoin';
const guestKey = (boardId) => `wb.guest.${boardId}`;

function read(storage, key) {
  try {
    return JSON.parse(storage.getItem(key));
  } catch {
    return null;
  }
}

function write(storage, key, value) {
  try {
    if (value === null) storage.removeItem(key);
    else storage.setItem(key, JSON.stringify(value));
  } catch {
    // storage unavailable (private mode): the session lasts for this page only
  }
}

const unexpired = (s) => (s && Date.parse(s.expiresAt) > Date.now() ? s : null);

/** {token, expiresAt, user: {id, displayName}} or null. */
export const loadSession = () => unexpired(read(localStorage, SESSION_KEY));
export const saveSession = (s) => write(localStorage, SESSION_KEY, s);

/** {token, expiresAt, role, displayName} for one board, or null. */
export const loadGuest = (boardId) => unexpired(read(sessionStorage, guestKey(boardId)));
export const saveGuest = (boardId, g) => write(sessionStorage, guestKey(boardId), g);

/** Share-link token remembered while a visitor logs in from the guest entry page. */
export const loadPendingJoin = () => read(sessionStorage, PENDING_JOIN_KEY);
export const savePendingJoin = (token) => write(sessionStorage, PENDING_JOIN_KEY, token);
