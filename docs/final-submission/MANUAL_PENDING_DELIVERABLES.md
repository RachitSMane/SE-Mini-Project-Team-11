# Manual pending deliverables — Team 11

Status as of **06-11-2026**, branch `docs/final-submission` (pushed at `a2ffc10`; no PR open yet).

Every task in this file needs a person: a teammate, the repository owner or the mentor. The repository
has no evidence for any of them yet. None of them can be completed by editing files, so this file
records **what is missing, who must act, what evidence proves it, and where that evidence goes**.

Do not mark an item done until its evidence exists at the stated location.

Facts re-checked on 06-11-2026 with the GitHub CLI and Git:
- **Reviews:** 0 GitHub reviews on PRs #1–#6 and #27–#34.
- **Videos:** no video file tracked anywhere.
- **Tags:** none.
- **GitHub Project:** still unreadable (`gh project list` → "missing required scopes [read:project]").
- **CI:** last `main` runs green on `64876d8` (`app-ci`, `docs-check`, 02-11-2026).

## 1. Task list

| # | Task | What is missing | Why it cannot be done without a person | Who | Evidence that proves it | Where to save it |
|---|---|---|---|---|---|---|
| M1 | **Decide the academic sprint mapping** | Four GitHub milestones must be mapped to the course's Sprint 1 and Sprint 2. Proposal (option A): milestones 1 + 2 → Sprint 1 (**49** points); milestones 3 + 4 → Sprint 2 (**62** points). `AGILE_ESTIMATION_AND_PLANNING_AUDIT.md` §12 and §16.4 | Planning decision of the team; mentor acceptance | all four members; mentor | new dated row in the decisions table with the chosen option and who agreed | `docs/DECISIONS.md` |
| M2 | **Approve the retrospective story-point estimates** | The backlog has no estimates. Proposal (not approved): 111 points (Krishna 31 · Pranav 29 · Prithvi 29 · Rachit 22). `AGILE_ESTIMATION_AND_PLANNING_AUDIT.md` §16 | Estimates must come from the team (planning poker). Writing them to GitHub needs approval and the `project` scope | all four members; mentor | session record (date, participants, agreed value per issue); then the Project field values (§2.2) | `docs/DECISIONS.md` (decision); a new dated folder under `docs/evidence/` for the session record |
| M3 | **Verify the GitHub Project and its repository link** | Project v2 exists (issue timelines), but its name, fields, views and repository link are unverified | Needs an interactive `gh auth refresh -s read:project` by the account owner | Rachit (owner) | output of `gh project list --owner RachitSMane` and `gh project view <n> --owner RachitSMane`, or a screenshot of the Project linked on the repository page | `docs/evidence/<date>-github-project/` |
| M4 | **Requirement IDs on backlog items** | Only #23 names a requirement. Proposed mapping: `ISSUE_REQUIREMENT_TRACEABILITY.md` §2 | Team must confirm the mapping. Entering it means editing the Project (approval needed) | team confirms; Rachit enters | Project field "SRS Requirements" filled; decision recorded | GitHub Project; `docs/DECISIONS.md` |
| M5 | **Record the Sprint 1 video (1 min)** | No video exists | Needs a person to run the demo and record the screen | one recorder plus one narrator (team's choice) | MP4, 1 minute, following `sprint-videos/README.md` §3, with a title card stating the recording date and commit | `docs/final-submission/sprint-videos/Team11_Sprint1_Demo_1min.mp4`, added through a PR |
| M6 | **Record the Sprint 2 video (2 min)** | No video exists | Same as M5; needs two browsers and a person | as M5 | MP4, 2 minutes, following `sprint-videos/README.md` §4 | `docs/final-submission/sprint-videos/Team11_Sprint2_Demo_2min.mp4`, added through a PR |
| M7 | **Formal PR reviews from now on** | 0 of 14 PRs reviewed. Past PRs cannot honestly be reviewed afterwards | A review must be given by a person other than the PR author, on GitHub | a teammate reviews; Rachit (owner) merges | "Approved" review with a comment on the documentation PR and the video PR (checklist §2.1) | GitHub PR pages; optional summary in `docs/evidence/<date>-pr-reviews/` |
| M8 | **Record the teammate contribution confirmations properly** | Prithvi (27) and Pranav (26) explicitly agreed, as reported by Rachit; date and written copy missing | Only the teammates can confirm in writing | Prithviwar, pranav6126 | a comment by each, for example on the documentation PR or on issues #25 and #26, stating agreement with the equivalent figure; then fill in the date | `INDIVIDUAL_CONTRIBUTION_ASSESSMENT.md` §7.4 (date and link) |
| M9 | **Mentor decisions** | (a) equivalent individual workload metric; (b) retrospective estimates and sprint mapping (M1, M2); (c) scope of PNG export and board rename (E6); (d) accepting TC-109 / SEC-REQ-007 as Blocked; (e) submission deadline and format (E2) | Mentor's authority | mentor; Rachit asks | the mentor's written answer (e-mail or message), quoted with its date | `docs/DECISIONS.md` (E2, E6 and new rows) |
| M10 | **Sign the SRS, SAD and STP approval tables** | Approval tables are unsigned (E1) | Each member must approve personally; no one signs for another | each member | each member's approval in the form the instructor accepts; then the tables are filled in and the documents regenerated | `docs/working/*/` approval sections → `docs/final/` (regenerate with `tools/build_docs.py`) |
| M11 | **Manual checks for #25 and #26** | #25 (stable Firefox core flows, Safari) and #26 (CI on the final commit, manual demo run-through) were closed with these checks unticked | Needs a person at real browsers and devices | any member; name the tester | results file: tester, date, commit, browser and version, each check as pass, fail or not done, screenshots | `docs/evidence/<date>-manual-checks/RESULTS.md` |
| M12 | **Optional manual device checks** | Release readiness report §8: 125 % scaling, touch screen, Windows high contrast, a second device over plain HTTP, Apple Safari | Physical devices and human judgement | any member | as M11 | as M11 |
| M13 | **Each member prepares their own contribution walkthrough** | Viva preparation is personal | Only the member can rehearse and explain their own code | each member | completed checklist §2.2 (self-check) | not stored; rehearsal only |
| M14 | **Freeze marker (optional)** | No tag marks the frozen release | Creating and pushing a tag needs the owner's approval | Rachit | annotated tag `v1.0` on the merge commit of the documentation PR | GitHub tags |
| M15 | **Missing TC-021 evidence (optional)** | Three earlier evidence files are referenced but not committed (`DOCUMENTATION_AUDIT.md` R2) | Personal content must be cropped out of a screenshot first | Rachit | the cropped files committed | the folders named in `DOCUMENTATION_AUDIT.md` R2 |

## 2. Checklists

### 2.1 PR review evidence checklist (M7)

Use this for the next PRs: the documentation PR from `docs/final-submission` and the video PR.

- [ ] The PR is opened by the person who did the work.
- [ ] The description lists the changed files and how the work was checked.
- [ ] CI (`app-ci`, `docs-check`) is green on the PR.
- [ ] A teammate who did **not** author the PR reviews it: **Files changed → Review changes → Approve**, with a comment that names what was checked.
- [ ] Requested changes, if any, are answered in new commits, not by force-pushing.
- [ ] The repository owner merges with a **merge commit**, not squash or rebase, so commit hashes stay the same.
- [ ] Do **not** add reviews to PRs #1–#34 now; explain the past practice honestly in the viva (`DEVIATIONS.md` D-17).
- [ ] Optional: enable branch protection on `main` (one approval, required checks), as in `docs/DECISIONS.md` E4.

### 2.2 Team contribution verification checklist (M8, M13)

Each member ticks their own row before the viva. The figures are proposals: assigned points from the
revised retrospective estimate (`AGILE_ESTIMATION_AND_PLANNING_AUDIT.md` §16) and the separate
equivalent individual workload (`INDIVIDUAL_CONTRIBUTION_ASSESSMENT.md`).

| Member | Assigned issues | Assigned points (proposal) | Equivalent workload (separate metric) | PRs to show | Confirmation status |
|---|---|---:|---:|---|---|
| Rachit S Mane | #8, #14, #17, #21, #23 | 22 | 27 | #2, #31, #32, #33, #34 | approved 06-11-2026 |
| P Chinni Krishna Reddy | #7, #11, #18, #22, #24 | 31 | 31 | #4, #30 | figure unchanged; no confirmation recorded |
| Pranav V Menon | #10, #13, #16, #19, #26 | 29 | 26 | #3, #27, #28 | explicitly agreed; date and written copy to be recorded (M8) |
| Prithvi W | #9, #12, #15, #20, #25 | 29 | 27 | #5, #29 | explicitly agreed; date and written copy to be recorded (M8) |

Self-check for each member:
- [ ] I can open each of my issues and say what its acceptance criteria were and how they were met.
- [ ] I can show the commits I authored (`git log --author=<name>`) and explain the code in them.
- [ ] For code that came in the shared snapshot commits (`7e1d2a2`, `68b0e0c`), I can explain it without claiming I wrote it unless I did.
- [ ] I know which parts of my issues other members finished, and which of their issues I helped with.
- [ ] I can explain the difference between assigned story points and the equivalent workload figure.
- [ ] I have read `VIVA_PREPARATION.md` §3 and `DEVIATIONS.md` §5.

### 2.3 Sprint video pre-flight checklist (M5, M6)

The full scripts, format and upload steps are in `sprint-videos/README.md`.

- [ ] M1 decided, so the scenes match the agreed sprint mapping.
- [ ] Clean `main` checked out; `npm install`, `npm run db:start`, `npm run dev` (`DEMO_GUIDE.md` §1).
- [ ] Two fake accounts created beforehand (`owner@demo.test`, `editor@demo.test`); no real data on screen.
- [ ] Desktop notifications off; browser zoom 100 %; other tabs closed.
- [ ] Title card shows the real recording date and the commit (`git rev-parse --short HEAD`).
- [ ] One silent rehearsal with a stopwatch; durations 1:00 and 2:00.
- [ ] MP4 under 50 MB; added through a PR that a teammate approves (§2.1).
- [ ] After merging: links added to `README.md` in this folder; `SUBMISSION_CHECKLIST.md` §E and `CHECKLIST_AUDIT.md` 2.10 and 2.14 updated.

## 3. Recommended order

1. **M3**: verify the Project (5 minutes; unblocks M2 and M4).
2. **M1, M2 and M4** in one team meeting; then ask the mentor (**M9**).
3. **Open the documentation PR** (owner's approval), a teammate reviews it (**M7**), and the teammates confirm their figures on it (**M8**).
4. **M11**: manual checks on the current `main`; record the results.
5. **M5 and M6**: record both videos after M1; upload them in a reviewed PR.
6. **M10**: sign the approval tables, regenerate the documents, then merge.
7. **M14**: tag `v1.0` (optional); **M13**: each member rehearses before the viva.
