"""Assemble the Markdown working drafts into the supplied Word templates.

Usage:  python tools/build_docs.py [srs|sad|stp ...]     (default: all three)

Standard library only. For each document the script copies the supplied template from
docs/templates/ (styles, page setup, theme), replaces the template body with the content of
the working files listed in MANIFEST, embeds the PNG diagrams and writes docs/final/*.docx.
The original templates are never modified.

Supported Markdown: headings (#..#####), paragraphs, **bold**, *italic*, `code`, <br>,
"- " bullets (nested by two spaces), "1. " numbered items, pipe tables, ![caption](image.png),
``` fenced code blocks, and <!-- include: path --> directives (path relative to repo root).
HTML comments are removed.
"""
import datetime
import pathlib
import re
import struct
import sys
import zipfile
from xml.sax.saxutils import escape

ROOT = pathlib.Path(__file__).resolve().parent.parent
WORK = ROOT / "docs" / "working"
TEMPLATES = ROOT / "docs" / "templates"
FINAL = ROOT / "docs" / "final"

MANIFEST = {
    "srs": {
        "template": "SRS_Template.docx",
        "output": "Team11_SRS.docx",
        "label": "SRS",
        "title": "Software Requirements Specification - Real-Time Collaborative Virtual Whiteboard",
        "headings": {1: "Heading1", 2: "Heading2", 3: "Heading3", 4: "Heading4", 5: "Heading5"},
        "files": ["srs/00-front-matter.md", "srs/01-introduction.md", "srs/02-overall-description.md",
                  "srs/03-external-interfaces.md", "srs/04a-fr-canvas.md", "srs/04b-fr-sync.md",
                  "srs/04c-fr-versions.md", "srs/04d-fr-access.md", "srs/05-nfr.md",
                  "srs/05-1-security.md", "srs/06-acceptance.md", "srs/07-use-cases.md",
                  "srs/08-rtm.md"],
    },
    "sad": {
        "template": "SAD_Template.docx",
        "output": "Team11_SAD.docx",
        "label": "SAD",
        "title": "Software Architecture and Design Specification - Real-Time Collaborative Virtual Whiteboard",
        "headings": {1: "Title", 2: "Heading1", 3: "Heading2", 4: "Heading3", 5: "Heading4"},
        "files": ["sad/01-02-introduction.md", "sad/03a-goals-stakeholders.md", "sad/03b-components.md",
                  "sad/03c-pattern-stack-risks.md", "sad/03d-traceability.md",
                  "sad/03e-security-architecture.md", "sad/04a-design-overview.md",
                  "sad/04b1-sd01-live-sync.md", "sad/04b2-sd02-version-restore.md",
                  "sad/04b3-sd03-share-link.md", "sad/04b4-sd04-transfer-ownership.md",
                  "sad/04b5-sd05-clear.md",
                  "sad/04c1-api01-realtime.md",
                  "sad/04c2-api02-access.md", "sad/04c3-api03-versions.md",
                  "sad/04d-errors-logging.md", "sad/04e-ux-open-issues.md", "sad/05-appendices.md"],
    },
    "stp": {
        "template": "STP_Template.docx",
        "output": "Team11_STP.docx",
        "label": "STP",
        "title": "Software Test Plan - Real-Time Collaborative Virtual Whiteboard",
        "headings": {1: "Heading1", 2: "Heading2", 3: "Heading3", 4: "Heading4", 5: "Heading5"},
        "files": ["stp/01-02-introduction-items.md", "stp/03-04-features.md", "stp/05-strategy.md",
                  "stp/05-1-security-validation.md", "stp/06-12-environment-to-suspension.md",
                  "stp/13-traceability.md", "stp/14-15-metrics-approvals.md",
                  "stp/tc-functional-nfr.md", "stp/tc-security.md"],
    },
}

