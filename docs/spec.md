# WHL Colours Palette — Specification

> Describes the tool as it is at **version 0.51.0** (`whl_colours_palette.html`, repo `~/Dev/Colours/Palette`, remote `github.com/wanghailei/colour`). History appears only as rationale. Sources: the current HTML file and the build-session transcripts (Claude Cowork session of 4 Jun – 27 Jul 2026, and Claude Code sessions of 27–29 Jul 2026).

---

## 1. What it is

WHL Colours Palette is Wang Hailei's personal colour standard: a single-file HTML tool that generates a complete, perceptually even colour system as one full-viewport swatch grid — hue families as columns, lightness steps as rows, black (the toolbar) at the top and white (the caption row) at the bottom — and exports it into any design workflow as CSS variables, JSON, a hex list, or a titled SVG. "WHL" is Wanted Hacker Limited (whl.ltd). The whole grid is the deliverable; there is no seed colour and no picker.

## 2. Purpose and principles

- **The whole swatch is the artefact.** The user starts from the complete system, never from one "main colour". A seed-colour workflow was built first and explicitly rejected (user, 4 Jun 2026: "I actually don't need to start with a certain main colour. Any time I start with a whole swatch.").
- **Perceptual evenness is the value.** Colour is modelled in OKLCH (Ottosson, 2020; CSS Color 4), the modern implementation of Munsell's hue/value/chroma idea. Equal numeric steps read as equal visual steps, and hue stays true as lightness changes — the failure mode of HSL/HSB that the tool exists to eliminate. Never optimise the maths back towards RGB/HSL arithmetic.
- **The title is the colour.** Cells carry no names. A cell's title is its true OKLCH coordinates; pasting them into `oklch()` reproduces the cell exactly. Names were tried (Tailwind's 17 families) and rejected because a family name lies at the ends of a column ("Pink 80 is not a real pink at all", 4 Jun 2026).
- **Honest values only.** Titles state the *rendered* (post-gamut-clamp) chroma, never the requested one, so title ↔ colour is strictly one-to-one.
- **Three controls, nothing more.** Hue-rotate, grey columns, grey-tint and preset step-counts were each built and then removed as redundant or confusing. Chroma at 0 already produces the grey ladder.
- **Minimal chrome, one voice.** One monospaced font, one size, borderless text controls, black-and-white frame; the colours are the interface.

## 3. Functional specification

### 3.1 Controls (toolbar, in L·C·H order)

| Control | Range | Meaning |
|---|---|---|
| `lightness` | 5–100, step 1 (default 18) | **Count** of lightness rows — an even ladder strictly between black and white |
| `chroma` | 0–0.32, step 0.002 (default 0.120) | One global saturation for the whole swatch |
| `hues` | 3–100, step 1 (default 28) | **Count** of hue families (columns), spread evenly around 360° |

- The chroma ceiling is the sRGB gamut's: its global maximum chroma is ≈0.313 (the blue primary), so every slider position past 0.32 clamped for every hue. The former 0.37 (Display-P3) ceiling was cut on 29 Jul 2026 — sRGB hex is the deliverable, practical on any screen, any platform, and in print preparation. Settings stored before the cap are clamped on load.
- **The house default is 18 / 0.120 / 28** (decided 29 Jul 2026) — the exact settings the companion Gradient tool's baked default swatch (`swatch/default.json`) was generated from, verified cell-for-cell identical, so a fresh visitor to either tool starts from the one house standard. An interim 0.150 default was chosen earlier the same day and superseded by this sync. There is no industry standard to defer to — systems such as Carbon or Tailwind tune chroma per family, whereas one global chroma is this tool's own design.

- Lightness and hues are free sliders, not presets (presets 10/20/30/40/50/100 were tried and rejected as too limited, 4 Jun 2026).
- The first hue sits at 25° (`hueStart: 25`, fixed; the hue-rotate control was removed).
- The current value renders beside each slider label; labels are lower case.

### 3.2 Colour construction

