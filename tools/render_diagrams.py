"""Render every PlantUML source in docs/diagrams/src/ to PNG in docs/diagrams/png/.

Usage:  python tools/render_diagrams.py

Requires Java and tools/plantuml/plantuml.jar (not committed; see docs/README.md).
"""
import pathlib
import subprocess
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC = ROOT / "docs" / "diagrams" / "src"
OUT = ROOT / "docs" / "diagrams" / "png"
JAR = ROOT / "tools" / "plantuml" / "plantuml.jar"


def main() -> int:
    if not JAR.exists():
        print(f"PlantUML jar not found at {JAR}. See docs/README.md, 'Diagrams'.")
        return 1
    sources = sorted(SRC.glob("*.puml"))
    if not sources:
        print("No .puml files found.")
        return 1
    OUT.mkdir(parents=True, exist_ok=True)
    # -Sdpi=192 renders at twice the default resolution so small text stays sharp when the
    # images are scaled to the 6-inch text width in the Word documents.
    cmd = ["java", "-Djava.awt.headless=true", "-jar", str(JAR),
           "-tpng", "-charset", "UTF-8", "-Sdpi=192", "-failfast2", "-o", str(OUT)]
    cmd += [str(s) for s in sources]
    result = subprocess.run(cmd)
    if result.returncode != 0:
        print("PlantUML reported an error (see above).")
        return result.returncode
    missing = 0
    for s in sources:
        # PlantUML writes one PNG per page: name.png, name_001.png, ... (diagrams split with newpage)
        pages = sorted(OUT.glob(s.stem + ".png")) + sorted(OUT.glob(s.stem + "_[0-9][0-9][0-9].png"))
        if not pages:
            missing += 1
            print("MISSING " + str((OUT / (s.stem + ".png")).relative_to(ROOT)))
        for png in pages:
            print("OK      " + str(png.relative_to(ROOT)))
    return 1 if missing else 0


if __name__ == "__main__":
    sys.exit(main())
