# Store asset candidates

Drawn for v25 (3.8). Nothing here is installed yet — `assets/icon.png` is still
the forklift that has always shipped. Pick one, and it gets copied over that
path (plus `assets/icon-foreground.png`, which the build already looks for).

## Why the icon needed doing at all

The icon in use fails three measurable tests, none of them aesthetic:

1. **It runs outside the adaptive safe zone.** Android guarantees only the
   centre 66/108 of the square. Under a circle mask — which is most launchers —
   the forklift's rear wheel and the back of the cab are cut off.
2. **The subject fills about a third of the frame**, so at 48px it reads as an
   orange smudge in a dark field.
3. **The hazard stripe sits on the bottom edge**, which is the first thing any
   mask removes.

Every candidate below keeps all meaningful art inside a 313px circle centred in
the 512 square, and ships a foreground layer so the adaptive icon is built
properly rather than from a cropped square.

| File | Notes |
|------|-------|
| `a-forklift.png` | The same idea, recomposed to fit the mask, hazard moved behind the vehicle. Safe choice — keeps the identity players already have. |
| `b-plan.png` | The top-down site, which is what the game actually looks like. **Do not ship this one.** It is handsome at 192px and turns to mush at 48px, which is the wrong way round. |
| `c-pallet.png` | One stacked pallet under floor marking. Four bold blocks, maximum contrast, legible at every size tested. **The recommendation.** |

Each has a matching `-fg.png` — the same art on a transparent ground, for
`assets/icon-foreground.png`. The background colour stays `#232529`, which the
release workflow already passes to the icon generator.

## Feature graphic

1024x500. Both candidates use a real frame of the game rather than clip art;
the one in use shows no gameplay at all and repeats the icon's forklift.

| File | Notes |
|------|-------|
| `f1-split.png` | Type on charcoal at the left, the live plan at the right. |
| `f2-bleed.png` | The plan across the full width under a scrim, type over the dark end. **Stronger** — it reads as a place, and the type stays legible at the size Play actually shows it. |

Regenerate with `icons/draw.js` and the feature-graphic snippet in the working
scratchpad; the plan frame comes from a 1400x900 capture of `#wcanvas` on a
late-game save.
