// COMP-01 canvas geometry: FR-002 (controls), FR-003 (shapes from drags), FR-005 (selection),
// FR-006 (eraser touches whole objects), D1c (stroke point limit).
import {
  addStrokePoint,
  bounds,
  hitTest,
  parseColor,
  parseStrokeWidth,
  shapeFromDrag,
  touchedBySegment,
} from '../src/board/geometry.js';

const style = { color: '#D32F2F', strokeWidth: 8 };

test('shapes from drags: bounding box / end points equal the drag start and end (FR-003)', () => {
  expect(shapeFromDrag('rect', { x: 100, y: 80 }, { x: 40, y: 200 }, style, 'r')).toEqual({ id: 'r', kind: 'rect', x: 40, y: 80, w: 60, h: 120, ...style });
  expect(shapeFromDrag('ellipse', { x: 1.04, y: 2 }, { x: 3, y: 4.06 }, style, 'e')).toMatchObject({ x: 1, y: 2, w: 2, h: 2.1 });
  expect(shapeFromDrag('line', { x: 5, y: 6 }, { x: 7, y: 8 }, style, 'l')).toEqual({ id: 'l', kind: 'line', x1: 5, y1: 6, x2: 7, y2: 8, ...style });
});

test('width control accepts 1–20 only; colour control accepts #RRGGBB only (FR-002)', () => {
  expect([1, 8, 20].map(parseStrokeWidth)).toEqual([1, 8, 20]);
  expect([0, 21, -1, 2.5, '', 'abc', '1e1'].map(parseStrokeWidth)).toEqual([null, null, null, null, null, null, null]);
  expect(parseColor('#d32f2f')).toBe('#D32F2F');
  expect(parseColor('red')).toBeNull();
  expect(parseColor('#12345')).toBeNull();
});

test('stroke capture skips tiny moves and stops at 2,000 points (D1c)', () => {
  const pts = [];
  addStrokePoint(pts, 0, 0);
  addStrokePoint(pts, 0.5, 0.5);
  expect(pts).toEqual([[0, 0]]);
  let more = true;
  for (let i = 1; more; i += 1) more = addStrokePoint(pts, i * 2, 0);
  expect(pts).toHaveLength(2000);
  expect(addStrokePoint(pts, 1e5, 0)).toBe(false);
  expect(pts).toHaveLength(2000);
});

describe('selection and eraser', () => {
  const s1 = { id: 's1', kind: 'stroke', points: [[0, 100], [100, 100]], color: '#000000', strokeWidth: 2 };
  const s2 = { id: 's2', kind: 'stroke', points: [[0, 300], [100, 300]], color: '#000000', strokeWidth: 2 };
  const t = { id: 't', kind: 'text', x: 200, y: 90, text: 'Sprint plan', color: '#000000', strokeWidth: 1 };
  const r = { id: 'r', kind: 'rect', x: 400, y: 0, w: 100, h: 100, color: '#000000', strokeWidth: 2 };
  const e = { id: 'e', kind: 'ellipse', x: 600, y: 0, w: 100, h: 50, color: '#000000', strokeWidth: 2 };
  const objects = [s1, s2, t, r, e];

  test('eraser path across S1 and T touches exactly those two (TC-004)', () => {
    expect(touchedBySegment(objects, 50, 95, 260, 95).sort()).toEqual(['s1', 't']);
  });

  test('eraser through the empty middle of a rectangle does not touch it; its edge does', () => {
    expect(touchedBySegment([r], 440, 50, 460, 50)).toEqual([]);
    expect(touchedBySegment([r], 395, 50, 405, 50)).toEqual(['r']);
    expect(touchedBySegment([e], 650, 25, 651, 25)).toEqual([]);
    expect(touchedBySegment([e], 600, 25, 601, 25)).toEqual(['e']);
  });

  test('select picks the topmost object under the pointer, including inside shapes', () => {
    const over = { ...r, id: 'r2', x: 450 };
    expect(hitTest([...objects, over], 470, 50).id).toBe('r2');
    expect(hitTest(objects, 450, 50).id).toBe('r');
    expect(hitTest(objects, 50, 102).id).toBe('s1');
    expect(hitTest(objects, 50, 200)).toBeNull();
  });

  test('bounds of every kind', () => {
    expect(bounds(s1)).toEqual({ x: 0, y: 100, w: 100, h: 0 });
    expect(bounds({ kind: 'line', x1: 10, y1: 5, x2: 0, y2: 0 })).toEqual({ x: 0, y: 0, w: 10, h: 5 });
    const tb = bounds(t);
    expect(tb.x).toBe(200);
    expect(tb.w).toBeGreaterThan(0);
  });
});
