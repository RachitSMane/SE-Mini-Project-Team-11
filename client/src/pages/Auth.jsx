// Login and registration (FR-040, FR-041).
import { useState } from 'react';
import { LIMITS } from '@wb/shared/objects';
import { api } from '../api.js';
import { Logo } from '../icons.jsx';
import { Link } from '../router.jsx';
import { ErrorText } from '../ui.jsx';

/** Frame shared by the account pages, the guest entry page and the "access ended" page. */
export function AuthLayout({ children }) {
  return (
    <div className="auth-page">
      <Logo />
      <main className="auth">{children}</main>
    </div>
  );
}

export function LoginPage({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      onLogin(await api('POST', '/auth/login', { body: { email, password } }));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <AuthLayout>
      <h1>Log in</h1>
      <p className="lead">Open your boards and continue where your team left off.</p>
      <form onSubmit={submit}>
        <label>
          E-mail address
          <input type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        <label>
          Password
          <input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </label>
        <ErrorText error={error} />
        <button type="submit" className="primary" disabled={busy}>
          {busy ? 'Logging in…' : 'Log in'}
        </button>
      </form>
      <p className="auth-footer">
        No account yet? <Link to="/register">Register</Link>
      </p>
    </AuthLayout>
  );
}

export function RegisterPage({ onLogin }) {
  const [form, setForm] = useState({ displayName: '', email: '', password: '' });
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const submit = async (e) => {
    e.preventDefault();
    if (!form.displayName.trim()) {
      setError('Enter a display name of 1–30 characters.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await api('POST', '/auth/register', { body: { ...form, displayName: form.displayName.trim() } });
      onLogin(await api('POST', '/auth/login', { body: { email: form.email, password: form.password } }));
    } catch (err) {
      setError(err.code === 'EMAIL_TAKEN' ? 'An account with this e-mail address already exists.' : err.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <AuthLayout>
      <h1>Create an account</h1>
      <p className="lead">Your display name is shown to everyone on the boards you join.</p>
      <form onSubmit={submit}>
        <label>
          <span>
            Display name <span className="hint">(1–30 characters)</span>
          </span>
          <input value={form.displayName} onChange={set('displayName')} maxLength={LIMITS.MAX_DISPLAY_NAME} required />
        </label>
        <label>
          E-mail address
          <input type="email" autoComplete="username" value={form.email} onChange={set('email')} required />
        </label>
        <label>
          <span>
            Password <span className="hint">(8–72 characters)</span>
          </span>
          <input
            type="password"
            autoComplete="new-password"
            value={form.password}
            onChange={set('password')}
            minLength={LIMITS.MIN_PASSWORD}
            maxLength={LIMITS.MAX_PASSWORD}
            required
          />
        </label>
        <ErrorText error={error} />
        <button type="submit" className="primary" disabled={busy}>
          {busy ? 'Creating account…' : 'Register'}
        </button>
      </form>
      <p className="auth-footer">
        Already registered? <Link to="/login">Log in</Link>
      </p>
    </AuthLayout>
  );
}