- Lightness of row *i* (0-based): `(i + 1) / (count + 1)` — black is rung 0, white is rung count + 1, the steps are the even rungs between. This exact formula ended a long search; earlier schemes (fixed IBM-style values, lightness-bias curves, pinned extremes) were all rejected because the extremes never changed.
- Chroma breathes with lightness: `chromaAt(L) = chroma × (0.2 + 0.8·sin(π·L))` — full at mid-tones, gentle at the extremes. An aesthetic decision; it shapes every colour.
- Hue of column *j*: `(25 + j·360/hueCount) mod 360`.
- OKLCH → sRGB uses the published OKLab matrices (round-trip verified). Out-of-gamut colours are clamped by a 22-iteration binary search on chroma; clamped cells show a small **◇** flag (bottom-right), explained in the footer caption.

### 3.3 Cell content

- Title: `<L%>% <rendered chroma, 3 d.p.> <hue°>` — valid `oklch()` arguments (e.g. `62% 0.110 25`).
- Below the title: the upper-case hex value at reduced opacity.
- Text ink flips black/white automatically from WCAG relative luminance (threshold 0.45).

### 3.4 Interactions

- **Click** a cell → copies its hex (toast confirms).
- **Shift-click** → selects the whole column (hue family) and copies its hex list.
- **Alt-click** → selects the whole row (one lightness across all hues) and copies its hex list.
- Clicking the same selection again, or **Escape**, clears it. A selection that outlives a slider change past the grid edge is dropped.
- Hover shows a 1px inset outline; a selection shows a 3px ring.
- The white footer row is a caption, not a cell: no pointer, no hover, no copy (defused 27 Jul 2026). It states the three click gestures, the ◇ gamut note, and the copyright line (© Wanted Hacker Limited · whl.ltd).
- Settings persist in `localStorage` (`whl-colour-palette-v3`); private mode fails silently.

### 3.5 Exports

| Button | Action | Format |
|---|---|---|
| `CSS` | copies | `:root` block: `--whl-black`, `--whl-white`, then `--whl-<hue, 3 digits>-<lightness %>: <hex>` per cell |
| `JSON` | downloads | `{ settings: {lightness, chroma, hues}, black, white, families: [{hue, steps: {<L%>: <hex>}, print: {<L%>: {cmyk, pt?}}}] }` |
| `HEX` | copies | plain upper-case list, `#000000` first, `#FFFFFF` last |
| `SVG` | downloads | titled rectangles, 100×100 (square — the canonical swatch form, decided 29 Jul 2026; the fill-to-window screen is a live view); full swatch includes the black top row and white bottom row; with a selection active, only the selected strip |

- **Print references** (JSON only, 29 Jul 2026): each step carries a `print` entry beside its honest hex — `cmyk`, the naive uncalibrated device conversion as `[c, m, y, k]` percentages, always; `pt`, the nearest entry of an optional sidecar table, only when present. The sidecar is `pantone.json` beside the HTML — a flat `{ "name": "#hex" }` map the owner supplies; it is licensed reference data, git-ignored, and never ships with the source. Nearest match is by OKLab distance. Both values are approximations for print orientation only — the hex remains the truth. The Gradient tool reads `steps` alone, so `print` is invisible to it.
- **SVG cell titles** (29 Jul 2026, replacing the original no-text rule): every colour cell carries its title and upper-case hex as vector text at the screen's visual density (11 and 10 units in a 100-unit cell), in the cell's own ink via the same luminance flip as the screen. The font is named, not embedded — `Berkeley Mono, ui-monospace, Menlo, monospace` — so machines with Berkeley render it exactly and everywhere else falls through to a monospace; text stays selectable and editable. The black and white frame plates stay bare, mirroring the screen.
- Download filenames encode the three settings: `whl_colours_palette_<lightness>_<chroma>_<hues>.<ext>` — every file states what produced it (convention set 5 Jun 2026; prefix pluralised with the file rename, 28 Jul 2026). A selection export appends what was selected (29 Jul 2026): `_h<deg>` for a column, `_l<pct>` for a row.
- Exports always derive from the palette model (`buildFamilies()`), never from the DOM.
- Clipboard writes use the async Clipboard API with an `execCommand` fallback and a toast either way.

## 4. Design specification

### 4.1 Typography

