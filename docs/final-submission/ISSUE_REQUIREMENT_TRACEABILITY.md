# Issue ↔ requirement traceability — PROPOSAL

> **Status: proposed mapping, prepared 05-11-2026 by Claude for the team to confirm.** It has not been
> approved by the team or the mentor, and nothing was written to GitHub. Requirement IDs are taken only
> from the SRS v1.0 and the RTM (`docs/traceability/rtm.md`); no new ID is proposed.

Related: [`STORY_POINT_ESTIMATION.md`](STORY_POINT_ESTIMATION.md), [`AGILE_AND_GITHUB_AUDIT.md`](AGILE_AND_GITHUB_AUDIT.md).

## 1. How the mapping was built

Three layers, kept apart so that what is *recorded* is not confused with what is *proposed*:

| Layer | Source | Result |
|---|---|---|
| **A. Recorded IDs** | requirement IDs written in issue bodies, issue comments, PR titles/bodies and commit messages | issue bodies: only **#23 → NFR-006**. Comments: #8 (NFR-006), #11 (FR-025), #14 and #26 (SEC-REQ-007, recorded as blocked). Commits: `20097f4` (FR-051), `c08e63b` (NFR-006). PRs: #33 (NFR-006, TC-109), #29 (TC-019, TC-022) |
| **B. Derived via test cases** | test cases cited in each issue's completion comment (all written by the repository owner on 02-11-2026), mapped to requirements through the RTM | mechanical and **over-inclusive**: e.g. #8 cites TC-015/TC-016 only to show a board can be opened, which pulls in FR-040–FR-044 |
| **C. Proposed primary mapping** | B, filtered by the issue's own tasks and acceptance criteria and by the code its PRs changed | the mapping recommended for the GitHub Project (§2) |

## 2. Proposed issue → requirement mapping

PR evidence uses three strengths. **Closes** means a formal GitHub closing reference. **x-ref** means
the PR mentions the issue, recorded as a timeline cross-reference. **cited** means the PR is named only
in the completion comment.

| Issue | Sprint | Proposed primary requirements (C) | Also touched (B, secondary) | PR evidence | Key commits |
|---|---|---|---|---|---|
| #7 Project setup | S1 | none — SRS §2.4–§2.5 constraints (environment, stack) | — | cited #27, #30 | `7e1d2a2`, `efb2a98` |
| #8 Frontend and canvas | S1 | NFR-007 (toolbar, role/status visible); NFR-006 (1280 px) | FR-001–FR-006 (drawing through the UI) | x-ref #32; cited #27, #29, #31 | `7028ca0`, `a5e57c7` |
| #9 Shared error handling | S1 | FR-026 (rejection feedback); SEC-REQ-005 (safe errors) — via SAD §4.4 | — | x-ref #29; cited #5 | `1c72bee`, `702838b` |
| #12 Sharing and access control | S2 | FR-045–FR-051, FR-052; SEC-REQ-003, SEC-REQ-004 | FR-044 (delete permission), FR-033 (restore permission, via TC-102) | x-ref #29; cited #27 | `702838b` |
| #13 Board management | S2 | FR-042, FR-043, FR-044 | rename: **outside baseline** (E6) | cited #27, #28 | `20097f4` |
| #14 Authentication | S2 | FR-040, FR-041; SEC-REQ-001, SEC-REQ-002 | SEC-REQ-006 (login limiter, named in the comment but not in tasks); SEC-REQ-007 noted as blocked | cited #2, #27 | `5416880` |
| #15 Drawing tools | S2 | FR-001–FR-007 | FR-020 (sync of drawing, via TC-001) | x-ref #29; cited #27, #32 | `702838b`, `7028ca0` |
| #16 Export | S2 | **none — outside the v1.0 baseline** (SRS §2.7, DECISIONS.md E6) | — | cited #28 | `0f7cad0` |
| #17 Frontend–API integration | S2 | none directly; supports FR-026, FR-043 | — | cited #27, #29 | `702838b` |
| #23 Responsive layout | S2 | **NFR-006** (recorded), NFR-007 | breakpoints below 1280 px: beyond the SRS | **closes: #33** | `c08e63b` |
| #11 Real-time synchronisation | S3 | FR-020–FR-025, FR-027; NFR-001, NFR-002 | FR-001–FR-007 via TC-001–TC-005 (sync of each operation) | cited #27, #30 | `efb2a98` |
| #18 Connection lifecycle | S3 | FR-025; NFR-004 | — | cited #30, #31 | `efb2a98`, `b3a8f75` |
| #10 E2E tests | S4 | verification item: TC-001–TC-018, TC-021, TC-023 (E2E parts) | — | cited #3, #28 | `b4e95a6`, `50243ef` |
| #19 Backend tests | S4 | verification item: TC-001–TC-025, TC-101–TC-108 (Jest parts) | — | cited #28, #31 | `9578520` |
| #20 Database validation | S4 | FR-008 (size limit stored consistently), FR-027; SEC-REQ-005 | — | x-ref #29 | `702838b` |
| #21 Frontend validation | S4 | FR-026; SEC-REQ-005 (client side); NFR-007 | — | **closes: #33** | `cc3e33c` |
| #22 Multi-client sync tests | S4 | verification of FR-020–FR-023, FR-027 | NFR-002 (multi-client, not the measured 10-client target) | cited #30 | `efb2a98` |
| #24 Board-state consistency | S4 | FR-021, FR-023, FR-024, FR-027; SEC-REQ-005 (incoming events) | — | cited #30 | `efb2a98` |
| #25 Cross-browser testing | S4 | NFR-006 (TC-021) | NFR-007; FR-025/NFR-004 (TC-009 in Firefox) | x-ref #29, #33 (not closing); cited #28–#32 | `702838b`, `d0b4937` |
| #26 Final validation | S4 | verification item: STP exit criteria | SEC-REQ-007 recorded as Blocked | x-ref #33 (not closing) | `9660c24`, `48051d8`, `85da387` |

