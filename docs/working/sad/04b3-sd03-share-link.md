<!-- Owner: Prithvi | Reviewers: Krishna | Status: v1.0 -->

#### SD-03 — Join through a share link, then revocation

Realises FR-024, FR-046, FR-047, FR-048, FR-051, SEC-REQ-002, SEC-REQ-004. A guest opens a share
link, the server validates the hashed token and issues a board-scoped guest token, and the guest
joins the board room and receives the full state. When the Owner later revokes the link, the
guest's socket is notified and disconnected.

Figures 18–22 show the flow in 5 parts.

![Figure 18 — SD-03 (part 1 of 5): guest resolves a share link](../../diagrams/png/sd-03-share-link.png)

![Figure 19 — SD-03 (part 2 of 5): valid link: guest token issued](../../diagrams/png/sd-03-share-link_001.png)

![Figure 20 — SD-03 (part 3 of 5): guest joins the board](../../diagrams/png/sd-03-share-link_002.png)

![Figure 21 — SD-03 (part 4 of 5): expired, revoked or unknown link](../../diagrams/png/sd-03-share-link_003.png)

![Figure 22 — SD-03 (part 5 of 5): Owner revokes the link](../../diagrams/png/sd-03-share-link_004.png)
