# Speaker notes — final presentation (Team 11)

Notes for `Team11_Whiteboard_Final_Presentation.pptx` (the same text is in the PowerPoint notes pane).
Total speaking time about 15–17 minutes, then the live demonstration (`../DEMO_GUIDE.md`). The notes are
written to be said in your own words, not read out. Every number is from the repository: test counts
from `docs/evidence/2026-11-02-final-validation/`, performance values from `docs/IMPLEMENTATION_STATUS.md` §4.

## Slide 1 — Title (about 30 s)

Good morning. We are Team 11 — Rachit, Krishna, Pranav and Prithvi — and our project is a real-time collaborative virtual whiteboard.
In the next fifteen minutes I will explain the problem, how we designed the system, how we tested it, what is finished and what is still open, and then I will show it running.
Everything you will see in these slides comes from our repository: the screenshots were taken from the running application, and the numbers come from test logs that are committed in the repository.

## Slide 2 — The problem we were given (about 1 min)

Our problem statement asked for three things: several people drawing, writing and editing at the same time, every change synchronised in real time, and a basic version history.
That sounds simple, but it hides three hard problems.
First, ordering: if two people change the board at the same moment from different browsers, everyone must still end up with exactly the same board.
Second, recovery: networks drop and servers restart, and anything the system has confirmed must not be lost.
Third, access: a share link must give exactly the rights it says, and the history must never be damaged — not even by the owner restoring an old version.
The rest of the talk is really about how we solved these three.

## Slide 3 — Objectives (about 1 min)

We turned the problem into four objectives, which our SRS then specified as fifty measurable requirements.
One: collaborate live — every accepted change reaches everyone without a reload, in the same order.
Two: never lose acknowledged work — the server stores a change before it confirms it, and clients resynchronise after any disconnection.
Three: share safely — Owner, Editor and Viewer roles that are enforced on the server, with links that expire and can be revoked.
Four: keep history — automatic versions, a read-only preview, and a restore that only the owner can do and that never deletes anything.
Each requirement has an ID that appears in the design, in the test plan and in the traceability matrix, and a script checks that these references agree.

## Slide 4 — Our solution (about 1 min)

Here is the result: a browser whiteboard with one authoritative server.
On the screen you see the owner's view. The toolbar is on the left, the top bar shows the board title, the role and the connection status, and the side panel lists the two people on the board.
The React client draws a change immediately so it feels instant, and sends it over a Socket.IO connection.
The Node.js server decides the order, checks permissions, validates the change, stores it in MongoDB, and only then confirms it and sends it to the others.
Everything that is not real-time — accounts, boards, sharing and version history — goes through a REST API.

## Slide 5 — Key features (about 1 min)

These are the main features, all covered by automated tests.
Drawing: a pen, rectangles, ellipses, lines and text, selecting, moving and restyling objects, an eraser, and a clear-board function for the owner.
Real-time sync with a live participant list. Sharing with three roles, expiring links, guest access and ownership transfer. Version history with preview and restore. A reconnection mechanism that disables editing while offline and resynchronises. And security throughout.
I want to be transparent about one thing at the bottom of the slide: we also built PNG export and board rename during the sprints. Our SRS lists export as a future enhancement that needs a new approved requirement, and we never formally approved that. So these two features work and are tested, but we do not count them as requirements, and their scope is a decision we still need to confirm with you.

## Slide 6 — Technology stack (about 45 s)

The stack is MERN with Socket.IO, decision D10 in our decision log.
React 18 with Vite on the client, drawing on an HTML canvas. Node.js with Express 5 and Socket.IO 4 on the server, Ajv for schema validation, JSON Web Tokens and bcrypt for authentication. MongoDB with Mongoose for storage.
A shared package contains the synchronisation module, the object model and the error codes. The same code runs in the browser, on the server and in the tests, which is important because our tests exercise the real client logic.
Testing uses Jest, Supertest, scripted Socket.IO clients and Playwright, and everything is delivered through GitHub issues, milestones and pull requests with CI.

