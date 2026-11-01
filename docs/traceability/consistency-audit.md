# Team 11 — Cross-Document Consistency Audit

> **Historical record** of the audit of the 10-10-2026 drafts, before implementation. Its statements
> that no code exists and that all tests are "Not executed" describe that date only; the current
> execution status is in the STP test-case records and `docs/IMPLEMENTATION_STATUS.md`.

<!-- Owner: Prithvi | Rerun before Gate A and before submission. -->

**Scope:** SRS v0.2, SAD v0.2, STP v0.2, master RTM, ID registry and decision log (drafts of
10-10-2026). **Method:** manual reading of the substantive statements in all three documents,
plus `tools/check_trace.py` for mechanical ID, link and status checks. The checker proves that IDs
exist and links agree; the semantic findings below come from manual review.

**Result of this audit:** all issues listed in section B were corrected in v0.2. Items in
section C remain open because they need team decisions. No application code exists, so no
behaviour described here has been verified by execution.

## A. Audit checklist

| # | Check | Result | Evidence |
|---|---|---|---|
| 1 | Every functional requirement maps to SAD components and design elements | Pass | SAD §3.8 lists components and SD/API elements for FR-001–FR-008, FR-020–FR-027, FR-030–FR-035, FR-040–FR-052; checker confirms SAD §3.8 equals the RTM "Design ref" column |
| 2 | Every NFR has a test that measures the same quantity | Pass | NFR-001/002 → TC-019; NFR-003 → TC-020; NFR-004 → TC-009; NFR-005 → TC-013; NFR-006/007 → TC-021. Start/end points, conditions and percentile method in SRS §5 are repeated verbatim in those test steps |
| 3 | Every security requirement maps to a SAD control and an STP test | Pass | SAD §3.9.6 control table; STP §5.1 table; each SEC-REQ has at least one TC-1xx test |
| 4 | Every referenced requirement ID exists | Pass | Checker: no unregistered IDs |
| 5 | Every referenced COMP, SD, API and TC ID exists | Pass | Checker; SD-04 added to the registry with SAD heading and diagram |
| 6 | No ID renumbered or duplicated | Pass | Registry change log: only additions (FR-008, SD-04, TC-022, TC-023) and a scope change of TC-018; no ID reused |
| 7 | Version-history policy agrees across documents | Pass (after fix B1–B3) | SRS §4.3 rules 1–6 (D5b); SAD §3.6, §4.1.5, API-03; STP TC-005, TC-012–TC-014 |
| 8 | Ownership transfer covered by SRS, SAD and STP | Pass (after fix B5) | FR-050; API-02 transfer-ownership subsection; SD-04; TC-018 (+ TC-102 matrix) |
| 9 | Real-time acknowledgement, ordering, persistence, reconnection agree | Pass (after fix B6–B8) | FR-021–FR-027; SAD §4.1.2–§4.1.4, API-01, SD-01; TC-006–TC-011 |
| 10 | RTM links each requirement to a test that actually verifies it | Pass | Manual check of every RTM row against the test steps (e.g. FR-049 moved from TC-018 to TC-023, which now exercises role change and removal) |
| 11 | Scope and out-of-scope consistent | Pass | SRS §1.2/§2.2, STP §4, SAD §4.6 list the same enhancements; resubmission and chunked storage named out of scope in all three |
| 12 | Proposed decisions separated from approved ones | Pass | `DECISIONS.md`: only Rachit's planning approval recorded; all drafting values marked proposed; documents label provisional targets and parameters |

## B. Inconsistencies found and resolved

