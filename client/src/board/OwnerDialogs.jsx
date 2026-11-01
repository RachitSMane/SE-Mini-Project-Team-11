// Owner dialogs: share links (FR-045, FR-047) and members with role change, removal and ownership
// transfer (FR-049, FR-050). The server enforces every rule; these dialogs only call API-02.
import { useCallback, useEffect, useState } from 'react';
import { api } from '../api.js';
import { Icon } from '../icons.jsx';
import { avatarTone, ConfirmDialog, ErrorText, formatTime, initials, Modal, ROLE_LABEL } from '../ui.jsx';

export function ShareDialog({ boardId, token, onClose }) {
  const [links, setLinks] = useState([]);
  const [role, setRole] = useState('viewer');
  const [expiresIn, setExpiresIn] = useState('7d');
  const [created, setCreated] = useState(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState(null);
  const load = useCallback(() => {
    api('GET', `/boards/${boardId}/links`, { token }).then(setLinks, (e) => setError(e.message));
  }, [boardId, token]);
  useEffect(load, [load]);

  const create = async (e) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      setCreated(await api('POST', `/boards/${boardId}/links`, { token, body: { role, expiresIn } }));
      setCopied(false);
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };
  const revoke = (l) =>
    setConfirm({
      title: 'Revoke share link?',
      message: `The ${ROLE_LABEL[l.role]} link will stop working immediately and guests who joined through it are disconnected. Registered members keep their membership.`,
      confirmLabel: 'Revoke link',
      onConfirm: async () => {
        try {
          await api('DELETE', `/boards/${boardId}/links/${l.linkId}`, { token });
        } catch (err) {
          setError(err.message);
        }
        load();
      },
    });

  return (
    <Modal title="Share board" onClose={confirm ? undefined : onClose} labelledBy="share-title" wide>
      <p>Anyone with a link can open this board in the role it grants, until the link expires or is revoked.</p>
      <form className="row share-form" onSubmit={create}>
        <label>
          Role
          <select value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="viewer">Viewer (view only)</option>
            <option value="editor">Editor (can draw and edit)</option>
          </select>
        </label>
        <label>
          Expires after
          <select value={expiresIn} onChange={(e) => setExpiresIn(e.target.value)}>
            <option value="1h">1 hour</option>
            <option value="24h">24 hours</option>
            <option value="7d">7 days</option>
          </select>
        </label>
        <button type="submit" className="primary" disabled={busy}>
          <Icon name="link" size={16} />
          Create link
        </button>
      </form>
      {created && (
        <div className="created-link">
          <p>Copy this link now — it is shown only once.</p>
          <div className="field">
            <input readOnly value={created.url} data-testid="share-url" onFocus={(e) => e.target.select()} aria-label="Share link" />
            <button
            type="button"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(created.url);
                setCopied(true);
              } catch {
                setError('Copying failed; select the link and copy it manually.');
              }
            }}
          >
              <Icon name={copied ? 'check' : 'copy'} size={16} />
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
        </div>
      )}
      <ErrorText error={error} />
      <h3>Active links</h3>
      {links.length === 0 ? (
        <p className="muted">No active links. Create one above to invite people.</p>
      ) : (
        <div className="table-wrap">
          <table data-testid="links">
            <thead>
              <tr>
                <th>Role</th>
                <th className="time">Created</th>
                <th className="time">Expires</th>
                <th>
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {links.map((l) => (
                <tr key={l.linkId}>
                  <td>
                    <span className={`role-tag ${l.role}`}>{ROLE_LABEL[l.role]}</span>
                  </td>
                  <td className="time">{formatTime(l.createdAt)}</td>
                  <td className="time">{formatTime(l.expiresAt)}</td>
                  <td className="actions-cell">
                    <button type="button" className="danger small" onClick={() => revoke(l)}>
                      Revoke
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="actions">
        <button type="button" onClick={onClose}>
          Close
        </button>
      </div>
      <ConfirmDialog confirm={confirm} onClose={() => setConfirm(null)} />
    </Modal>
  );
}

export function MembersDialog({ boardId, token, isOwner, onClose, onTransferred }) {
  const [members, setMembers] = useState([]);
  const [error, setError] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const load = useCallback(() => {
    api('GET', `/boards/${boardId}/members`, { token }).then(setMembers, (e) => setError(e.message));
  }, [boardId, token]);
  useEffect(load, [load]);

  const call = async (fn) => {
    setError(null);
    try {
      await fn();
    } catch (err) {
      setError(err.message);
    }
    load();
  };
  const changeRole = (m, role) => call(() => api('PATCH', `/boards/${boardId}/members/${m.userId}`, { token, body: { role } }));
  const remove = (m) =>
    setConfirm({
      title: 'Remove member?',
      message: `${m.displayName} loses access to this board and is disconnected.`,
      confirmLabel: 'Remove member',
      onConfirm: () => call(() => api('DELETE', `/boards/${boardId}/members/${m.userId}`, { token })),
    });
  const transfer = (m) =>
    setConfirm({
      title: 'Transfer ownership?',
      message: `${m.displayName} becomes the Owner of this board. You become an Editor and can no longer delete the board, restore versions, or manage links and members.`,
      confirmLabel: `Make ${m.displayName} the Owner`,
      onConfirm: () =>
        call(async () => {
          await api('POST', `/boards/${boardId}/transfer-ownership`, { token, body: { newOwnerId: m.userId, confirm: true } });
          onTransferred(m);
        }),
    });

  return (
    <Modal title="Members" onClose={confirm ? undefined : onClose} labelledBy="members-title" wide>
      <ErrorText error={error} />
      <div className="table-wrap">
        <table data-testid="members">
          <thead>
            <tr>
              <th>Name</th>
              <th>Role</th>
              <th>
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {members.map((m) => (
              <tr key={m.userId}>
                <td>
                  <span className="member">
                    <span className={`avatar ${avatarTone(m.userId)}`} aria-hidden="true">
                      {initials(m.displayName)}
                    </span>
                    {m.displayName}
                  </span>
                </td>
                <td>
                  {isOwner && m.role !== 'owner' ? (
                    <select aria-label={`Role of ${m.displayName}`} value={m.role} onChange={(e) => changeRole(m, e.target.value)}>
                      <option value="editor">Editor</option>
                      <option value="viewer">Viewer</option>
                    </select>
                  ) : (
                    <span className={`role-tag ${m.role}`}>{ROLE_LABEL[m.role]}</span>
                  )}
                </td>
                <td className="actions-cell">
                  {isOwner && m.role !== 'owner' && (
                    <span className="cell-actions">
                      <button type="button" className="small" onClick={() => transfer(m)}>
                        Make Owner
                      </button>
                      <button type="button" className="danger small" onClick={() => remove(m)}>
                        Remove
                      </button>
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="footnote">Guests are not members; they appear in the participant list while connected.</p>
      <div className="actions">
        <button type="button" onClick={onClose}>
          Close
        </button>
      </div>
      <ConfirmDialog confirm={confirm} onClose={() => setConfirm(null)} />
    </Modal>
  );
}
