// Canvas 2D drawing of board objects. Text is drawn with fillText, so user text is never
// interpreted as HTML (SEC-REQ-005).
import { bounds, TEXT_LINE_HEIGHT, textFontSize } from './geometry.js';

export const FONT_FAMILY = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';

export function canvasMeasure(ctx) {
  return (line, fontSize) => {
    ctx.font = `${fontSize}px ${FONT_FAMILY}`;
    return ctx.measureText(line).width;
  };
}

export function drawObject(ctx, o) {
  ctx.strokeStyle = o.color;
  ctx.fillStyle = o.color;
  ctx.lineWidth = o.strokeWidth;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  switch (o.kind) {
    case 'stroke': {
      const [first, ...rest] = o.points;
      ctx.beginPath();
      if (rest.length === 0) {
        ctx.arc(first[0], first[1], o.strokeWidth / 2, 0, 2 * Math.PI);
        ctx.fill();
        return;
      }
      ctx.moveTo(first[0], first[1]);
      for (const [x, y] of rest) ctx.lineTo(x, y);
      ctx.stroke();
      return;
    }
    case 'line':
      ctx.beginPath();
      ctx.moveTo(o.x1, o.y1);
      ctx.lineTo(o.x2, o.y2);
      ctx.stroke();
      return;
    case 'rect':
      ctx.strokeRect(o.x, o.y, o.w, o.h);
      return;
    case 'ellipse':
      ctx.beginPath();
      ctx.ellipse(o.x + o.w / 2, o.y + o.h / 2, o.w / 2, o.h / 2, 0, 0, 2 * Math.PI);
      ctx.stroke();
      return;
    case 'text': {
      const fs = textFontSize(o.strokeWidth);
      ctx.font = `${fs}px ${FONT_FAMILY}`;
      ctx.textBaseline = 'top';
      o.text.split('\n').forEach((line, i) => ctx.fillText(line, o.x, o.y + i * fs * TEXT_LINE_HEIGHT));
      return;
    }
    default:
  }
}

export function drawSelection(ctx, o) {
  const b = bounds(o, canvasMeasure(ctx));
  const pad = o.strokeWidth / 2 + 4;
  ctx.save();
  ctx.setLineDash([6, 4]);
  ctx.lineWidth = 1;
  ctx.strokeStyle = '#0d6b62'; // --accent
  ctx.strokeRect(b.x - pad, b.y - pad, b.w + 2 * pad, b.h + 2 * pad);
  ctx.restore();
}

/** Draws a whole scene; `hidden` ids are not drawn (e.g. objects being dragged or erased). */
export function drawScene(ctx, width, height, objects, { hidden = new Set(), extra = [], selected = null, dim = new Set() } = {}) {
  ctx.clearRect(0, 0, width, height);
  for (const o of objects) {
    if (hidden.has(o.id)) continue;
    ctx.globalAlpha = dim.has(o.id) ? 0.3 : 1;
    drawObject(ctx, o);
  }
  ctx.globalAlpha = 1;
  for (const o of extra) drawObject(ctx, o);
  if (selected) drawSelection(ctx, selected);
}
