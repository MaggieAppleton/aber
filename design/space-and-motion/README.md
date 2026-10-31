# Space and motion export

These files are an export of the Claude Design canvas "Aber — Space & Motion", taken on 31 October 2026. You can read and build on them without access to Claude Design.

Start with `index.html` in a browser. It shows every board with its screenshot and a one-line description.

| Folder | What's in it |
| --- | --- |
| `boards/` | Each board as a standalone HTML file with inline styles and no runtime. Open any one directly. Links between boards work. `Material.html` has a small vanilla-JS accept/discard demo; everything else is static. |
| `screenshots/` | One PNG per board, taken with Chromium at the board's own size and with the fonts in `assets/` loaded. |
| `source/` | The original Claude Design sources (`*.dc.html`) plus `canvas.json`, which records layout, board titles and sizes. These need the Claude Design runtime to render; use `boards/` for viewing. |
| `assets/` | IBM Plex Sans and Mono (SIL Open Font License, from @fontsource) and `fonts.css`. |
| `manifest.json` | Board list: export file name, source file name, title and size. |

## Name mapping

The export names describe what each board shows. The source names are what the canvas used.

| Export (`boards/`) | Source (`source/`) |
| --- | --- |
| WorldA.html | Main.dc.html |
| WorldAtScale.html | WorldScale.dc.html |
| WorldB.html | OptionB.dc.html |
| TheoryWriting.html | Writing.dc.html |
| DumpPanelOpen.html | TheoryChat.dc.html (repurposed from the old conversation-panel alternative) |
| All others | The same name with `.dc.html` |

## Caveats

- **Wireframe fidelity.** The boards are low-to-mid fidelity wireframes. The look (colour, type, density) has not been designed yet; that is Layer 4.
- **Example data.** All themes, theories and signals are placeholders. Bracketed text such as `[YEAR]` marks deliberately missing facts.
- **Laptop boards are app shells.** They are 100vh layouts sized for a 1440×900 window and are not responsive below about 1100px wide. The phone boards are separate 390×844 mockups.
- **Motion is a storyboard, not an animation.**