- One family everywhere: **Berkeley Mono Variable**, bound via `@font-face` `local()` aliases under the internal name "WHL Mono" (aliases include `TX-02` and static Berkeley Mono faces; the `local()` binding forces Safari to attach the variable family across its weight axis). Because Safari's fingerprinting protection hides user-installed fonts from web content, the licensed Berkeley Mono web font is also declared as a served face — `url(../gradient/berkeley.woff2)`, the Gradient tool's sidecar, one copy per site — answering to the "Berkeley Mono" name later in the stack (0.49.5). Final fallbacks: `ui-monospace`, SF Mono, Menlo, monospace.
- One size everywhere: **12px** (the ◇ flag is 10px). All weights regular (400) except the brand, which is medium (500).
- Slider labels and export buttons are plain text — no button shapes, no borders; hover underlines the export buttons.

### 4.2 Layout

- The page is the swatch. A CSS grid fills the browser window: columns share the width down to a 150px minimum, rows share the height down to a **100px** minimum; past the minimums the swatch scrolls instead of crushing.
- The toolbar **is** the black row: grid row 1, sticky at the top, fixed 96px height. The white caption row sits at the bottom, also 96px (header height is linked to footer height). Colour rows take the rest.
- Toolbar content: brand left ("WHL **Colours Palette** – OKLCH ‹version›", with the model suffix and version at reduced opacity), the three sliders centred, the four export buttons right. The inner toolbar is sticky against horizontal scroll.
- Safari's rubber-band overscroll is disabled on the document and the scroll container (`overscroll-behavior: none`, 28 Jul 2026).
- Feedback is a small dark toast, bottom-centre, auto-hiding after 1.4s.

### 4.3 Colour rules

- Output gamut: **sRGB hex, by decision** (29 Jul 2026). The palette must be usable on any screen and in print preparation, on macOS, Windows and Linux alike — Display-P3 output was considered and declined until a real need appears. Values above a hue's sRGB ceiling clamp and flag ◇; the slider itself stops at the gamut's global ceiling (0.32).
- Black `#000000` and white `#ffffff` frame every export as well as the screen.

## 5. Technical shape