## Slide 7 — System architecture (about 1.5 min)

This is our UML component diagram from the design document. There are nine components.
In the browser: the user interface and the synchronisation module.
They talk to the server through two interfaces. API-01 is the Socket.IO connection for board operations, presence and notifications. API-02 and API-03 are the REST API for accounts, boards, links, members and versions.
On the server, the real-time collaboration server and the REST layer both use the same services: authentication, board and access, version history and logging. Below them, the persistence layer talks to MongoDB.
The key design decision is that REST and Socket.IO use the same tokens and the same permission function, so there is exactly one place where access rules live.

## Slide 8 — Frontend and user interface (about 1 min)

Three screens from the application. The dashboard lists the boards you own or are a member of, with your role and the last change. In the middle, the same board seen by the editor. On the right, a guest viewer who joined through a link: the badge says "View only" and the drawing tools are gone.
In the code, BoardPage owns the whole board session: the socket, the sync client, roles, dialogs and messages. Canvas turns mouse or pen input into board objects, and a separate renderer draws them.
The interface hides tools a role cannot use, but that is only a convenience: the server checks every action anyway, and our security tests send crafted messages from viewers to prove it.

## Slide 9 — Backend and API (about 1 min)

On the left is the REST API under slash api slash v1: registration, login and logout; boards; share links; members and ownership transfer; and versions. Restore needs an Idempotency-Key header so that a retried request can never restore twice.
On the right is the Socket.IO namespace slash board. The client joins a board and submits operations; the server sends applied operations, presence, the full state after a restore, role changes, revocations, version events and title changes.
The socket is authenticated with the same JWT in the handshake, each connection is limited to thirty operations per second, and each message to sixty-four kilobytes.

## Slide 10 — How one change travels (about 1.5 min)

This slide is the heart of the system. When a user draws a shape, the client submits an operation. On the server it goes into a queue — one first-in-first-out queue per board, so changes to one board never interleave, while different boards run in parallel.
The server checks the user's role, validates the shape against a schema, and stores it in MongoDB — highlighted, because this happens before anything is confirmed. Then it assigns the next sequence number, acknowledges the sender and broadcasts the change to everyone else.
On the client, the sync module keeps the confirmed server state plus the user's own pending changes, so drawing feels instant; if the server rejects a change, it disappears with a message. Events are applied strictly in sequence order. If an event is missing for more than a second, the client simply asks for the full state again.
If two people change the same property of the same object, the higher sequence number wins on every client — a deliberate, documented trade-off instead of complex merging.

## Slide 11 — Database design and persistence (about 1 min)

MongoDB holds seven collections. Users store a bcrypt hash, never a password. Boards store the title, the owner, the current sequence number, the size of the content, and a small journal used while a clear or restore is in progress. Each drawing object is its own document, and besides Mongoose validation, MongoDB itself has a JSON-schema validator on that collection.
Memberships hold Editor and Viewer roles; the owner is stored on the board. Share links store only a SHA-256 hash of the token, so even a database leak gives no usable link. Versions are full snapshots, and at least the twenty newest are kept. Revoked tokens implement logout, and indexes clean up expired entries automatically.
Because every change is written before it is confirmed, our tests kill the server and check that every acknowledged change is still there after a restart.

## Slide 12 — Testing strategy and results (about 1.5 min)

Our testing has three levels. 110 unit tests check the permission matrix, validation, the sync rules and the drawing geometry. 100 integration tests run against a real MongoDB with scripted Socket.IO clients — including a five-client synchronisation suite and fault-injection tests that kill the server during a clear or a restore. And 31 end-to-end tests drive real browsers through every major workflow.
49 of our 50 requirements are verified; the remaining one needs a deployed HTTPS server.
On browsers, I want to be precise. All 31 end-to-end tests pass in Chromium, which CI uses, and in installed Chrome and Edge. In Playwright's Firefox and WebKit builds they pass apart from a few skips that are documented in the tests. Those builds are engine builds — Playwright's WebKit is Safari's engine, not Safari itself, and we have not tested Apple Safari. Stable Firefox 159 ran 22 tests through an experimental driver; the other seven failed because of driver limitations, which we diagnosed, not because of application defects.
And CI runs lint, tests, the build and the browser tests on every pull request.

