# Team 11 — Review Checklist for Draft v0.3

> **Historical record** (review of 10-10-2026, before implementation); test statuses quoted here are
> those of that date.

<!-- Owner: Prithvi (traceability) | Produced before editing; every finding verified against the current files. -->

Review date 10-10-2026. Inputs: SRS/SAD/STP v0.2 (Markdown sources and `docs/final/*.docx`), the
three instructor templates (`docs/templates/`, unchanged), the brief
`SE_Mini_Project_Delivereables_Part-1.pdf`, `rtm.md`, `id-registry.md`, `DECISIONS.md`.
Baseline before this review: `python tools/check_trace.py` → 1,388 checks passed, 0 failed (the
findings below are semantic and template issues the checker does not detect).

Severity: **Critical** = mandatory deliverable missing, incorrect security/safety claim, broken
traceability or serious contradiction; **High** = incorrect/ambiguous requirement, missing design
behaviour, untestable criterion, unreadable diagram, significant template violation;
**Medium** = formatting, incomplete explanation, weak procedure, minor inconsistency; **Low** = cosmetic.

| # | Sev. | Document / section | Problem found | Evidence | Correction | Also affects |
|---|---|---|---|---|---|---|
| R1 | Critical | SRS FR-008; SAD §3.6, §3.7, §4.1.2, API-01, §4.4; STP TC-022 | The 15 MB limit is defined on "serialised board objects" without saying which serialisation. MongoDB's 16 MB limit applies to the **BSON** size of the version document. BSON is much larger than JSON for coordinate arrays (each number in an array costs 1 type byte + index key + 8-byte double, ≈ 11 bytes vs. ≈ 6 JSON characters), so a board of 15 MB "serialised" (JSON) could exceed 16 MB as a BSON snapshot. The SAD claims "the 15 MB content limit plus metadata stays below MongoDB's 16 MB document limit" — not established. | FR-008 text; SAD §3.6 table row "Snapshot storage"; MongoDB limit = 16 MiB (16,777,216 bytes) BSON | Define the limit on the BSON-encoded size of the board's objects array: 15 MiB = 15,728,640 bytes, tracked as a conservative upper bound (per-object BSON size + 9 bytes array overhead); defensive check of the complete version document against 16 MiB − 64 KiB before writing; reject before persistence and never acknowledge. Mark as proposed (D11c revised). | DECISIONS D11b/D11c; SD-01; TC-022; audit |
| R2 | High | SAD §4.1.2 step 4 | Clearing runs the "before clear" snapshot first, but the behaviour when that snapshot cannot be written (database error, defensive size check) is unspecified — clearing anyway would destroy the pre-clear content that FR-007 promises to preserve. | "For `board:clear`, COMP-07's 'before clear' trigger runs first" with no failure rule | Specify: if the before-clear version cannot be written, the clear is rejected (`INTERNAL`), nothing is cleared or broadcast. Add to FR-007 acceptance, SAD §4.1.2/§4.4, TC-005 note (fault injection is a unit-level test). | FR-007, §4.4, TC-005 |
| R3 | High | SAD SD-02, §3.6, §4.1.5 | Restore writes the new board objects first and the "restore" version second. A failure between the two leaves the board restored without the version record that FR-033 requires. | `sd-02-version-restore.puml` lines 36–37 | Write the restore version first (with `boardSeq = seq + 1`), then replace objects and advance `seq`; on start-up, roll forward any version whose `boardSeq` is greater than `boards.seq`. Update SD-02 and §4.1.5. | FR-033, TC-013 |
| R4 | High | SAD §4.2 diagrams | Sequence-diagram text is ≈ 5.0–6.0 pt on 6-inch portrait pages (previous report); parts are height- and width-limited. | Measured PNG sizes; scale to 6.0 × 8.3 in | Split each sequence diagram at section boundaries into parts of ≤ ≈ 1,400 px (at 192 dpi) and let the generator place wide figures on landscape pages when that gives ≥ 15 % larger text. Target ≥ 7 pt. Replace `group` wrappers that prevent splitting with `== [alt] … ==` dividers. | build_docs.py, SAD §4.2 |
| R5 | Medium | SRS §8, STP §13, `rtm.md` | RTM columns differ from the template ("Section ref / Design Spec", "Module"). | SRS template §8 header: `Req ID \| Requirement short \| Section ref / Design Spec \| Module \| Test case(s) \| Status (N/P/A) \| Comments` | Use the template's column headings: "Section ref / Design Spec" = `SRS x.y / SD-…, API-…`; "Module" = COMP IDs. Update generator and checker column indices. | check_trace.py, SAD §3.8 |
| R6 | Medium | SRS §4.4 permission matrix | Matrix row lacks "view members list", although API-02 `GET /boards/{boardId}/members` is a Viewer operation. | Matrix row 1 vs. API-02 table | Add "members list" to the Viewer row. | API-02, TC-102 |
| R7 | Medium | SRS §6 | Exit criterion "no NFR target missed by more than the tolerance agreed at Gate A (none agreed yet)" cannot be classified pass/fail. | `06-acceptance.md` | Replace with "every NFR test case passes against the target values approved at Gate A". | STP §5 exit criteria |
| R8 | Medium | SRS §7, SAD §3.3/§4.2 | Figure captions inconsistent ("UC-01 …", "Figure 3.3 — …", "SD-01 (part 1 of 3) — …"); only one figure is referenced in the text. | Caption list | Number figures per document ("Figure n — …") and reference each figure in the text. | — |
| R9 | Medium | SAD §3.9.2 | Guest tokens expire after at most 24 h while links may live 7 days; the guest's path after token expiry is not stated. | §3.9.2 | State that the client returns the guest to the guest entry page, where a still-valid link can be resolved again. | FR-046 |
| R10 | Low | All | Documents still say Draft v0.2; this review changes content. | Front matter | Bump to Draft v0.3 with revision-history rows; keep "not baselined"; no approvals added. | footers |
| R11 | Low | SRS §5.1 heading level | Template uses Heading 2 for "5.1 Security" (same level as §5); ours uses a subsection level. | SRS template | Keep the hierarchical level (5.1 is a subsection of 5); recorded as an intentional deviation, numbering text unchanged. | — |

