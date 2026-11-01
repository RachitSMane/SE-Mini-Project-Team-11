// Pure geometry for the board canvas (COMP-01): bounds, hit testing for select and eraser,
// shapes from drags and stroke point capture. No DOM access, so it is unit-tested in Node.
import { LIMITS } from '@wb/shared/objects';

export const round1 = (v) => Math.round(v * 10) / 10;

/** Font size of a text object: its stroke width (1–20) selects the size. */
export const textFontSize = (strokeWidth) => 10 + 2 * strokeWidth;
export const TEXT_LINE_HEIGHT = 1.25;

/** Approximate text width; the canvas passes ctx.measureText-based measurement instead. */
export const approxMeasure = (line, fontSize) => [...line].length * fontSize * 0.6;

export function bounds(obj, measure = approxMeasure) {
  switch (obj.kind) {
    case 'stroke': {
      const xs = obj.points.map((p) => p[0]);
      const ys = obj.points.map((p) => p[1]);
      const x = Math.min(...xs);
      const y = Math.min(...ys);
      return { x, y, w: Math.max(...xs) - x, h: Math.max(...ys) - y };
    }
    case 'line':
      return { x: Math.min(obj.x1, obj.x2), y: Math.min(obj.y1, obj.y2), w: Math.abs(obj.x2 - obj.x1), h: Math.abs(obj.y2 - obj.y1) };
    case 'rect':
    case 'ellipse':
      return { x: obj.x, y: obj.y, w: obj.w, h: obj.h };
    case 'text': {
      const fs = textFontSize(obj.strokeWidth);
      const lines = obj.text.split('\n');
      return { x: obj.x, y: obj.y, w: Math.max(...lines.map((l) => measure(l, fs))), h: lines.length * fs * TEXT_LINE_HEIGHT };
    }
    default:
      return { x: 0, y: 0, w: 0, h: 0 };
  }
}

export function distToSegment(px, py, ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  const len2 = dx * dx + dy * dy;
  const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len2));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

function distToBox(px, py, b) {
  const dx = Math.max(b.x - px, 0, px - (b.x + b.w));
  const dy = Math.max(b.y - py, 0, py - (b.y + b.h));
  return Math.hypot(dx, dy);
}

/** Distance from (px, py) to the drawn outline of an object (0 inside a text box). */
export function distanceToOutline(obj, px, py, measure = approxMeasure) {
  switch (obj.kind) {
    case 'stroke': {
      const pts = obj.points;
      if (pts.length === 1) return Math.hypot(px - pts[0][0], py - pts[0][1]);
      let d = Infinity;
      for (let i = 1; i < pts.length; i += 1) d = Math.min(d, distToSegment(px, py, pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1]));
      return d;
    }
    case 'line':
      return distToSegment(px, py, obj.x1, obj.y1, obj.x2, obj.y2);
    case 'rect': {
      const { x, y, w, h } = obj;
      return Math.min(
        distToSegment(px, py, x, y, x + w, y),
        distToSegment(px, py, x + w, y, x + w, y + h),
        distToSegment(px, py, x + w, y + h, x, y + h),
        distToSegment(px, py, x, y + h, x, y),
      );
    }
    case 'ellipse': {
      const rx = obj.w / 2;
      const ry = obj.h / 2;
      if (rx === 0 || ry === 0) return distToSegment(px, py, obj.x, obj.y, obj.x + obj.w, obj.y + obj.h);
      const cx = obj.x + rx;
      const cy = obj.y + ry;
      // Distance to the nearest of 64 points on the outline (accurate to well under 1 px here).
      let d = Infinity;
      for (let i = 0; i < 64; i += 1) {
        const a = (i / 64) * 2 * Math.PI;
        d = Math.min(d, Math.hypot(px - (cx + rx * Math.cos(a)), py - (cy + ry * Math.sin(a))));
      }
      return d;
    }
    case 'text':
      return distToBox(px, py, bounds(obj, measure));
    default:
      return Infinity;
  }
}

