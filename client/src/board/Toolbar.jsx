// Toolbar (FR-001 to FR-006, NFR-007): every control is a native button or input with an accessible
// name and a tooltip, reachable with Tab and activated with Enter/Space. Tools are grouped as
// selection, freehand, shapes and text; colour and width follow as the properties of new objects
// (and of the selected object with the Select tool).
import { Fragment, useCallback, useEffect, useState } from 'react';
import { LIMITS, PRESET_COLORS } from '@wb/shared/objects';
import { Icon } from '../icons.jsx';
import { parseColor, parseStrokeWidth } from './geometry.js';

export const TOOLS = [
  { id: 'select', label: 'Select', key: 'V', group: 0, hint: 'Select, move (drag), restyle or delete (Delete key) one object; double-click text to edit' },
  { id: 'pen', label: 'Pen', key: 'P', group: 1, hint: 'Draw freehand' },
  { id: 'eraser', label: 'Eraser', key: 'E', group: 1, hint: 'Delete every object the eraser touches' },
  { id: 'rect', label: 'Rectangle', key: 'R', group: 2, hint: 'Drag to draw a rectangle' },
  { id: 'ellipse', label: 'Ellipse', key: 'O', group: 2, hint: 'Drag to draw an ellipse' },
  { id: 'line', label: 'Line', key: 'L', group: 2, hint: 'Drag to draw a straight line' },
  { id: 'text', label: 'Text', key: 'T', group: 3, hint: 'Click to add text (up to 500 characters)' },
];
const GROUP_LABEL = ['Selection', 'Freehand', 'Shapes', 'Text'];
const COLOUR_NAME = { '#000000': 'Black', '#D32F2F': 'Red', '#FB8C00': 'Orange', '#FDD835': 'Yellow', '#43A047': 'Green', '#1E88E5': 'Blue', '#8E24AA': 'Purple', '#FFFFFF': 'White' };

/** Tooltip state for toolbar controls: shown on hover and on keyboard focus, beside the control. */
function useTooltip() {
  const [tip, setTip] = useState(null);
  const hide = useCallback(() => setTip(null), []);
  const show = (e, title, body, key) => {
    const r = e.currentTarget.getBoundingClientRect();
    setTip({ title, body, key, top: r.top + r.height / 2, left: r.right + 10 });
  };
  const bind = (title, body, key) => ({
    onMouseEnter: (e) => show(e, title, body, key),
    onFocus: (e) => {
      if (e.target.matches(':focus-visible')) show(e, title, body, key);
    },
    onMouseLeave: () => setTip(null),
    onBlur: () => setTip(null),
    onPointerDown: () => setTip(null),
  });
  const node = tip && (
    <div className="tooltip" style={{ top: tip.top, left: tip.left }} aria-hidden="true">
      <span className="tooltip-head">
        <strong>{tip.title}</strong>
        {tip.key && <kbd>{tip.key}</kbd>}
      </span>
      {tip.body && <span className="tooltip-body">{tip.body}</span>}
    </div>
  );
  return { bind, node, hide };
}

