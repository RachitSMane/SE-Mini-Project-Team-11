<!-- Owner: Rachit | Reviewers: Krishna, Pranav | Status: v1.0 -->

## 4. System features (detailed)

Each requirement below has a stable identifier, an acceptance criterion (AC-<Req ID>) and a
reference to the STP test case(s) that verify it. Identifiers are allocated in blocks:
FR-001–019 canvas editing, FR-020–029 real-time synchronisation, FR-030–039 version history,
FR-040–059 accounts, boards, sharing and access. Identifiers are never renumbered; a removed
requirement is marked "Withdrawn" in `docs/traceability/id-registry.md`.

"Editing roles" means the Owner and Editor roles. All operations in §4.1 are subject to the
permission matrix in FR-051 and to server-side validation (SEC-REQ-003, SEC-REQ-005).

### 4.1 Canvas editing

Description: participants with an editing role create and change board objects; every accepted
change is synchronised to all participants (§4.2).

| Req ID | Requirement (shall...) | Type | Priority | Source/Stakeholder | Acceptance criteria / Test case ref | Comments / Dependencies |
|---|---|---|---|---|---|---|
| FR-001 | The system shall let a user with an editing role draw a freehand stroke on the board with the pen tool, using the currently selected colour and stroke width. | Functional | High | Problem statement | AC-FR-001: After a pointer drag with the pen tool, one stroke object following the drag path, in the selected colour and width, appears on the board. Test: TC-001 | FR-002, FR-020 |
| FR-002 | The system shall let a user with an editing role select a stroke colour (any `#RRGGBB` value, with a palette of preset colours) and a stroke width from 1 to 20 px, and apply them to new strokes and shapes. | Functional | High | Team | AC-FR-002: Objects created after a change of colour or width use the new values; the width control does not accept values outside 1–20 px. Test: TC-001 | Values: DECISIONS.md D1a |
| FR-003 | The system shall let a user with an editing role add a rectangle, an ellipse or a straight line by dragging on the board with the corresponding tool. | Functional | High | Problem statement | AC-FR-003: Each of the three tools creates one object of the matching type whose bounding box or end points equal the drag start and end points. Test: TC-002 | FR-002 |
| FR-004 | The system shall let a user with an editing role add a text object at a chosen position and edit its text, up to 500 characters per text object. | Functional | High | Problem statement ("write") | AC-FR-004: Typed text appears at the chosen position; input beyond 500 characters is not accepted; edited text replaces the previous text for all participants. Test: TC-002 | Text is displayed as plain text (SEC-REQ-005) |
| FR-005 | The system shall let a user with an editing role select one object and move it, change its colour or stroke width, or delete it. | Functional | High | Problem statement ("edit") | AC-FR-005: After each action the object shows the new position or style, or is removed, on every participant's board. Test: TC-003 | FR-020, FR-023 |
| FR-006 | The system shall provide an eraser tool that deletes every whole object the eraser path touches. | Functional | High | Team | AC-FR-006: Objects touched by the eraser path are removed completely; objects not touched remain unchanged. Test: TC-004 | Partial (pixel) erasing is not supported |
| FR-007 | The system shall let only the Owner clear the entire board after an explicit confirmation; before clearing, the system shall apply the "before clear" version trigger of FR-030 so that the pre-clear content is preserved in the latest version; if that version cannot be stored, the clear shall be rejected. Clearing an empty board shall have no effect. | Functional | High | Team | AC-FR-007: After the Owner confirms, the board is empty for all participants and the latest version contains the pre-clear content (a new "before clear" version if the content had changed since the latest version, otherwise the existing latest version); clearing an empty board changes nothing and creates no version; if the pre-clear version cannot be stored, the clear is rejected and the board keeps its content; a clear interrupted by a server failure after it was committed is completed when the server restarts, and no participant receives a success acknowledgement before it is complete; a clear request from an Editor or Viewer is rejected. Test: TC-005, TC-025 | FR-030 (rules in §4.3), FR-051 |
| FR-008 | The system shall limit the **content size** of one board to 15 MiB (15,728,640 bytes) and shall reject, with a "board full" message, any add or update operation that would make the content size exceed the limit; a rejected operation shall not be stored, acknowledged as accepted or broadcast. The content size is the BSON-based count of the board's object list defined in SAD §3.6 (measure M3); it is independent of the per-message size limit of SEC-REQ-005 (measure M1). | Functional | Medium | Team (D11c) | AC-FR-008: (a) an operation after which the content size is at most 15,728,640 bytes is accepted; (b) an operation that would make it exceed 15,728,640 bytes by one byte or more is rejected with "board full", is not stored, not acknowledged as accepted and not broadcast, and the board is unchanged; (c) after objects are deleted, an operation that fits within the limit again is accepted; (d) a version of a board within one object of the limit is stored, and the stored version document is below MongoDB's 16 MiB (16,777,216-byte) document limit. Test: TC-022 | Keeps every version snapshot below the 16 MiB document limit (SAD §3.6); value and accounting per D11c |

