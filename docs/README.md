# Team 11 — Project Documents (SRS, SAD, STP)

This folder holds the Markdown sources and generated Word versions of the three Part-1 deliverables
for the Real-Time Collaborative Virtual Whiteboard:

| Document | Final file | Working drafts |
|---|---|---|
| Software Requirements Specification (SRS) | `final/Team11_SRS.docx` | `working/srs/` |
| Software Architecture and Design Specification (SAD) | `final/Team11_SAD.docx` | `working/sad/` |
| Software Test Plan (STP) with test cases and RTM | `final/Team11_STP.docx` | `working/stp/` |

**Status:** version 1.0, final for submission. The submission copies (DOCX and PDF) are in
`submission/final/`. Team sign-off (the approval tables, Gate A) is still pending, and no test has
been executed because the system is not implemented. `DECISIONS.md` lists every design decision
with its rationale and the remaining external actions (E1–E5).

## Layout

```
docs/
  README.md            this guide
  DECISIONS.md         decision log (D1–D16, design values D1a–D14c, external actions E1–E5)
  templates/           the three supplied Word templates (local only, NOT committed)
  traceability/
    id-registry.md     every ID, its owner and status (Prithvi)
    rtm.md             master Requirements Traceability Matrix (Prithvi; authors update own rows)
    consistency-audit.md  cross-document consistency audit (Prithvi; rerun before Gate A and submission)
    review-checklist-v0.3.md  findings of the v0.3 review and their resolution
  working/
    srs/  sad/  stp/   Markdown section drafts, one owner per file (owner in the first line)
  diagrams/
    src/               PlantUML sources (.puml)
    png/               rendered diagrams used in the Word files
  final/               generated Word documents (only the final-assembly branch commits these)
tools/
  check_trace.py       ID and traceability checks (run before every push)
  render_diagrams.py   renders docs/diagrams/src/*.puml to PNG
  build_docs.py        assembles working drafts into the Word templates
  export_pdf.ps1       exports the generated DOCX files to PDF with Microsoft Word (Windows)
  size_model.py        design calculation of the size measures M1-M4 (SAD §3.6)
  tests/               unit tests for the documentation tools (python -m unittest discover -s tools/tests)
```

## Who owns what

Each Markdown file names its owner and reviewers in its first line. Only the owner edits a file;
others comment in the Pull Request.

| Member | SRS | SAD | STP | Shared artefacts |
|---|---|---|---|---|
| **Rachit** (SRS lead) | `00-front-matter`, `01-introduction`, `04a-fr-canvas`, `04b-fr-sync`, `04c-fr-versions`, `05-nfr`, `06-acceptance`, §7.1 of `07-use-cases` | `04b2-sd02-version-restore`, `04b5-sd05-clear`, `04c3-api03-versions`, `04d-errors-logging` | — | `diagrams/src/uc-01-collaborate.puml`, `sd-02-version-restore.puml`, `sd-05-clear.puml`, `tools/build_docs.py`, final assembly |
| **Krishna** (SAD lead) | — | `01-02-introduction`, `03a-goals-stakeholders`, `03b-components`, `03c-pattern-stack-risks`, `03d-traceability`, `04a-design-overview`, `04b1-sd01-live-sync`, `04c1-api01-realtime`, `04e-ux-open-issues`, `05-appendices` | — | `diagrams/src/component-diagram.puml`, `component-dependencies.puml`, `sd-01-live-sync.puml` |
| **Pranav** (STP lead) | — | — | `01-02-introduction-items`, `03-04-features`, `05-strategy`, `05-1-security-validation`, `06-12-environment-to-suspension`, `14-15-metrics-approvals`, `tc-functional-nfr` | — |
| **Prithvi** (security & traceability lead) | `02-overall-description`, `03-external-interfaces`, `04d-fr-access`, `05-1-security`, §7.2 of `07-use-cases`, `08-rtm` | `03e-security-architecture`, `04b3-sd03-share-link`, `04b4-sd04-transfer-ownership`, `04c2-api02-access` | `13-traceability`, `tc-security` | `traceability/id-registry.md`, `traceability/rtm.md`, `diagrams/src/uc-02-access.puml`, `sd-03-share-link.puml`, `sd-04-transfer-ownership.puml`, `tools/check_trace.py`, `DECISIONS.md` |