export default function Toolbar({ tool, setTool, style, setStyle, editable, disabledReason, selected, onDeleteSelected }) {
  const [widthInput, setWidthInput] = useState(String(style.strokeWidth));
  useEffect(() => setWidthInput(String(style.strokeWidth)), [style.strokeWidth]);
  const widthValid = parseStrokeWidth(widthInput) !== null;
  const { bind, node: tooltip, hide } = useTooltip();
  // Disabled controls receive no mouseleave/blur, so a role or connection change closes the tooltip.
  useEffect(() => {
    hide();
  }, [editable, hide]);
  const isPreset = PRESET_COLORS.includes(style.color);
  const widthTip = bind('Stroke width', '1–20 px; also sets the text size', null);
  const stepWidth = (d) => {
    const n = Math.min(LIMITS.MAX_STROKE_WIDTH, Math.max(LIMITS.MIN_STROKE_WIDTH, style.strokeWidth + d));
    if (n !== style.strokeWidth) setStyle({ ...style, strokeWidth: n });
    setWidthInput(String(n));
    // At a limit the step button becomes disabled and receives no mouseleave/blur, so close its tooltip.
    if (n === LIMITS.MIN_STROKE_WIDTH || n === LIMITS.MAX_STROKE_WIDTH) hide();
  };

  const groups = GROUP_LABEL.map((label, g) => ({ label, tools: TOOLS.filter((t) => t.group === g) }));

  return (
    <nav className="toolbar" aria-label="Drawing tools">
      <div className="tools" role="group" aria-label="Tools">
        {groups.map((grp, i) => (
          <Fragment key={grp.label}>
            {i > 0 && <span className="tool-sep" aria-hidden="true" />}
            <div className="tool-group" role="group" aria-label={grp.label}>
              {grp.tools.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  className={`tool${tool === t.id ? ' active' : ''}`}
                  aria-pressed={tool === t.id}
                  aria-label={t.label}
                  aria-keyshortcuts={t.key}
                  title={editable ? undefined : disabledReason}
                  disabled={!editable}
                  onClick={() => setTool(t.id)}
                  data-testid={`tool-${t.id}`}
                  {...bind(t.label, t.hint, t.key)}
                >
                  <Icon name={t.id} />
                </button>
              ))}
            </div>
          </Fragment>
        ))}
        {selected && editable && (
          <>
            <span className="tool-sep" aria-hidden="true" />
            <button type="button" className="tool tool-danger" onClick={onDeleteSelected} aria-label="Delete selected" {...bind('Delete selected', 'Remove the selected object for everyone', 'Del')}>
              <Icon name="trash" />
            </button>
          </>
        )}
      </div>

      <div className="props">
        <fieldset className="colours" disabled={!editable} title={editable ? undefined : disabledReason}>
          <legend className="sr-only">Colour</legend>
          <div className="swatches">
            {PRESET_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                className={`swatch${style.color === c ? ' active' : ''}${c === '#FFFFFF' ? ' light' : ''}`}
                style={{ '--swatch': c }}
                aria-label={`Colour ${c}`}
                aria-pressed={style.color === c}
                onClick={() => setStyle({ ...style, color: c })}
                {...bind(COLOUR_NAME[c] || c, c, null)}
              />
            ))}
            <label
              className={`swatch custom${isPreset ? '' : ' active'}`}
              style={isPreset ? undefined : { '--swatch': style.color }}
              {...bind('Custom colour', isPreset ? 'Pick any colour' : `Current: ${style.color}`, null)}
            >
              <span className="sr-only">Custom colour</span>
              <input
                type="color"
                value={style.color.toLowerCase()}
                onChange={(e) => {
                  const c = parseColor(e.target.value);
                  if (c) setStyle({ ...style, color: c });
                }}
              />
            </label>
          </div>
        </fieldset>

        <span className="tool-sep" aria-hidden="true" />

        <fieldset className="width" disabled={!editable} title={editable ? undefined : disabledReason}>
          <legend className="sr-only">Width</legend>
          <span className="width-preview" aria-hidden="true">
            <span style={{ width: Math.max(2, style.strokeWidth), height: Math.max(2, style.strokeWidth), background: style.color }} />
          </span>
          <button type="button" className="step" aria-label="Increase stroke width" onClick={() => stepWidth(1)} disabled={!editable || style.strokeWidth >= LIMITS.MAX_STROKE_WIDTH} {...bind('Increase stroke width', 'Up to 20 px', null)}>
            <Icon name="plus" size={14} />
          </button>
          <input
            type="number"
            min={1}
            max={20}
            step={1}
            value={widthInput}
            aria-label="Stroke width in pixels, 1 to 20"
            aria-invalid={!widthValid}
            data-testid="stroke-width"
            onChange={(e) => {
              setWidthInput(e.target.value);
              const n = parseStrokeWidth(e.target.value);
              if (n !== null) setStyle({ ...style, strokeWidth: n });
            }}
            {...widthTip}
            onBlur={() => {
              widthTip.onBlur();
              setWidthInput(String(style.strokeWidth));
            }}
          />
          <button type="button" className="step" aria-label="Decrease stroke width" onClick={() => stepWidth(-1)} disabled={!editable || style.strokeWidth <= LIMITS.MIN_STROKE_WIDTH} {...bind('Decrease stroke width', 'Down to 1 px', null)}>
            <Icon name="minus" size={14} />
          </button>
          {!widthValid && <span className="field-error">1–20</span>}
        </fieldset>
      </div>
      {tooltip}
    </nav>
  );
}