/** Topmost object under the pointer for the select tool: inside the bounds or near the outline. */
export function hitTest(objects, px, py, tolerance = 6, measure = approxMeasure) {
  for (let i = objects.length - 1; i >= 0; i -= 1) {
    const o = objects[i];
    const near = distanceToOutline(o, px, py, measure) <= tolerance + o.strokeWidth / 2;
    const inside = (o.kind === 'rect' || o.kind === 'ellipse' || o.kind === 'text') && distToBox(px, py, bounds(o, measure)) === 0;
    if (near || inside) return o;
  }
  return null;
}

/** IDs of every whole object the eraser segment (a)–(b) with the given radius touches (FR-006). */
export function touchedBySegment(objects, ax, ay, bx, by, radius = 8, measure = approxMeasure) {
  const steps = Math.max(1, Math.ceil(Math.hypot(bx - ax, by - ay) / (radius / 2)));
  const out = [];
  for (const o of objects) {
    for (let s = 0; s <= steps; s += 1) {
      const px = ax + ((bx - ax) * s) / steps;
      const py = ay + ((by - ay) * s) / steps;
      if (distanceToOutline(o, px, py, measure) <= radius + o.strokeWidth / 2) {
        out.push(o.id);
        break;
      }
    }
  }
  return out;
}

/** Rectangle, ellipse or line whose bounding box / end points equal the drag (FR-003). */
export function shapeFromDrag(kind, start, end, style, id) {
  const base = { id, kind, color: style.color, strokeWidth: style.strokeWidth };
  if (kind === 'line') return { ...base, x1: round1(start.x), y1: round1(start.y), x2: round1(end.x), y2: round1(end.y) };
  return {
    ...base,
    x: round1(Math.min(start.x, end.x)),
    y: round1(Math.min(start.y, end.y)),
    w: round1(Math.abs(end.x - start.x)),
    h: round1(Math.abs(end.y - start.y)),
  };
}

/**
 * Appends a pointer position to a stroke being drawn. Points closer than `minDist` to the last
 * one are skipped; returns false once the stroke has reached the 2,000-point limit (D1c).
 */
export function addStrokePoint(points, x, y, minDist = 1.5) {
  if (points.length >= LIMITS.MAX_POINTS) return false;
  const last = points[points.length - 1];
  if (last && Math.hypot(x - last[0], y - last[1]) < minDist) return true;
  points.push([round1(x), round1(y)]);
  return points.length < LIMITS.MAX_POINTS;
}

/** Stroke width control value: integer 1–20, otherwise null (not accepted, FR-002). */
export function parseStrokeWidth(value) {
  if (!/^\d{1,2}$/.test(String(value).trim())) return null;
  const n = Number(value);
  return n >= LIMITS.MIN_STROKE_WIDTH && n <= LIMITS.MAX_STROKE_WIDTH ? n : null;
}

/** Colour control value: #RRGGBB (upper-cased), otherwise null. */
export function parseColor(value) {
  return /^#[0-9A-Fa-f]{6}$/.test(value) ? value.toUpperCase() : null;
}

/**
 * New object id (issue #15): a random RFC 4122 version-4 UUID, which matches the server's object id
 * rule (validation.js: 1–64 of A–Z a–z 0–9 _ -).
 * crypto.randomUUID() exists only in secure contexts (HTTPS or localhost). When the app is opened over
 * plain HTTP from another device on the local network (e.g. http://192.168.1.20:5173 to test Safari on
 * a Mac or phone) it is undefined and every drawing gesture would throw. crypto.getRandomValues() is
 * available in every context, so the UUID is built from it in that case.
 * @param {Crypto} [c] Web Crypto implementation (a parameter so the fallback can be unit-tested)
 */
export function newObjectId(c = globalThis.crypto) {
  if (typeof c?.randomUUID === 'function') return c.randomUUID();
  const b = new Uint8Array(16);
  if (typeof c?.getRandomValues === 'function') c.getRandomValues(b);
  else for (let i = 0; i < 16; i += 1) b[i] = Math.floor(Math.random() * 256); // no Web Crypto at all
  b[6] = (b[6] & 0x0f) | 0x40; // version 4
  b[8] = (b[8] & 0x3f) | 0x80; // RFC 4122 variant
  const hex = [...b].map((x) => x.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
