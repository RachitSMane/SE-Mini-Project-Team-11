<!-- Owner: Krishna | Reviewers: Rachit, Pranav | Status: v1.0 -->

#### SD-01 — Live drawing synchronisation, acknowledgement and reconciliation

Realises FR-001, FR-008, FR-020 to FR-023, FR-026, FR-027, FR-051, NFR-001. Editor A adds a
stroke: the client shows it optimistically, the server persists it, acknowledges it with its
sequence number and broadcasts it. Then A and Editor B update the same object at nearly the same
time and the server's queue order decides the final state. The diagram also shows the gap-repair
safeguard, the rollback of a rejected operation and reconnection recovery (protocol rules in §4.1.3–§4.1.4).

Figures 3–8 show the flow in 6 parts.

![Figure 3 — SD-01 (part 1 of 6): add a stroke: optimistic edit, validation, authorisation](../../diagrams/png/sd-01-live-sync.png)

![Figure 4 — SD-01 (part 2 of 6): add a stroke (continued): persist, acknowledge, broadcast](../../diagrams/png/sd-01-live-sync_001.png)

![Figure 5 — SD-01 (part 3 of 6): concurrent update of the same object](../../diagrams/png/sd-01-live-sync_002.png)

![Figure 6 — SD-01 (part 4 of 6): gap repair](../../diagrams/png/sd-01-live-sync_003.png)

![Figure 7 — SD-01 (part 5 of 6): rejected operation is rolled back](../../diagrams/png/sd-01-live-sync_004.png)

![Figure 8 — SD-01 (part 6 of 6): reconnection recovery](../../diagrams/png/sd-01-live-sync_005.png)