PAGE_WIDTH_TWIPS = 8640          # 12240 page - 2 x 1800 margins (all three templates)
PAGE_SHORT, PAGE_LONG = 12240, 15840   # Letter page in twips (template page size)
LANDSCAPE_TEXT_TWIPS = PAGE_LONG - 2 * 1800   # 8.5 in text width on landscape pages
WIDE_TABLE_COLUMNS = 7           # sections with tables this wide are printed landscape
PORTRAIT_BOX = (6.0, 8.3)        # usable figure area in inches (text width x height minus caption)
LANDSCAPE_BOX = (8.5, 5.5)       # landscape: 11 in - 2 x 1.25 in margins; 8.5 in - 2 x 1 in - caption and lead-in line
DIAGRAM_DPI = 192                # tools/render_diagrams.py renders with -Sdpi=192
CHAR_TWIPS = 92                  # average character width at the 8.5 pt table font
CELL_PAD_TWIPS = 220             # left + right cell margins and a little slack
ZERO_WIDTH_SPACE = chr(0x200B)    # line-break opportunity in table headers
KEEP_TOGETHER_ROWS = 14          # tables up to this many rows are kept on one page (keepNext)
KEEP_TOGETHER_CHARS = 4200       # ... unless their text is too long for one page (e.g. TC-022)
SMALL_TABLE_ROWS = 6             # any table this small (e.g. approvals) is kept on one page
ID_RE = re.compile(r"(?<![A-Za-z0-9-])(?:AC-FR|SEC-OBJ|SEC-REQ|NFR|FR|UC|SD|COMP|API|TC|ADR)-\d{1,3}(?![0-9])")
FOOTER_TYPE = "http://schemas.openxmlformats.org/officeDocument/2006/relationships/footer"
FOOTER_CT = "application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml"
EMU_PER_INCH = 914400
EXTRA_NS = {
    "xmlns:r": "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
    "xmlns:wp": "http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing",
    "xmlns:a": "http://schemas.openxmlformats.org/drawingml/2006/main",
    "xmlns:pic": "http://schemas.openxmlformats.org/drawingml/2006/picture",
}


# --------------------------------------------------------------------- input
def load(rel_path, seen=None):
    """Read a working file, expand include directives, return (text, base_dir)."""
    path = WORK / rel_path if not str(rel_path).startswith("docs/") else ROOT / rel_path
    seen = (seen or set()) | {path}
    text = path.read_text(encoding="utf-8")

    def include(match):
        target = ROOT / match.group(1).strip()
        if target in seen:
            raise SystemExit(f"Include loop at {target}")
        inner = target.read_text(encoding="utf-8")
        return re.sub(r"<!--.*?-->", "", inner, flags=re.S)

    text = re.sub(r"<!--\s*include:\s*(.*?)\s*-->", include, text)
    text = re.sub(r"<!--.*?-->", "", text, flags=re.S)
    return text, path.parent


