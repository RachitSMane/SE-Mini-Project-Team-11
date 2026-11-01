// Board canvas (COMP-01): renders the optimistic view and turns pointer input into operations
// for the pen, shape, line, text, select and eraser tools (FR-001 to FR-006).
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { LIMITS, translatedGeometry } from '@wb/shared/objects';
import { addStrokePoint, hitTest, newObjectId, round1, shapeFromDrag, textFontSize, touchedBySegment } from './geometry.js';
import { canvasMeasure, drawScene, FONT_FAMILY } from './render.js';

// Works over plain HTTP too (crypto.randomUUID needs HTTPS or localhost); see newObjectId.
const newId = () => newObjectId();

export default function BoardCanvas({ objects, tool, style, editable, selectedId, onSelect, onAdd, onUpdate, onDelete, emptyHint = null }) {
  const wrapRef = useRef(null);
  const canvasRef = useRef(null);
  const [size, setSize] = useState({ w: 800, h: 600 });
  const drag = useRef(null); // current gesture
  const [frame, setFrame] = useState(0); // re-render (and redraw) while a gesture changes the draft
  const [textEdit, setTextEdit] = useState(null); // {x, y, value, id?}

  // Fit the canvas to its container (device-pixel sharp).
  useLayoutEffect(() => {
    const el = wrapRef.current;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setSize({ w: Math.max(1, Math.floor(width)), h: Math.max(1, Math.floor(height)) });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const selected = selectedId ? objects.find((o) => o.id === selectedId) || null : null;

  // Draw. Only when something visible changed: the objects, the canvas size, the selection, the tool,
  // the object hidden by the text editor, or a gesture step (frame). Typing into the text editor
  // re-renders this component on every key but does not change the canvas; without this list each
  // key repainted the whole board, which made typing very slow in WebKit (issue #25: 501 keys took
  // more than 60 s in Playwright's WebKit, against about 2 s in a plain text field).
  useEffect(() => {
    const canvas = canvasRef.current;
    const dpr = window.devicePixelRatio || 1;
    if (canvas.width !== size.w * dpr) canvas.width = size.w * dpr;
    if (canvas.height !== size.h * dpr) canvas.height = size.h * dpr;
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const g = drag.current;
    const hidden = new Set();
    const extra = [];
    let shownSelected = selected;
    if (g?.type === 'move' && g.moved && selected) {
      hidden.add(selected.id);
      shownSelected = { ...selected, ...translatedGeometry(selected, g.dx, g.dy) };
      extra.push(shownSelected);
    }
    if (g?.draft) extra.push(g.draft);
    if (textEdit?.id) hidden.add(textEdit.id);
    drawScene(ctx, size.w, size.h, objects, { hidden, extra, selected: tool === 'select' ? shownSelected : null, dim: g?.erased || new Set() });
  }, [objects, size, selected, tool, textEdit?.id, frame]);

  const point = (e) => {
    const r = canvasRef.current.getBoundingClientRect();
    return { x: round1(e.clientX - r.left), y: round1(e.clientY - r.top) };
  };
  const measure = () => canvasMeasure(canvasRef.current.getContext('2d'));

  const commitText = () => {
    const t = textEdit;
    setTextEdit(null);
    if (!t) return;
    const value = t.value.slice(0, LIMITS.MAX_TEXT);
    if (!value.trim()) return;
    if (t.id) {
      const current = objects.find((o) => o.id === t.id);
      if (current && current.text !== value) onUpdate(t.id, { text: value });
    } else {
      onAdd({ id: newId(), kind: 'text', x: t.x, y: t.y, text: value, color: style.color, strokeWidth: style.strokeWidth });
    }
  };

  const onPointerDown = (e) => {
    if (!editable || e.button !== 0 || textEdit) return;
    const p = point(e);
    canvasRef.current.setPointerCapture(e.pointerId);
    switch (tool) {
      case 'pen': {
        const points = [];
        addStrokePoint(points, p.x, p.y);
        drag.current = { type: 'pen', draft: { id: newId(), kind: 'stroke', points, color: style.color, strokeWidth: style.strokeWidth } };
        break;
      }
      case 'rect':
      case 'ellipse':
      case 'line':
        drag.current = { type: 'shape', start: p, draft: shapeFromDrag(tool, p, p, style, newId()) };
        break;
      case 'eraser': {
        const erased = new Set(touchedBySegment(objects, p.x, p.y, p.x, p.y, 8, measure()));
        drag.current = { type: 'eraser', last: p, erased };
        break;
      }
      case 'select': {
        const hit = hitTest(objects, p.x, p.y, 6, measure());
        onSelect(hit ? hit.id : null);
        if (hit) drag.current = { type: 'move', start: p, dx: 0, dy: 0, moved: false };
        break;
      }
      case 'text':
        e.preventDefault();
        setTextEdit({ x: p.x, y: p.y, value: '' });
        break;
      default:
    }
    setFrame((f) => f + 1);
  };

  const onPointerMove = (e) => {
    const g = drag.current;
    if (!g) return;
    const p = point(e);
    if (g.type === 'pen') {
      if (!addStrokePoint(g.draft.points, p.x, p.y)) finishGesture(); // 2,000-point limit reached
    } else if (g.type === 'shape') {
      g.draft = shapeFromDrag(g.draft.kind, g.start, p, style, g.draft.id);
    } else if (g.type === 'eraser') {
      for (const id of touchedBySegment(objects, g.last.x, g.last.y, p.x, p.y, 8, measure())) g.erased.add(id);
      g.last = p;
    } else if (g.type === 'move') {
      g.dx = p.x - g.start.x;
      g.dy = p.y - g.start.y;
      g.moved = g.moved || Math.hypot(g.dx, g.dy) > 2;
    }
    setFrame((f) => f + 1);
  };

  function finishGesture() {
    const g = drag.current;
    drag.current = null;
    if (!g) return;
    if (g.type === 'pen') onAdd({ ...g.draft, points: g.draft.points.slice() });
    else if (g.type === 'shape') {
      const d = g.draft;
      const empty = d.kind === 'line' ? d.x1 === d.x2 && d.y1 === d.y2 : d.w === 0 && d.h === 0;
      if (!empty) onAdd(d);
    } else if (g.type === 'eraser' && g.erased.size) onDelete([...g.erased]);
    else if (g.type === 'move' && g.moved && selected) onUpdate(selected.id, translatedGeometry(selected, g.dx, g.dy));
    setFrame((f) => f + 1);
  }

  const onDoubleClick = (e) => {
    if (!editable || tool !== 'select') return;
    const p = point(e);
    const hit = hitTest(objects, p.x, p.y, 6, measure());
    if (hit?.kind === 'text') setTextEdit({ id: hit.id, x: hit.x, y: hit.y, value: hit.text });
  };

  // Abandon a gesture if editing becomes impossible (disconnect, role change).
  useEffect(() => {
    if (!editable) {
      drag.current = null;
      setTextEdit(null);
      setFrame((f) => f + 1); // redraw without the abandoned draft
    }
  }, [editable]);

  const editingObj = textEdit?.id ? objects.find((o) => o.id === textEdit.id) : null;
  const fs = textFontSize(editingObj ? editingObj.strokeWidth : style.strokeWidth);
  return (
    <div className={`canvas-wrap tool-${tool}`} ref={wrapRef}>
      <canvas
        ref={canvasRef}
        style={{ width: size.w, height: size.h }}
        data-testid="board-canvas"
        aria-label="Whiteboard canvas"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={finishGesture}
        onPointerCancel={finishGesture}
        onDoubleClick={onDoubleClick}
      />
      {emptyHint && objects.length === 0 && !drag.current?.draft && !textEdit && (
        <div className="canvas-empty" aria-hidden="true">
          {emptyHint}
        </div>
      )}
      {textEdit && (
        <textarea
          className="text-edit"
          data-testid="text-input"
          autoFocus
          maxLength={LIMITS.MAX_TEXT}
          value={textEdit.value}
          aria-label="Text (up to 500 characters). Enter to finish, Shift+Enter for a new line, Escape to cancel."
          style={{ left: textEdit.x, top: textEdit.y, fontSize: fs, fontFamily: FONT_FAMILY, color: editingObj?.color || style.color }}
          onChange={(e) => setTextEdit({ ...textEdit, value: e.target.value })}
          onKeyDown={(e) => {
            if (e.key === 'Escape') setTextEdit(null);
            else if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              commitText();
            }
          }}
          onBlur={commitText}
        />
      )}
    </div>
  );
}
