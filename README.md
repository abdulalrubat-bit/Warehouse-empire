# Warehouse Empire

Idle logistics game for Android. Published on Google Play as
`com.abdulgames.warehouseempire`.

**This repository is the source of truth for the game.** The whole game is the
single self-contained file `warehouse-empire-android.html` — no dependencies and
no external assets at runtime. Edit that file and the next build picks it up.

The one generated part of that file is the sprite atlas, inlined as a data URI
in a `<script id="atlas">` block ahead of the game. Regenerate it with
`python3 tools/inline-atlas.py` after changing `art/atlas.png`; nothing else in
the file is generated.

`abdulalrubat-bit.github.io` is the studio site and hosts `app-ads.txt` at the
domain root (AdMob requires it there). It does not carry a copy of the game.

## Building

Both builds are GitHub Actions workflows — run them from the Actions tab. Each
one generates a fresh Capacitor project around the HTML file, so there is no
`android/` folder committed here.

| Workflow | Produces | Trigger |
|---|---|---|
| `build-debug.yml` | Debug APK, sideloadable | Automatic on push to the game file, or manual |
| `build-release.yml` | Signed AAB for Play | Manual, takes `version_code` and `version_name` |
| `generate-keystore.yml` | Signing keystore | Manual, **run once ever** |

`version_code` must increase on every Play upload. The release workflow fails
early if the substitution did not apply, rather than building an AAB that Play
would reject.

## Layout

Two layouts, one set of markup — nothing moves in the DOM between them except the site
view itself, which is why the whole test suite carries over.

- **Portrait** is the shipped layout, untouched: a scrolling column with the site view as
  a band inside the Floor tab.
- **Landscape** makes the site the backdrop and slides the active tab over the left of
  it, so the yard stays live beside whatever you are buying. The tab bar becomes a rail
  down the right edge.

The site view is the one element that has to move. Left inside `#tab-floor` it could
never paint behind that section — a positioned section with a `z-index` is a stacking
context of its own, and nothing inside it can escape underneath — so `placeFloorView()`
reparents it to `<body>` in landscape and back again in portrait, on load and on every
rotation.

Two things follow from the canvas being the whole viewport in landscape rather than a
382px band:

- The camera zooms to, and centres on, the **strip between the panel and the rail**, not
  the canvas. A fixed zoom ceiling tuned for portrait left the site as a stamp in the
  middle of an empty apron on a tablet.
- The ground is sized from the viewport. A world rect paints as a diamond, and a diamond
  covers a `CW×CH` rectangle only when its span is at least `CW/TW + CH/TH` — so ground
  that suited portrait leaves paddock in the corners of a landscape frame. It is clipped
  to below the horizon, because ground large enough to cover a landscape canvas is also
  large enough to cover the sky.

## Rendering

The site view has two renderers, and the player chooses between them under
**Graphics** in the Office tab.

- **Modelled** (default) blits sprites baked out of the [Kenney](https://kenney.nl)
  CC0 model kits. Roughly 150 `drawImage` calls a frame.
- **Blocks** draws the original flat prisms. Roughly 3,500 path fills a frame.

Both paint the same world through the same projection and the same camera, so
the corporate plot tap zones, the yard incident spawn bands and the frame budget
are shared and neither renderer knows which one ran. `test-renderers.js` asserts
that by mapping the whole tappable region of a plot under each and comparing.

Sprites cannot be recoloured per frame, so a livery repaints the sky, the ground
and one flat wash over the finished frame rather than tinting each model. That
makes the daylight liveries read closer together in Modelled than in Blocks —
which is part of why Blocks stays.

If the atlas fails to load, the game falls back to Blocks on its own and the
Modelled option is disabled.

### The atlas

`art/atlas.png` is the source sheet, 2048x2048, 86 frames at 48px per tile.
`tools/inline-atlas.py` crops it to the used extent, encodes it as WebP at
quality 95 and writes it into the game. WebP rather than PNG: 265KB against
575KB, with a mean channel error under 1/255 over opaque pixels — no banding and
no ringing on the alpha edges, and every WebView this ships to is Chromium.

The pipeline that renders the models into that sheet lives in `prototype/tools/`.
It renders along the true isometric axis and squashes by `sqrt(3)/2`, because the
game projects 2:1 dimetric and an orthographic camera cannot produce that at
uniform scale.

## Ads

Six rewarded AdMob placements, mapped in `AD_UNITS` near the top of the game's
script block. Each has its own ad unit so they report separately.

Debug builds force `AD_TESTING = true` so they always serve Google test ads —
tapping your own live ads is an AdMob policy violation. Release builds fail if
`AD_TESTING` is true, if any unit is empty, or if two placements share a unit.

The AdMob app ID and the `AD_ID` permission are injected into the manifest by
both workflows; without the app ID the app crashes on launch, and without the
permission Android 13+ zeroes the advertising ID.

## Icons

`assets/icon.png` (512x512 or larger) is the source for every density. The
release build fails if the generated launcher icon is unchanged, so a default
icon cannot ship by accident.

Optionally add `assets/icon-foreground.png` for the Android 8+ adaptive layer.
Without it, launchers crop roughly the outer 19% of each edge.
