# Warehouse Empire 4.4 (v31)

**4.3 was never uploaded. This build contains it.** The last build on Play is
4.2 (v30), so this is the first release anyone sees since then. The Play notes
below cover both, and the 4.3 notes still describe the Instant Dispatch
repricing and the Fleet card in full.

Use **version code 31** unless Play has already seen a v31 upload. A code Play
has seen cannot be reused, even from a rejected build (that is how v29 was lost).

Play caps the release-notes field at 500 characters; the short version below is
inside that.

---

## Play Store release notes (short)

A new opening shift: the Last Truck. Ten short tasks that teach the warehouse by
running it. Existing saves keep everything.

The Floor is cleaner: one card for what to do next, contracts in one place, and
the site opens closer so you can see your fleet at work.

Your Network now appears on a map of Melbourne.

Instant Dispatch now doubles in price with each use in a day. Fleet cards show
what the next purchase adds.

Choosing a new site after a sale is now a required step.

---

## Longer version

### The Last Truck

The opening is now a guided shift: ten one-minute beats built around a truck at
dock S04. Load it, hire a handler, take a heavy delivery, choose between a
backlog and an express job, buy a forklift, run a rush, try automation, buy a
trolley, pick a customer, and dispatch the final load. Every purchase is at the
normal price and nothing resets. A missed beat is rescheduled rather than
failed.

It starts on its own for a new install and is offered from the Floor to an
existing save. While it runs, its card sits directly above PICK ORDER. On a
phone the card's button used to sit behind that bar, which meant the first
thing a new player was asked to tap was the one thing they could not see.

### The Floor, decluttered

Below the site there used to be nine blocks stacked end to end. Now there are:

- **One card saying what to do next.** A real bottleneck, such as a rush falling
  behind, comes first because it carries the Expedite button. Otherwise it's the
  current task or the next purchase. The "on schedule" status is gone, since the
  contract card beneath it already said so.
- **One Contracts panel**, with the regular contract and the Priority Client
  together.
- **A Shift details drawer** for the SKU, session stats and progress. Its label
  turns hi-vis when your freight's market is hot.

The readout at the top no longer carries the game's name. It also folds to one
line (balance and rate) when you scroll or during the opening shift. Notices
appear as a slim banner under it rather than over the middle of the screen, and
a tap dismisses them.

"0 dispatched" beside a four-figure rate read as a stalled site for the first
ten seconds of every launch. Until the first unit leaves, it now counts what is
in transit.

### The site view

The site opens on the working building (docks, racking, sort, pack) at roughly
twice the previous scale, instead of the whole estate at under a quarter scale.
At that size the labels had to be dropped, and the largest things on screen were
empty expansion plots. Overview still shows everything. Zone names now hold a
readable size at any zoom.

### The Network, on the map it is named after

Retired sites are real Melbourne freight suburbs, and the Office now draws them
on Port Phillip. Each site you hold is marked in its specialisation's colour
and grows with investment, and the suburbs you don't hold yet show as faint
dots. Tap a marker to jump to that site's row.

### Commissioning is no longer skippable

After a sale, choosing the next site is a modal with no dismiss. As a card it
could be walked past: a player could rebuild a whole fleet on the old site's
economics and then have them swapped underneath it. This was reported as "it
overwrote the warehouse I was using". The pending choice is saved, so closing
the app no longer loses it.

---

## Release checklist

1. Build and upload **v31**, version name **4.4**.
2. **Register seven custom dimensions in GA4 before this goes out.** None are
   retroactive, and these measure the new opening, which is the one thing this
   release most needs data on:
   - `truck_source` on `truck_start`: auto (new install) or manual.
   - `truck_beat`, `truck_beat_id`, `truck_result`, `truck_secs` and `truck_choice`
     on `truck_beat`, one event per beat as it closes. This is the drop-off funnel.
   - `truck_completed` on `truck_end`, alongside `truck_result` (complete or
     skipped).

   The names carry their event's prefix for the reason given in 4.2: a GA4
   dimension binds to a parameter name across every event that sends it.
3. **Privacy policy and data safety: no change needed.** The new events are app
   interaction, which is already declared, and they carry no new kind of data.
4. **The store screenshots are out of date.** The readout, the Floor and the
   default camera have all changed. Recapture before or alongside this release.
   The listing text does not describe any of the changed UI, so it can stay.
5. **Reading the numbers:** the opening is new, so `objective_done` step
   comparisons across 4.2 and 4.4 are comparing two different openings. Read new
   players' first session from `truck_beat` instead.
