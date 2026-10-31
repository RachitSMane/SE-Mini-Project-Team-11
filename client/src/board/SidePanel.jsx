// Right panel: participants (FR-052) and version history with read-only preview (FR-031, FR-032)
// and Owner restore (FR-033).
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { api } from '../api.js';
import { avatarTone, ErrorText, formatTime, initials, Modal, ROLE_LABEL } from '../ui.jsx';
import { Icon } from '../icons.jsx';
import { bounds } from './geometry.js';
import { canvasMeasure, drawScene } from './render.js';

const TRIGGER_LABEL = {
  periodic: 'Periodic',
  before_clear: 'Before clear',
  last_left: 'Last participant left',
};
const triggerLabel = (v) => (v.trigger === 'restore' ? `Restore of version ${v.restoredFrom}` : TRIGGER_LABEL[v.trigger]);

const TABS = [
  { id: 'participants', label: 'Participants' },
  { id: 'history', label: 'History' },
];

export default function SidePanel({ tab, setTab, onClose, participants, meId, boardId, token, isOwner, versionTick, onRestore, onError }) {
  const tabRefs = useRef({});
  // Arrow keys move between the two tabs (WAI-ARIA tabs pattern); Tab moves into the panel.
  const onTabKey = (e) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    e.preventDefault();
    const next = TABS[(TABS.findIndex((t) => t.id === tab) + 1) % TABS.length].id;
    setTab(next);
    tabRefs.current[next]?.focus();
  };
  return (
    <aside className="side" id="board-side" aria-label="Participants and history">
      <div className="side-head">
        <div className="tabs" role="tablist" aria-label="Board panel">
          {TABS.map((t) => (
            <button
              key={t.id}
              ref={(el) => {
                tabRefs.current[t.id] = el;
              }}
              type="button"
              role="tab"
              id={`tab-${t.id}`}
              aria-selected={tab === t.id}
              aria-controls={`panel-${t.id}`}
              tabIndex={tab === t.id ? 0 : -1}
              className={tab === t.id ? 'active' : ''}
              onClick={() => setTab(t.id)}
              onKeyDown={onTabKey}
            >
              {t.label}
              {t.id === 'participants' && <span className="count">{participants.length}</span>}
            </button>
          ))}
        </div>
        <button type="button" className="ghost small icon-only side-close" onClick={onClose} aria-label="Hide panel" title="Hide panel">
          <Icon name="close" size={16} />
        </button>
      </div>
      <div className="tabpanel" role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`}>
        {tab === 'participants' ? (
          <Participants participants={participants} meId={meId} />
        ) : (
          <History boardId={boardId} token={token} isOwner={isOwner} versionTick={versionTick} onRestore={onRestore} onError={onError} />
        )}
      </div>
    </aside>
  );
}

function Participants({ participants, meId }) {
  if (participants.length === 0) {
    return (
      <ul className="participants" data-testid="participants">
        <li className="panel-empty">No one is connected yet. People appear here while they have the board open.</li>
      </ul>
    );
  }
  return (
    <>
      <p className="panel-note">{participants.length === 1 ? '1 person on this board' : `${participants.length} people on this board`}</p>
      <ul className="participants" data-testid="participants">
        {participants.map((p) => (
          <li key={p.id}>
            <span className={`avatar ${avatarTone(p.id)}`} aria-hidden="true">
              {initials(p.displayName)}
            </span>
            <span className="who">
              {p.displayName}
              {p.guest && <span className="guest"> (guest)</span>}
              {meId && p.id === meId && <span className="you"> · you</span>}
            </span>
            <span className={`role-tag ${p.role}`}>{ROLE_LABEL[p.role]}</span>
          </li>
        ))}
      </ul>
    </>
  );
}

function History({ boardId, token, isOwner, versionTick, onRestore, onError }) {
  const [versions, setVersions] = useState(null);
  const [error, setError] = useState(null);
  const [preview, setPreview] = useState(null);
  const load = useCallback(() => {
    api('GET', `/boards/${boardId}/versions?limit=50`, { token }).then(
      (v) => {
        setError(null);
        setVersions(v);
      },
      (err) => setError(err.message),
    );
  }, [boardId, token]);
  useEffect(load, [load, versionTick]);

  const open = async (v) => {
    try {
      setPreview(await api('GET', `/boards/${boardId}/versions/${v.number}`, { token }));
    } catch (err) {
      onError(err);
      load();
    }
  };

  return (
    <div className="history">
      <ErrorText error={error} />
      {versions === null ? (
        !error && <p className="panel-empty">Loading versions…</p>
      ) : versions.length === 0 ? (
        <p className="panel-empty">No versions yet. Versions are saved automatically while the board is edited and before it is cleared.</p>
      ) : (
        <>
          <p className="panel-note">{isOwner ? 'Open a version to preview it. You can restore it from the preview.' : 'Open a version to preview it. Only the Owner can restore versions.'}</p>
          <ol className="versions" data-testid="versions">
            {versions.map((v) => (
              <li key={v.number}>
                <button type="button" className="version" onClick={() => open(v)} title="Preview this version (read-only)">
                  <span className="vnum">
                    <span className="sr-only">Version </span>
                    <span aria-hidden="true">v</span>
                    {v.number}
                  </span>
                  <span className="vtrigger">{triggerLabel(v)}</span>
                  <span className="vtime">{formatTime(v.createdAt)}</span>
                </button>
              </li>
            ))}
          </ol>
        </>
      )}
      {preview && (
        <Modal title={`Version ${preview.number} — ${triggerLabel(preview)} (read-only)`} onClose={() => setPreview(null)} labelledBy="preview-title" wide>
          <p className="preview-meta">
            {formatTime(preview.createdAt)} · {preview.objects.length === 1 ? '1 object' : `${preview.objects.length} objects`}
          </p>
          <div className="preview-frame">
            <PreviewCanvas objects={preview.objects} />
          </div>
          {!isOwner && <p className="footnote">Only the Owner can restore versions.</p>}
          <div className="actions">
            <button type="button" onClick={() => setPreview(null)}>
              Close
            </button>
            {isOwner && (
              <button
                type="button"
                className="primary"
                onClick={() => {
                  const n = preview.number;
                  setPreview(null);
                  onRestore(n);
                }}
              >
                Restore this version…
              </button>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}

/** Read-only rendering of a version, scaled to fit. */
function PreviewCanvas({ objects }) {
  const ref = useRef(null);
  useLayoutEffect(() => {
    const canvas = ref.current;
    const ctx = canvas.getContext('2d');
    const W = 760;
    const H = 420;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    const m = canvasMeasure(ctx);
    let maxX = 1;
    let maxY = 1;
    for (const o of objects) {
      const b = bounds(o, m);
      maxX = Math.max(maxX, b.x + b.w + o.strokeWidth);
      maxY = Math.max(maxY, b.y + b.h + o.strokeWidth);
    }
    const scale = Math.min(1, W / maxX, H / maxY);
    ctx.setTransform(dpr * scale, 0, 0, dpr * scale, 0, 0);
    drawScene(ctx, W / scale, H / scale, objects);
  }, [objects]);
  return <canvas ref={ref} className="preview" data-testid="preview-canvas" aria-label="Version preview" />;
}