Verified as **not** defects (no change): template keeps headings with the next paragraph
(`keepNext` in Heading 1–4 styles of all three templates); all required template sections present
in all three documents; 32 test cases present (TC-001–TC-023, TC-101–TC-109) all "Not executed";
all 50 RTM rows N; component diagram (not class diagram) retained per the brief; two use-case
diagrams retained per the SRS template; ownership-transfer contract identical in FR-050, API-02,
SD-04, TC-018 and D14b; no ATM or template placeholder text in the generated documents; the
brief's ETA 28-09-2026 is still unconfirmed (flagged, not changed).

## Resolution status (after implementation)

| # | Status | Where resolved |
|---|---|---|
| R1 | Resolved (decision D11c revised, still proposed) | FR-008; SRS §2.5; SAD §3.6 (accounting rule, storage, defensive check, reference size), §4.1.2, API-01, §4.4; TC-022; DECISIONS D11b/D11c |
| R2 | Resolved (new proposed decision D5c) | FR-007 and AC-FR-007; SAD §4.1.2, §4.4; TC-005 dependencies (unit-level fault injection) |
| R3 | Resolved (D5c) | SAD §3.6 restore order and roll-forward; SD-02 parts 2 and 4; §4.4 |
| R4 | Resolved | Sequence diagrams split into 4–6 parts (21 images); `hide footbox`; actors merged into client lifelines; generator places a figure on a landscape page when that gives ≥ 15 % larger text; component diagram redrawn without duplicate title. Smallest diagram text now ≈ 6.6–6.8 pt (was ≈ 5.0 pt) |
| R5 | Resolved | `rtm.md` columns as in the SRS template; checker and generator updated |
| R6 | Resolved | SRS §4.4 matrix row 1 |
| R7 | Resolved | SRS §6 exit criteria |
| R8 | Resolved | SRS Figures 1–2; SAD Figures 1–22, each referenced in the text |
| R9 | Resolved | SAD §3.9.2 |
| R10 | Resolved | All three documents Draft v0.3 with revision rows; approvals still empty |
| R11 | Accepted deviation | Not changed |

