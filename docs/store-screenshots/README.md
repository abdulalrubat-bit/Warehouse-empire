# Play Store screenshots

Captured from the v20 (2.9) build at `aca5de1`, so everything shown is in that
release. 1080x1920, 24-bit RGB PNG, no alpha — inside Play's phone screenshot
requirements (320–3840px per side, under 8MB each).

| File | Shows |
|------|-------|
| `01-site.png` | The site: full racking, corporate towers, Peak market, Priority Client ready |
| `02-daily.png` | Daily calendar, with the crate bonus days |
| `03-markets.png` | All three manifests at Peak / Low / Hot at once |
| `04-fleet.png` | The equipment ladder |
| `05-corporate.png` | All eight corporate buildings, including "% BUILT" progress |
| `06-liveries.png` | The livery set, crates counter and the Crate Shipment ad |
| `07-night-livery.png` | Night Shift livery — the whole app, not just the canvas |
| `08-upgrades.png` | Upgrades |

Play shows the first two or three in the listing preview, so 01 and 07 lead:
side by side they make the livery system obvious.

These are browser captures rather than device captures. Rendering is identical
— the app is a WebView — but there is no Android status bar or rounded corner
mask. Play does not require either.

Regenerate with `storeshots.js` (kept in the working scratchpad, not the repo):
it seeds a mid-late save, forces High quality, and walks the tabs at a 540x960
viewport with deviceScaleFactor 2.
