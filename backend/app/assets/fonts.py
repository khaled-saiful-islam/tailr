"""Fonts for documents and images drawn by the headless renderer.

The renderer has no network, so fonts are inlined as data URLs. Each `<name>-<n>.woff2`
has a `<name>-<n>.json` beside it: {"family": "...", "weight": "100 900", "stretch"?: "75% 125%"}.
"""

from __future__ import annotations

import base64
import json
from functools import cache
from pathlib import Path

FONTS_DIR = Path(__file__).parent / "fonts"


@cache
def font_faces(names: tuple[str, ...]) -> str:
    """@font-face rules for the named fonts (e.g. ("archivo", "martian"))."""
    rules = []
    for name in names:
        for path in sorted(FONTS_DIR.glob(f"{name}-*.woff2")):
            meta = json.loads(path.with_suffix(".json").read_text())
            data = base64.b64encode(path.read_bytes()).decode()
            stretch = f" font-stretch: {meta['stretch']};" if meta.get("stretch") else ""
            rules.append(
                f"@font-face {{ font-family: '{meta['family']}'; font-weight: {meta['weight']};"
                f"{stretch} font-display: block;"
                f" src: url(data:font/woff2;base64,{data}) format('woff2'); }}"
            )
    return "\n".join(rules)