| # | Finding (v0.1) | Resolution (v0.2) |
|---|---|---|
| B1 | FR-007/FR-030 required a version "immediately before clearing", while AC-FR-030 said no version is created when nothing changed — contradictory when a board is cleared right after a version. | One no-change rule for all automatic triggers; clear preserves the pre-clear content in the latest version (new or existing); clearing an empty board is a no-op; restore always creates a version (SRS §4.3, D5b). FR-007, FR-030, TC-005, TC-012, SAD §3.6/§4.1.5 aligned. |
| B2 | FR-033 said existing versions are never deleted, but the SAD retention mechanism deletes versions beyond the 20 newest. | FR-033 now forbids a restore from modifying or deleting versions; retention (FR-035) is the only removal path; API-03 returns `VERSION_NOT_FOUND` for removed versions; TC-014 tests it. |
| B3 | The 5-minute interval appeared as a fact in SAD/STP while only proposed. | Interval *T* is a configuration parameter, proposed 5 min (D11a, unapproved); tests record the configured value. |
| B4 | FR-023 described whole-object last-write-wins, but updates carry only changed properties, so concurrent changes to different properties would be judged inconsistently. | Per-property LWW stated in FR-023, SAD §3.5/§4.1.3, D12; TC-007 adds a different-property case. |
| B5 | API-02 had a one-line `POST /boards/{id}/transfer` without authentication, safeguards, target validation or errors; no design flow for FR-050. | Fully specified `POST /api/v1/boards/{boardId}/transfer-ownership` (D14b), new SD-04, TC-018 rewritten with negative cases. |
| B6 | Acknowledgement contents, reconciliation of optimistic edits, gap repair and duplicate handling were not specified; `board:state` was described as both restore push and gap repair. | SAD §4.1.3 protocol (confirmed/pending/buffer, rules 1–6, convergence argument); API-01 ack schema includes `clientOpId`; `board:state` for restore only, gap repair via `board:join`. |
| B7 | Persistence-before-broadcast lacked a crash-safety argument; standalone MongoDB has no multi-document transactions. | SAD §4.1.2: journaled writes before ack/broadcast; `seq` recovery on start-up; FR-027 now says "before acknowledging or broadcasting". |
| B8 | NFR-004 (5 s recovery) was infeasible with Socket.IO's default 5 s maximum reconnection delay; behaviour of unacknowledged edits after reconnect was undefined. | Reconnection backoff max 2 s (D6b); FR-025 and SAD §4.1.4 discard unacknowledged edits with a user notice; TC-009 covers it. |
| B9 | NFR measurement end points ("visible") could not be measured by scripted clients; percentile method, warm-up, rejected-operation handling unspecified. | SRS §5 defines quantity, start/end, conditions, nearest-rank p95; TC-019/020/009/013 use identical definitions and record raw data. |
| B10 | Snapshots could exceed MongoDB's 16 MB limit with only a vague "future GridFS" fallback. | FR-008 board content limit 15 MB (D11c) with `BOARD_FULL`; defensive snapshot check; GridFS explicitly future work (SAD §3.6 table); TC-022. |
| B11 | Viewport 1280 px (SRS §2.4) and keyboard access (SRS §3.1) had no requirement or test; SAD UX contained an untested 4.5:1 contrast target. | NFR-006 includes the 1280 px viewport, NFR-007 includes keyboard access, TC-021 checks both; the contrast target was removed. |
| B12 | Guest tokens had no defined lifetime; SEC-REQ-002 only covered session tokens. | SEC-REQ-002 covers guest tokens (one board, min(link expiry, 24 h)); SAD §3.9.2; TC-106 adds expired and wrong-board guest tokens. |
| B13 | TC-102 allowed "403 or 404" for non-members — not objectively verifiable. | 403/404 rule (D14a): no role → 404, low role → 403; TC-102 expects exact codes. |
| B14 | Test status values (Pass/Fail/Blocked/Not executed) and RTM codes (N/P/A) had no defined mapping. | STP §13 and SRS §8 define the derivation; checker enforces it; all tests "Not executed", all RTM entries N. |
| B15 | TC-018 combined member-role changes and ownership transfer; FR-049 and FR-050 were not independently verifiable. | TC-018 = ownership transfer; new TC-023 = role change and removal. |
| B16 | FR-052 claimed "update timing as NFR-001", but NFR-001 measures board operations, not presence. | No separate presence timing in v1.0 (stated in FR-052). |
| B17 | SD-02 created the restore version before the board `seq` advanced, so its `boardSeq` would not match. | SD-02 now replaces objects, advances `seq`, then stores the version with that `boardSeq`. |

## C. Open items (need team decisions — not resolvable from available sources)