All four members review the SRS before Gate A (team sign-off), and each member reviews at least one document
outside their own area (reviewers are listed in each file's first line).

## One-time setup (every member)

1. Clone: `git clone https://github.com/RachitSMane/SE-Mini-Project-Team-11.git`
2. Install Python 3.10+ (only the standard library is used) and Java 11+ (for diagrams).
3. Copy the three supplied templates into `docs/templates/` with these exact names (they are
   git-ignored because the repository is public):
   `SRS_Template.docx`, `SAD_Template.docx`, `STP_Template.docx`.
4. Download PlantUML 1.2024.7 into `tools/plantuml/plantuml.jar` (git-ignored) from Maven Central:
   `https://repo1.maven.org/maven2/net/sourceforge/plantuml/plantuml/1.2024.7/plantuml-1.2024.7.jar`
   and check its SHA-1 against the `.sha1` file published next to it
   (`cb57b315d96413d55622edaa8c4b234e2ebf4b1f`).

## Everyday workflow

```
git switch main && git pull origin main          # always start from the latest main
git switch -c docs/<your-branch>                 # see branch plan below
# edit only the files you own
python tools/render_diagrams.py                  # if you changed a .puml file
python tools/check_trace.py                      # must end with "0 failed"
git add <your files> && git commit -m "..."
git push -u origin docs/<your-branch>
# open a Pull Request into main, request at least one reviewer, wait for CI and approval
```

Rules for IDs (enforced by `check_trace.py`):

- Allocate a new ID in `traceability/id-registry.md` before using it. Never renumber or reuse an ID; mark removed items `Withdrawn` and add a change-log row.
- When you add or change a requirement or test case, update its RTM row in the same PR: requirement ↔ test case links must agree in the SRS "Test:" reference, the test case "Requirements" field and the RTM.
- SAD §3.8 components and design elements must match the RTM "Module" and "Section ref / Design Spec" columns.

Do not edit any `.docx` file by hand. Word files are regenerated from the Markdown drafts with
`python tools/build_docs.py` on the final-assembly branch only, so two people never edit the same
Word file. Close the documents in Word before rebuilding (Word locks open files), or build a
preview elsewhere with `python tools/build_docs.py --out-dir <folder>`.

## Branch plan and merge order

| Order | Branch | Owner | Contents | Reviewer(s) |
|---|---|---|---|---|
| 1 | `docs/readme` | Rachit | Root README (already committed locally) | any member |
| 2 | `docs/setup` | Rachit + Prithvi | This layout, `DECISIONS.md`, ID registry, RTM skeleton, tools, CI workflow | all |
| 3a | `docs/srs-requirements` | Rachit | Rachit's SRS files, UC-01 | Prithvi, Pranav |
| 3b | `docs/srs-context-security` | Prithvi | Prithvi's SRS files, UC-02, registry/RTM rows | Rachit |
| — | **Gate A** | all | All four approve the SRS PRs and the decision log; requirement IDs frozen | all |
| 4a | `docs/sad-architecture` | Krishna | Krishna's SAD files, component diagram, SD-01, API-01 | Rachit, Prithvi |
| 4b | `docs/sad-design-flows` | Rachit | SD-02, API-03, §4.4 | Krishna |
| 4c | `docs/sad-security` | Prithvi | §3.9, SD-03, SD-04, API-02 | Krishna |
| 4d | `docs/test-plan` | Pranav | Pranav's STP files and TC-001 to TC-023 | Rachit, Prithvi |
| 4e | `docs/test-cases-security` | Prithvi | §13, TC-101 to TC-109 | Pranav |
| 5 | `docs/traceability-review` | Prithvi (all contribute) | RTM completion, cross-document consistency fixes | all |
| 6 | `docs/final-assembly` | Rachit | Regenerated `final/*.docx`, revision tables | all |

Branches 3a/3b and 4a–4e touch different files and can be reviewed in parallel. Merge each PR
only after CI passes and at least one teammate approves; everyone pulls `main` after each merge.

## CI and repository settings (current state)

- `.github/workflows/docs-check.yml` runs `tools/check_trace.py` on pushes and Pull Requests. It
  becomes active only after it is pushed to GitHub; it has **not** been run on GitHub yet.
- Collaborators, branch protection for `main`, required reviews and required CI checks are
  **not configured or verified** yet. The repository owner must set them in the GitHub settings.
- Never commit passwords, tokens, API keys or `.env` files. Use placeholders such as `<token>` in documentation.
