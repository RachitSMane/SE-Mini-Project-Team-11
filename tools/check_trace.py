"""Check IDs and traceability across the Team 11 working documents.

Usage:  python tools/check_trace.py

Standard library only. Exit code 0 = all checks passed, 1 = at least one check failed.
Checks the ID registry, requirement and test-case definitions, the master RTM, the SAD
traceability table, security validation coverage, image links and the template minimums.
"""
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
DOCS = ROOT / "docs"
WORK = DOCS / "working"
REGISTRY = DOCS / "traceability" / "id-registry.md"
RTM = DOCS / "traceability" / "rtm.md"

ID_PATTERN = (r"(?:AC-FR-\d{3}|SEC-OBJ-\d{3}|SEC-REQ-\d{3}|NFR-\d{3}|FR-\d{3}"
              r"|UC-\d{2}|SD-\d{2}|COMP-\d{2}|API-\d{2}|TC-\d{3})")
ID_RE = re.compile(r"(?<![A-Z0-9-])" + ID_PATTERN + r"(?![0-9])")
# "FR-020 to FR-029", "FR-001–FR-019", "FR-001–019": range endpoints need not exist
RANGE_RE = re.compile(r"(?<![A-Z0-9-])" + ID_PATTERN
                      + r"\s*(?:–|—|to)\s*(?:" + ID_PATTERN + r"|\d{2,3})(?![0-9])")
REQ_PREFIXES = ("FR-", "NFR-", "SEC-REQ-")

TC_STATUSES = ("Not executed", "Pass", "Fail", "Blocked")
MINIMUMS = {"FR": 15, "NFR": 5, "SEC-OBJ": 2, "SEC-REQ": 5, "UC": 2, "SD": 2, "API": 2, "TC": 10}

failures = []
passes = []


def check(ok, message):
    (passes if ok else failures).append(message)


def kind(identifier):
    for prefix in ("AC-FR", "SEC-OBJ", "SEC-REQ", "NFR", "FR", "UC", "SD", "COMP", "API", "TC"):
        if identifier.startswith(prefix + "-"):
            return prefix
    return "?"


def strip_comments(text):
    return re.sub(r"<!--.*?-->", "", text, flags=re.S)


def table_rows(text):
    """Yield lists of cell strings for every markdown table body row."""
    for line in text.splitlines():
        line = line.strip()
        if not line.startswith("|") or re.match(r"^\|[\s:|-]+\|$", line):
            continue
        cells = [c.strip() for c in line.replace("\\|", "\x00").strip("|").split("|")]
        yield [c.replace("\x00", "|") for c in cells]


def ids_in(text):
    return set(ID_RE.findall(text))


def read(path):
    return path.read_text(encoding="utf-8")