def parse_blocks(text, base_dir):
    """Turn Markdown text into a list of block tuples."""
    lines = text.splitlines()
    blocks, para, i = [], [], 0

    def flush():
        if para:
            blocks.append(("p", " ".join(s.strip() for s in para)))
            para.clear()

    while i < len(lines):
        line = lines[i]
        stripped = line.strip()
        if stripped.startswith("```"):
            flush()
            code, i = [], i + 1
            while i < len(lines) and not lines[i].strip().startswith("```"):
                code.append(lines[i])
                i += 1
            blocks.append(("code", code))
        elif not stripped:
            flush()
        elif re.match(r"^#{1,6}\s", stripped):
            flush()
            level = len(stripped) - len(stripped.lstrip("#"))
            blocks.append(("h", level, stripped[level:].strip()))
        elif stripped.startswith("|"):
            flush()
            rows = []
            while i < len(lines) and lines[i].strip().startswith("|"):
                row = lines[i].strip()
                if not re.match(r"^\|[\s:|-]+\|$", row):
                    cells = row.replace("\\|", "\x00").strip("|").split("|")
                    rows.append([c.strip().replace("\x00", "|") for c in cells])
                i += 1
            blocks.append(("table", rows))
            continue
        elif re.match(r"^!\[[^\]]*\]\([^)]+\)$", stripped):
            flush()
            alt, target = re.match(r"^!\[([^\]]*)\]\(([^)]+)\)$", stripped).groups()
            blocks.append(("img", (base_dir / target).resolve(), alt))
        elif re.match(r"^\s*[-*]\s+", line):
            flush()
            indent = len(line) - len(line.lstrip(" "))
            item = re.sub(r"^\s*[-*]\s+", "", line)
            while i + 1 < len(lines) and lines[i + 1].startswith(" " * (indent + 2)) \
                    and not re.match(r"^\s*([-*]|\d+\.)\s+", lines[i + 1]):
                i += 1
                item += " " + lines[i].strip()
            blocks.append(("li", indent // 2, item, None))
        elif re.match(r"^\s*\d+\.\s+", line):
            flush()
            indent = len(line) - len(line.lstrip(" "))
            number, item = re.match(r"^\s*(\d+)\.\s+(.*)$", line).groups()
            while i + 1 < len(lines) and lines[i + 1].startswith(" " * (indent + 3)) \
                    and not re.match(r"^\s*([-*]|\d+\.)\s+", lines[i + 1]):
                i += 1
                item += " " + lines[i].strip()
            blocks.append(("li", indent // 2, item, number))
        else:
            para.append(line)
        i += 1
    flush()
    return blocks


# -------------------------------------------------------------------- output
def run_xml(text, bold=False, italic=False, code=False, size=None):
    props = []
    if code:
        props.append('<w:rFonts w:ascii="Consolas" w:hAnsi="Consolas" w:cs="Consolas"/>')
    if bold:
        props.append("<w:b/>")
    if italic:
        props.append("<w:i/>")
    if size:
        props.append(f'<w:sz w:val="{size}"/><w:szCs w:val="{size}"/>')
    rpr = f"<w:rPr>{''.join(props)}</w:rPr>" if props else ""
    parts = text.split("\n")
    out = []
    for n, part in enumerate(parts):
        if n:
            out.append(f"<w:r>{rpr}<w:br/></w:r>")
        if part:
            out.append(f"<w:r>{rpr}{text_with_ids(part)}</w:r>")
    return "".join(out)


def text_with_ids(text):
    """Run content in which requirement and test IDs use non-breaking hyphens."""
    out, pos = [], 0
    for match in ID_RE.finditer(text):
        if match.start() > pos:
            out.append(f'<w:t xml:space="preserve">{escape(text[pos:match.start()])}</w:t>')
        pieces = match.group(0).split("-")
        out.append("<w:noBreakHyphen/>".join(f"<w:t>{escape(piece)}</w:t>" for piece in pieces))
        pos = match.end()
    if pos < len(text):
        out.append(f'<w:t xml:space="preserve">{escape(text[pos:])}</w:t>')
    return "".join(out)


def inline_xml(text, size=None, force_bold=False):
    """Convert inline Markdown to runs."""
    text = re.sub(r"<br\s*/?>", "\n", text)
    text = re.sub(r"\[([^\]]+)\]\(([^)]+)\)", r"\1 (\2)", text)
    tokens = re.split(r"(\*\*[^*]+\*\*|`[^`]+`|(?<![\w*])\*[^*\s][^*]*\*(?![\w*]))", text)
    out = []
    for token in tokens:
        if not token:
            continue
        if token.startswith("**") and token.endswith("**"):
            # bold text may contain `code` spans: bold for all parts, monospace for the code parts
            for n, part in enumerate(re.split(r"`([^`]+)`", token[2:-2])):
                if part:
                    out.append(run_xml(part, bold=True, code=bool(n % 2), size=size))
        elif token.startswith("`") and token.endswith("`"):
            out.append(run_xml(token[1:-1], code=True, bold=force_bold, size=size))
        elif token.startswith("*") and token.endswith("*") and len(token) > 2:
            out.append(run_xml(token[1:-1], italic=True, bold=force_bold, size=size))
        else:
            out.append(run_xml(token, bold=force_bold, size=size))
    return "".join(out)


def para_xml(inner, style=None, ppr_extra=""):
    style_xml = f'<w:pStyle w:val="{style}"/>' if style else ""
    ppr = f"<w:pPr>{style_xml}{ppr_extra}</w:pPr>" if (style_xml or ppr_extra) else ""
    return f"<w:p>{ppr}{inner}</w:p>"


def column_widths(rows, page_width=None):
    """Give each column room for its longest unbreakable body token, then share the rest by content.

    Header cells may wrap after "/" (see table_xml), so header words only count up to a slash."""
    page_width = page_width or PAGE_WIDTH_TWIPS
    cols = max(len(r) for r in rows)
    minimum, weights = [], []
    for c in range(cols):
        cells = [re.sub(r"[*`]|<br\s*/?>", " ", r[c]) if c < len(r) else "" for r in rows]
        header_tokens = [t for w in cells[0].split() for t in w.split("/")]
        tokens = [w for cell in cells[1:] for w in cell.split()] + header_tokens
        longest_token = max((len(w) for w in tokens), default=4)
        minimum.append(min(longest_token * CHAR_TWIPS + CELL_PAD_TWIPS, page_width * 0.4))
        # share spare width by typical (mean) content length, so a short label column stays narrow
        body_cells = cells[1:] or cells
        weights.append(max(min(sum(len(cell) for cell in body_cells) / len(body_cells), 60), 4))
    if sum(minimum) >= page_width:
        # short columns (e.g. a role) keep their width; only the wide columns are narrowed
        short = [m <= page_width * 0.12 for m in minimum]
        fixed = sum(m for m, s in zip(minimum, short) if s)
        scale = (page_width - fixed) / sum(m for m, s in zip(minimum, short) if not s)
        widths = [int(m if s else m * scale) for m, s in zip(minimum, short)]
        widths[-1] += page_width - sum(widths)
        return widths
    spare = page_width - sum(minimum)
    total = sum(weights)
    widths = [int(m + spare * w / total) for m, w in zip(minimum, weights)]
    widths[-1] += page_width - sum(widths)
    return widths


def table_xml(rows, page_width=None):
    cols = max(len(r) for r in rows)
    rows = [r + [""] * (cols - len(r)) for r in rows]
    rows[0] = [cell.replace("/", "/" + ZERO_WIDTH_SPACE) for cell in rows[0]]   # allow header wrap after a slash
    widths = column_widths(rows, page_width)
    border = '<w:{0} w:val="single" w:sz="4" w:space="0" w:color="8C9BB0"/>'
    borders = "".join(border.format(b) for b in ("top", "left", "bottom", "right", "insideH", "insideV"))
    out = ['<w:tbl><w:tblPr><w:tblW w:w="5000" w:type="pct"/>'
           f'<w:tblBorders>{borders}</w:tblBorders><w:tblLayout w:type="fixed"/>'
           '<w:tblCellMar><w:top w:w="40" w:type="dxa"/><w:left w:w="80" w:type="dxa"/>'
           '<w:bottom w:w="40" w:type="dxa"/><w:right w:w="80" w:type="dxa"/></w:tblCellMar>'
           '</w:tblPr><w:tblGrid>']
    out += [f'<w:gridCol w:w="{w}"/>' for w in widths]
    out.append("</w:tblGrid>")
    # two-column field/value tables (one test case each) stay on one page; other tables may break between rows
    # (a table longer than one page cannot stay together; Word would push it whole and orphan its heading)
    fits_page = sum(len(c) for r in rows for c in r) <= KEEP_TOGETHER_CHARS
    keep_together = (cols == 2 and len(rows) <= KEEP_TOGETHER_ROWS and fits_page) or len(rows) <= SMALL_TABLE_ROWS
    for r, row in enumerate(rows):
        header = r == 0
        trpr = "<w:trPr><w:tblHeader/><w:cantSplit/></w:trPr>" if header else "<w:trPr><w:cantSplit/></w:trPr>"
        out.append(f"<w:tr>{trpr}")
        # long tables of short rows: the header stays with the first two rows and the last two rows
        # stay together (tall rows are left free to avoid half-empty pages)
        short = lambda i: 0 < i < len(rows) and max(len(c) for c in rows[i]) <= 120
        edge = (r <= 1 and short(1) and short(2)) or (r == len(rows) - 2 and short(r) and short(r + 1))
        keep = '<w:keepNext/>' if (keep_together or edge) and r < len(rows) - 1 else ""
        for c, cell in enumerate(row):
            shade = '<w:shd w:val="clear" w:color="auto" w:fill="DCE6F2"/>' if header else ""
            out.append(f'<w:tc><w:tcPr><w:tcW w:w="{widths[c]}" w:type="dxa"/>{shade}</w:tcPr>')
            spacing = '<w:spacing w:before="0" w:after="0" w:line="240" w:lineRule="auto"/>'
            out.append(para_xml(inline_xml(cell, size=17, force_bold=header), ppr_extra=keep + spacing))
            out.append("</w:tc>")
        out.append("</w:tr>")
    out.append("</w:tbl>")
    out.append(para_xml("", ppr_extra='<w:spacing w:before="0" w:after="60"/>'))
    return "".join(out)


def png_size(path):
    with open(path, "rb") as handle:
        head = handle.read(24)
    if head[:8] != b"\x89PNG\r\n\x1a\n":
        raise SystemExit(f"Not a PNG file: {path}")
    return struct.unpack(">II", head[16:24])


def image_dpi(path):
    """Resolution of a PNG: its pHYs chunk if present, else 192 for rendered diagrams, else 96."""
    data = path.read_bytes()[:4096]
    index = data.find(b"pHYs")
    if index > 0:
        ppx, _, unit = struct.unpack(">IIB", data[index + 4:index + 13])
        if unit == 1 and ppx:
            return ppx * 0.0254
    return DIAGRAM_DPI if "diagrams" in path.parts else 96


def image_inches(path):
    width_px, height_px = png_size(path)
    dpi = image_dpi(path)
    return width_px / dpi, height_px / dpi


def wants_landscape(path):
    """Landscape when it gives at least 15 % larger figure text than portrait."""
    w, h = image_inches(path)
    portrait = min(1.0, PORTRAIT_BOX[0] / w, PORTRAIT_BOX[1] / h)
    landscape = min(1.0, LANDSCAPE_BOX[0] / w, LANDSCAPE_BOX[1] / h)
    return landscape > portrait * 1.15


def image_xml(rel_id, number, path, alt, box):
    w, h = image_inches(path)
    scale = min(1.0, box[0] / w, box[1] / h)
    cx, cy = int(w * scale * EMU_PER_INCH), int(h * scale * EMU_PER_INCH)
    name = escape(alt or path.name, {'"': "&quot;"})
    drawing = (
        f'<w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0">'
        f'<wp:extent cx="{cx}" cy="{cy}"/><wp:docPr id="{number}" name="Picture {number}" descr="{name}"/>'
        '<wp:cNvGraphicFramePr><a:graphicFrameLocks noChangeAspect="1"/></wp:cNvGraphicFramePr>'
        '<a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">'
        f'<pic:pic><pic:nvPicPr><pic:cNvPr id="{number}" name="{escape(path.name)}"/><pic:cNvPicPr/></pic:nvPicPr>'
        f'<pic:blipFill><a:blip r:embed="{rel_id}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill>'
        f'<pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="{cx}" cy="{cy}"/></a:xfrm>'
        '<a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic>'
        "</a:graphicData></a:graphic></wp:inline></w:drawing></w:r>")
    center = '<w:jc w:val="center"/>'
    # pPr children must follow schema order: keepNext, ..., spacing, ..., jc
    caption = para_xml(run_xml(alt, italic=True, size=18), ppr_extra='<w:spacing w:after="160"/>' + center)
    return para_xml(drawing, ppr_extra='<w:keepNext/>' + center) + caption


def section_break(sect_xml):
    """A paragraph whose sectPr ends the current section (Word starts the next one on a new page)."""
    return f"<w:p><w:pPr>{sect_xml}</w:pPr></w:p>"


def landscape_sect(sect_xml):
    return re.sub(r"<w:pgSz\b[^>]*/>",
                  f'<w:pgSz w:w="{PAGE_LONG}" w:h="{PAGE_SHORT}" w:orient="landscape"/>', sect_xml, count=1)


def without_restart(sect_xml):
    """Remove a page-number restart so numbering continues across sections."""
    return re.sub(r'(<w:pgNumType\b[^>]*?)\s+w:start="\d+"', r"\1", sect_xml)


def block_orientations(blocks):
    """Orientation ('P' or 'L') for every block.

    A section (a heading and the blocks up to the next heading) is printed landscape when it
    contains a table with WIDE_TABLE_COLUMNS or more columns, or when all of its figures read better
    landscape; in mixed sections each figure gets its own best orientation."""
    orient = ["P"] * len(blocks)
    starts = [i for i, b in enumerate(blocks) if b[0] == "h"] or [0]
    if starts[0] != 0:
        starts.insert(0, 0)
    bounds = list(zip(starts, starts[1:] + [len(blocks)]))
    for a, b in bounds:
        segment = blocks[a:b]
        wide_table = any(x[0] == "table" and max(len(r) for r in x[1]) >= WIDE_TABLE_COLUMNS for x in segment)
        images = [i for i in range(a, b) if blocks[i][0] == "img" and blocks[i][1].exists()]
        image_land = [wants_landscape(blocks[i][1]) for i in images]
        if wide_table:
            orient[a:b] = ["L"] * (b - a)
        elif images and all(image_land):
            # the heading and description stay in the preceding orientation (no near-empty page);
            # landscape starts with the sentence introducing the first figure, or the figure itself
            first = images[0] - 1 if images[0] > a and blocks[images[0] - 1][0] == "p" else images[0]
            orient[a:first] = [orient[a - 1] if a else "P"] * (first - a)
            orient[first:b] = ["L"] * (b - first)
        else:
            for i, land in zip(images, image_land):
                orient[i] = "L" if land else "P"
    return orient


def blocks_to_xml(blocks, headings, media, sections):
    """sections: dict with the 'portrait' sectPr; records section breaks and the final orientation."""
    out = []
    orient = block_orientations(blocks)
    current = "P"
    for index, block in enumerate(blocks):
        if orient[index] != current:
            if current == "P":
                # end the preceding portrait section; only the first section keeps the page restart
                first = not sections["breaks"]
                out.append(section_break(sections["portrait"] if first else without_restart(sections["portrait"])))
            else:
                out.append(section_break(without_restart(landscape_sect(sections["portrait"]))))
            sections["breaks"] += 1
            current = orient[index]
        width = LANDSCAPE_TEXT_TWIPS if current == "L" else PAGE_WIDTH_TWIPS
        kind = block[0]
        if kind == "h":
            style = headings.get(block[1], "Heading4")
            out.append(para_xml(inline_xml(block[2]), style=style))
        elif kind == "p":
            # a lead-in ("...:") or the sentence introducing a figure stays with what follows
            following = blocks[index + 1][0] if index + 1 < len(blocks) else None
            text = block[1].strip()
            label = text.startswith("**") and text.endswith("**")  # a bold-only lead-in label
            stay = label or text.rstrip("*_").rstrip().endswith(":") or following == "img"
            out.append(para_xml(inline_xml(block[1]), ppr_extra="<w:keepNext/>" if stay else ""))
        elif kind == "li":
            level, text, number = block[1], block[2], block[3]
            marker = f"{number}." if number else ("•" if level == 0 else "–")
            left = 360 + 360 * level
            ppr = (f'<w:tabs><w:tab w:val="left" w:pos="{left}"/></w:tabs>'
                   f'<w:spacing w:before="0" w:after="40"/><w:ind w:left="{left}" w:hanging="300"/>')
            out.append(para_xml(run_xml(marker + "\t") + inline_xml(text), ppr_extra=ppr))
        elif kind == "table":
            out.append(table_xml(block[1], width))
        elif kind == "code":
            ppr = ('<w:shd w:val="clear" w:color="auto" w:fill="F2F2F2"/>'
                   '<w:spacing w:before="0" w:after="0" w:line="240" w:lineRule="auto"/><w:ind w:left="120"/>')
            lines = block[1] or [""]
            for i, line in enumerate(lines):
                # code examples are short; keep each one on a single page (keepNext precedes shd in pPr)
                keep = "<w:keepNext/>" if i < len(lines) - 1 else ""
                out.append(para_xml(run_xml(line, code=True, size=16), ppr_extra=keep + ppr))
            out.append(para_xml("", ppr_extra='<w:spacing w:before="0" w:after="60"/>'))
        elif kind == "img":
            path, alt = block[1], block[2]
            if not path.exists():
                raise SystemExit(f"Missing image {path}. Run: python tools/render_diagrams.py")
            number = len(media) + 1
            rel_id = f"rIdImg{number}"
            media.append((rel_id, f"media/image{number}.png", path))
            out.append(image_xml(rel_id, number, path, alt, LANDSCAPE_BOX if current == "L" else PORTRAIT_BOX))
    sections["final"] = current
    return "".join(out)


def build(key, out_dir=FINAL):
    spec = MANIFEST[key]
    template = TEMPLATES / spec["template"]
    if not template.exists():
        raise SystemExit(f"Template not found: {template}\nCopy the supplied template there (see docs/README.md).")
    blocks = []
    for rel in spec["files"]:
        text, base = load(rel)
        blocks += parse_blocks(text, base)
    media = []

    with zipfile.ZipFile(template) as src:
        entries = {name: src.read(name) for name in src.namelist()}
    document = entries["word/document.xml"].decode("utf-8")
    root_open = re.search(r"<w:document\b[^>]*>", document).group(0)
    new_root = root_open
    for attr, uri in EXTRA_NS.items():
        if attr + "=" not in new_root:
            new_root = new_root[:-1] + f' {attr}="{uri}">'
    sect = re.search(r"<w:sectPr\b.*?</w:sectPr>", document, flags=re.S)
    sect_xml = sect.group(0) if sect else "<w:sectPr></w:sectPr>"
    # Footer with document label, version and page numbers (the templates have no footer).
    # footerReference must be the first child of sectPr.
    first_text, _ = load(spec["files"][0])
    version = re.search(r"\*\*Version:\*\*\s*([0-9.]+)", first_text)
    version = version.group(1) if version else "?"
    sect_xml = re.sub(r"(<w:sectPr\b[^>]*>)", r'\1<w:footerReference w:type="default" r:id="rIdFtr1"/>',
                      sect_xml, count=1)
    sections = {"portrait": sect_xml, "breaks": 0}
    body = blocks_to_xml(blocks, spec["headings"], media, sections)
    if sections["final"] == "L":
        sect_xml = landscape_sect(sect_xml)    # document ends on a landscape section: no blank portrait page
    if sections["breaks"]:
        sect_xml = without_restart(sect_xml)   # final section continues the page numbering
    entries["word/footer1.xml"] = footer_xml(spec["label"], version).encode("utf-8")
    prolog = document[:document.index(root_open)]
    entries["word/document.xml"] = (prolog + new_root + "<w:body>" + body + sect_xml
                                    + "</w:body></w:document>").encode("utf-8")

    rels = entries["word/_rels/document.xml.rels"].decode("utf-8")
    image_type = "http://schemas.openxmlformats.org/officeDocument/2006/relationships/image"
    new_rels = "".join(f'<Relationship Id="{rid}" Type="{image_type}" Target="{target}"/>'
                       for rid, target, _ in media)
    new_rels += f'<Relationship Id="rIdFtr1" Type="{FOOTER_TYPE}" Target="footer1.xml"/>'
    entries["word/_rels/document.xml.rels"] = rels.replace("</Relationships>", new_rels + "</Relationships>").encode("utf-8")
    for rid, target, path in media:
        entries["word/" + target] = path.read_bytes()

    types = entries["[Content_Types].xml"].decode("utf-8")
    if 'Extension="png"' not in types:
        types = types.replace("<Types ", "<Types ", 1).replace(
            "</Types>", '<Default Extension="png" ContentType="image/png"/></Types>')
    if 'PartName="/word/footer1.xml"' not in types:
        types = types.replace("</Types>", f'<Override PartName="/word/footer1.xml" ContentType="{FOOTER_CT}"/></Types>')
    entries["[Content_Types].xml"] = types.encode("utf-8")

    # The template's extended properties carry its own statistics (e.g. "8 pages"); drop them so
    # no stale page or word count is shown (all are optional; Word recomputes them on save).
    if "docProps/app.xml" in entries:
        app = entries["docProps/app.xml"].decode("utf-8")
        app = re.sub(r"<(Pages|Words|Characters|CharactersWithSpaces|Lines|Paragraphs|TotalTime)>[^<]*</\1>",
                     "", app)
        entries["docProps/app.xml"] = app.encode("utf-8")

    # Document properties: the templates have no title/author (STP has no core part at all), so the
    # core part is always written; the template's creation date is kept when it has one.
    now = datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    old_core = entries.get("docProps/core.xml", b"").decode("utf-8")
    created = re.search(r"<dcterms:created[^>]*>(.*?)</dcterms:created>", old_core)
    created = created.group(1) if created else now
    entries["docProps/core.xml"] = (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" '
        'xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" '
        'xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">'
        f"<dc:title>{escape(spec['title'])}</dc:title>"
        f"<dc:subject>Version {escape(version)} — final for submission; team sign-off pending</dc:subject>"
        "<dc:creator>Team 11</dc:creator><cp:lastModifiedBy>Team 11</cp:lastModifiedBy>"
        f'<dcterms:created xsi:type="dcterms:W3CDTF">{created}</dcterms:created>'
        f'<dcterms:modified xsi:type="dcterms:W3CDTF">{now}</dcterms:modified>'
        "</cp:coreProperties>").encode("utf-8")
    package_rels = entries["_rels/.rels"].decode("utf-8")
    if "docProps/core.xml" not in package_rels:
        package_rels = package_rels.replace(
            "</Relationships>",
            '<Relationship Id="rIdCore1" Type="http://schemas.openxmlformats.org/package/2006/relationships/'
            'metadata/core-properties" Target="docProps/core.xml"/></Relationships>')
        entries["_rels/.rels"] = package_rels.encode("utf-8")
    types = entries["[Content_Types].xml"].decode("utf-8")
    if 'PartName="/docProps/core.xml"' not in types:
        types = types.replace("</Types>", '<Override PartName="/docProps/core.xml" '
                              'ContentType="application/vnd.openxmlformats-package.core-properties+xml"/></Types>')
        entries["[Content_Types].xml"] = types.encode("utf-8")

    out_dir.mkdir(parents=True, exist_ok=True)
    output = out_dir / spec["output"]
    with zipfile.ZipFile(output, "w", zipfile.ZIP_DEFLATED) as dst:
        order = ["[Content_Types].xml"] + [n for n in entries if n != "[Content_Types].xml"]
        for name in order:
            dst.writestr(name, entries[name])
    headings = sum(1 for b in blocks if b[0] == "h")
    tables = sum(1 for b in blocks if b[0] == "table")
    print(f"{output}: {headings} headings, {tables} tables, {len(media)} images")


def footer_xml(label, version):
    """Centred footer: 'Team 11 · <label> · Version <version> · Page X of Y'.

    Complex fields (fldChar begin/separate/end) carry the run formatting on every part, so Word
    renders the page numbers in the same 8 pt size as the footer text."""
    rpr = '<w:rPr><w:sz w:val="16"/><w:szCs w:val="16"/></w:rPr>'

    def text(value):
        return f'<w:r>{rpr}<w:t xml:space="preserve">{escape(value)}</w:t></w:r>'

    def field(instr):
        return (f'<w:r>{rpr}<w:fldChar w:fldCharType="begin"/></w:r>'
                f'<w:r>{rpr}<w:instrText xml:space="preserve"> {instr} </w:instrText></w:r>'
                f'<w:r>{rpr}<w:fldChar w:fldCharType="separate"/></w:r>'
                f'<w:r>{rpr}<w:t>1</w:t></w:r>'
                f'<w:r>{rpr}<w:fldChar w:fldCharType="end"/></w:r>')

    body = (text(f"Team 11 · {label} · Version {version} · Page ") + field("PAGE")
            + text(" of ") + field("NUMPAGES"))
    return ('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            '<w:ftr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" '
            'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">'
            f'<w:p><w:pPr><w:jc w:val="center"/></w:pPr>{body}</w:p></w:ftr>')


def main(argv):
    """Usage: build_docs.py [--out-dir DIR] [srs|sad|stp ...]"""
    out_dir = FINAL
    if "--out-dir" in argv:
        index = argv.index("--out-dir")
        out_dir = pathlib.Path(argv[index + 1]).resolve()
        argv = argv[:index] + argv[index + 2:]
    keys = argv or list(MANIFEST)
    for key in keys:
        if key not in MANIFEST:
            raise SystemExit(f"Unknown document '{key}'. Choose from: {', '.join(MANIFEST)}")
        build(key, out_dir)
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
