// COMP-01 application shell: session state and page routing.
import { useCallback, useEffect, useState } from 'react';
import { api } from './api.js';
import { navigate, useLocation } from './router.jsx';
import { loadPendingJoin, loadSession, saveSession } from './session.js';
import { LoginPage, RegisterPage } from './pages/Auth.jsx';
import Dashboard from './pages/Dashboard.jsx';
import JoinPage from './pages/Join.jsx';
import BoardPage from './board/BoardPage.jsx';

export default function App() {
  const { path, hash } = useLocation();
  const [session, setSession] = useState(loadSession);

  const onLogin = useCallback((s) => {
    saveSession(s);
    setSession(s);
    navigate(loadPendingJoin() ? '/join' : '/', { replace: true });
  }, []);

  // Expired or revoked session: back to the login page (FR-041).
  const onUnauthenticated = useCallback(() => {
    saveSession(null);
    setSession(null);
    navigate('/login', { replace: true });
  }, []);

  const onLogout = useCallback(async () => {
    try {
      await api('POST', '/auth/logout', { token: session?.token });
    } catch {
      // the session ends locally even if the server cannot be reached
    }
    onUnauthenticated();
  }, [session, onUnauthenticated]);

  // The session token expires after 24 h (D8c) even if the page stays open.
  useEffect(() => {
    if (!session) return undefined;
    const t = setTimeout(onUnauthenticated, Math.max(0, Date.parse(session.expiresAt) - Date.now()));
    return () => clearTimeout(t);
  }, [session, onUnauthenticated]);

  const board = path.match(/^\/boards\/([A-Za-z0-9]{1,64})$/);
  if (board) return <BoardPage key={board[1]} boardId={board[1]} session={session} onUnauthenticated={onUnauthenticated} />;
  if (path === '/join') return <JoinPage session={session} hash={hash} />;
  if (path === '/register') return session ? <Redirect to="/" /> : <RegisterPage onLogin={onLogin} />;
  if (path === '/login') return session ? <Redirect to="/" /> : <LoginPage onLogin={onLogin} />;
  if (!session) return <Redirect to="/login" />;
  if (path === '/') return <Dashboard session={session} onLogout={onLogout} onUnauthenticated={onUnauthenticated} />;
  return <Redirect to="/" />;
}

function Redirect({ to }) {
  useEffect(() => navigate(to, { replace: true }), [to]);
  return null;
}
