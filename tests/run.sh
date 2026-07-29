#!/bin/sh
# Test driver for whl_colours_palette.html.
# Extracts the pure layer (colour maths, palette model, export builders)
# from the single-file HTML with awk, appends the assertions in
# palette.test.js, and runs the result in Node. Pass = PASS on stdout
# and exit 0. No files are written outside ${TMPDIR}.
set -e
cd "$(dirname "$0")/.."
SRC=whl_colours_palette.html
T="${TMPDIR:-/tmp}/whl-palette-tests"
rm -rf "$T"; mkdir -p "$T"

# Markup assertions — attributes live outside the extractable script.
grep -q 'id="chromaRange" min="0" max="0.32" step="0.002"' "$SRC" ||
	{ echo "FAIL: chroma slider is not capped at the sRGB ceiling 0.32"; exit 1; }

# Pure-layer extraction. Each range starts at a unique anchor and stops
# before the first impure neighbour (DOM, clipboard, storage, network).
{
	awk '/function srgbToLinear/{f=1} f && /State — no main colour/{exit} f{print}' "$SRC"
	grep 'const defaultSettings = ' "$SRC"
	grep 'const settings = ' "$SRC"
	awk '/function lightnessAt/{f=1} f && /Selection — a whole column/{exit} f{print}' "$SRC"
	grep 'let selection = null' "$SRC"
	awk '/function gatherPalette/{f=1} f && /function exportCss/{exit} f{print}' "$SRC"
	awk '/function svgRectangles/{f=1} f && /function downloadFile/{exit} f{print}' "$SRC"
	awk '/function svgCells/{f=1} f && /function exportSvg/{exit} f{print}' "$SRC"
	cat tests/palette.test.js
} > "$T/run.js"

node "$T/run.js"
