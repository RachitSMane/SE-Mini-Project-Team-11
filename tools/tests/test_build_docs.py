"""Tests for tools/build_docs.py: builds all three documents into a temporary folder and checks them.

Skipped when the instructor templates are not present (they are kept out of Git, see docs/README.md).
"""
import pathlib
import re
import sys
import tempfile
import unittest
import zipfile
from xml.etree import ElementTree as ET

TOOLS = pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0, str(TOOLS))
import build_docs  # noqa: E402

W = "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}"
TEMPLATES_PRESENT = all((build_docs.TEMPLATES / s["template"]).exists() for s in build_docs.MANIFEST.values())


def text_of(element):
    return "".join((t.text or "") if t.tag == W + "t" else "-"
                   for t in element.iter() if t.tag in (W + "t", W + "noBreakHyphen"))


@unittest.skipUnless(TEMPLATES_PRESENT, "instructor templates not available")
class BuildDocsTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.tmp = tempfile.TemporaryDirectory()
        cls.out = pathlib.Path(cls.tmp.name)
        for key in build_docs.MANIFEST:
            build_docs.build(key, cls.out)

    @classmethod
    def tearDownClass(cls):
        cls.tmp.cleanup()

    def load(self, key):
        z = zipfile.ZipFile(self.out / build_docs.MANIFEST[key]["output"])
        self.assertIsNone(z.testzip())
        for name in z.namelist():
            if name.endswith((".xml", ".rels")):
                ET.fromstring(z.read(name))
        return z

    def test_version_markers_agree(self):
        for key in build_docs.MANIFEST:
            z = self.load(key)
            body = text_of(ET.fromstring(z.read("word/document.xml")))
            version = re.search(r"Version:\s*([\d.]+)", body).group(1)
            self.assertIn(f"Version {version}", z.read("word/footer1.xml").decode("utf-8"))
            self.assertIn(f"Version {version}", z.read("docProps/core.xml").decode("utf-8"))

    def test_footer_uses_complex_fields(self):
        footer = self.load("srs").read("word/footer1.xml").decode("utf-8")
        self.assertIn('w:fldCharType="begin"', footer)
        self.assertIn(" PAGE ", footer)
        self.assertIn(" NUMPAGES ", footer)

    def test_every_image_has_a_numbered_caption(self):
        for key in build_docs.MANIFEST:
            root = ET.fromstring(self.load(key).read("word/document.xml"))
            captions = [text_of(p) for p in root.iter(W + "p") if re.match(r"^Figure \d+ — ", text_of(p))]
            images = list(root.iter("{http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing}inline"))
            self.assertEqual(len(captions), len(images), key)
            self.assertEqual([int(re.match(r"Figure (\d+)", c).group(1)) for c in captions],
                             list(range(1, len(captions) + 1)), key)

    def test_page_numbering_restarts_only_once(self):
        for key in build_docs.MANIFEST:
            document = self.load(key).read("word/document.xml").decode("utf-8")
            sections = re.findall(r"<w:sectPr\b.*?</w:sectPr>", document, re.S)
            restarts = [i for i, s in enumerate(sections) if re.search(r"pgNumType[^>]*w:start", s)]
            self.assertEqual(restarts, [0], key)

    def test_no_template_placeholders(self):
        for key in build_docs.MANIFEST:
            body = text_of(ET.fromstring(self.load(key).read("word/document.xml")))
            for pattern in (r"\bATM\b", r"<<\s*Insert", r"Model Answer", r"TODO", r"\bTBD\b"):
                self.assertIsNone(re.search(pattern, body), f"{key}: {pattern}")


if __name__ == "__main__":
    unittest.main()
