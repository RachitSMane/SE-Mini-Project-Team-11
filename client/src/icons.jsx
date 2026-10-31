// Inline SVG icons (20 × 20 grid, 1.5 px strokes, currentColor). Kept local so the client needs no
// icon dependency. Icons are decorative: every control that shows one also has a text label or an
// aria-label, so the SVG is hidden from assistive technology.
const PATHS = {
  select: <path d="M5 3.5l10.5 5.6-4.6 1.3-2 4.6L5 3.5z" strokeLinejoin="round" />,
  pen: (
    <>
      <path d="M13.6 3.4l3 3L7 16H4v-3l9.6-9.6z" strokeLinejoin="round" />
      <path d="M11.6 5.4l3 3" />
    </>
  ),
  eraser: (
    <>
      <path d="M8.2 15.5l-4.3-4.3a1.4 1.4 0 010-2l6.3-6.3a1.4 1.4 0 012 0l4.3 4.3a1.4 1.4 0 010 2l-6.3 6.3" strokeLinejoin="round" />
      <path d="M7 7.6l5.4 5.4M8.2 15.5H16.5" />
    </>
  ),
  rect: <rect x="3.5" y="5" width="13" height="10" rx="1" />,
  ellipse: <ellipse cx="10" cy="10" rx="7" ry="5.25" />,
  line: <path d="M4.5 15.5l11-11" />,
  text: <path d="M4.5 5.5V4h11v1.5M10 4v12M7.5 16h5" />,
  trash: <path d="M4 6h12M8 6V4.5h4V6M5.6 6l.6 9.1a1 1 0 001 .9h5.6a1 1 0 001-.9L14.4 6M8.5 9v4.5M11.5 9v4.5" />,
  link: (
    <path d="M8.6 11.4a3 3 0 004.2 0l2.4-2.4a3 3 0 00-4.2-4.2l-.8.8M11.4 8.6a3 3 0 00-4.2 0L4.8 11a3 3 0 004.2 4.2l.8-.8" />
  ),
  users: (
    <>
      <circle cx="8" cy="7" r="2.75" />
      <path d="M3 16c.6-2.5 2.6-4 5-4s4.4 1.5 5 4M13.2 4.5a2.6 2.6 0 010 5M14.6 12.3c1.2.5 2 1.6 2.4 3.7" />
    </>
  ),
  logout: <path d="M8 4H5.2a1 1 0 00-1 1v10a1 1 0 001 1H8M12 13.5L15.5 10 12 6.5M15.5 10H8" />,
  plus: <path d="M10 4.5v11M4.5 10h11" />,
  minus: <path d="M4.5 10h11" />,
  panel: (
    <>
      <rect x="3" y="4" width="14" height="12" rx="1.75" />
      <path d="M12 4v12" />
    </>
  ),
  chevronLeft: <path d="M12 5l-5 5 5 5" strokeLinejoin="round" />,
  close: <path d="M5.5 5.5l9 9M14.5 5.5l-9 9" />,
  copy: (
    <>
      <rect x="7" y="7" width="9" height="9" rx="1.5" />
      <path d="M13 7V5.5A1.5 1.5 0 0011.5 4h-6A1.5 1.5 0 004 5.5v6A1.5 1.5 0 005.5 13H7" />
    </>
  ),
  check: <path d="M4.5 10.5l3.5 3.5 7.5-8" />,
  alert: (
    <>
      <path d="M10 3.5l7 12.5H3L10 3.5z" strokeLinejoin="round" />
      <path d="M10 8.5v3.2M10 13.9v.1" />
    </>
  ),
  history: (
    <>
      <circle cx="10" cy="10" r="6.5" />
      <path d="M10 6.5V10l2.5 1.6" />
    </>
  ),
};

export function Icon({ name, size = 20 }) {
  return (
    <svg
      className="icon"
      width={size}
      height={size}
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      aria-hidden="true"
      focusable="false"
    >
      {PATHS[name]}
    </svg>
  );
}

/** Product mark used on the account pages, the dashboard header and (mark only) the board header. */
export function Logo({ markOnly = false }) {
  return (
    <span className="logo">
      <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden="true" focusable="false">
        <rect x="1" y="1" width="20" height="20" rx="5" fill="var(--accent)" />
        <path d="M6 14.5c1.6-4.5 3.4-6.5 4.6-5.2 1.1 1.2-.9 4.6.6 4.9 1.2.3 2.3-2.2 4.8-6.2" fill="none" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {!markOnly && <span className="logo-text">Whiteboard</span>}
    </span>
  );
}
