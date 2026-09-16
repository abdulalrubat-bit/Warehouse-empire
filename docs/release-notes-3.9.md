# Warehouse Empire 3.9 (v26)

Play caps the release-notes field at 500 characters; the short version below is
inside that.

**3.8 (v25) is live.** This release carries four merged pull requests of gameplay
work plus a balance correction and four fixes found reviewing them.

---

## Play Store release notes (short)

Every fourth contract is now a rush: two minutes, more than double the pay, and
no penalty at all for letting it pass. Priority Dispatch clears the backlog if
you commit it in time.

The floor now names what is holding the site up, and the plan shows the queue
building against you.

Tap any zone of the warehouse to inspect it, Overview to pull back out.

The opening is shorter and better ordered.

---

## Longer version (for a store listing update or changelog page)

### Freight that pushes back

**Rush contracts.** Every fourth job is now a rush: a two minute clock, a goal
sized at 110% of what your site can move in that time, and two and a half times
the usual pay with five pallets instead of three. Miss it and nothing happens —
the window closes, the next standard contract arrives, and you have lost nothing
you had. It is an offer, not a punishment.

**Priority Dispatch.** When a contract is running behind, the floor offers a
button that lifts throughput 75% for thirty seconds, on a two minute cooldown.
The numbers are built to meet: ninety seconds at normal pace plus thirty at
+75% is just enough to clear a rush goal. So a rush is not winnable standing
still, and is winnable with one well-timed press. That gap is the whole point.

**The backlog is visible.** Freight you are failing to move stacks up in staging
and trailers queue outside the fence, and both clear as you catch up. A number
falling behind another number is a spreadsheet; a yard filling with pallets you
cannot shift is a warehouse.

**The floor says what is wrong.** A card under the objective names the current
constraint — a changeover in progress, a contract you lack the capacity for,
the next thing worth buying — and takes you to the tab that fixes it.

### The opening

**A fifth step.** Between hiring your first Casual Picker and taking your first
contract there is now a Pallet Trolley to buy, so the first contract arrives
against a site that can actually move it. The first contract is also smaller
than the ones that follow, so the opening loop closes rather than stalling.

**Hand picks count as freight.** Tapping now advances the active contract, so
the opening is something you can push at rather than wait through.

**The Office is a tab again.** 3.8 hid the whole tab until your first contract,
which took the settings and save controls with it. Only the operations desk —
selling up, Corporate Real Estate, the Directorship, the Network — now waits,
with a panel in its place saying what opens it.

**The objective card keeps going.** Past the opening it becomes a rolling next
target rather than disappearing.

### The site view

The camera now opens on the whole site rather than the operational core. Tap any
zone — receiving, sorting, storage, packing, staging, shipping — to inspect it
and fly in; Overview pulls back out. Plant and pallets stay legible when zoomed
out, and a tap that lands in the gap between two zones now selects the nearer one
instead of doing nothing.

Two input faults are fixed: pinch-to-zoom was centring on the wrong point, and
lifting a two-finger gesture could register as a tap.

### Balance

**Priority Dispatch is priced honestly.** It lifted output 75% while payroll
stayed flat, which meant a new player's *net* income rose about 103% from a
button advertising 75% — and the effect was largest for exactly the players whose
wage bill is the biggest share of what they earn. Wages now scale with it, as
they already did for Overtime Shift and for the changeover. The rush it exists to
solve is still winnable with it priced this way.

### Fixes

- The bottleneck card greeted a new player with "Moving $0/s" — one Casual Picker
  earns a few cents a second and the formatter floored anything under a tenth.
- A REP target in the hundreds of millions printed as a raw eight-digit integer.
- Session statistics could not tell a cold launch from a return to the
  foreground. They can now, which makes the per-launch figures readable.

---

## Release checklist

1. Build and upload v26, version name `3.9`.
2. **Register the `kind` custom dimension in GA4** — Admin → Data display →
   Custom definitions → Create custom dimension, name "Session kind", scope
   Event, parameter `kind`. It could not be registered before this release
   because no shipped build sent the parameter, so GA4 had never seen it. Custom
   dimensions are not retroactive, so every day between this release and that
   registration is a day of launch-versus-resume data that cannot be recovered.
3. The other nine dimensions were registered on 15 September and need nothing.