## 3. Requirement coverage

### 3.1 Requirements with **no** issue (neither recorded nor derivable) — 12 of 50

| Requirement | Implemented and verified? | Where the work actually is |
|---|---|---|
| FR-008 Board content size limit | yes, P (TC-022) | PR #4 "Add Sunny's backend board capacity work" (`2e50004`, Krishna, 27-10-2026: `boardEngine.js` size check and `boardLimit.test.js`) — a PR with **no issue**. Only loosely covered by #20 in the proposal above |
| FR-027 Persist before broadcast | yes, P (TC-011) | part of #11's design; not named in any issue |
| FR-031 Version list for all roles | yes, P (TC-012) | **version history has no issue** — `server/src/versions/`, `SidePanel.jsx` History tab; came in with the bulk commit `7e1d2a2` (#27) |
| FR-032 Read-only version preview | yes, P (TC-012) | as above |
| FR-034 Restored state pushed to all | yes, P (TC-013) | as above |
| FR-035 Retain ≥ 20 versions | yes, P (TC-014) | as above |
| NFR-001 Latency p95 ≤ 500 ms | yes, P (TC-019, 12-10-2026) | `scripts/perf/`; no issue for performance measurement |
| NFR-002 ≥ 10 participants | yes, P (TC-019) | as above (proposed under #11 in §2) |
| NFR-003 Board ready ≤ 3 s | yes, P (TC-020) | as above |
| NFR-005 Restore ≤ 3 s | yes, P (TC-013) | as above |
| SEC-REQ-006 Rate limits | yes, P (TC-108) | `authService.js` limiter, `realtimeServer.js` operation limit; mentioned only in #14's comment |
| SEC-REQ-008 Security logging | yes, P (TC-104) | `server/src/logger.js`; no issue |

FR-030 and FR-033 appear only indirectly: through TC-005 (clear creates a version) and TC-102
(restore permission). So the **whole version-history feature (FR-030–FR-035) has no backlog item**,
although the problem statement makes version history mandatory and it is one of the most complex parts
of the system (journalled, idempotent restore; SAD SD-02).

### 3.2 Requirements covered by several issues (overlap)

| Requirement(s) | Issues | Comment |
|---|---|---|
| FR-001–FR-006 | #8, #15, (#11 for sync) | drawing UI split between "frontend" and "drawing tools"; sync of each operation in #11 |
| FR-025, NFR-004 | #11, #18, (#25) | reconnection appears in both #11's and #18's tasks |
| FR-020–FR-024, FR-027 | #11, #22, #24 | implementation in #11; verification in #22 and #24, which overlap each other |
| FR-026, SEC-REQ-005 | #9, #17, #21, #20, #24 | error/validation behaviour spread over five issues |
| NFR-006 | #8, #23, #25 | |
| SEC-REQ-007 | #14, #26 | both record it as Blocked; neither owns it |

### 3.3 Issues without a requirement of their own

| Issue | Why | Recommendation |
|---|---|---|
| #7 | environment set-up (SRS constraints) | link to SRS §2.4–§2.5 in the Project field |
| #10, #19, #26 | verification items | link to the STP test cases they implement, not to FRs |
| #16 | export is **outside the v1.0 baseline** | keep unmapped until the mentor decides (E6); then either new IDs (via `docs/traceability/id-registry.md`) or "accepted addition" |
| #17 | cross-cutting integration | supporting item; consider folding (see `STORY_POINT_ESTIMATION.md` §4) |

### 3.4 Functionality outside the SRS baseline

- **PNG export** (#16, `0f7cad0`) and **board rename** (#13, `20097f4`; `PATCH /api/v1/boards/{boardId}`):
  documented in SRS §2.7 and DECISIONS.md E6, **pending approval**.
- **Layouts below 1280 px** (#23, `c08e63b`) and **touch / forced-colour handling** (#25, #32: `d0b4937`,
  `7028ca0`): extras beyond NFR-006; no requirement change claimed.
- **CI workflows** (credited in #7's completion note; added in #27): process tooling, covered by DECISIONS.md D16.

## 4. Missing links between issues, PRs, commits and requirements

| Link | Current state | Recommended action (outside GitHub history) |
|---|---|---|
| Issue → requirement | 1 of 20 issues names a requirement (#23) | add an "SRS Requirements" **Project field** with §2's column C after team review; do not edit closed issue bodies |
| PR → issue (formal) | only **#21 and #23** are closed by a PR (#33). The other 18 were closed manually by the owner on 02-11-2026 13:07–13:11 or 15:53–15:54 UTC, with completion comments | nothing can be changed retroactively; in future, write "Closes #n" in PR descriptions |
| PR → issue (mention) | cross-references from PR #29 (#9, #12, #15, #20, #25), PR #32 (#8), PR #33 (#21, #23, #25, #26), PR #34 (#13, #16, #25, #26) | — |
| Commit → issue | issue numbers in 14 non-merge commit messages on `main` (e.g. `0f7cad0` #16, `20097f4` #13, `9578520` #19, `702838b` #9 #12 #15 #20 #25, `efb2a98` #7 #18 #22 #24, `c08e63b` #23, `cc3e33c` #21, `d0b4937` #25) | — |
| Commit/PR → requirement | 2 commits (`20097f4` FR-051, `c08e63b` NFR-006) and 1 PR (#33) | the RTM (requirement → test → design) is complete and checked by `tools/check_trace.py`; the gap is only on the backlog side |
| Issue → issue dependency | written in prose only (#26 → #21, #23, #25; #21 → #9, #17; #23 → #8, #15; #25 → #10, #8, #15; #11 → #18, #22, #24). GitHub's "blocked by" relationships and sub-issues are **not used** (API: none on any issue) | optional: mirror in the Project; do not edit closed issues |

## 5. Decisions needed

1. **Team:** confirm or correct column C of §2 before it is entered anywhere.
2. **Team:** whether to add *retrospective* backlog items for version history, performance measurement
   and security logging. If yes, label them "retrospective entry, created <date>", link the commits that
   implemented them (`7e1d2a2`, `2e50004`), and do not back-date them.
3. **Mentor:** the scope of export and rename (E6), which decides whether #16 and #13 gain requirement IDs.
