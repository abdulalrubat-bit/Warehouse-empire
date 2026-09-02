# Landscape sprite prototype

A separate, self-contained prototype: landscape-only, drawing the site from sprites
baked out of the Kenney CC0 model kits rather than from flat prisms. The shipping game
in `warehouse-empire-android.html` is untouched.

`landscape.html` is a **single self-contained file** — the atlas is inlined as a data
URI, so it can be downloaded on its own and opened anywhere. It was originally split
across three files, which broke the moment it was opened from a phone's Downloads
folder: the HTML arrived without its siblings and had nothing to draw.

Open it at a landscape aspect. Zoom, centre and **Grow** (steps the site through eight
build-out levels) are on the right.

Rebuild the inlined copy after regenerating the atlas:

    python3 tools/inline.py

## How the sprites are made

`tools/` holds the pipeline. It renders each GLB once, headlessly, and packs the results
into one atlas.

The camera is the fiddly part. The game projects with `x = (px-py)*TW` and
`y = (px+py)*TW/2 - pz*TW` — 2:1 dimetric, which an orthographic camera **cannot**
produce at uniform scale, because true isometric gives 2:1.1547. So the pipeline renders
along the true iso axis and packs more world height into the same pixels, squashing by
`sqrt(3)/2`. That factor is measured off a unit cube, not assumed: the calibration
renders a cube and checks its bounding box comes out square.

The kits do not share a scale. `road-straight` is exactly 1x1 unit, but a whole
industrial warehouse is 2.1 units while a car is 2.5 — left alone, a sedan renders larger
than a distribution centre. `models.json` carries a tiles-per-unit figure per model, with
a per-kit default, taking one tile as 4 metres.

Rebuild with:

    node tools/batch.js && python3 tools/pack.py

## Drawing

`spriteScale()` is the only bridge between atlas pixels and the live grid: sprites were
rendered at `tilePx` per tile, so scaling by `(TW*2)/tilePx` puts them at the right size
at any zoom. Each frame records where the model origin sits inside the trimmed sprite,
so a sprite is placed from a grid coordinate with no per-model fudging.

Sorting is the game's painter's algorithm with one addition: entities carry a footprint,
and sort by their **front** corner. Without it a big sprite drawn from its centre sorts
too far back and paints over anything standing in front of it — which put trucks behind
the shed roof.

## What this is not

The reference render this was aimed at is near-photorealistic. These kits are stylised
low-poly, so the prototype reads as a clean Kenney warehouse rather than that image. The
gap is in the art, not the pipeline.

## Motion

Vehicles are agents with a closed route. Facing comes from the direction of travel —
the atlas holds four yaws per vehicle, so picking the nearest to the heading is all the
animation a vehicle needs at this scale. Forklifts carry a pallet on the outbound leg
and run empty on the return, which is what makes it read as work rather than drift.

Chimney smoke is drawn rather than sprited, so it drifts and fades without costing atlas
frames.

Static scenery stays pre-sorted and the handful of moving things are merged into it each
frame, rather than re-sorting five hundred entities sixty times a second.

## What this is not

Nothing here is wired to game state — the HUD numbers are placeholders and "Grow" is a
manual stepper. It exists to judge the look and the cost, which measured 0.6ms a frame
for ~500 sprites with everything moving.
