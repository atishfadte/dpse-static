# FontAwesome — the vendored cut

Cut from the **Font Awesome Pro 7.3.0** package by `tools/fa-style.py`. Do not hand-edit and do
not hand-copy files in: three things have to move together or every icon silently becomes a blank
square (see BUILD-ERRORS §106).

| File | Why |
|---|---|
| `css/fontawesome.min.css` | the **core** — utility classes and the glyph table (`.fa-user{--fa:"\f007"}`) for all 4,797 classic icons. Carries **no** `@font-face`. |
| `css/solid.min.css` | the **style** — `@font-face` *and* `.fa-solid{--fa-style:900}`. Whichever style is current lives here. |
| `css/brands.min.css` | brand marks. They exist in **no** other style, so this always ships. |
| `webfonts/fa-solid-900.woff2` | the style's webfont |
| `webfonts/fa-brands-400.woff2` | the brands webfont |

**One style ships.** `solid` is what this build uses; `light` (thin line work) is the other common pick. Change it with one command;
the tool swaps the CSS, the webfont, every `fa-<style>` class in the pages/JS/JSON/CSS and the
`<head>` loader together:

```bash
python3 tools/fa-style.py             # what is shipped, what is available, is anything out of step
python3 tools/fa-style.py light       # or thin / regular / solid / sharp-light / duotone-light / …
```

Shipping four styles "so they're there" costs ~1.5 MB of webfont for a site that then looks
inconsistent page to page. ~650 KB, one style, is the point.

**The accent** (not in use here). `accent.json`, when present, records a SECOND style for a named
few icons — say the play/pause controls in duotone, if a hairline triangle proves hard to read at
12px on a small round button. Its webfont is **subsetted to exactly those glyphs** (796 bytes for
two, not the 345 KB the whole font weighs):

```bash
python3 tools/fa-style.py --accent duotone play pause
python3 tools/fa-style.py --accent off
```

**Licence.** Font Awesome Pro is commercially licensed per seat — see
`LICENSE-fontawesome-pro.txt`. The full 1.1 GB package lives at
`resources/fontawesome-pro-plus_v7.3.0_web/` and is **gitignored**; only this cut is committed.
A build without the licence uses FontAwesome Free (solid/regular/brands only) or the Lucide line
set (`tools/icons-switch.py line`).
