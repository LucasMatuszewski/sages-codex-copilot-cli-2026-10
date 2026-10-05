#!/usr/bin/env python3
"""Verify the imported workshop baseline. Does not read course-materials."""
from pathlib import Path
import hashlib
import json
import sys

root = Path(__file__).resolve().parents[1] / "app"
expected = json.loads((root / "upstream-sha256.json").read_text(encoding="utf-8"))
actual = {p.relative_to(root).as_posix(): hashlib.sha256(p.read_bytes()).hexdigest()
          for name in ("jftp", "ftpapi") for p in (root / name).rglob("*") if p.is_file()}
changed = sorted(path for path in expected.keys() | actual.keys() if expected.get(path) != actual.get(path))
if changed:
    print("Changed, missing or extra upstream files:\n" + "\n".join(changed))
    sys.exit(1)
print(f"Unchanged upstream baseline: {len(expected)} files")
