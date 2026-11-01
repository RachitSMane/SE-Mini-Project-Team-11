// Board export (issue #16): renders the board content to a PNG image and downloads it.
// The image uses the same drawing code as the board canvas (render.js) and keeps the board's
// coordinate system: it starts at the board origin (0, 0), so every object appears at the same
// position as on screen, and extends left/up only if objects lie at negative coordinates.
import { approxMeasure, bounds } from './geometry.js';
import { canvasMeasure, drawObject } from './render.js';

export const EXPORT_PADDING = 20; // px of white space around the content
export const EXPORT_BACKGROUND = '#FFFFFF';
// Browsers refuse or silently blank very large canvases; stay well inside their limits.
export const MAX_EXPORT_SIDE = 8192;
export const MAX_EXPORT_PIXELS = 32_000_000;

export class ExportError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}

/**
 * Board-coordinate rectangle to export and the scale that keeps it inside the canvas limits.
 * Returns null for an empty board. Pure (no DOM): `measure` measures text width.
 */
export function exportArea(objects, measure = approxMeasure) {
  if (!objects || objects.length === 0) return null;
  let minX = 0;
  let minY = 0;
  let maxX = 0;
  let maxY = 0;
  for (const o of objects) {
    const b = bounds(o, measure);
    const half = (o.strokeWidth || 1) / 2; // strokes are drawn centred on the outline
    minX = Math.min(minX, b.x - half);
    minY = Math.min(minY, b.y - half);
    maxX = Math.max(maxX, b.x + b.w + half);
    maxY = Math.max(maxY, b.y + b.h + half);
  }
  const x = minX < 0 ? Math.floor(minX - EXPORT_PADDING) : 0;
  const y = minY < 0 ? Math.floor(minY - EXPORT_PADDING) : 0;
  const width = Math.max(1, Math.ceil(maxX + EXPORT_PADDING - x));
  const height = Math.max(1, Math.ceil(maxY + EXPORT_PADDING - y));
  const scale = Math.min(1, MAX_EXPORT_SIDE / width, MAX_EXPORT_SIDE / height, Math.sqrt(MAX_EXPORT_PIXELS / (width * height)));
  return { x, y, width, height, scale, pixelWidth: Math.max(1, Math.floor(width * scale)), pixelHeight: Math.max(1, Math.floor(height * scale)) };
}

/** File name from the board title: safe characters only, plus the export date (YYYY-MM-DD). */
export function exportFileName(title, date = new Date()) {
  const base =
    String(title ?? '')
      .normalize('NFKD')
      .replace(/[^\w\s-]+/g, '')
      .trim()
      .replace(/[\s_]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 60)
      .toLowerCase() || 'board';
  const pad = (n) => String(n).padStart(2, '0');
  return `${base}-${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}.png`;
}

/** Draws the objects on a new canvas (white background). Throws ExportError('EMPTY') for no objects. */
export function renderBoardImage(objects, doc = document) {
  const canvas = doc.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new ExportError('EXPORT_FAILED', 'Your browser could not create the image.');
  const area = exportArea(objects, canvasMeasure(ctx));
  if (!area) throw new ExportError('EMPTY', 'This board is empty: there is nothing to export.');
  canvas.width = area.pixelWidth;
  canvas.height = area.pixelHeight;
  ctx.fillStyle = EXPORT_BACKGROUND;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.setTransform(area.scale, 0, 0, area.scale, -area.x * area.scale, -area.y * area.scale);
  for (const o of objects) drawObject(ctx, o);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  return { canvas, area };
}

function canvasToPngBlob(canvas) {
  return new Promise((resolve, reject) => {
    try {
      canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new ExportError('EXPORT_FAILED', 'The image could not be created.'))), 'image/png');
    } catch {
      reject(new ExportError('EXPORT_FAILED', 'The image could not be created.'));
    }
  });
}

/** Renders the board and starts the download of `<title>-<date>.png`. Resolves with {fileName, width, height}. */
export async function downloadBoardPng(objects, title, doc = document) {
  const { canvas } = renderBoardImage(objects, doc);
  const blob = await canvasToPngBlob(canvas);
  const fileName = exportFileName(title);
  const url = URL.createObjectURL(blob);
  try {
    const a = doc.createElement('a');
    a.href = url;
    a.download = fileName;
    a.rel = 'noopener';
    a.style.display = 'none';
    doc.body.appendChild(a);
    a.click();
    a.remove();
  } finally {
    // Revoke after the browser has started the download.
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
  }
  return { fileName, width: canvas.width, height: canvas.height };
}
