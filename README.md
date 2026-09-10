# Warehouse Empire

Idle logistics game for Android. Published on Google Play as
`com.abdulgames.warehouseempire`.

**This repository is the source of truth for the game.** The whole game is the
single self-contained file `warehouse-empire-android.html` — no dependencies and
no external assets at runtime. Edit that file and the next build picks it up.

The one generated part of that file is the model sheet, inlined as a data URI in a
`<script id="atlas">` block ahead of the game. Regenerate it with
`python3 tools/inline-atlas.py`; nothing else in the file is generated.

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

## The prestige layer

Selling up pays REP. REP is spent in **the Directorship** — four branches of four nodes,
each ending in a **Directorship** proper, of which you may hold one at a time.

The load-bearing rule: **`state.rep` means total ever earned, and it is what
`prestigeMult()` reads.** Spending is tracked separately in `state.repSpent`. If the
multiplier read what was *left*, buying a node would cut your income and every existing
save would quietly lose power the first time it opened — the tree would be a trap rather
than a reward.

Taking a different Directorship refunds the one you hold in full. The rule is one at a
time, not one forever: REP grows as the square root of a lifetime that itself runs away,
so a permanent lock would only punish a player for choosing before they understood the
choice. For the same reason a Directorship is gated on **sales**, not on price — a price
alone stops gating anything a few prestiges later.

`sim-tree.js` is the balance pass. It reports when each tier of the tree comes into
range, measures each Directorship against holding none, and checks the Network is worth
managing. Three findings came out of it and are baked into the numbers:

- Entry cost was 40 REP, four sales away. The tree is the headline of the prestige layer
  and should introduce itself sooner; at 10 REP it lands after the fourth sale.
- Investing in a retired site paid for itself in **twelve minutes**, which is not an
  investment, it is a formality. Prices now pay back in about two hours, quadrupling per
  tier.
- Logistics Tycoon originally only lifted the Network's output cap — and that cap almost
  never binds, because right after a sale the REP floor carries the Network and once a
  fleet is running 40% of it dwarfs the Network sum. It doubles what retired sites are
  worth as well, which is what makes it a Network build rather than a dead node.

## The Network

Retired sites used to be a list of peaks that summed into an income floor you never saw.
Each now keeps the specialisation it was run as, so **what you choose to run before
selling decides what you end up holding** — three of a kind pay +10%, six pay +25%. Each
can be invested in with cash, and the whole thing is capped as a share of the site you
are running now, so it supports the current run rather than replacing it.

## The site view

The yard is drawn in blocks: racking, cladding, hazard markings, corporate towers. That
is what the seven liveries recolour, and it is what makes the site read as this game
rather than as a generic industrial estate.

Models are used for one thing — the forklifts, where a stack of blocks genuinely cannot
describe the shape. They are baked out of the [Kenney](https://kenney.nl) CC0 kits along
this exact projection, so a frame's recorded origin lands on the point `pt()` returns for
its grid cell with no per-model fudging, and they go into the same sorted stream as
everything else through `emit()` — a forklift occludes the racking correctly and the
racking occludes it.

A short history worth keeping, because both dead ends look like good ideas:

- **The whole site was drawn from models once.** It came out as a grey office park: the
  racking is the game's subject and models put it inside a shed where you cannot see it,
  the sheet's own colours ignore the liveries, and the busiest thing on screen was a car
  park. The blocks were simply better.
- **Sorting prisms by their near corner** is the textbook fix for a tall model painting
  over a container. It visibly flattens the racking and reorders the cladding, because
  the whole scene was composed against the far-corner convention. Sprites carry a
  footprint instead, and the model forklifts stay out of the aisle beside the container
  court.

Models are baked in daylight, so on a night livery the sheet is multiplied through that
livery's own haze colour — once, into an offscreen canvas cached per livery. If the sheet
will not decode, the forklifts fall back to blocks and nothing says so, because there is
nothing to say: the yard reads the same either way.

### The sheet

`art/atlas.png` is the full 86-model sheet the pipeline produces.
`tools/inline-atlas.py` repacks the frames named in its `KEEP` list into a small WebP and
writes it into the game as a data URI — currently five frames, 214×48, under 5KB. Adding
a model later means naming it in `KEEP` and re-running the tool.

It goes in as a data URI because the workflow copies one HTML file into `www/` and
nothing else, so a sibling asset would simply not be in the AAB.

The pipeline that renders the models into `art/atlas.png` lives in `prototype/tools/`. It
renders along the true isometric axis and squashes by `sqrt(3)/2`, because the game
projects 2:1 dimetric and an orthographic camera cannot produce that at uniform scale.

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
