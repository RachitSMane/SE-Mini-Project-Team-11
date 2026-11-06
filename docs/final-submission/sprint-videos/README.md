# Sprint demonstration videos — Team 11

**Status (05-11-2026): neither video exists yet.** The checklist requires a **1-minute Sprint 1 video**
and a **2-minute Sprint 2 video** of the working product "uploaded to the repository". No video file
and no video link was found in the repository, its issues, Pull Requests or milestones. This folder is
their destination; the scripts below say exactly what to record.

## 1. Decision needed first: which work is "Sprint 1" and "Sprint 2"?

The course model has two sprints; the team planned **four** milestones on GitHub:

| GitHub milestone | Dates (as planned) | Issues |
|---|---|---|
| Sprint 1 – Project Foundation | 31-08 to 13-09-2026 | #7, #8, #9 |
| Sprint 2 – Core Whiteboard | 14-09 to 27-09-2026 | #12, #13, #14, #15, #16, #17, #23 |
| Sprint 3 – Real-Time Collaboration | 28-09 to 11-10-2026 | #11, #18 |
| Sprint 4 – Testing and Finalization | 12-10 to 25-10-2026 | #10, #19, #20, #21, #22, #24, #25, #26 |

**Proposed mapping (team to confirm, mentor to accept):** course **Sprint 1** = milestones 1 + 2 (a
single-user whiteboard with accounts and boards); course **Sprint 2** = milestones 3 + 4 (real-time
collaboration, versions, hardening and testing). The scripts follow this mapping. If the team chooses
another mapping, move the scenes accordingly. Record the decision in `docs/DECISIONS.md` and in the
viva answer (`../VIVA_PREPARATION.md` §2).

**Be transparent about timing.** The code reached GitHub through Pull Requests between 26-10 and
02-11-2026, after the planned sprint dates, and there is no historical commit that contains only the
Sprint 1 scope. Both videos will therefore be recorded from the current `main`. Show a title card
that says so (template in each script). Do not present a recording made now as if it had been made at
the end of the sprint.

## 2. Recording format and destination

| Item | Recommendation |
|---|---|
| Format | MP4, H.264 video, AAC audio; 1280 × 720 or 1920 × 1080; 30 fps |
| Size | under 50 MB each (GitHub warns at 50 MB and rejects files over 100 MB; 1–2 min at 720p is typically 5–25 MB) |
| Tools on Windows 10 | **PowerPoint** → Insert → Screen Recording (select the area of both browser windows; then right-click the video → *Save Media as…* → MP4), or **OBS Studio** (Display Capture). Xbox Game Bar (Win + Alt + R) records only one window, which is not enough for the collaboration scenes |
| Audio | one narrator, built-in microphone is fine; no background music needed |
| Data on screen | only the fake demo accounts (`owner@demo.test`, `editor@demo.test`, DEMO_GUIDE §1.2); never `server/.env`, browser storage, real e-mail addresses or a real share link; hide desktop notifications (Focus assist on) |
| File names | `docs/final-submission/sprint-videos/Team11_Sprint1_Demo_1min.mp4` and `docs/final-submission/sprint-videos/Team11_Sprint2_Demo_2min.mp4` |
| Upload | commit both files on a branch, open a Pull Request into `main` and merge it (so the upload itself is visible in the history). If a file is over 50 MB, re-export at 720p rather than using Git LFS |
| After upload | add the links to the table in `../README.md`, tick the items in `../SUBMISSION_CHECKLIST.md` and `../CHECKLIST_AUDIT.md` |

Preparation (both videos): follow `../DEMO_GUIDE.md` §1 (clean `main`, `npm install`, `npm run db:start`,
`npm run dev`), create the two fake accounts beforehand, close other tabs, set browser zoom to 100 %,
and do one silent rehearsal with a stopwatch.

## 3. Script — Sprint 1 video (60 seconds)

Goal: show a **working single-user whiteboard** — the outcome of milestones 1 and 2. One browser
(Chrome), logged out at the start.

