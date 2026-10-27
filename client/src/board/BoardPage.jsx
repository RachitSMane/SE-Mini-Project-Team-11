// Board view (COMP-01) on top of the COMP-02 sync module: connection status, role-aware tools,
// optimistic editing, rejection messages, access changes, restore notices and test hooks.
import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { SyncClient } from '@wb/shared/sync';
import { api, describeError } from '../api.js';
import { Link, navigate } from '../router.jsx';
import { loadGuest, saveGuest, savePendingJoin } from '../session.js';
import { avatarTone, ConfirmDialog, initials, ROLE_LABEL, Toasts, useToasts } from '../ui.jsx';
import { Icon, Logo } from '../icons.jsx';
import { AuthLayout } from '../pages/Auth.jsx';
import BoardCanvas from './Canvas.jsx';
import Toolbar, { TOOLS } from './Toolbar.jsx';
import SidePanel from './SidePanel.jsx';
import { MembersDialog, ShareDialog } from './OwnerDialogs.jsx';

const TEST_BUILD = import.meta.env.MODE === 'test';

const ENDED = {
  BOARD_DELETED: 'This board was deleted by its Owner.',
  MEMBER_REMOVED: 'You were removed from this board.',
  LINK_REVOKED: 'The share link you joined with was revoked.',
  LINK_EXPIRED: 'The share link you joined with has expired.',
  BOARD_NOT_FOUND: 'Board not found, or you do not have access to it.',
  UNAUTHENTICATED: 'Your access to this board has ended. Open the share link again or log in.',
};

// Below this width the side panel overlays the canvas instead of taking space beside it (styles.css).
const PANEL_OVERLAY_QUERY = '(max-width: 900px)';
const MAX_AVATARS = 3;

/** Submits queued operations at most `perSecond` per second (stays below SEC-REQ-006's 30/s). */
function createOutbox(send, perSecond = 20) {
  const queue = [];
  let timer = null;
  const pump = () => {
    const op = queue.shift();
    if (op) send(op.type, op.payload);
    timer = queue.length ? setTimeout(pump, 1000 / perSecond) : null;
  };
  return {
    push(type, payload) {
      queue.push({ type, payload });
      if (!timer) pump();
    },
    clear() {
      queue.length = 0;
      clearTimeout(timer);
      timer = null;
    },
  };
}