- **One self-contained file**: `whl_colours_palette.html` — one `<style>` block (wrapped in `@layer palette`, design tokens as `:root` custom properties), one markup block, one `<script>`. No build step, no dependencies, no network. Open in a browser to use it; open in an editor to change it.
- Plain browser JavaScript: no semicolons, double quotes, tabs, full-word camelCase names; plain CSS, no frameworks. Formatted with Prettier (`--use-tabs --semi false --print-width 120`).
- Data flow is one-way: `settings` → `buildFamilies()` (pure, the single source of truth) → `render()` / exports. The DOM is a projection of the model.
- A `const version` string renders in the toolbar — the stale-cache tell (Safari `file://` caches aggressively; a mismatched number means a stale page).
- Versioning: `0.<iteration>.<patch>` — the minor number counts iteration rounds (renumbered to 0.48.0 on 27 Jul 2026 to reflect ~48 rounds); minor/patch bump automatically, major requires permission.
- State: `localStorage` only. No server, no accounts.
- **Tests**: `sh tests/run.sh` — extracts the pure layer (colour maths, palette model, export builders) from the HTML with awk and runs the assertions in `tests/palette.test.js` under Node (round-trip against the sRGB primaries, clamp honesty and monotonicity, ladder evenness, house defaults, print references, filenames, SVG geometry, and the Gradient `steps` contract).
- **Deployment**: whl.ltd is a separate GitHub Pages repo (`~/Dev/whl.ltd`, Carson-governed). The file is copied there as `colours/palette/index.html` and served at **whl.ltd/colours/palette/**. Standing rule (28 Jul 2026): every version bump must also be deployed to whl.ltd — the user views the live site.

## 6. History and rationale

- **4 Jun 2026 — concept and form.** "I'm a designer. I've been looking for a tool or way for generating colour palettes for many years." First build was a seed-colour generator; corrected to "It should look like a swatch, a big one, the whole webpage"; then, against an uploaded IBM Carbon colour-reference PDF: "NO. The swatch UI was right. It's something looks like this." The edge-to-edge grid with a black and white frame has been the form ever since.
- **4 Jun 2026 — reduction.** Grid rotated 90° (hues as columns); no main colour; hue-rotate removed ("confusing to me"); grey columns and grey-tint removed (chroma 0 already yields greys); presets tried and reverted to sliders; the even black→white lightness ladder settled after repeated "the darkest and the lightest colour never changed" corrections.
- **4 Jun 2026 — naming.** Tailwind family names adopted then rejected; Pantone-style numbers rejected; settled on true OKLCH coordinates as the title, with rendered chroma. Control order set to L·C·H to mirror `oklch()`. Product renamed WHL Colour Palette.
- **4–5 Jun 2026 — craft.** White-on-black toolbar doubling as the black row; single 12px monospace voice; row/column selection with shift/alt-click and SVG strip export; footer interaction guide; version stamp introduced (0.1.x) after stale-cache debugging; export filename convention `…_<lightness>_<chroma>_<hues>`.
- **27 Jun 2026 — layout.** Grid fills the browser window (`1fr` tracks with minimum floors); header and footer fixed at 96px; all weights regular; `@font-face local()` binding added for Berkeley Mono (0.2.0).
- **27 Jul 2026 — handoff to Claude Code.** design.md / develop.md / project.md written in the Cowork session; version renumbered 0.2.0 → 0.48.0 (minor = iteration count); renamed **WHL Colours Palette** (plural) with the brand at medium weight; font binding fixed; footer defused into a caption; repo moved to `~/Dev/Colours/Palette`.
- **28 Jul 2026 — 0.49.x.** JSON export changed from copy to file download (0.49.0) — the JSON is dragged into the companion WHL Gradient tool; file renamed `whl_colours_palette.html` with matching export prefix (0.49.1); cell minimum height raised 48 → 64 → 100px (0.49.2–0.49.3); Safari overscroll bounce disabled (0.49.4); live deployment to whl.ltd/colours/palette/ established with the always-latest rule.
- **29 Jul 2026 — 0.49.5.** The licensed Berkeley Mono web font added as a served `@font-face` fallback: Safari's fingerprinting protection hides user-installed fonts, so the `local()` binding alone had stopped reaching Berkeley on the live site.
- **29 Jul 2026 — 0.50.0.** The handoff's open questions worked through and closed with the owner: chroma slider capped at the sRGB ceiling 0.32 (P3 declined as impractical); house default chroma set to 0.150 (superseded by 0.51.0's Gradient sync); SVG cells made square (100×100) as the canonical form; selection exports named by their selection; approximate print references (device CMYK always, PT via the git-ignored `pantone.json` sidecar) added to the JSON export; the pure-layer test suite added (`tests/run.sh`).
- **29 Jul 2026 — 0.51.0.** SVG cells titled — vector text at the screen's density, in the cell's ink, the no-text rule of 4 Jun revised by the owner; selection filename suffixes shortened to `_h<deg>` / `_l<pct>`; house defaults set to **18 / 0.120 / 28** — the settings behind the Gradient's baked default swatch, verified cell-for-cell identical, closing the default-sync question in the reverse direction (Palette adopted the proven standard rather than Gradient re-baking).

### Open questions — resolved with the owner, 29 Jul 2026 (0.50.0–0.51.0)

1. **Chroma ceiling vs colour space** → slider capped at the sRGB ceiling **0.32**; output stays sRGB hex. Display-P3 declined: the palette must be practical on any screen and in print, on macOS, Windows and Linux alike (§4.3).
2. **House default chroma** → 0.150 at first, then **0.120 as part of the 18 / 0.120 / 28 house default** synced with the Gradient's baked swatch (§3.1).
3. **SVG cell ratio** → **square (100×100) is canonical**; the fill-to-window screen is a live view (§3.5).
4. **Selection export filenames** → the selection is encoded: `_h<deg>` for a column, `_l<pct>` for a row (§3.5).
5. **CMYK / PT hints** → added to the JSON export as approximate print references; PT via the git-ignored `pantone.json` sidecar the owner supplies (§3.5).
6. **Test suite** → `tests/run.sh` covers the pure layer (§5).
7. **Default palette sync with Gradient** → resolved by adoption: Palette's defaults are now the settings the Gradient's `swatch/default.json` was baked from, verified identical — [wanghailei/gradient#5](https://github.com/wanghailei/gradient/issues/5) closed accordingly.
