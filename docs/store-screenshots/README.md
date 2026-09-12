# Play Store screenshots

Captured from the v25 (3.8) build at `536d938`, so everything shown is in that
release. 1080x1920, 24-bit RGB PNG, no alpha — inside Play's phone screenshot
requirements (320–3840px per side, under 8MB each).

The previous set was captured from v20 (2.9) and showed the isometric renderer,
which no longer exists. Anyone who installed off that listing was being shown a
different game.

| File | Shows |
|------|-------|
| `01-site.png` | Distribution Centre: pallet racking, full estate, trucks on both aprons |
| `02-port.png` | Port Terminal: container stacks, gantry, open water at the quay |
| `03-night-livery.png` | Dangerous Goods Yard under Night Shift — bunded cells, warm palette |
| `04-directorship.png` | The Directorship tree, one branch held and another part-bought |
| `05-network.png` | The Network: six retired sites, each with its specialisation |
| `06-corporate.png` | The corporate estate, including "% BUILT" progress |
| `07-fleet.png` | The equipment ladder |
| `08-manifests.png` | All five manifests, three in different market states, and the changeover a switch costs |

Play shows the first two or three in the listing preview, so 01 and 02 lead:
side by side, tan pallet racking against stacked containers and water makes the
point that a site is a place rather than a set of multipliers.

**On ordering.** The canvas is about a fifth of a portrait frame, so adjacent
shots have to differ in *colour* to read as different at thumbnail size. Cold
Store is the fourth site and is not here — its layout is the closest to the
Distribution Centre, and next to 01 the two thumbnails were nearly
indistinguishable. It lost its slot to the manifests.

These are browser captures rather than device captures. Rendering is identical —
the app is a WebView — but there is no Android status bar or rounded corner
mask. Play does not require either.

Regenerate with `storeshots37.js` (kept in the working scratchpad, not the
repo): it seeds a late-game save, forces High quality, gives the site a couple
of seconds to run so the docks are not caught empty, and walks the tabs at a
540x960 viewport with deviceScaleFactor 2. It also blocks the analytics endpoint
outright, so a capture run cannot post events even if the build it is shooting
is configured.
