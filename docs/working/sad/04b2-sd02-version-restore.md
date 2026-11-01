<!-- Owner: Rachit | Reviewers: Krishna | Status: v1.0 -->

#### SD-02 — Restore a previous version

Realises FR-033, FR-034, FR-051, NFR-005. The Owner restores version *n* through API-03. The
restore runs as a task in the board queue: it checks the Owner role and the idempotency key,
commits the operation in the durable journal (`boards.pendingOp`), stores the restore version,
replaces the board objects, completes the journal entry and only then pushes the restored state to
every participant (§3.6). A restore from a non-Owner, or one that fails before its commit, is
rejected without any change; a restore interrupted after its commit is completed at start-up.

Figures 9–17 show the flow in 9 parts.

![Figure 9 — SD-02 (part 1 of 9): restore request and authorisation](../../diagrams/png/sd-02-version-restore.png)

![Figure 10 — SD-02 (part 2 of 9): idempotency check and snapshot](../../diagrams/png/sd-02-version-restore_001.png)

![Figure 11 — SD-02 (part 3 of 9): commit and version insert](../../diagrams/png/sd-02-version-restore_002.png)

![Figure 12 — SD-02 (part 4 of 9): replace objects and complete](../../diagrams/png/sd-02-version-restore_003.png)

![Figure 13 — SD-02 (part 5 of 9): broadcast and response](../../diagrams/png/sd-02-version-restore_004.png)

![Figure 14 — SD-02 (part 6 of 9): rejected or failed requests](../../diagrams/png/sd-02-version-restore_005.png)

![Figure 15 — SD-02 (part 7 of 9): repeated request](../../diagrams/png/sd-02-version-restore_006.png)

![Figure 16 — SD-02 (part 8 of 9): start-up recovery of an interrupted restore](../../diagrams/png/sd-02-version-restore_007.png)

![Figure 17 — SD-02 (part 9 of 9): start-up recovery (continued)](../../diagrams/png/sd-02-version-restore_008.png)