Additional defects found and corrected during implementation:

| # | Sev. | Problem | Correction |
|---|---|---|---|
| R12 | High | Component diagram lacked two dependencies used in the sequence diagrams: Version History → Board & Access (`authorize`, SD-02) and Board & Access → Real-time Server (role changes and revocations, SD-03, SD-04). | Both dependencies added to the component diagram. |
| R13 | High | SD-04 omitted three rejection cases specified in API-02: missing `confirm` (400), no role / missing board (404), concurrent transfer (0 documents modified → 403). | SD-04 parts 5–6 show all rejection cases. |
| R14 | Medium | SD-01 did not show reconnection recovery, which FR-025, NFR-004 and SAD §4.1.4 specify. | SD-01 part 6 added; RTM design elements for FR-025 and NFR-004 now include SD-01. |
| R15 | Medium | The limit counted "each object's BSON size" but did not say whether the snapshot copies the storage-only fields (`_id`, `boardId`, `updatedSeq`) of `boardObjects`; if it did, the count would under-estimate the snapshot. | SAD §3.6 now defines the snapshot element form (without storage-only fields) and measures exactly that form; update/delete/start-up accounting stated. |

## v0.4 corrections (10-10-2026)

| # | Sev. | Problem found | Correction |
|---|---|---|---|
| R16 | Critical | Start-up recovery conflict: SAD §4.1.2 raises `boards.seq` to the largest `updatedSeq`, while §3.6 rolled an interrupted restore forward only if the latest version's `boardSeq` exceeded `boards.seq`. Objects already written by an interrupted restore carry the new `updatedSeq`, so sequence recovery could hide the incomplete restore and leave a partially restored board. Concurrency, retry, idempotency and reporting were unspecified. | SAD §3.6 "Restore consistency and recovery" table and mandatory start-up order (roll-forward on the stored `boards.seq` first, then sequence recovery, then size recomputation); §4.1.2 references the order; new log events; FR-033 acceptance covers failure and recovery; new TC-024 with fault injection; D5c updated. |
| R17 | High | TC-022 equated "2,000 points ≈ 64 KiB BSON" with a message "below 64 KB"; the message limit was written "64 KB" without a byte definition. | Four explicit size measures M1–M4 in SAD §3.6 with a derivation of the version-document margin; message limit stated as 65,536 bytes per Socket.IO packet everywhere (SRS §3.4, SEC-REQ-005, SAD §3.9, API-01, STP §5, §5.1, TC-107, D8d); TC-022 rewritten with a deterministic generator that records M1–M4 and checks boundary, rejection without persistence/broadcast, version size and recovery after deletion. |
| R18 | Medium | Component diagram dense (≈ 6.6 pt). | Split into Figure 1 (overview, ≈ 9.6 pt) and Figure 2 (server dependencies, ≈ 9.4 pt, landscape); sequence-diagram figures renumbered 3–23. |
| R19 | Medium | Stale permissions on open connections were not tested for ownership transfer or guest-token reuse after revocation. | TC-018 step 8 sends `board:clear` over the former Owner's open socket; TC-103 step 6 retries with the revoked guest token. |
| R20 | Medium | Planned test assets (scripts, generator, hooks) could be read as existing. | STP §6 and Appendix A state that none exists yet; SAD §4.1.6 likewise. |
