# Warehouse Empire 3.7 (v24)

Play caps the release-notes field at 500 characters; the short version below is
inside that.

**This assumes 2.9 (v20) is the version currently live.** The Play Console
rollout log ends at "20 (2.9)" on 23 August with nothing after it, and
`release-notes-3.0.md` exists in this folder for a build that was never rolled
out — so 3.0 through 3.6 appear to have been built but not published. If 3.0 did
in fact ship, cut the "Progression" paragraph from the short notes: those players
already have it.

---

## Play Store release notes (short)

The site is now a top-down plan — pan it, zoom it, watch it work. The whole app
went dark to match.

Your four sites are four different places: pallet racking, chilled chambers,
bunded cells for dangerous goods, container stacks on a quay.

Trucks arrive, dock, load and pull out. Reputation is spent in a Directorship
tree. Retired sites become a Network you invest in.

Six new ranks, two late manifests, a fourth site, twelve awards.

Vibration is now its own setting.

---

## Longer version (for a store listing update or changelog page)

### The site view

**A plan, not a diagram.** The yard is drawn from above now, the way a site is
actually laid out: receiving along the top, sorting behind it, the storage hall
in the middle, packing and staging down the side, shipping across the bottom.
You can drag it and pinch it. The isometric view it replaces could not be made
legible at phone size — at full racking it was putting a two-pixel upright every
six pixels, and the aisles closed into a single grey mass.

**Floor marking carries the site.** On a real yard the paint is the brightest
thing there, and it is what gives the place its edges. Bay numbers, aisle
letters, walkways, crossings, hazard chevrons on the dock aprons.

**The four sites are four places.** A site used to be a set of multipliers with
the same yard behind it. Now the storage hall is built to what the site is for:

- **Distribution Centre** — pallet racking in aisles, forklifts working the rows
- **Cold Store** — insulated chambers with roof condensers, and a cooler cast
  over the whole site
- **Dangerous Goods Yard** — separated bunded cells, wider gaps, a warmer cast
- **Port Terminal** — container stacks in blocks, a gantry, and open water at
  the quay

**Trucks work the docks.** Trailers arrive, reverse onto a bay, sit under load
and pull out again, and how busy the aprons are follows how full your warehouse
is. Every piece of plant you own is on the site now — pickers, trolleys,
forklifts, reach trucks, conveyors, sorters, cranes and hubs. Four of those were
previously invisible: you could buy them and nothing changed.

**The whole app is dark.** The site view is charcoal hardstand under safety
yellow in every livery, and four of the seven liveries still dressed the app
around it in cream. The canvas read as a hole cut in the page. There is one
base now, and what still tells the liveries apart is the accent — the hazard
yellow and the cash green — which is what was carrying them anyway.

### Progression

*(New since 2.9. Skip this section if 3.0 already reached your players.)*

**The Directorship.** Reputation used to be a number that only went up. It is
now spent in a tree of three branches — Throughput, Logistics, Capital — each
ending in a Directorship you may hold one of. Spending never costs you anything:
your multiplier is built on every point you have **earned**, not on what is
left.

**The Network is a layer.** Retired sites used to be a number that summed into
an income floor you never saw. Each one now keeps the specialisation it was run
as, is named, and can be invested in afterwards — so the site you choose before
selling decides the Network you end up with.

**A ladder that reaches the top.** Six ranks past Site Manager, from Operations
Manager to Empire Magnate. Two late manifests: Bonded Spirits and
Semiconductors. A fourth site, the Port Terminal, earned at $50 billion
lifetime. Twelve more awards, running to $1 quintillion. A second tier of perks.

**Yard incidents.** Six kinds, each paying in a different currency, each on its
own clock — hazard pay, a speed run, quadruple hand picks, a recovered pallet, a
rush order, and the Express Courier, which is gone in nine seconds.

### Settings

**Vibration is its own switch.** It used to be tied to the sound setting, so
turning off the SFX also silenced the haptics — muting returned out of the sound
routine before the vibration ever fired. There is a BUZZ control in the Office
beside the audio one, and it is saved with the rest of your settings.

### Under the hood

**Anonymous statistics.** The game now reports a small amount of anonymous
information so that faults can be found and fixed: which of the four opening
tasks you have finished, the graphics quality your device settled on and its
model, how long a session lasted rounded into a range, and the text of any error
the game hits. No accounts, no location, no advertising ID, nothing you type,
and not your saved game. It is set out in full in the privacy policy.

**Landscape is gone.** It was added in 3.0 and removed again: the top-down plan
fills a portrait frame properly, and maintaining two layouts against one canvas
was costing more than the rotation was worth.