export default function BoardPage({ boardId, session, onUnauthenticated }) {
  const guest = useMemo(() => (session ? null : loadGuest(boardId)), [session, boardId]);
  const token = session?.token || guest?.token;
  const [, rerender] = useReducer((x) => x + 1, 0);
  const syncRef = useRef(null);
  const outboxRef = useRef(null);
  const { toasts, push, dismiss } = useToasts();
  const [ended, setEnded] = useState(null);
  const [title, setTitle] = useState('');
  const [tool, setTool] = useState('pen');
  const [style, setStyle] = useState({ color: '#000000', strokeWidth: 3 });
  const [selectedId, setSelectedId] = useState(null);
  const [dialog, setDialog] = useState(null); // 'share' | 'members'
  const [confirm, setConfirm] = useState(null);
  const [versionTick, setVersionTick] = useState(0);
  const [connecting, setConnecting] = useState(true);
  const [panelOpen, setPanelOpen] = useState(() => !window.matchMedia(PANEL_OVERLAY_QUERY).matches);
  const [panelTab, setPanelTab] = useState('participants');
  const endedRef = useRef(null);
  endedRef.current = ended;

  // A guest token that expires while its link is still valid sends the guest back to the guest
  // entry page, where the link is resolved again for a new token (SAD §3.9.2). A revoked or
  // expired link instead ends access with its notice (FR-047, FR-048).
  const guestTokenExpired = useCallback(() => Boolean(guest) && Date.parse(guest.expiresAt) <= Date.now(), [guest]);
  const returnToGuestEntry = useCallback(() => {
    if (endedRef.current) return;
    saveGuest(boardId, null);
    if (!guest?.linkToken) {
      setEnded(ENDED.UNAUTHENTICATED);
      return;
    }
    savePendingJoin(guest.linkToken);
    navigate('/join?expired=1', { replace: true });
  }, [boardId, guest]);
  useEffect(() => {
    if (!guest) return undefined;
    // Grace period: a link expiry (same instant) is reported by the server first.
    const t = setTimeout(returnToGuestEntry, Math.max(0, Date.parse(guest.expiresAt) - Date.now()) + 1500);
    return () => clearTimeout(t);
  }, [guest, returnToGuestEntry]);

  useEffect(() => {
    if (!token) {
      setEnded('Open the share link again, or log in to view this board.');
      return undefined;
    }
    api('GET', `/boards/${boardId}`, { token }).then(
      (b) => setTitle(b.title),
      (err) => {
        if (err.status === 401 && session) onUnauthenticated();
        else setEnded(ENDED[err.code] || err.message);
      },
    );
    const socket = io('/board', {
      auth: { token },
      transports: ['websocket'],
      reconnectionDelay: 500, // D6b
      reconnectionDelayMax: 2000,
      randomizationFactor: 0.2,
    });
    const sync = new SyncClient(socket, boardId);
    syncRef.current = sync;
    const outbox = createOutbox((type, payload) => sync.submit(type, payload));
    outboxRef.current = outbox;

    const unsub = sync.subscribe((kind, data) => {
      switch (kind) {
        case 'ready':
          setConnecting(false);
          // End point of load and reconnection timing (NFR-003, NFR-004).
          requestAnimationFrame(() => performance.mark('board-ready'));
          break;
        case 'rejected':
          push(describeError(data.error), 'error');
          break;
        case 'notice':
          push(data.message, 'warning', 8000);
          break;
        case 'join-failed':
          setEnded(ENDED[data.code] || data.message);
          socket.disconnect();
          break;
        case 'revoked':
          setEnded(ENDED[data.reason] || 'Your access to this board has ended.');
          break;
        case 'role':
          push(`Your role is now ${ROLE_LABEL[data]}.`, 'info');
          break;
        case 'version:created':
          setVersionTick((t) => t + 1);
          break;
        case 'version:restored':
          push(`${data.actor.displayName} restored version ${data.restoredFrom} (saved as version ${data.newVersion}).`, 'info', 8000);
          setVersionTick((t) => t + 1);
          break;
        case 'disconnected':
          outbox.clear();
          // The server closes sockets whose token has expired; Socket.IO does not reconnect those.
          if (data === 'io server disconnect' && guestTokenExpired()) returnToGuestEntry();
          break;
        default:
      }
      rerender();
    });
    socket.on('connect_error', (err) => {
      if (err?.data?.code !== 'UNAUTHENTICATED') return; // network errors: keep retrying
      socket.disconnect();
      if (session) onUnauthenticated();
      else if (guestTokenExpired()) returnToGuestEntry();
      else setEnded(ENDED.UNAUTHENTICATED);
    });
    if (TEST_BUILD) {
      window.__wbTest = {
        exportState: () => sync.exportState(),
        submitRaw: (op) => sync.submit(op.type, op.payload),
        status: () => sync.status,
      };
    }
    return () => {
      unsub();
      outbox.clear();
      sync.close();
      socket.disconnect();
      if (TEST_BUILD) delete window.__wbTest;
    };
  }, [boardId, token, session, onUnauthenticated, push, guestTokenExpired, returnToGuestEntry]);

  const sync = syncRef.current;
  const role = sync?.role;
  const status = sync?.status || 'connecting';
  const ready = status === 'ready';
  const canEdit = ready && (role === 'owner' || role === 'editor');
  const isOwner = role === 'owner';
  const objects = sync ? [...sync.getView().values()] : [];
  const selected = selectedId ? objects.find((o) => o.id === selectedId) || null : null;
  const disabledReason = !ready ? 'Not connected — tools are disabled until the board is resynchronised' : 'View only: your role does not permit editing';

  const submit = useCallback(
    (type, payload) => {
      if (!syncRef.current?.submit(type, payload)) push('Not connected: the change was not sent.', 'error');
    },
    [push],
  );
  const onAdd = useCallback((obj) => submit('object:add', obj), [submit]);
  const onUpdate = useCallback((id, changes) => submit('object:update', { id, ...changes }), [submit]);
  const onDelete = useCallback(
    (ids) => {
      for (const id of ids) outboxRef.current.push('object:delete', { id });
      if (ids.includes(selectedId)) setSelectedId(null);
    },
    [selectedId],
  );

  // Changing colour or width restyles the selected object (FR-005).
  const changeStyle = (next) => {
    if (selected && canEdit && tool === 'select') {
      const changes = {};
      if (next.color !== style.color) changes.color = next.color;
      if (next.strokeWidth !== style.strokeWidth) changes.strokeWidth = next.strokeWidth;
      if (Object.keys(changes).length) onUpdate(selected.id, changes);
    }
    setStyle(next);
  };

  // Keyboard: tool shortcuts and Delete for the selected object.
  useEffect(() => {
    const onKey = (e) => {
      if (e.target.closest('input, textarea, select, [role="dialog"]') || e.ctrlKey || e.metaKey || e.altKey) return;
      if ((e.key === 'Delete' || e.key === 'Backspace') && selected && canEdit) {
        e.preventDefault();
        onDelete([selected.id]);
        return;
      }
      const t = TOOLS.find((x) => x.key === e.key.toUpperCase());
      if (t && canEdit) setTool(t.id);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [selected, canEdit, onDelete]);

  useEffect(() => {
    if (tool !== 'select') setSelectedId(null);
  }, [tool]);
  useEffect(() => {
    if (selectedId && !selected) setSelectedId(null); // deleted by someone else
  }, [selectedId, selected]);

  const clearBoard = () =>
    setConfirm({
      title: 'Clear the entire board?',
      message: 'Every object is removed for all participants. The current content is kept in the version history.',
      confirmLabel: 'Clear board',
      onConfirm: () => submit('board:clear', {}),
    });

  const restore = (n) =>
    setConfirm({
      title: `Restore version ${n}?`,
      message: `The board content of every participant is replaced by version ${n}. This is saved as a new version; no version is deleted.`,
      confirmLabel: 'Restore',
      onConfirm: async () => {
        const key = crypto.randomUUID(); // one key per user action (D14c); reused for a retry
        const call = () => api('POST', `/boards/${boardId}/versions/${n}/restore`, { token, headers: { 'Idempotency-Key': key } });
        try {
          await call().catch((err) => (err.code === 'NETWORK' ? call() : Promise.reject(err)));
        } catch (err) {
          push(describeError(err), 'error');
        }
      },
    });

  if (ended) {
    return (
      <AuthLayout>
        <div className="ended">
          <h1>{title || 'Board'}</h1>
          <p role="alert" data-testid="ended">
            {ended}
          </p>
          {session ? <Link to="/">Back to my boards</Link> : <Link to="/login">Log in</Link>}
        </div>
      </AuthLayout>
    );
  }

  const statusText = { ready: 'Connected', joining: 'Synchronising…', connecting: connecting ? 'Connecting…' : 'Disconnected — reconnecting…', disconnected: 'Disconnected — reconnecting…', error: 'Error', revoked: 'Access ended' }[status];
  const statusTone = ready ? 'ok' : status === 'joining' || connecting ? 'pending' : 'down';
  const myName = session ? session.user.displayName : guest?.displayName;
  const me = session ? myName : `${myName} (guest)`;
  const participants = sync?.participants || [];
  const shown = participants.slice(0, MAX_AVATARS);
  const showParticipants = () => {
    setPanelTab('participants');
    setPanelOpen(true);
  };
  const emptyHint = !ready ? null : canEdit ? (
    <>
      <strong>This board is empty</strong>
      <span>
        Pick a tool on the left to start. Shortcuts: <kbd>P</kbd> pen, <kbd>R</kbd> rectangle, <kbd>T</kbd> text.
      </span>
    </>
  ) : (
    <>
      <strong>This board is empty</strong>
      <span>Changes made by editors appear here as they happen.</span>
    </>
  );

  return (
    <div className={`board${panelOpen ? ' panel-open' : ''}`}>
      <header className="topbar">
        <nav className="crumbs" aria-label="Breadcrumb">
          <Logo markOnly />
          {session && (
            <>
              <Link to="/" className="back" title="Back to my boards">
                <span className="back-arrow">←</span> <span className="back-label">Boards</span>
              </Link>
              <span className="crumb-sep" aria-hidden="true">/</span>
            </>
          )}
          <h1 title={title}>{title}</h1>
          <span className={`badge role-${role || 'none'}`} data-testid="role-badge">
            {role === 'viewer' ? 'View only' : ROLE_LABEL[role] || '…'}
          </span>
        </nav>
        <div className="spacer" />
        <span className={`status status-${statusTone}`} data-testid="connection-status" role="status">
          <span className="dot" aria-hidden="true" />
          <span className="status-text">{statusText}</span>
        </span>
        {participants.length > 0 && (
          <button
            type="button"
            className="presence"
            onClick={showParticipants}
            aria-label={`${participants.length === 1 ? '1 person' : `${participants.length} people`} on this board: show participants`}
            title={participants.map((p) => p.displayName).join(', ')}
          >
            <span className="avatar-stack" aria-hidden="true">
              {shown.map((p) => (
                <span key={p.id} className={`avatar ${avatarTone(p.id)}`}>
                  {initials(p.displayName)}
                </span>
              ))}
              {participants.length > MAX_AVATARS && <span className="avatar more">+{participants.length - MAX_AVATARS}</span>}
            </span>
          </button>
        )}
        <span className="divider" />
        <div className="topbar-actions">
          <button type="button" className="ghost" onClick={() => setDialog('members')} disabled={!ready} title="See who has access to this board">
            <Icon name="users" size={16} />
            <span className="btn-label">Members</span>
          </button>
          {isOwner && (
            <button type="button" className="primary" onClick={() => setDialog('share')} disabled={!session}>
              <Icon name="link" size={16} />
              <span className="btn-label">Share</span>
            </button>
          )}
          {isOwner && (
            <button type="button" className="ghost icon-only danger-ghost" onClick={clearBoard} disabled={!canEdit} data-testid="clear-board" aria-label="Clear board" title="Clear board: remove every object for everyone">
              <Icon name="trash" size={16} />
            </button>
          )}
          <button
            type="button"
            className={`ghost icon-only${panelOpen ? ' pressed' : ''}`}
            onClick={() => setPanelOpen((o) => !o)}
            aria-expanded={panelOpen}
            aria-controls="board-side"
            aria-label={panelOpen ? 'Hide participants and history panel' : 'Show participants and history panel'}
            title={panelOpen ? 'Hide panel' : 'Show participants and history'}
          >
            <Icon name="panel" size={16} />
          </button>
        </div>
        <span className="me" title={`You are on this board as ${me}`}>
          <span className={`avatar ${avatarTone(session?.user.id || myName)}`} aria-hidden="true">
            {initials(myName)}
          </span>
          <span className="name">{me}</span>
        </span>
      </header>
      {!ready && !connecting && (
        <div className="banner" role="alert" data-testid="disconnected-banner">
          <Icon name="alert" size={16} />
          Disconnected — reconnecting… Editing is disabled until the board is resynchronised.
        </div>
      )}
      <div className="workspace">
        {role !== 'viewer' && (
          <Toolbar
            tool={tool}
            setTool={setTool}
            style={style}
            setStyle={changeStyle}
            editable={canEdit}
            disabledReason={disabledReason}
            selected={tool === 'select' ? selected : null}
            onDeleteSelected={() => selected && onDelete([selected.id])}
          />
        )}
        <BoardCanvas
          objects={objects}
          tool={tool}
          style={style}
          editable={canEdit}
          selectedId={selectedId}
          onSelect={setSelectedId}
          onAdd={onAdd}
          onUpdate={onUpdate}
          onDelete={onDelete}
          emptyHint={emptyHint}
        />
        {panelOpen && (
          <SidePanel
            tab={panelTab}
            setTab={setPanelTab}
            onClose={() => setPanelOpen(false)}
            participants={participants}
            meId={session?.user.id}
            boardId={boardId}
            token={token}
            isOwner={isOwner}
            versionTick={versionTick}
            onRestore={restore}
            onError={(err) => push(describeError(err), 'error')}
          />
        )}
      </div>
      {dialog === 'share' && <ShareDialog boardId={boardId} token={token} onClose={() => setDialog(null)} />}
      {dialog === 'members' && (
        <MembersDialog
          boardId={boardId}
          token={token}
          isOwner={isOwner}
          onClose={() => setDialog(null)}
          onTransferred={(m) => {
            setDialog(null);
            push(`${m.displayName} is now the Owner. You are an Editor.`, 'info', 8000);
          }}
        />
      )}
      <ConfirmDialog confirm={confirm} onClose={() => setConfirm(null)} />
      <Toasts toasts={toasts} dismiss={dismiss} />
    </div>
  );
}