| Time | Show (exact actions) | Say (suggested narration) |
|---|---|---|
| 0:00–0:05 | Title card (a slide or text on screen): "Team 11 — Real-Time Collaborative Whiteboard · Sprint 1 outcome · recorded <date> from `main` @ `<commit>`" | "Team 11, Sprint 1 outcome: the foundation and the core whiteboard." |
| 0:05–0:15 | Register page: enter *Demo Owner*, `owner@demo.test`, a password; submit. (Optional: first submit an invalid e-mail to show the validation message) | "Users register and log in; passwords are checked and stored only as hashes." |
| 0:15–0:22 | Dashboard: type the title "Sprint 1 demo", click **Create board**; the board opens | "Each user has a dashboard. Creating a board makes you its Owner." |
| 0:22–0:42 | Draw: pen stroke; pick a colour and a stroke width; rectangle, ellipse, line; text "Hello"; **Select** → move a shape and change its colour; **Eraser** across one stroke | "The toolbar has a pen, shapes, text, select and an eraser, with colour and stroke width." |
| 0:42–0:50 | Reload the page (F5): the drawing comes back | "Every change is saved on the server, so the board survives a reload." |
| 0:50–0:57 | Back to the dashboard: the board is listed; (optional) **Export PNG** on the board | "Boards are listed on the dashboard and can be exported as an image." |
| 0:57–1:00 | End card: "Sprint 1: issues #7, #8, #9, #12–#17, #23" | "That completes Sprint 1." |

Note: export (#16) and rename (#13) are outside the SRS v1.0 baseline; if you show export, do not call it
an SRS requirement (scope decision pending, `docs/DECISIONS.md` E6).

## 4. Script — Sprint 2 video (120 seconds)

Goal: show **real-time collaboration and its guarantees** — the outcome of milestones 3 and 4. Two
browsers side by side: Chrome = *Demo Owner* (left), Edge = *Demo Editor* (right). Start with the Owner
logged in on an empty board called "Sprint 2 demo"; the Editor logged in on the dashboard.

| Time | Show (exact actions) | Say (suggested narration) |
|---|---|---|
| 0:00–0:06 | Title card: "Team 11 · Sprint 2 outcome · recorded <date> from `main` @ `<commit>`" | "Sprint 2: real-time collaboration, version history and testing." |
| 0:06–0:22 | Owner: **Share** → create an *Editor* link → copy → close the dialog (do not leave the link on screen). Editor: paste the link; the board opens; both presence lists show two participants | "The Owner creates a share link with a role and an expiry. The second user joins as an Editor." |
| 0:22–0:45 | Both draw at the same time on different parts of the board; Editor moves a shape the Owner drew; Owner adds text | "Changes appear on the other screen within a fraction of a second. The server orders every change, so both screens always end up identical." |
| 0:45–0:58 | Owner: **Members** → change the Editor to *Viewer*. Editor: the tools become disabled, the role label shows Viewer | "Permissions are enforced by the server. A Viewer can watch but cannot edit." |
| 0:58–1:15 | Editor window: DevTools → Network → *Offline*; the "connection lost" banner appears and tools are disabled; Owner draws two strokes; Editor back *Online*; the strokes appear | "If the connection drops, the user is told, and on reconnect the board resynchronises from the server." |
| 1:15–1:38 | Owner: **Clear board** (toolbar icon, tooltip "Clear board") → confirm; then the **History** tab of the side panel → open the previous version (read-only preview) → **Restore**; both windows show the restored content | "Clearing keeps a version first. The Owner can preview old versions and restore one; the restore is pushed to everyone and is crash-safe." |
| 1:38–1:52 | Cut to a terminal with `npm run test:unit` finishing (≈ 4 s), then the green `app-ci` run on GitHub (Actions tab) | "Every change is checked by CI: 110 unit, 100 integration and 31 end-to-end tests pass." |
| 1:52–2:00 | End card: "Sprint 2: issues #10, #11, #18–#22, #24–#26 · reports in `docs/testing-reports/`" | "That is our Sprint 2 outcome. Thank you." |

Tips: rehearse the Viewer and offline steps once — they are the ones most likely to take longer. If the
reconnect takes more than a few seconds, cut the waiting time in the editor but say so ("shortened").
Do not speed up or fake the synchronisation itself.
