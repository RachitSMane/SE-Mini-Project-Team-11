// Guest entry page for share links (FR-046, SD-03). The token is read from the URL fragment
// (never sent to servers in requests for the page) and removed from the address bar at once.
import { useEffect, useRef, useState } from 'react';
import { LIMITS } from '@wb/shared/objects';
import { api } from '../api.js';
import { navigate } from '../router.jsx';
import { loadPendingJoin, saveGuest, savePendingJoin } from '../session.js';
import { ErrorText } from '../ui.jsx';
import { AuthLayout } from './Auth.jsx';

const LINK_MESSAGES = {
  LINK_EXPIRED: 'This share link has expired. Ask the board Owner for a new link.',
  LINK_REVOKED: 'This share link has been revoked. Ask the board Owner for a new link.',
  LINK_NOT_FOUND: 'This share link is not valid.',
};

export default function JoinPage({ session, hash }) {
  const tokenRef = useRef(null);
  if (tokenRef.current === null) tokenRef.current = hash.replace(/^#/, '') || loadPendingJoin() || '';
  const token = tokenRef.current;
  const [name, setName] = useState('');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const [expired] = useState(() => new URLSearchParams(window.location.search).has('expired'));
  useEffect(() => {
    if (hash || expired) window.history.replaceState(null, '', '/join');
  }, [hash, expired]);

  const fail = (err) => setError(LINK_MESSAGES[err.code] || err.message);

  // A logged-in user becomes a member (or keeps a higher role) and opens the board.
  useEffect(() => {
    if (!session || !token) return;
    savePendingJoin(null);
    api('POST', '/links/resolve', { token: session.token, body: { token } }).then(
      (r) => navigate(`/boards/${r.boardId}`, { replace: true }),
      fail,
    );
  }, [session, token]);

  if (!token) {
    return (
      <AuthLayout>
        <h1>Join a board</h1>
        <ErrorText error="This page needs a share link." />
      </AuthLayout>
    );
  }
  if (session) {
    return (
      <AuthLayout>
        <h1>Join a board</h1>
        {error ? <ErrorText error={error} /> : <p className="lead">Opening the board…</p>}
      </AuthLayout>
    );
  }

  const joinAsGuest = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Enter a display name of 1–30 characters.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const r = await api('POST', '/links/resolve', { body: { token, displayName: name.trim() } });
      // The link token is kept with the guest token (same sessionStorage scope) so that an expired guest
      // token can be renewed from this page while the link is still valid (SAD §3.9.2).
      saveGuest(r.boardId, { token: r.guestToken, expiresAt: r.expiresAt, role: r.role, displayName: name.trim(), linkToken: token });
      savePendingJoin(null);
      navigate(`/boards/${r.boardId}`, { replace: true });
    } catch (err) {
      fail(err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthLayout>
      <h1>Join a board</h1>
      <p className="lead">You were invited through a share link. Join as a guest, or log in to join as a member.</p>
      {expired && (
        <p role="status" className="notice" data-testid="guest-expired">
          Your guest session has ended. Enter your name to join the board again.
        </p>
      )}
      <form onSubmit={joinAsGuest}>
        <label>
          <span>
            Your display name <span className="hint">(1–30 characters)</span>
          </span>
          <input value={name} maxLength={LIMITS.MAX_DISPLAY_NAME} onChange={(e) => setName(e.target.value)} autoFocus />
        </label>
        <ErrorText error={error} />
        <button type="submit" className="primary" disabled={busy}>
          {busy ? 'Joining…' : 'Join as guest'}
        </button>
      </form>
      <p className="auth-footer">
        Have an account?{' '}
        <button
          type="button"
          className="linklike"
          onClick={() => {
            savePendingJoin(token);
            navigate('/login');
          }}
        >
          Log in to join as a member
        </button>
      </p>
    </AuthLayout>
  );
}
