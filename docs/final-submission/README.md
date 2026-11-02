# Final submission package — Team 11

Real-Time Collaborative Virtual Whiteboard, Software Engineering Mini Project. This folder collects the
final-evaluation material and points to the canonical documents; the documents themselves are not
duplicated here.

| Item | File |
|---|---|
| Submission checklist (what is done, what needs review or approval) | [`SUBMISSION_CHECKLIST.md`](SUBMISSION_CHECKLIST.md) |
| Presentation (17 slides, speaker notes inside) | [`presentation/Team11_Whiteboard_Final_Presentation.pptx`](presentation/Team11_Whiteboard_Final_Presentation.pptx) · [PDF](presentation/Team11_Whiteboard_Final_Presentation.pdf) |
| Speaker notes | [`presentation/SPEAKER_NOTES.md`](presentation/SPEAKER_NOTES.md) |
| Demo walkthrough and technical explanation | [`DEMO_GUIDE.md`](DEMO_GUIDE.md) |
| Documentation consistency audit | [`DOCUMENTATION_AUDIT.md`](DOCUMENTATION_AUDIT.md) · [check script](audit/check_docs_consistency.py) · [log](audit/check_docs_consistency.txt) |
| Screenshots of the running application (02-11-2026) | [`screenshots/`](screenshots/) |
| SRS, SAD, STP (Word and PDF) | [`../final/`](../final/) — sources in [`../working/`](../working/) |
| Architecture diagrams | [`../diagrams/png/`](../diagrams/png/) |
| Release readiness report and test evidence | [`../reports/RELEASE_READINESS_2026-11-02.md`](../reports/RELEASE_READINESS_2026-11-02.md) · [`../evidence/2026-11-02-final-validation/`](../evidence/2026-11-02-final-validation/) |
| Implementation status, test by test | [`../IMPLEMENTATION_STATUS.md`](../IMPLEMENTATION_STATUS.md) |
| Decisions and open external actions | [`../DECISIONS.md`](../DECISIONS.md) |
| Project README (setup, running, testing) | [`../../README.md`](../../README.md) |

## Screenshots

Taken from the application running locally (test build, Chromium, 1440 × 900) with throw-away accounts
and data; the share-link screenshot shows the link list only, never a token.

| File | Shows |
|---|---|
| `01-login.png`, `02-register.png` | Login and registration |
| `03-dashboard.png` | Dashboard with boards and the create form |
| `04-empty-board.png` | New empty board with the tool hint |
| `05-board-owner.png`, `06-board-editor.png` | The same board for Owner and Editor, two participants |
| `07-share-dialog.png`, `08-members-dialog.png` | Owner dialogs |
| `09-guest-join.png`, `10-viewer-guest.png` | Guest entry page and the read-only Viewer view |
| `11-export.png` | PNG export confirmation |
| `12-clear-confirm.png` | Clear-board confirmation |
| `13-version-preview.png` | Read-only version preview with Restore |
| `14-editor-after-restore.png` | Editor after the Owner's restore |
| `15-disconnected.png` | Connection lost: banner, disabled tools |
