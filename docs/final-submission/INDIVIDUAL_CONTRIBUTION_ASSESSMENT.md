# Individual contribution assessment: RachitSMane

Repository `RachitSMane/SE-Mini-Project-Team-11` · prepared 06-11-2026 · read-only investigation.

**Status: final proposed equivalent workload distribution, agreed by the affected members.**
Rachit 27 · Krishna 31 · Prithvi 27 · Pranav 26 · total 111.
- Approved by RachitSMane on 06-11-2026.
- Prithviwar (27) and pranav6126 (26) have explicitly agreed to their allocations; confirmation date to be recorded.
- Krishna's figure (31) is unchanged by the adjustment.
- Mentor review is still to come (§7.4).

**Nothing was changed on GitHub.** No issue, assignee, estimate, label, milestone or Project field was
touched. Nothing was committed or pushed. The assigned story points used here are the **retrospective
assigned story-point estimates** of the revised proposal in `AGILE_ESTIMATION_AND_PLANNING_AUDIT.md` §16
(total 111). That proposal is still **subject to team and mentor approval**. No estimate exists on GitHub.
This document does not change those estimates.

---

## 1. Executive summary

| Figure | Value | Basis |
|---|---:|---|
| **A. Story points assigned** (#8, #14, #17, #21, #23) | **22** | retrospective estimates (audit §16), subject to team and mentor approval; unchanged |
| **B. Verified extra work on teammates' issues** | **+5 equivalent**: #25 +2, #26 +3 | commits authored by RachitSMane in PR #33, weighed against the owners' own work on the same issues |
| **C. Plausible but unverifiable** | not scored | snapshot code of unknown authorship; the pre-Git working tree on Rachit's machine |
| **Final equivalent individual workload (separate metric, not story points)** | **27** | A + B. The owners of #25 (Prithviwar) and #26 (pranav6126) lose exactly the amount moved, so nothing is counted twice |

**Final agreed distribution.** Approved by RachitSMane on 06-11-2026. Prithviwar and pranav6126,
the two members whose equivalent figures are reduced, have each explicitly agreed to their allocation
(§7.4):

| Member | Retrospective assigned story points | Attribution adjustment | **Equivalent individual workload** |
|---|---:|---|---:|
| RachitSMane | 22 | +2 (#25), +3 (#26) | **27** |
| Chinni-Krishna-Reddy | 31 | none | **31** |
| Prithviwar | 29 | −2 (#25 → Rachit) | **27** |
| pranav6126 (Pranav) | 29 | −3 (#26 → Rachit) | **26** |
| **Total** | **111** | **0** (net) | **111** |

**Conclusion.** Rachit's **retrospective assigned story points stay 22**. His **equivalent individual
workload is 27**: 22 for his own issues plus 5 for verified work on #25 and #26. The same 5 points are
taken off the owners of those issues, so the total stays 111. The equivalent workload figure is a separate
evaluation metric. **Never present it as story points.** No estimate, assignee, issue, milestone or Project field
changes.

Moving work from #25 and #26 to Rachit closes most of the gap between his 22 and the others' 29–31, but it
does not make him the largest contributor. Krishna stays highest at 31 (§7).

Five findings matter most:

1. **#25 and #26: real, substantial and verified.** Rachit authored all seven commits in PR #33. Five of
   them are #25/#26 work (`d0b4937`, `12d7e34`, `85da387`, `9660c24`, `48051d8`): 3 compatibility fixes, 6 new E2E tests, a dependency security fix, the full
   release-candidate validation, and the 02-11 release-readiness report with 22 evidence logs.
2. **#25 was shared, not taken over.** Prithvi's 31-10 record found the plain-HTTP restore defect and
   the swatch defect (G8). For G8 it wrote out the exact CSS fix and left it to Rachit as owner of
   `styles.css` (Rachit's planned task R2). Rachit applied both fixes. Only the lost-pointer-capture
   fix was a new finding of Rachit's.
3. **Merging is not counted.** Rachit merged 10 of the 14 PRs. Merging earns nothing here. No PR has a
   recorded review, so **no code-review credit can be claimed** for anyone.
4. **#8/#15: no scope change is supported** (§5). Rachit's verified canvas work is about 35 lines.
   Prithvi's verified canvas change is about the same size. The drawing tools came in the snapshot, and
   git cannot show who wrote them.
5. **Two facts a mentor may raise; disclose them first** (§9):
   - All 14 of Rachit's commits from 02-11 onward carry a `Co-Authored-By: Claude` trailer (AI-assisted). So do Pranav's 8 commits.
   - Rachit's merge `4934f16` broke `BoardPage.jsx` on `main`. He repaired it himself in PR #31.

---

## 2. Assigned responsibilities

| Issue | Title | Sprint | Retrospective points | What Rachit verifiably authored | Base code in git from |
|---|---|---|---:|---|---|
| #8 | Whiteboard frontend and canvas interface | S1 | 5 | `7028ca0` (fractional DPR, one pointer per gesture), PR #32; `a5e57c7` BoardPage repair, PR #31 | `BoardPage.jsx` first uploaded by **Prithvi** (`1c72bee`, PR #5, 27-10); `Canvas.jsx`, `Toolbar.jsx`, `SidePanel.jsx` from snapshot `7e1d2a2` (committed by Pranav) |
| #14 | Authentication and session management | S2 | 8 | `5416880`: `Auth.jsx` (122 lines), `Join.jsx` (117), `styles.css` (464), PR #2, 26-10 | server auth (`authService.js`, middleware, socket handshake) from snapshot `7e1d2a2` |
| #17 | Frontend integration with backend APIs | S2 | 3 | **no commit names #17**; `cc3e33c` (#21) puts the auth pages on the shared `describeError()` | `api.js` first uploaded by **Prithvi** (`1c72bee`) and reworked by him (`702838b`, error contract for #9) |
| #21 | Frontend validation and user feedback | S4 | 3 | `cc3e33c`: readable login, register and join errors; `e2e/validation.spec.cjs` (6 tests), PR #33 | validation rules from snapshot; builds on Prithvi's error contract |
| #23 | Responsive whiteboard layout | S4\* | 3 | `c08e63b`: top-bar fix below 1024 px; `e2e/responsive.spec.cjs` (3 tests), PR #33 | breakpoints and `ResizeObserver` from snapshot |
| | **Total** | | **22** | | |

\* #23 sits in milestone Sprint 2 and was closed last (02-11).

**A note on PR #2 and the "per-member uploads."** Before PR #27, `main` held only files that each member
had uploaded as "assigned files" (PR #2 Rachit, #3 Pranav, #4 Krishna, #5 Prithvi). The team had agreed
this so that every member would have commits (agenda D-16; `TEAM_CONTRIBUTION_PLAN.md` §3). The upload
split therefore shows **file ownership**, and `TEAM_CONTRIBUTION_PLAN.md` §3 confirms that Rachit owned
`Auth.jsx`, `Join.jsx` and `styles.css`. It **does not prove who wrote the files**. The same caution
applies to Prithvi's upload of `BoardPage.jsx` and `api.js`. `5416880` is still the strongest git
evidence of Rachit's authorship of the auth pages.

---

## 3. Verified contribution to each issue

The ✓ marks follow the tasks and acceptance criteria in each issue body.

**#8 (5).** ✓ canvas backing store rounded to whole device pixels (`7028ca0`; 125 % scaling regression
test added later in `compat.spec.cjs`). ✓ BoardPage repaired after a merge conflict (`a5e57c7`). The
layout, toolbar and navigation are in the snapshot, so who wrote them is not recorded. *Verified share:
follow-ups only.*

**#14 (8).** ✓ Login, register and guest-join pages plus the stylesheet (`5416880`). The server side
(bcrypt, JWT, revocation, REST and socket enforcement) is in the snapshot, so who wrote it is not
recorded. That server work is the reason #14 was raised from 5 to 8. *Verified share: client half.*

**#17 (3).** No commit by anyone names #17. The only related change by Rachit is `cc3e33c` (filed under
#21). *Verified share: none separable. This is the weakest of the five; say so openly.*

**#21 (3).** ✓ Fix: raw messages such as "Request failed (502)." replaced with readable text. ✓ Six E2E
tests. Closed by PR #33. *Verified share: high.*

**#23 (3).** ✓ Defect found and fixed: between about 760 and 1000 px the board title collapsed to 4 px.
✓ Three E2E tests covering 6 viewports and 6 browsers. Closed by PR #33. *Verified share: high for the
final work; breakpoints from the snapshot.*

---

## 4. Contributions to teammates' issues

### 4.1 #25 Cross-browser compatibility testing (Prithviwar, 5 points)

| Part of #25 | Done by | Evidence |
|---|---|---|
| WebKit project, 4-browser matrix script | Prithvi (comments in `playwright.config.cjs` cite #25; first commit in his PR #29) | `68b0e0c`, `702838b` |
| First full run: 5 engines, 39 passed / 1 skipped / 0 failed | Prithvi | `docs/evidence/2026-10-31-cross-browser/RESULTS.md` |
| Three browser issues found; two fixed (WebKit redraw, drawing ids over plain HTTP) | Prithvi | `RESULTS.md` §4.1, §4.2; `702838b` |
| **Plain-HTTP version restore** | **found by Prithvi** (§4.2, "out of scope … still fails"); **fixed by Rachit** | `d0b4937`, `BoardPage.jsx` |
| **Forced-colour swatches (G8)** | **diagnosed by Prithvi**, who wrote out the exact CSS fix and left it to the file owner (§4.4); **applied by Rachit** (his planned task R2) | `d0b4937`, `styles.css` |
| **Lost pointer capture ends the gesture** | **Rachit**: a new finding | `d0b4937`, `Canvas.jsx` |
| `e2e/compat.spec.cjs`: 5 tests (3 for the fixes, 2 regression tests for #32) | Rachit | `d0b4937` |
| Firefox offline-emulation limit in the #16 export test | Rachit | `12d7e34` (`boards.spec.cjs`) |
| Release-candidate 4-browser runs: 119 passed, 0 failed, 5 skipped | Rachit | `9660c24`, logs 05, 09, 19 |
| Stable Firefox 159 run and driver diagnosis | Rachit | `48051d8`, logs 21, 22 |
| Manual checks in the issue (stable Firefox core flows, Safari) | **not done**; still unticked at closure | issue #25 body |

**Assessment:** a genuine split. Prithvi did the discovery work, the part with unknown outcome. Rachit
did the final fixes, the regression tests and the re-validation on the release candidate. **Fair share
for Rachit: 2 of 5** (final agreed attribution). Prithviwar keeps 3 of #25's 5 in the equivalent
workload view. As the assignee, he keeps all 5 assigned points.

### 4.2 #26 Final system validation and release readiness (pranav6126, 5 points)

| Part of #26 | Done by | Evidence |
|---|---|---|
| First release-readiness report and evidence (validated `50243ef`, before PRs #29–#32) | Pranav | `b86de85`, `RELEASE_READINESS_2026-10-31.md`, 17 evidence files |
| CI fix so MongoDB 8.0 starts on new runner kernels | Pranav | `eeb07af` (PR #27) |
| Release smoke test: full workflow, fails on any console error or failed request | Rachit | `12d7e34`, `e2e/smoke.spec.cjs` |
| Dependency security fix: production audit 1 high + 2 moderate → 0 | Rachit | `85da387`, logs 12–14 |
| Full validation of the release candidate: lint, 210 Jest tests, build, E2E in Chromium and 4 browsers, traceability, doc tools, size model, then all repeated after the dependency change | Rachit | `9660c24`, logs 01–20 |
| Defect review and release-readiness report for 02-11 (supersedes the 31-10 report) | Rachit | `RELEASE_READINESS_2026-11-02.md` (161 lines), `48051d8` |
| Issue's "Final checks": CI green on the final `main` commit, manual demo run-through on that commit | **not recorded**; all six still unticked at closure | issue #26 body |

**Assessment:** Rachit did most of the final validation. Pranav's report covered an earlier commit, and
his CI fix helped every later run. **Fair share for Rachit: 3 of 5** (final agreed attribution).
pranav6126 keeps 2 of #26's 5 in the equivalent workload view. As the assignee, he keeps all 5 assigned
points.

### 4.3 Smaller verified items

| Item | Issue scope | Weight |
|---|---|---|
| One pointer per gesture: a second finger or palm is ignored (`7028ca0`, second half) | #15 task "handle mouse and pointer interactions" | below one Fibonacci step; **not added** to the equivalent workload (0) |
| Merge conflict resolution of PR #28 against `main` (`4934f16`) and repair (`a5e57c7`) | integration of #13 with #9/#12 | **net zero**: the repair fixed a break introduced by the same merge |
| Completion or progress notes on all 20 issues; created the issues, milestones and Project entries (30-10) | backlog management (Product Owner) | outside story points; listed in §7 |

---

## 5. The #8 / #15 boundary

| Question | Evidence | Finding |
|---|---|---|
| Who owns drawing behaviour, going by the acceptance criteria? | #15's ACs list draw, erase, brush size and colour, smooth interactions; its tasks add clear and "mouse and pointer interactions". #8's AC only says "basic drawing interactions work", next to layout and toolbar display | **#15 owns the drawing tools.** #8 owns the surface and the shell |
| Did Rachit implement the drawing tools under #8? | Pen, shapes, eraser, text, select/move and clear arrived in snapshot `7e1d2a2` (16–19 Oct tree, committed by Pranav), so who wrote them is not recorded. No commit by Rachit adds a drawing tool | **No evidence** |
| What canvas work is verifiably Rachit's? | `7028ca0`: DPR rounding (an #8 surface concern) and multi-pointer gesture ownership (#15 task text); `d0b4937`: lost-pointer-capture (filed under #25). About 35 lines of product code in total | small, real follow-ups |
| What canvas work is verifiably Prithvi's? | `702838b` compared with the snapshot: about 16 lines in `Canvas.jsx` (WebKit redraw) and 20 lines in `geometry.js` (`newObjectId` fallback) | similar size |

**Recommendation: no scope adjustment.** Moving drawing into #8 (#8 → 8, #15 → 5) would add 3 points to
Rachit and remove 3 from Prithvi. Nothing in the acceptance criteria or the git record supports that
move. Revisit it only if the team, Prithvi included, states in writing that Rachit wrote the drawing
tools in the pre-Git tree. Even then, record it as a verbal attestation (category C).

---

## 6. Contribution matrix

Confidence: **High** = commit authored by RachitSMane and diff inspected. **Medium** = authored commit
whose share of a team task needs judgement. **Low** = indirect evidence only.

| Work item | Issue | Actual work performed | Evidence | Contribution type | Confidence |
|---|---|---|---|---|---|
| Login, register, guest-join pages; stylesheet | #14 (also #8, #23) | 703 lines of client code | `5416880`, PR #2 | Primary implementation (client half) | High for commit; Medium for original authorship (see §2 note) |
| Fractional DPR backing store | #8 | integer backing store at 125 % scaling | `7028ca0`, PR #32 | Bug fixing | High |
| One pointer per gesture | #15 (scope) | ignores a second finger or palm | `7028ca0`, PR #32 | Bug fixing | High |
| BoardPage repair | #8 / integration | fixed a parse error left by his merge `4934f16` | `a5e57c7`, PR #31 | Integration / bug fixing (self-introduced) | High |
| Merge of `main` into Pranav's branch | #13 integration | resolved conflicts in BoardPage and Dashboard | `4934f16` | Integration (introduced the defect above) | High |
| Readable auth and join errors; 6 E2E tests | #21 | `describeError()` on 3 pages; `validation.spec.cjs` | `cc3e33c`, PR #33 | Primary implementation + Testing | High |
| Top bar below 1024 px; 3 E2E tests | #23 | icon buttons, title no longer collapses; `responsive.spec.cjs` | `c08e63b`, PR #33 | Bug fixing + Testing | High |
| Plain-HTTP restore fix | #25 | `newObjectId()` instead of `crypto.randomUUID()` | `d0b4937`; defect found by Prithvi | Bug fixing (co-implementation) | High |
| Forced-colour swatch fix | #25 (G8; task R2) | applied the fix Prithvi recommended | `d0b4937`; `RESULTS.md` §4.4 | Bug fixing (co-implementation) | High |
| Lost pointer capture | #25 | `onLostPointerCapture` ends the gesture | `d0b4937` | Bug fixing | High |
| Compatibility tests | #25 | 5 tests in `compat.spec.cjs` | `d0b4937` | Testing | High |
| Firefox offline limit in export test | #25 / #16 | test skips the impossible outage | `12d7e34` | Testing | High |
| Release smoke test | #26 | full workflow with console and network checks | `12d7e34` | Testing / Release preparation | High |
| Dependency security update | #26 | body-parser, qs, fast-uri patched | `85da387` | Release preparation | High |
| Release-candidate validation, 20 logs | #26, #25 | full suite before and after the dependency change | `9660c24` | Testing / Release preparation | High |
| Stable Firefox 159 run | #25, #26 | 22 passed, 7 driver limitations, diagnosed | `48051d8` | Testing | High |
| Release-readiness report 02-11 | #26 | defect review, coverage, limitations | `9660c24`, `48051d8` | Release preparation / Documentation | High |
| SRS/SAD/STP aligned with the code; Word/PDF regenerated | none (deliverables) | 22 files | `3259b69`, PR #34 | Documentation | High |
| README rewrite; final package (demo guide, presentation, screenshots, audit script) | none | | `d09fcb9`, `09500b0`, `8bca53e`, PR #34 | Documentation / Release preparation | High |
| Evaluation audits, testing reports, viva material | none | 88 files | `11a2e47` (**local, not pushed**) | Documentation | High (authorship); not yet on GitHub |
| Original SRS, SAD, STP deliverables; SRS lead; diagrams UC-01, SD-02, SD-05; final assembly | none (pre-backlog) | | `82af885`; `docs/README.md` ownership table; `Owner: Rachit` diagram headers | Documentation | Medium (ownership tables, not diffs) |
| Backlog: 20 issues, 4 milestones, Project entries, 20 completion notes | all | created 30-10, after the planned sprints | issue timelines; comments | Project management | High (but retrospective) |
| PR merges: #1, #2, #6, #27, #28, #30, #31, #32, #33, #34 | n/a | merged | PR metadata | **Not counted** (not implementation; no reviews recorded) | High |
| Pre-Git working tree on Rachit's machine | many | tree hosted and run there (15-10 sessions) | `TEAM_ACTION_TRACKER.md` "Evidence note, 15-10-2026 … run on Rachit's machine" | **Category C**: location, not authorship | Low |

---

## 7. Team workload comparison

### 7.1 Figures

| | Krishna | Pranav | Prithvi | Rachit | Total |
|---|---:|---:|---:|---:|---:|
| **A. Retrospective assigned story points** | 31 | 29 | 29 | 22 | 111 |
| Work done on others' issues, moved to the doer | — | −3 (#26 → Rachit) | −2 (#25 → Rachit) | +5 | 0 |
| **Final equivalent individual workload (separate metric)** | **31** | **26** | **27** | **27** | **111** |

**How the adjustment works, without double counting:**

| Issue | Retrospective points (assignee) | Owner keeps | Moved to Rachit | Check |
|---|---|---:|---:|---|
| #25 | 5 (Prithviwar) | 3 | 2 | 3 + 2 = 5 |
| #26 | 5 (pranav6126) | 2 | 3 | 2 + 3 = 5 |
| All other 18 issues | 101 | 101 | 0 | unchanged |
| **Total** | **111** | **106** | **5** | 106 + 5 = 111 |

Reconciliation: 27 + 31 + 27 + 26 = **111**. That equals the retrospective assigned total 22 + 31 + 29 + 29 = 111.

The method credits the doer of verifiable work on someone else's issue, takes the same amount from the
owner and keeps the total at 111. It is **not Fibonacci story points**, and it changes no estimate
or GitHub field. Krishna's 31 is unchanged. The noted overlap of #22 and #24 (they could be one 8, not 10) is an
estimate question for the retrospective estimates, not an attribution adjustment, so it is not applied here.

### 7.2 Qualitative view

| Member | Assigned scope | Verified authored work | Shared or uncertain | Non-backlog work | Overall |
|---|---|---|---|---|---|
| **Krishna** | #7, #11, #18, #22, #24: the real-time core, on the critical path | `efb2a98`, `b3a8f75` (~2,960 lines: sync tests, lifecycle, consistency); PR #4 board-size limit | #11 core sync is in the snapshot, so who wrote it is not recorded; #7 scaffold the same | **PR #4 (FR-008, 630 lines) has no backlog item**, so it is uncounted | Highest assigned complexity; strong verified test work |
| **Prithvi** | #9, #12, #15, #20, #25 | `1c72bee`, `702838b`: error contract with tests, DB integrity with 13 tests, WebKit matrix, #25 record and 2 fixes | #12, #15 core in the snapshot; `702838b` also re-adds snapshot files | security and traceability lead (RTM, `check_trace.py`) | Broad and verified; final #25 work shared with Rachit |
| **Pranav** | #10, #13, #16, #19, #26 | `b4e95a6`, `20097f4`, `0f7cad0`, `9578520`, `50243ef`, `b86de85`, `eeb07af` | committed the snapshot (`7e1d2a2`), but **committing is not authorship** | STP lead; integration PR #27 | Consistent, verified feature and test work; final #26 work largely by Rachit |
| **Rachit** | #8, #14, #17, #21, #23 | §6 rows marked High | #8, #14, #17 base code in the snapshot; #17 has no separable work | SRS lead; final assembly; backlog and completion notes; final docs package | Smaller assigned scope; substantial verified work in testing, compatibility and release readiness |

### 7.3 Evidence gaps (all members)

1. **Snapshot authorship.** 7,727 lines of code arrived in `7e1d2a2` (Pranav) and 5,940 in `68b0e0c`
   (Prithvi); the two overlap heavily. Their own commit messages call them copies of a shared team tree, so no member can claim
   or be denied that code from git.
2. **No PR reviews.** All 14 PRs have 0 reviews and 0 conversation comments, so code review cannot be
   credited to anyone.
3. **Raw line counts mislead.** Authored code lines excluding the two snapshots: Prithvi ≈ 3,560 (part
   of it re-added snapshot files), Krishna ≈ 2,560, Pranav ≈ 1,610, Rachit ≈ 1,370. None of these
   figures is used for scoring.
4. **Unticked checks.** #25 (manual browser checks) and #26 (CI on the final commit, demo run-through)
   were closed with checks unticked. Nobody can claim that work.
5. **Retrospective backlog.** Issues and milestones were created on 30-10, after the planned sprints, so
   assignments were recorded afterwards.

---

### 7.4 Teammate agreement

| Member | Equivalent figure | Change from assigned | Agreement | Date |
|---|---:|---:|---|---|
| RachitSMane | 27 | +5 | approved | 06-11-2026 |
| Prithviwar | 27 | −2 (#25) | **explicitly agreed** to 27 | confirmed; date to be recorded |
| pranav6126 (Pranav) | 26 | −3 (#26) | **explicitly agreed** to 26 | confirmed; date to be recorded |
| Chinni-Krishna-Reddy | 31 | 0 | no change to his figure | — |

**Source of the two confirmations.** RachitSMane reported them on 06-11-2026. They were given outside
the repository, and no written copy is stored here. To make the record verifiable, add the date and
the form of each confirmation (for example a message or an issue comment). A short comment from each
member on GitHub would also work. This record does not cover the mentor's acceptance of the
equivalent workload metric.

---

## 8. Ownership versus contribution: the final figure of 27

```
A (assigned, retrospective story points)     22
B (verified work on teammates' issues)
    #25 cross-browser (owner Prithviwar)    +2
    #26 release readiness (owner pranav6126) +3
                                            ---
Equivalent individual workload              27
```

**Why 27 and not 28.** A higher figure was considered and rejected. It would have needed:
- #25 credited above 2, although Prithvi found two of the three defects and wrote out one fix;
- #26 credited above 3, although two of its six final checks were never recorded;
- credit for the #15 pointer fix, which is below one Fibonacci step.

None of these is backed by enough evidence, so the agreed figure is 27.

The wording to use is: **"22 story points owned; with verified work on #25 and #26, an equivalent
individual workload of 27 under a separate contribution metric."**

**Why #25 and #26 work deserves recognition:**
- It is authored, dated and tied to the issues by number in commit messages and issue comments.
- Every fix ships with a test that, per the 02-11 report, fails on the old code.
- The release-candidate validation is the run the team relies on for "ready for demonstration".
- Without it, #26's acceptance criteria rest on a 31-10 run of a commit that predates PRs #29–#33.

**Why it does not change ownership:** the assignee is the historical owner. Prithvi and Pranav keep the
points on #25 and #26. Recognition comes from this contribution record, not from editing estimates.

**What could raise the figure legitimately:** written statements from teammates that Rachit wrote
specific snapshot code (for example the server-side auth for #14, or the board UI for #8). Those would
move items from C to B with "attested" confidence. Without them, nothing more can be claimed.

---

## 9. Limitations of Git evidence

| Limitation | Effect here |
|---|---|
| Committer ≠ author | the snapshot commits hide authorship for #7, #8, #11, #12, #14, #15, #17 |
| Per-member uploads before PR #27 were agreed distributions (D-16) | they show file ownership, not who wrote the files; this applies to Rachit's PR #2 too |
| Merging ≠ implementation | Rachit's 10 merges earn no credit |
| **AI assistance is disclosed in commits** | all 14 of Rachit's commits from 02-11 onward, and 8 of Pranav's, carry `Co-Authored-By: Claude Opus 5.5`. The 15-10 test sessions on Rachit's machine are described as "made by the AI assistant". Follow the course's policy; each member should be able to explain every change in their commits |
| Merges can break things | `4934f16` broke `main` from about 22:53 IST on 01-11 until PR #31 at 18:23 IST on 02-11 (lint and build failed). Rachit fixed it. Disclose it rather than claim the repair as extra work |
| Work location ≠ authorship | the pre-Git tree ran on Rachit's machine; that shows custody, not who wrote it |
| Unpushed work | `11a2e47` exists only locally |
| Attribution splits are judgements | the 2/3 split of #25 and the 3/2 split of #26 weigh the evidence in §4. Git cannot measure effort, so another reviewer could weigh it slightly differently |
| Agreement of the affected members | Prithviwar and pranav6126 explicitly agreed to their figures (27 and 26), as reported by RachitSMane (§7.4). Their confirmation dates and a written copy are not yet in the repository. The mentor has not yet reviewed the metric |
| Audit provenance | this assessment and the earlier audits were produced with an AI assistant from repository data. They show consistency, not independent verification |

---

## 10. How to present this to the mentor

1. **Lead with ownership:** "My five assigned issues total 22 story points." Do not alter that figure.
2. **Then the verified extras, with commits on screen:** PR #33 → `d0b4937`, `12d7e34`, `85da387`,
   `9660c24`, `48051d8`. Show the 02-11 report's results table and `compat.spec.cjs`.
3. **Credit teammates explicitly:** "Prithvi's cross-browser record found the restore and swatch
   defects; I applied the fixes and added tests. Pranav's earlier report and CI fix came first; I
   re-validated the release candidate." This makes the claim more credible.
4. **State the metric honestly:** "Under a separate equivalent-workload view, which moves work from the
   owner to the doer and keeps the total at 111, I come to 27. Prithvi is 27, Pranav 26 and
   Krishna 31. My retrospective assigned story points remain 22."
5. **Disclose the weak points first:**
   - #17 has no separable commit.
   - Base code for #8 and #14 arrived in the team snapshot.
   - The merge break, and that I fixed it.
   - The AI co-author trailers.
6. **Be ready to explain the code** of #8, #14, #21, #23 and of the #25/#26 fixes line by line. That is
   the strongest individual evidence available.
7. **Optional, with teammates' agreement:** collect short written attestations on snapshot authorship.
   Do this for all members, not only for yourself.
8. **Do not:** edit assignees or estimates, call merges implementation, claim code review, or present
   the equivalent workload (27) as story points.

---

### Appendix: commands used (all read-only)

`git log --all` (authors, dates, `--numstat`, `--shortstat`, trailers) · `git show --cc 4934f16` ·
`git diff 7e1d2a2:<f> 702838b:<f>` · `git rev-parse 5416880:<f>` versus `7e1d2a2:<f>` (identical blobs) ·
`gh pr list --state all` · `gh api repos/…/pulls/<n>/commits` · `gh api repos/…/issues/<n>/comments` for
#7–#26 · `gh issue view 8 15 25 26` · reading `TEAM_CONTRIBUTION_PLAN.md`, `TEAM_ACTION_TRACKER.md`,
`RESULTS.md` (31-10), `RELEASE_READINESS_2026-11-02.md`.
