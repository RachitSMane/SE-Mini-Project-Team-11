// Board object model and operation semantics shared by the server (COMP-06), the browser
// client (COMP-01/02) and the scripted test clients (SAD §4.1.1).

export const LIMITS = Object.freeze({
  MAX_POINTS: 2000, // D1c
  MAX_TEXT: 500, // FR-004
  MIN_STROKE_WIDTH: 1, // FR-002, D1a
  MAX_STROKE_WIDTH: 20,
  MAX_TITLE: 100, // FR-042
  MAX_DISPLAY_NAME: 30, // FR-040, D4c
  MIN_PASSWORD: 8, // SEC-REQ-001, D8a
  MAX_PASSWORD: 72,
  MAX_COORD: 1_000_000,
  BOARD_CONTENT_LIMIT: 15_728_640, // FR-008, D11c (M3)
  MAX_MESSAGE_BYTES: 65_536, // SEC-REQ-005, D8d (M1)
  VERSION_DOC_LIMIT: 16_711_680, // D11b (M4 defensive threshold)
  OPS_PER_SECOND: 30, // SEC-REQ-006
});

export const KINDS = Object.freeze(['stroke', 'rect', 'ellipse', 'line', 'text']);

/** Kind-specific geometry properties. `color` and `strokeWidth` apply to every kind. */
export const GEOMETRY = Object.freeze({
  stroke: ['points'],
  rect: ['x', 'y', 'w', 'h'],
  ellipse: ['x', 'y', 'w', 'h'],
  line: ['x1', 'y1', 'x2', 'y2'],
  text: ['x', 'y', 'text'],
});

export const OP_TYPES = Object.freeze(['object:add', 'object:update', 'object:delete', 'board:clear']);

export const PRESET_COLORS = Object.freeze([
  '#000000', '#D32F2F', '#FB8C00', '#FDD835', '#43A047', '#1E88E5', '#8E24AA', '#FFFFFF',
]);

/** Properties an `object:update` may change for an object of the given kind. */
export function updatableProps(kind) {
  return [...(GEOMETRY[kind] || []), 'color', 'strokeWidth'];
}

/** Snapshot form of an object: only `id`, `kind`, geometry, `color`, `strokeWidth`, `text`. */
export function snapshotForm(obj) {
  const out = { id: obj.id, kind: obj.kind };
  for (const p of GEOMETRY[obj.kind] || []) if (obj[p] !== undefined) out[p] = obj[p];
  out.color = obj.color;
  out.strokeWidth = obj.strokeWidth;
  return out;
}

/**
 * Apply one accepted operation to a Map(id -> object). Objects are treated as immutable:
 * updates replace the map entry with a new object. Returns false when an update or delete
 * targets a missing object (the server rejects those before they are sequenced).
 */
export function applyOperation(objects, type, payload) {
  switch (type) {
    case 'object:add':
      objects.set(payload.id, { ...payload });
      return true;
    case 'object:update': {
      const current = objects.get(payload.id);
      if (!current) return false;
      objects.set(payload.id, { ...current, ...payload });
      return true;
    }
    case 'object:delete':
      return objects.delete(payload.id);
    case 'board:clear':
      objects.clear();
      return true;
    default:
      throw new Error(`Unknown operation type ${type}`);
  }
}

/** Canonical, order-independent representation of a board state (used to compare clients). */
export function canonicalState(objects) {
  return [...objects.values()]
    .map(snapshotForm)
    .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
}

/** Translate an object by (dx, dy); returns the complete new geometry properties. */
export function translatedGeometry(obj, dx, dy) {
  const r = (v) => Math.round(v * 10) / 10;
  switch (obj.kind) {
    case 'stroke':
      return { points: obj.points.map(([x, y]) => [r(x + dx), r(y + dy)]) };
    case 'line':
      return { x1: r(obj.x1 + dx), y1: r(obj.y1 + dy), x2: r(obj.x2 + dx), y2: r(obj.y2 + dy) };
    default:
      return { x: r(obj.x + dx), y: r(obj.y + dy) };
  }
}
