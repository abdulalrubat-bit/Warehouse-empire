# Warehouse Empire 4.1 (v28)

Play caps the release-notes field at 500 characters; the short version below is
inside that.

**Two changes.** One fixes a save-breaking bug. One makes the game idle before
you have bought anything. No other numbers move.

---

## Play Store release notes (short)

Your site now opens with a Casual Picker already on. It earns while the app is
shut, so there is something waiting when you come back — and the offline
reminder works from the first minute rather than after your first purchase.

Fixed: buying Full Automation could stop a site earning entirely and never
recover. If a save has been frozen since you bought it, this release unfreezes
it.

---

## Longer version

### Full Automation could brick a save

`autoPickCarry` was used in the 100ms ticker and declared nowhere. Reading an
undeclared name throws, and that read sat three statements ahead of the line that
banks income, inside an interval with no `catch` — and a throw does not stop an
interval, it just skips the rest of every tick.

So from the moment Full Automation was bought, that site **earned nothing,
advanced no contract and never redrew**, on that tick and on every launch after.
It needed 6000 REP and ten sales, which is to say it only ever reached the
players with the most to lose. GA4 caught it in the field on 3.8 (25).

One declared variable. The save was never damaged — it was the running game that
stopped — so an affected site resumes as soon as this build is installed.

### The game now idles before you buy anything

A new save earned $0.00/sec until the first purchase. That gated far more than
income. Offline earnings are rate × time, so they were zero. The offline reminder
never scheduled, because it is gated on the rate being above zero. The freight
flow added in 4.0 only moved when you tapped. Put the phone down in the first
fifteen seconds and there was nothing waiting, nothing to call you back, and no
reason to open it again.

Four weeks of field data says twelve players tapped ten times and two ever bought
anything. Against the shipping economy the first hire is five to fifteen seconds
of tapping, so those ten did not hit a wall or run out of money — they stopped,
and nothing followed them.

**Every site now opens with one Casual Picker.** The first, and each one after it.
A player who never taps at all reaches their second picker in under four minutes
and a Pallet Trolley in fifteen, where before they reached nothing at all. Eight
hours away is now worth about $2,146 against a $96 trolley.

The purchase that teaches the loop is kept rather than skipped: the opening
objective is the *second* picker, and its hint reads the live price rather than
quoting a figure, because the cost moves with each site's multiplier.

Nothing else a new player sees has changed. Five things — the boost row, the
streak calendar, the contract card, the bottleneck card — used "owns any plant"
to mean "this player has begun", which the granted picker would have made true on
the first frame. The streak calendar opened over a brand-new player's first tap
in testing. Those gates now ask about plant the player chose to buy, so the
opening reads exactly as it did in 4.0.

**No existing save is affected by any of this.** A save loaded from storage
replaces the fleet wholesale.

---

## Release checklist

1. Build and upload v28, version name `4.1`.
2. Store listing and screenshots are unchanged — no system changed and the
   interface is identical to 4.0.
3. Watch `session_length` by `bucket` after this ships. If the opening was losing
   people inside ten seconds, this release does not fix that, and the next change
   is the first frame rather than the economy.
4. `objective_done` step 2 is now the second picker rather than the first. The
   step numbers are unchanged, but the event means something slightly different
   from v28 onward — worth remembering when reading the funnel across versions.
