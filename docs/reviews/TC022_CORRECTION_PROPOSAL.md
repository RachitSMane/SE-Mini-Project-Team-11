# TC-022 correction proposal (for team review — nothing here has been applied)

Prepared 14-10-2026. **Proposal only.** The STP, the RTM and the six files in `submission/final/`
were not changed. TC-022's status remains **Pass**, as recorded on 12-10-2026 and subject to team
review. Applying any of these corrections means editing STP sources and regenerating the deliverables,
which needs a team decision.

Sources compared:
- STP record `docs/working/stp/tc-functional-nfr.md`, Appendix A.1, "TC-022 — Board content size
  limit" (lines 329–342).
- STP §14 `docs/working/stp/14-15-metrics-approvals.md` (line 23).
- Test `server/tests/integration/boardLimit.test.js` (current, session-3 version; line numbers below).
- Evidence `docs/evidence/2026-10-12-reverification/`, `docs/evidence/2026-10-14-tc022-investigation/`
  and `docs/evidence/2026-10-14-final-checks/`.

Summary: A–C and F–G are description mismatches. The test checks the same requirement, sometimes more
strictly. **No recorded TC-022 value changes** because of them. D and E concern the recorded result
and its history; they change what the record says, not whether TC-022 passed.

---

## A. Cross-check of M3: server log vs. database

| | |
|---|---|
| Where | STP App. A.1, TC-022, *Steps*, step 1 |
| Current wording | "Record M1 of every message and the final M3; cross-check M3 with `board_content_bytes` in the server log." |
| Actual behaviour | No `board_content_bytes` field exists anywhere in `server/src`. The test cross-checks M3 against the stored board: `expect((await Board.findById(boardId).lean()).contentBytes).toBe(m3)` (line 112), and at the limit `…contentBytes).toBe(LIMIT)` (line 133). The server log does carry the size in `op.rejected` lines (`contentBytes`, `attemptedBytes`); the test checks `attemptedBytes === LIMIT + 1` there (line 128). Also, the test records the **maximum** M1 (`maxM1`), not M1 of every message; every M1 is asserted ≤ 65,536 bytes (line 75; maximum again at line 113). |
| Why it matters | The step names an artefact that does not exist, so a reviewer cannot repeat the check as written. |
| Proposed wording | "Record the largest M1 (every M1 is checked against 65,536 bytes) and the final M3; cross-check M3 with the board's stored content size (`boards.contentBytes`) and, for the rejected operation of step 3, with `attemptedBytes` in the `op.rejected` log line." |
| Team decision? | Yes: whether to correct the STP text (deliverable change). |
| Effect | Description only. |

## B. Submission rate in step 1

| | |
|---|---|
| Where | STP App. A.1, TC-022, *Steps*, step 1 |
| Current wording | "E submits generated strokes one at a time (at most 20 per second, below the rate limit), waiting for each acknowledgement, …" |
| Actual behaviour | Each fill submission waits for its acknowledgement and then for 40 ms (line 77: `setTimeout(r, 40)`, commented "< 30 operations/s (SEC-REQ-006)"). That bounds the rate below 25 per second, not 20. The 5 boundary operations of steps 2–4 (lines 123–137) and the 2 deletes of step 6 (line 159) are sent without the pause; the new stroke of step 6 uses the paced path. For comparison, TC-006/TC-007 pace at ≥ 50 ms (IMPLEMENTATION_STATUS §5). |
| Why it matters | The documented bound is not what the test enforces. The real bound still stays under the 30 operations/s limit, and no `RATE_LIMITED` rejection occurred (every fill operation is asserted `ok: true`). |
| Proposed wording (option 1, text) | "…one at a time (each submission waits for its acknowledgement and then 40 ms, i.e. fewer than 25 per second, below the 30 operations/s limit), …" |
| Option 2 (test) | Change the pause to 50 ms so the documented ≤ 20 per second holds. This changes the test (not its assertions) and needs a rerun. |
| Team decision? | Yes: option 1 or option 2. |
| Effect | Description only (option 1). Option 2 needs new runs, though no assertion changes. |

## C. Version step: waiting for *T* and `mongosh`

| | |
|---|---|
| Where | STP App. A.1, TC-022, *Preconditions* and *Steps*, step 5 |
| Current wording | Preconditions: "…a test build with a periodic interval *T* short enough for step 6; access to the test MongoDB with `mongosh`." Step 5: "Version near the limit: wait one interval *T*; in `mongosh`, read the newest version and run `Object.bsonsize(db.versions.findOne({boardId: B}, {sort: {number: -1}}))`." |
| Actual behaviour | The test server runs with `VERSION_INTERVAL_MS: '0'` (line 46), which disables the periodic timer (`server/src/realtime/realtimeServer.js:200`). Step 5 calls the function the timer would call, `versions.triggerAutomatic(boardId, 'periodic')` (line 143). It reads the newest version through the MongoDB driver (`Version.collection.findOne(…, { sort: { number: -1 } })`) and measures it with `BSON.calculateObjectSize` (line 145), the driver's equivalent of `Object.bsonsize`. It asserts M4 ≤ 16,711,680 (line 149), plus a tighter bound M4 ≤ 15,728,640 + 286 + 1,024 (line 150). `mongosh` is not used. |
| Why it matters | Same measure, different procedure. IMPLEMENTATION_STATUS §5 lists the direct-trigger deviation for TC-005 and TC-012 but **not** for TC-022. |
| Proposed wording | Preconditions: "…test server with the periodic timer disabled (`VERSION_INTERVAL_MS=0`); version creation is triggered through the same function the timer calls." Step 5: "Trigger a periodic version directly (same code path as the timer); read the newest version document and measure its BSON size (`BSON.calculateObjectSize`, equivalent to `Object.bsonsize` in `mongosh`)." |
| Alternative | Leave the STP text and add TC-022 to the IMPLEMENTATION_STATUS §5 list of recorded deviations. |
| Team decision? | Yes: correct the STP, or record it as a deviation. |
| Effect | Description only. |

