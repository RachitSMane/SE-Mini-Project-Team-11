"""Fault-injection tests for tools/check_trace.py on disposable copies of docs/ and tools/."""
import pathlib
import shutil
import subprocess
import sys
import tempfile
import unittest

REPO = pathlib.Path(__file__).resolve().parents[2]

MUTATIONS = {
    # Faults are injected into the recorded execution state of 12-10-2026 (TC-101 and TC-001 Pass).
    "test passed without evidence": ("docs/working/stp/tc-security.md", "| Actual result | ", "| Actual result | |\n| Note | "),
    "RTM status not derived": ("docs/traceability/rtm.md", "| TC-001 | P |  |", "| TC-001 | N |  |"),
    "invalid status value": ("docs/working/stp/tc-security.md", "| Status | Pass |", "| Status | Passed |"),
    "missing dependencies field": ("docs/working/stp/tc-security.md", "| Dependencies / limitations | — |\n", ""),
    "unregistered ID": ("docs/working/srs/06-acceptance.md", "Canvas editing — TC-001 to TC-005, TC-022",
                        "Canvas editing — TC-001 to TC-005, TC-022, TC-077"),
    "broken image": ("docs/working/sad/04b5-sd05-clear.md", "sd-05-clear_001.png", "sd-05-clear_009.png"),
    "SRS test reference differs from RTM": ("docs/working/srs/04a-fr-canvas.md", "Test: TC-005, TC-025 |", "Test: TC-005 |"),
}


def run_checker(root):
    return subprocess.run([sys.executable, "-I", str(root / "tools" / "check_trace.py")],
                          capture_output=True, text=True)


class CheckTraceTest(unittest.TestCase):
    def copy_repo(self, target):
        shutil.copytree(REPO / "docs", target / "docs", ignore=shutil.ignore_patterns("templates", "final", "~$*"))
        shutil.copytree(REPO / "tools", target / "tools", ignore=shutil.ignore_patterns("plantuml", "__pycache__"))

    def test_current_sources_pass(self):
        result = run_checker(REPO)
        self.assertEqual(result.returncode, 0, result.stdout[-2000:])
        self.assertIn(" 0 failed", result.stdout)

    def test_each_fault_is_detected(self):
        for name, (rel, old, new) in MUTATIONS.items():
            with self.subTest(name), tempfile.TemporaryDirectory() as tmp:
                root = pathlib.Path(tmp)
                self.copy_repo(root)
                path = root / rel
                text = path.read_text(encoding="utf-8")
                self.assertIn(old, text, f"fixture text missing for {name}")
                path.write_text(text.replace(old, new, 1), encoding="utf-8")
                result = run_checker(root)
                self.assertEqual(result.returncode, 1, f"{name} not detected")
                self.assertIn("FAIL", result.stdout)


if __name__ == "__main__":
    unittest.main()