def main():
    # ---------------------------------------------------------------- registry
    registry = {}
    for cells in table_rows(read(REGISTRY)):
        if len(cells) >= 6 and ID_RE.fullmatch(cells[0]):
            check(cells[0] not in registry, f"registry: {cells[0]} listed once")
            registry[cells[0]] = {"status": cells[5], "owner": cells[3]}
    for identifier, row in registry.items():
        check(row["status"] in ("Active", "Withdrawn"),
              f"registry: {identifier} has status Active or Withdrawn")
    active = {i for i, r in registry.items() if r["status"] == "Active"}

    files = {p: read(p) for p in sorted(WORK.rglob("*.md"))}
    files[RTM] = read(RTM)

    # ------------------------------------------- every referenced ID registered
    unknown = {}
    for path, text in files.items():
        body = RANGE_RE.sub(" ", strip_comments(text))
        for identifier in ids_in(body):
            base = identifier[3:] if identifier.startswith("AC-") else identifier
            if base not in registry:
                unknown.setdefault(identifier, path.relative_to(ROOT).as_posix())
    for identifier, where in sorted(unknown.items()):
        check(False, f"references: {identifier} used in {where} but not in the registry")
    check(not unknown, "references: every ID used in the documents is registered")
    withdrawn_used = sorted(i for i in registry if registry[i]["status"] == "Withdrawn"
                            and any(i in RANGE_RE.sub(" ", strip_comments(t)) for t in files.values()))
    check(not withdrawn_used, f"references: no withdrawn ID is still used {withdrawn_used or ''}")

    # ------------------------------------------------- requirement definitions
    srs_files = {p: t for p, t in files.items() if p.parent.name == "srs"}
    definitions = {}
    srs_test_refs = {}
    for path, text in srs_files.items():
        for cells in table_rows(strip_comments(text)):
            first = cells[0]
            if ID_RE.fullmatch(first) and kind(first) in ("FR", "NFR", "SEC-OBJ", "SEC-REQ"):
                definitions.setdefault(first, []).append(path.name)
                if kind(first) != "SEC-OBJ":
                    joined = " ".join(cells[1:])
                    m = re.search(r"Test:\s*(.*)$", joined)
                    srs_test_refs[first] = set(re.findall(r"TC-\d{3}", m.group(1))) if m else set()
    for identifier, where in sorted(definitions.items()):
        check(len(where) == 1, f"SRS: {identifier} defined exactly once (found in {where})")
    for identifier in sorted(i for i in active if kind(i) in ("FR", "NFR", "SEC-OBJ", "SEC-REQ")):
        check(identifier in definitions, f"SRS: active {identifier} is defined in the SRS")
    for identifier in sorted(definitions):
        check(identifier in active, f"SRS: defined {identifier} is Active in the registry")

    # ------------------------------------------------------ test case headings
    tc_defs = {}
    tc_reqs = {}
    tc_status = {}
    stp_dir = WORK / "stp"
    for path in sorted(stp_dir.glob("tc-*.md")):
        text = strip_comments(read(path))
        sections = re.split(r"^#{2,6}\s+(TC-\d{3})\b.*$", text, flags=re.M)
        for index in range(1, len(sections), 2):
            identifier, body = sections[index], sections[index + 1]
            tc_defs.setdefault(identifier, []).append(path.name)
            actual = ""
            for cells in table_rows(body):
                if cells[0].lower().startswith("requirements") and len(cells) > 1:
                    tc_reqs[identifier] = {i for i in ids_in(cells[1]) if i.startswith(REQ_PREFIXES)}
                if cells[0] == "Status" and len(cells) > 1:
                    tc_status[identifier] = cells[1]
                if cells[0] == "Actual result" and len(cells) > 1:
                    actual = cells[1]
            status = tc_status.get(identifier, "")
            check(status in TC_STATUSES, f"STP: {identifier} status '{status}' is one of {TC_STATUSES}")
            if status in ("Pass", "Fail", "Blocked"):
                check(bool(actual), f"STP: {identifier} has an actual result recorded for status {status}")
            for field in ("Preconditions", "Test data", "Steps", "Expected result", "Pass/fail criteria",
                          "Dependencies / limitations", "Actual result", "Status"):
                check(re.search(r"^\|\s*" + re.escape(field) + r"\s*\|", body, re.M) is not None,
                      f"STP: {identifier} has field '{field}'")
    for identifier, where in sorted(tc_defs.items()):
        check(len(where) == 1, f"STP: {identifier} defined exactly once")
        check(identifier in active, f"STP: {identifier} is Active in the registry")
        check(bool(tc_reqs.get(identifier)), f"STP: {identifier} lists at least one requirement")
    for identifier in sorted(i for i in active if kind(i) == "TC"):
        check(identifier in tc_defs, f"STP: active {identifier} has a specification")

    # ------------------------------------------------- UC / SD / API / COMP defs
    sad_text = "\n".join(strip_comments(t) for p, t in files.items() if p.parent.name == "sad")
    srs_text = "\n".join(strip_comments(t) for t in srs_files.values())
    heading_ids = set()
    for line in (sad_text + "\n" + srs_text).splitlines():
        if line.startswith("#"):
            heading_ids |= ids_in(line)
    comp_defs = set()
    for cells in table_rows(sad_text):
        if ID_RE.fullmatch(cells[0]) and kind(cells[0]) == "COMP":
            comp_defs.add(cells[0])
    for identifier in sorted(i for i in active if kind(i) in ("UC", "SD", "API")):
        check(identifier in heading_ids, f"design: {identifier} has its own heading")
    for identifier in sorted(i for i in active if kind(i) == "COMP"):
        check(identifier in comp_defs, f"SAD: {identifier} described in the component table")

    # ------------------------------------------------------------------- RTM
    rtm_tcs, rtm_comps, rtm_design, rtm_status = {}, {}, {}, {}
    for cells in table_rows(read(RTM)):
        if len(cells) >= 5 and ID_RE.fullmatch(cells[0]) and cells[0].startswith(REQ_PREFIXES):
            rtm_tcs[cells[0]] = set(re.findall(r"TC-\d{3}", cells[4]))
            rtm_comps[cells[0]] = set(re.findall(r"COMP-\d{2}", cells[3]))
            # template columns: Req ID | short | Section ref / Design Spec | Module | Test case(s) | Status | Comments
            rtm_design[cells[0]] = set(re.findall(r"(?:SD|API)-\d{2}", cells[2]))
            rtm_status[cells[0]] = cells[5]
            check(cells[5] in ("N", "P", "A"), f"RTM: {cells[0]} status is N, P or A")
    # RTM status must be derived from test-case statuses (STP 13)
    for req, tcs in rtm_tcs.items():
        statuses = [tc_status.get(tc, "") for tc in tcs]
        expected = "A" if "Fail" in statuses else ("P" if statuses and all(x == "Pass" for x in statuses) else "N")
        check(rtm_status.get(req) == expected,
              f"status: RTM status of {req} is {rtm_status.get(req)}, derived from {statuses} it must be {expected}")
    requirements = sorted(i for i in active if i.startswith(REQ_PREFIXES))
    for identifier in requirements:
        check(bool(rtm_tcs.get(identifier)), f"RTM: {identifier} has at least one test case")
        check(bool(rtm_comps.get(identifier)), f"RTM: {identifier} has at least one component")
    all_rtm_tcs = set().union(*rtm_tcs.values()) if rtm_tcs else set()
    for identifier in sorted(all_rtm_tcs):
        check(identifier in tc_defs, f"RTM: referenced {identifier} has a specification")
    for identifier in sorted(tc_defs):
        check(identifier in all_rtm_tcs, f"RTM: {identifier} traces to at least one requirement")

    # RTM <-> test case "Requirements" field (both directions)
    for req, tcs in rtm_tcs.items():
        for tc in tcs:
            check(req in tc_reqs.get(tc, set()), f"consistency: {tc} lists {req} (RTM maps {req} -> {tc})")
    for tc, reqs in tc_reqs.items():
        for req in reqs:
            check(tc in rtm_tcs.get(req, set()), f"consistency: RTM maps {req} -> {tc} ({tc} lists {req})")
    # RTM <-> SRS "Test:" references
    for req, refs in srs_test_refs.items():
        check(refs == rtm_tcs.get(req, set()),
              f"consistency: SRS test refs for {req} {sorted(refs)} match RTM {sorted(rtm_tcs.get(req, set()))}")

    # ------------------------------------------------ SAD 3.8 vs RTM components
    sad_trace = WORK / "sad" / "03d-traceability.md"
    sad_comps, sad_design = {}, {}
    for cells in table_rows(read(sad_trace)):
        if len(cells) >= 4 and ID_RE.fullmatch(cells[0]) and cells[0].startswith(REQ_PREFIXES):
            sad_comps[cells[0]] = set(re.findall(r"COMP-\d{2}", cells[2]))
            sad_design[cells[0]] = set(re.findall(r"(?:SD|API)-\d{2}", cells[3]))
    for identifier in requirements:
        check(sad_comps.get(identifier) == rtm_comps.get(identifier),
              f"consistency: SAD 3.8 components for {identifier} match the RTM")
        check(sad_design.get(identifier) == rtm_design.get(identifier),
              f"consistency: SAD 3.8 design elements for {identifier} match the RTM")
    used_design = set().union(*sad_design.values()) if sad_design else set()
    for identifier in sorted(i for i in active if kind(i) in ("SD", "API")):
        check(identifier in used_design, f"SAD: {identifier} traces to at least one requirement")
    traced = set().union(*sad_comps.values()) if sad_comps else set()
    for identifier in sorted(i for i in active if kind(i) == "COMP"):
        check(identifier in traced, f"SAD: {identifier} traces to at least one requirement")

    # ------------------------------------------------------ security coverage
    secval = read(WORK / "stp" / "05-1-security-validation.md")
    for identifier in sorted(i for i in active if kind(i) == "SEC-REQ"):
        check(identifier in secval, f"STP 5.1: {identifier} has a security validation entry")
        sec_tests = {t for t in rtm_tcs.get(identifier, set()) if t.startswith("TC-1")}
        check(bool(sec_tests), f"STP: {identifier} is covered by a security test case (TC-1xx)")
    sec_obj_text = read(WORK / "srs" / "05-1-security.md")
    for cells in table_rows(sec_obj_text):
        if ID_RE.fullmatch(cells[0]) and kind(cells[0]) == "SEC-OBJ":
            check(bool(re.search(r"SEC-REQ-\d{3}", " ".join(cells[1:]))),
                  f"SRS: {cells[0]} is realised by at least one security requirement")

    # ------------------------------------------------------------ image links
    for path, text in files.items():
        for target in re.findall(r"!\[[^\]]*\]\(([^)]+)\)", strip_comments(text)):
            check((path.parent / target).resolve().exists(),
                  f"images: {target} referenced in {path.name} exists")

    # --------------------------------------------------------------- minimums
    for prefix, minimum in MINIMUMS.items():
        count = len([i for i in active if kind(i) == prefix])
        check(count >= minimum, f"minimum: {prefix} count {count} >= {minimum}")

    for message in failures:
        print("FAIL  " + message)
    print(f"\n{len(passes)} checks passed, {len(failures)} failed.")
    counts = {p: len([i for i in active if kind(i) == p]) for p in MINIMUMS}
    counts["COMP"] = len([i for i in active if kind(i) == "COMP"])
    print("Active IDs: " + ", ".join(f"{k} {v}" for k, v in counts.items()))
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())