## D. Recorded result and §14 summary vs. the session-3 investigation

| | |
|---|---|
| Where | STP App. A.1, TC-022, *Actual result*; STP §14 (line 23) |
| Current wording | Actual result: "…run 2, on a heavily loaded machine — TC-022 failed at step 6: deleting stroke `fill-0000` was rejected; the test does not record the error code and the cause is not known; … Kept as Pass on Rachit's decision of 12-10-2026 with this reliability issue open and team review pending…" §14: "…test-reliability issues found in the re-verification of the same day (one intermittent TC-022 failure under load) are listed there as open." |
| Actual evidence (14-10-2026) | Under artificial CPU load the failure was reproduced at the same step with code `NOT_READY`. Both scripted clients had dropped with `ping timeout` during step 5; the delete was never sent to the server. That makes it a test-harness fault, not an FR-008 fault. Run 2 is only *consistent with* this; its code was not recorded. The test was changed (reconnect wait + diagnostics). Why heartbeats are missed under load is **unexplained**. |
| Why it matters | The record says "cause not known" while the repository documents a reproduced mechanism and a test change. |
| Proposed wording (to append; keep the existing text as history) | "Investigation of 14-10-2026 (`docs/evidence/2026-10-14-tc022-investigation/`): under artificial CPU load the step-6 failure was reproduced with error `NOT_READY` — both scripted clients had been disconnected by the Socket.IO heartbeat (`ping timeout`) during step 5, so the delete was never sent. Test-harness fault, not an FR-008 fault; run 2 of 12-10-2026 is consistent with this mechanism but cannot be confirmed. The test now waits (≤ 60 s) for both clients to rejoin before step 6 and records disconnects; expected results unchanged. The cause of the missed heartbeats under load is not established." §14: replace "are listed there as open" with "are listed there; the TC-022 failure was traced to a test-harness fault and the test changed (14-10-2026), pending team review." |
| Team decision? | **Yes:** keep TC-022 as Pass; accept the harness-fault conclusion; approve the wording. |
| Effect | Changes the record's narrative; does not by itself change the Pass status. |

## E. Recorded values come from an earlier test version

| | |
|---|---|
| Where | STP App. A.1, TC-022, *Actual result* ("Run 12-10-2026 on the uncommitted working tree of branch docs/setup (base commit 82af885)…"); STP §13 rule: "a result is recorded only from an actual run, together with the build (Git commit) and date." |
| Actual evidence | The recorded values (243 strokes, max M1 31,881 B, M4 15,727,703 B) come from the 12-10 test version. The current version (session 3) gave the same values in its runs of 14-10-2026: TC-022 alone passed in 58.6 s and 65.9 s, and the full `npm test` passed 77/77 three times. Under load, only the **first** post-fix version passed (before the 60 s bounds were added), at more than 286 s of its 300 s Jest timeout. The **final version has not been run under load.** No run is bound to a Git commit. |
| Why it matters | The record should say which test version produced the result, and the STP's own rule requires a commit hash. |
| Proposed resolution | After the changes are committed, rerun TC-022 (and the full suite) on that commit and record the hash, date and values. Until then, add: "Test changed on 14-10-2026 (diagnostics, reconnect wait); the changed version passed alone and in the full suite on the uncommitted tree; not run under load." |
| Team decision? | Yes, as part of the commit/rerun plan (IMPLEMENTATION_STATUS §9 step 4). |
| Effect | Recording only. A rerun on the commit is needed to satisfy STP §13. |

## F. Step number in the preconditions (additional finding)

| | |
|---|---|
| Where | STP App. A.1, TC-022, *Preconditions* |
| Current wording | "a test build with a periodic interval *T* short enough for step 6" |
| Actual | The interval matters for **step 5** (version near the limit); step 6 is the deletion. |
| Proposed | Superseded by C. If C is not adopted, change "step 6" to "step 5". |
| Team decision? | Editorial; include in the same STP revision. |
| Effect | Description only. |

## G. Checks performed by the test but not listed in the STP, and one expected item not checked (additional finding)

- **Not in the STP, but done by the test:**
  - an update that grows an object past the limit is rejected with `BOARD_FULL` (line 134);
  - a new object at the limit is rejected (line 135);
  - a non-growing update at the limit is accepted (line 137);
  - the tighter M4 bound (line 150).
- **In the STP, but not checked:** step 3's expected result "E removes its optimistic stroke **and
  shows the message**". The test checks that the optimistic object is removed (line 127). A scripted
  client cannot check that a message is shown, and the test has no UI. Whether the "Board is full"
  message appears in the browser is not covered by TC-022's evidence.
- Proposed: list the extra checks under *Steps*. For the message, either state that TC-022 checks the
  rejection through the client sync module only, or name the UI evidence that covers it.
- Team decision: yes (scope wording). Effect: description only, unless the team asks for UI evidence
  of the message, which would require a new check.

---

## Decisions requested from the team

1. Keep TC-022 as **Pass**, given D and E?
2. Correct the STP text (A, C, F, G), or record them as deviations in the status report?
3. Pacing: change the text (B option 1) or the test (B option 2)?
4. Approve the wording in D for the Actual result and §14.
5. Rerun TC-022 on the committed build and record the hash (E). Optionally also a loaded run, given the
   300 s timeout margin.
6. After 1–5: regenerate the deliverables, keeping backups of the current six files.
