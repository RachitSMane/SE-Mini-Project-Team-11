// Dashboard (FR-042 to FR-044): boards the user owns or is a member of; create, open, rename
// (issue #13), delete.
import { useCallback, useEffect, useState } from 'react';
import { LIMITS } from '@wb/shared/objects';
import { api, describeError } from '../api.js';
import { Icon, Logo } from '../icons.jsx';
import { Link, navigate } from '../router.jsx';
import { ConfirmDialog, ErrorText, formatTime, initials, Modal, ROLE_LABEL } from '../ui.jsx';

/** Rename dialog (Owner only). Validates the 1–100 character rule before sending. */
function RenameDialog({ board, token, onRenamed, onClose, onUnauthenticated }) {
  const [title, setTitle] = useState(board.title);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    const next = title.trim();
    if (!next) {
      setError('Enter a title of 1–100 characters.');
      return;
    }
    if (next === board.title) {
      onClose();
      return;
    }
    setBusy(true);
    setError(null);
    try {
      onRenamed(await api('PATCH', `/boards/${board.id}`, { token, body: { title: next } }));
    } catch (err) {
      if (err.status === 401) onUnauthenticated();
      else setError(err.message);
      setBusy(false);
    }
  };
  return (
    <Modal title="Rename board" onClose={busy ? undefined : onClose} labelledBy="rename-title">
      <form onSubmit={submit}>
        <label>
          Board title
          <input value={title} maxLength={LIMITS.MAX_TITLE} onChange={(e) => setTitle(e.target.value)} aria-invalid={Boolean(error)} data-testid="rename-input" />
        </label>
        <ErrorText error={error} />
        <div className="actions">
          <button type="button" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button type="submit" className="primary" disabled={busy} data-testid="rename-save">
            {busy ? 'Saving…' : 'Save'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export default function Dashboard({ session, onLogout, onUnauthenticated }) {
  const [boards, setBoards] = useState(null);
  const [title, setTitle] = useState('');
  const [error, setError] = useState(null);
  const [creating, setCreating] = useState(false);
  const [confirm, setConfirm] = useState(null);
  const [renaming, setRenaming] = useState(null);

  const handle = useCallback(
    (err) => {
      if (err.status === 401) onUnauthenticated();
      else setError(describeError(err));
    },
    [onUnauthenticated],
  );

  const load = useCallback(() => {
    api('GET', '/boards', { token: session.token }).then(setBoards, handle);
  }, [session.token, handle]);
  useEffect(load, [load]);

  const create = async (e) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Enter a title of 1–100 characters.');
      return;
    }
    setError(null);
    setCreating(true);
    try {
      const b = await api('POST', '/boards', { token: session.token, body: { title: title.trim() } });
      navigate(`/boards/${b.id}`);
    } catch (err) {
      handle(err);
      setCreating(false);
    }
  };

  const remove = (b) =>
    setConfirm({
      title: 'Delete board?',
      message: `"${b.title}" will be deleted with all its content, versions, members and share links. Connected participants are disconnected. This cannot be undone.`,
      confirmLabel: 'Delete board',
      onConfirm: async () => {
        try {
          await api('DELETE', `/boards/${b.id}`, { token: session.token });
          load();
        } catch (err) {
          handle(err);
        }
      },
    });

  return (
    <>
      <header className="appbar">
        <Logo />
        <div className="spacer" />
        <span className="account">
          <span className="avatar" aria-hidden="true">
            {initials(session.user.displayName)}
          </span>
          <span>
            <span className="account-label">Logged in as </span>
            <strong>{session.user.displayName}</strong>
          </span>
        </span>
        <span className="divider" />
        <button type="button" className="ghost small" onClick={onLogout}>
          <Icon name="logout" size={16} />
          Log out
        </button>
      </header>
      <main className="dashboard">
        <div className="pagehead">
          <h1>My boards</h1>
          {boards?.length > 0 && <span className="count">{boards.length === 1 ? '1 board' : `${boards.length} boards`}</span>}
        </div>
        <form className="create" onSubmit={create}>
          <div className="create-field">
            <label htmlFor="new-title">New board title</label>
            <input
              id="new-title"
              value={title}
              maxLength={LIMITS.MAX_TITLE}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Sprint planning"
              aria-invalid={Boolean(error) && !title.trim()}
            />
          </div>
          <button type="submit" className="primary" disabled={creating}>
            <Icon name="plus" size={16} />
            Create board
          </button>
        </form>
        <ErrorText error={error} />
        <div className="panel">
          {boards === null ? (
            <p className="loading">Loading boards…</p>
          ) : boards.length === 0 ? (
            <div className="empty">
              <strong>No boards</strong>
              <p>You have no boards yet. Create one, or open a share link you received.</p>
            </div>
          ) : (
            <table className="boards">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Your role</th>
                  <th className="time">Last modified</th>
                  <th>
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {boards.map((b) => (
                  <tr key={b.id} data-testid="board-row">
                    <td>
                      <Link to={`/boards/${b.id}`}>{b.title}</Link>
                    </td>
                    <td>
                      <span className={`role-tag ${b.role}`}>{ROLE_LABEL[b.role]}</span>
                    </td>
                    <td className="time">{formatTime(b.updatedAt)}</td>
                    <td className="actions-cell">
                      {b.role === 'owner' && (
                        <>
                          <button type="button" className="small" onClick={() => setRenaming(b)}>
                            Rename
                          </button>{' '}
                          <button type="button" className="danger small" onClick={() => remove(b)}>
                            Delete
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <ConfirmDialog confirm={confirm} onClose={() => setConfirm(null)} />
        {renaming && (
          <RenameDialog
            board={renaming}
            token={session.token}
            onClose={() => setRenaming(null)}
            onUnauthenticated={onUnauthenticated}
            onRenamed={() => {
              setRenaming(null);
              load();
            }}
          />
        )}
      </main>
    </>
  );
}
