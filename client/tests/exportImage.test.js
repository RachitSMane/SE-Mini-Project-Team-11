// Issue #16 board export: exported area (layout preserved from the board origin), canvas size
// limits, empty boards and the download file name. The DOM part (drawing and download) is covered
// by the E2E test in e2e/boards.spec.cjs.
import { EXPORT_PADDING, exportArea, exportFileName, MAX_EXPORT_PIXELS, MAX_EXPORT_SIDE } from '../src/board/exportImage.js';

const style = { color: '#1E88E5', strokeWidth: 4 };
const rect = (x, y, w, h, extra = {}) => ({ id: `r${x}${y}`, kind: 'rect', x, y, w, h, ...style, ...extra });

test('empty or missing object lists have nothing to export', () => {
  expect(exportArea([])).toBeNull();
  expect(exportArea(undefined)).toBeNull();
});

test('the area starts at the board origin so objects keep their on-screen positions', () => {
  const a = exportArea([rect(100, 50, 200, 80)]);
  expect(a).toMatchObject({ x: 0, y: 0, scale: 1 });
  // right/bottom edge = outline + half the stroke width + padding
  expect(a.width).toBe(Math.ceil(300 + 2 + EXPORT_PADDING));
  expect(a.height).toBe(Math.ceil(130 + 2 + EXPORT_PADDING));
  expect([a.pixelWidth, a.pixelHeight]).toEqual([a.width, a.height]);
});

test('every object kind is inside the exported area', () => {
  const objs = [
    { id: 's', kind: 'stroke', points: [[10, 10], [400, 30]], ...style },
    { id: 'l', kind: 'line', x1: 5, y1: 500, x2: 50, y2: 20, ...style },
    { id: 'e', kind: 'ellipse', x: 600, y: 100, w: 100, h: 50, ...style },
    { id: 't', kind: 'text', x: 20, y: 700, text: 'Sprint plan', ...style },
  ];
  const a = exportArea(objs);
  expect(a.width).toBeGreaterThanOrEqual(700 + EXPORT_PADDING);
  expect(a.height).toBeGreaterThanOrEqual(700 + EXPORT_PADDING); // text box extends below y = 700
});

test('objects at negative coordinates extend the area left and up (nothing is cut off)', () => {
  const a = exportArea([rect(-150, -40, 100, 100)]);
  expect(a.x).toBeLessThanOrEqual(-150 - 2 - EXPORT_PADDING + 1);
  expect(a.y).toBeLessThanOrEqual(-40 - 2 - EXPORT_PADDING + 1);
  expect(a.x + a.width).toBeGreaterThanOrEqual(EXPORT_PADDING);
});

test('very large boards are scaled down to stay inside browser canvas limits', () => {
  const a = exportArea([rect(0, 0, 900_000, 1000)]);
  expect(a.scale).toBeLessThan(1);
  expect(a.pixelWidth).toBeLessThanOrEqual(MAX_EXPORT_SIDE);
  const b = exportArea([rect(0, 0, 8000, 8000)]);
  expect(b.pixelWidth * b.pixelHeight).toBeLessThanOrEqual(MAX_EXPORT_PIXELS);
});

test('file name: board title made safe, plus the date', () => {
  const d = new Date(2026, 9, 31);
  expect(exportFileName('Sprint planning', d)).toBe('sprint-planning-2026-10-31.png');
  expect(exportFileName('  Q4 / roadmap: v2?  ', d)).toBe('q4-roadmap-v2-2026-10-31.png');
  expect(exportFileName('../../etc/passwd', d)).toBe('etcpasswd-2026-10-31.png');
  expect(exportFileName('<script>', d)).toBe('script-2026-10-31.png');
  expect(exportFileName('', d)).toBe('board-2026-10-31.png');
  expect(exportFileName('!!!', d)).toBe('board-2026-10-31.png');
  expect(exportFileName('x'.repeat(100), d)).toBe(`${'x'.repeat(60)}-2026-10-31.png`);
});