1. Approval by Krishna, Pranav and Prithvi of every planning decision D1–D16 (only Rachit's planning approval is recorded).
2. Approval of the drafting values: D1a–D1c, D3a, D4a–D4c, D5a, D5b, D6a, D6b, D7a–D7c, D8a–D8e, D11a–D11c, D13a, D14a, D14b.
3. Feasibility of the provisional NFR targets (NFR-001 to NFR-005) — no measurement exists.
4. SEC-REQ-007 cannot be verified without a deployed instance (TC-109).
5. Submission deadline (the brief's ETA of 28-09-2026 has passed) and the instructor's interpretation of the template's RTM "Status (N/P/A)" codes.
6. Diagram legibility: on the 6-inch portrait text width the smallest sequence-diagram text is about 5 pt (2× resolution images). If the instructor requires larger diagrams, options are landscape pages or fewer lifelines.

## D. v0.3 review (10-10-2026)

A further review is recorded in `review-checklist-v0.3.md` (findings R1–R14). The most important
correction: the board content limit is now defined on the BSON-encoded size that MongoDB actually
stores (R1), and a clear or restore can no longer complete without its version (R2, R3). The
checklist in section A was re-run after these changes with the same results.

## E. v0.4 review (10-10-2026)

Findings R16–R20 (see `review-checklist-v0.3.md`). Re-checked after the corrections: the size
limits use the same measures (M1 message 65,536 bytes; M3 content 15,728,640 bytes; M4 version
document ≤ 16,711,680 bytes defensive, 16,777,216 bytes MongoDB) in SRS FR-008/SEC-REQ-005, SAD §3.6
and STP TC-022/TC-107; the restore recovery order agrees across SAD §3.6, §4.1.2, SD-02, FR-033 and
TC-024; checklist section A re-run with the same results.

## F. v1.0 final correction audit (11-10-2026)

| # | Finding | Resolution (files) |
|---|---|---|
| F1 | STP §11 stated that the SRS v1.0 "is signed off", while all approval tables are blank and sign-off is pending (E1). | §11 now states sign-off as a precondition of test execution; the §5 entry criteria say that none is met yet (`stp/06-12-…`, `stp/05-strategy.md`). |
| F2 | SEC-REQ-008 required actor and board for every security event, but a failed login has neither; the correlation ID, outcome and the producing component were unspecified. | SEC-REQ-008 and SEC-OBJ-003 define required fields and the JSON `null` form; SAD §4.4 specifies the security event record, producing components and field allow-list (D13b); STRIDE and control mapping, §5.1 and TC-104 updated; SEC-REQ-008 maps to COMP-03 to COMP-07 and COMP-09 in SAD §3.8 and the RTM. |
| F3 | TC-024 step 1 and FR-033 treated a failed write of the restore version as a pre-commit failure, but SAD §3.6 writes that version after the commit point. | Pre-commit failures of a restore are the size check and the commit write (§3.6 step 2, SD-02 alt 3, fault `commit_write_error`); a later write failure is completed by recovery. FR-033 and TC-024 aligned; TC-024 retitled (registry). |
| F4 | Retry, distinct request, key reuse, concurrency, key-retention limit and failed start-up recovery were not all stated; `after_version_insert` and `after_preclear_version` hooks were unused by any test. | SAD §3.6 rules and failure table, API-03 contract and example, SD-02/SD-05 notes, D5c/D14c; TC-024 and TC-025 now cover every failure point including crash after completion and failed recovery. |
| F5 | TC-013 and TC-102 sent restore requests without the required `Idempotency-Key`. | Both test cases now send a new key per request. |
| F6 | "verified by" wording for unexecuted tests (SAD §3.6, STRIDE row) and for the size-model calculation. | Reworded to "to be verified" / "a calculation, not a test of the system". |
| F7 | API-03 example: the 409 response for a reused key was truncated (`...`) and not valid JSON. | Complete request and `409 Conflict` body in the common error format; all three JSON bodies checked with a JSON parser (`sad/04c3-api03-versions.md`). |
| F8 | TC-005 said the rejected clear (failed before-clear version) is verified by a unit test; TC-025 step 1 now tests it, and the wording read as completed verification. | TC-005 refers to TC-025 step 1 (`stp/tc-functional-nfr.md`). |
| F9 | SRS §2.6 said performance targets "are verified" in the local environment, which can be read as done. | Reworded to "are to be verified … have not been measured yet" (`srs/02-overall-description.md`). |
| F10 | API-01 example: the `op:applied` line abbreviated its payload as `{...}`, which could be read as JSON. | The payload is now written out (identical to the submitted payload, as §4.1.3 requires; no new fields) and the example states that every JSON part is complete (`sad/04c1-api01-realtime.md`). |
| F11 | SRS template §4.5 "Maintenance & Monitoring" has no counterpart in the SRS. | No change: template §4.1–§4.5 are ATM sample feature groups (IDs ATM-F-001…045, e.g. "technician menu", "cash cassette"); the brief (Part-1, item 1) requires FRs/NFRs, a use-case diagram and a security section but no maintenance section. Project logging/monitoring is covered by SEC-REQ-008 and SAD §4.4. |
| F12 | `subjectId` appeared in the SAD §4.4 allow-list, D13b and TC-104 but not in SEC-REQ-008, SAD §3.9.6 or STP §5.1; its meaning (internal account ID, never an e-mail) was implicit. | Defined and listed identically in SEC-REQ-008, SAD §3.9.6/§4.4, STP §5.1, TC-104 and D13b. |
| F13 | The login limiter counted "per account", so an unregistered e-mail never reached `429` while a registered one did — the response revealed account existence. | SEC-REQ-006, D8b and SAD §3.9.6 count per entered e-mail (HMAC key, never stored or logged); SAD §4.4 adds identical `401`, dummy bcrypt comparison and identical `429`; TC-108 step 2 tests an unregistered address. |
| F14 | Login responses were required to be "identical", but every error body carries a unique `requestId` (SAD §4.3), so TC-108 could not pass as written; D8b did not record the dummy bcrypt comparison or the HMAC-keyed limiter. | Equality defined as same status, error code and message (SEC-REQ-006, SAD §3.9.6/§4.4, STP §5.1, TC-108); D8b completed and marked for team review. |

Re-checked with no change needed: size measures M1–M4; NFR-001 to NFR-007 definitions against
TC-019 to TC-021, TC-009 and TC-013; the FR-051 permission matrix against the API-02/API-03 role
columns; all 34 test cases remain "Not executed" and all 50 RTM rows remain N.
