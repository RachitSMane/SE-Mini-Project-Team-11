<!-- Owner: Prithvi | Reviewers: Krishna | Status: v1.0 -->

## 3. External interface requirements

### 3.1 User interfaces

- **Board view:** a canvas occupying most of the window; a toolbar with pen, eraser, select, rectangle, ellipse, line and text tools and colour and stroke-width controls; a participant panel; a version-history panel; the user's role and the connection status always visible (NFR-007).
- **Role-aware controls:** tools that the user's role does not permit are hidden or disabled (e.g. drawing tools for Viewers; Clear board, Share and Restore for non-Owners). Disabled controls are a convenience only; enforcement is on the server (SEC-REQ-003).
- **Dashboard:** list of the user's boards with title, role and last-modified time; actions to create, open and (for Owners) delete a board.
- **Sharing dialog (Owner):** create a link by choosing a role and an expiry; list active links with role and expiry; revoke a link.
- **Members dialog (Owner):** list members with roles; change role, remove member, transfer ownership to an Editor or Viewer member after a confirmation dialog (FR-049, FR-050).
- **Guest entry page:** shown when a share link is opened without login; asks for a display name or offers login.
- **Messages:** confirmation dialogs for destructive actions (clear board, delete board, restore version, revoke link, transfer ownership); clear error messages for rejected actions, a full board (FR-008), expired or revoked links, and lost connection.
- **Accessibility:** all toolbar controls have text labels or tooltips and can be reached and activated with the keyboard (NFR-007).
- **Viewport:** the board view is usable at a browser viewport width of 1280 px or more without horizontally cut-off controls (NFR-006).

### 3.2 Hardware interfaces

No special hardware is required. The client uses the standard pointer device (mouse, touchpad or
pen tablet acting as a mouse) and keyboard of the user's computer.

### 3.3 Software interfaces

- **Web browser:** the client runs in a supported browser (NFR-006) and uses its HTML canvas, WebSocket and HTTP capabilities.
- **Client–server request interface:** an HTTP request/response interface for accounts, boards, members, share links and version history (specified in SAD §4.3, API-02 and API-03).
- **Client–server real-time interface:** a persistent bidirectional connection for board operations, presence and restore notifications (specified in SAD §4.3, API-01).
- **Database:** the server stores all persistent data in a database (MongoDB, SAD §3.6). No other external software system is integrated.

### 3.4 Communications interfaces

- All client–server traffic in a deployed system uses HTTPS and secure WebSockets (TLS 1.2 or later) (SEC-REQ-007).
- Every request and real-time connection carries either a session token (registered users) or a share-link-derived guest token (guests) (SEC-REQ-002).
- Real-time messages are JSON objects; the maximum size of one message is 64 KiB (65,536 bytes per Socket.IO packet) (SEC-REQ-005). This limit is separate from the board content limit of FR-008.
- When the real-time connection drops, the client retries automatically and resynchronises on reconnection (FR-025).