## Slide 13 — Performance against the targets (about 45 s)

Our SRS set four measurable performance targets, and this chart compares each target with the worst value we measured. Synchronisation latency at the 95th percentile was 80 milliseconds against a target of 500, with ten clients. Loading a full standard test board took at most 1.1 seconds in Chrome against three seconds. Restoring a version for ten clients took at most 1.7 seconds, and reconnecting after a thirty-second outage at most 2.3 seconds, against three and five seconds.
To be clear about the conditions: these were measured on the twelfth of October on one laptop with all clients on the same machine, as the test plan defines. They are not Internet measurements.

## Slide 14 — Challenges and how we solved them (about 1.5 min)

A few real problems we hit.
Restoring a version touches every object on a board, and a crash in the middle could leave it half-restored. We journal the restore on the board document and use an idempotency key, so on restart the server completes or undoes it, and a retry never restores twice. Our tests crash the server at every step to prove it.
A merge in pull request 28 resolved a conflict wrongly and broke the main branch — CI was red but the merge went through. We repaired it in pull request 31. The lesson is to protect the main branch and require CI, which is still a recommendation for our repository.
In cross-browser testing, one Firefox test kept failing. Instead of skipping it blindly, we measured that the test tool's offline mode does not close WebSockets in Firefox, and corrected only that step.
A layout check at many window widths showed the top bar collapsing between about 760 and 1000 pixels; we fixed it and added a test.
And drawing failed over plain HTTP from another device because a browser API exists only on secure pages; we added a fallback.

## Slide 15 — Four sprints (about 1 min)

We organised the work in four two-week sprints with twenty GitHub issues.
Sprint 1 laid the foundation: the project structure, the whiteboard frontend and shared error handling. Sprint 2 built the core whiteboard: authentication, boards, sharing and access control, the drawing tools, export, API integration and the responsive layout. Sprint 3 delivered real-time collaboration and the connection lifecycle. Sprint 4 was testing and finalisation: end-to-end and backend tests, database integrity, frontend validation, multi-client synchronisation, cross-browser testing and the final release validation.
All twenty issues and all four milestones are closed. One honest note: the code reached GitHub through pull requests between the twenty-sixth of October and the second of November, so the sprint dates are the plan, and the pull requests show when work was merged.

## Slide 16 — Limitations and future work (about 1 min)

What is not finished. The HTTPS deployment requirement cannot be verified because we have no deployed server; the application side is implemented and tested locally. We have not tested Apple Safari. The system runs as a single server with a fifteen-megabyte limit per board. After a reconnection, changes the server never confirmed are discarded and the user is told, rather than resent. And the scope of export and rename still needs your decision.
For the future: deploy behind HTTPS and run that test, resend unconfirmed changes using the client operation ID, scale to several servers with a Socket.IO adapter, and add undo and redo, live cursors, PDF export and smarter merging of text.

## Slide 17 — Thank you — questions? (remaining time)

To sum up: we built a whiteboard where several people can work on the same board live and always end up with the same result, with history that can be restored safely and sharing that is enforced on the server. 49 of 50 requirements are verified, there are 241 automated tests, and CI checks every change.
The repository contains the code, the SRS, SAD and test plan, the test evidence and this presentation.
I will now show the application running, and then we are happy to take your questions.

## Questions to prepare for

See `../DEMO_GUIDE.md`, section 6, for short answers (Socket.IO vs WebSockets, CRDTs, delete/edit conflicts, restore safety, what is unfinished).
