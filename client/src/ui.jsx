// Shared UI pieces: dialog frame, confirmation dialog (destructive actions, SAD §4.5), toast messages,
// error text and small display helpers.
import { useCallback, useEffect, useRef, useState } from 'react';
import { Icon } from './icons.jsx';

export function Modal({ title, onClose, children, labelledBy = 'modal-title', wide = false }) {
  const ref = useRef(null);
  useEffect(() => {
    const prev = document.activeElement;
    // Focus the first control of the dialog body; the header's close button is reachable with Tab.
    const first = ref.current?.querySelector('.modal-body :is(button, input, select, textarea, [tabindex])') || ref.current?.querySelector('button');
    first?.focus();
    const onKey = (e) => e.key === 'Escape' && onClose?.();
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      prev?.focus?.();
    };
  }, [onClose]);
  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}>
      <div className={`modal${wide ? ' wide' : ''}`} role="dialog" aria-modal="true" aria-labelledby={labelledBy} ref={ref}>
        <div className="modal-head">
          <h2 id={labelledBy}>{title}</h2>
          <button type="button" className="ghost small icon-only" aria-label="Close dialog" onClick={() => onClose?.()} disabled={!onClose}>
            <Icon name="close" size={16} />
          </button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}

/** confirm = {title, message, confirmLabel, onConfirm}; resolves busy state while onConfirm runs. */
export function ConfirmDialog({ confirm, onClose }) {
  const [busy, setBusy] = useState(false);
  if (!confirm) return null;
  const run = async () => {
    setBusy(true);
    try {
      await confirm.onConfirm();
    } finally {
      setBusy(false);
      onClose();
    }
  };
  return (
    <Modal title={confirm.title} onClose={busy ? undefined : onClose} labelledBy="confirm-title">
      <p>{confirm.message}</p>
      <div className="actions">
        <button type="button" onClick={onClose} disabled={busy}>
          Cancel
        </button>
        <button type="button" className="danger solid" onClick={run} disabled={busy} data-testid="confirm">
          {confirm.confirmLabel || 'Confirm'}
        </button>
      </div>
    </Modal>
  );
}

let toastId = 0;
export function useToasts() {
  const [toasts, setToasts] = useState([]);
  const dismiss = useCallback((id) => setToasts((t) => t.filter((x) => x.id !== id)), []);
  const push = useCallback(
    (message, kind = 'info', ms = 5000) => {
      toastId += 1;
      const id = toastId;
      setToasts((t) => [...t.slice(-4), { id, message, kind }]);
      if (ms) setTimeout(() => dismiss(id), ms);
    },
    [dismiss],
  );
  return { toasts, push, dismiss };
}

export function Toasts({ toasts, dismiss }) {
  return (
    <div className="toasts" role="status" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={`toast ${t.kind}`} data-testid={`toast-${t.kind}`}>
          <span>{t.message}</span>
          <button type="button" aria-label="Dismiss message" onClick={() => dismiss(t.id)}>
            <Icon name="close" size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}

export function ErrorText({ error }) {
  if (!error) return null;
  return (
    <p className="error" role="alert">
      <Icon name="alert" size={16} />
      <span>{error}</span>
    </p>
  );
}

/** Initials of a real display name, for the participant and account avatars. */
export function initials(name = '') {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  return (parts.length === 1 ? parts[0].slice(0, 2) : parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** Stable avatar tint (CSS class tone-0 … tone-5) so a person keeps one colour in header and panel. */
export function avatarTone(key = '') {
  let h = 0;
  for (const ch of String(key)) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return `tone-${h % 6}`;
}

export const formatTime =(iso) => new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });

export const ROLE_LABEL = { owner: 'Owner', editor: 'Editor', viewer: 'Viewer' };
