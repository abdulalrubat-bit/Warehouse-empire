# Warehouse Empire 4.3 (v31)

Play caps the release-notes field at 500 characters; the short version below is
inside that.

**Two player-facing changes and one that is not.** 4.2 (v30) is live. Nothing in
this release touches the opening, the save format, or telemetry.

---

## Play Store release notes (short)

Instant Dispatch was the only sensible thing to spend a pallet on — it paid more
than every permanent upgrade in the Store put together, at any point in the game.
It now doubles in price each time you use it in a day, and banks half an hour
rather than a full one. The perk tree is worth buying again.

Every Fleet card now shows what the purchase in front of you would actually add.

---

## Longer version

### Pallets had one correct use, which is not an economy

Instant Dispatch paid an hour of production for a flat 5 pallets. A perk pays a
percentage of your output, so the two scale together and the comparison between
them is the same number at every point in the game — and that number was **forty
hours of production now, against Kaizen's +15% forever**, which needs 267 hours of
further play at that rate to catch up.

Nobody plays 267 hours between sales. So there was no point on the curve where any
perk was the right buy, and the whole second tier of the tree — Cross-Trained
Crew, Kaizen, Yard Telemetry — was decoration. That is why pallet income felt too
fast: not the rate they arrive at, but that there was only ever one thing to do
with them.

Each use now **doubles the price for the rest of the day** and resets with it, and
the payout is **half an hour instead of a full one**. Two hundred pallets buys
about two hours across four uses rather than forty, which puts Kaizen's break-even
at thirteen hours of play. Padded Gloves at 8 pallets still costs less than a
single dispatch, so nothing about the opening changes.

The old price also scaled with how many times you had sold up. That was the right
instinct pointed at the wrong variable — it tracked your history rather than your
usage — and it is gone.

### The Fleet card answers the question it is asked

A Sorting Robot you do not own read **$0/s** in the largest type on the card, next
to a price of $1.34M. True, and useless: it describes the past while you are being
asked about the future.

Every card now carries **what the purchase in front of you would add** — for the
quantity you have selected, and accounting for the milestone bonuses at 25, 50 and
100, so the unit that crosses one is priced differently from the unit before it.
The `$0/s` line is dropped where it would only say nothing.

The type scale was also backwards: the price was the largest figure on the card
and the production rate was smaller than it, so every card announced what it cost
and murmured what it did. The rate leads now.

### And one that is not player-facing

The bug fixed in 4.1 — a save that stopped earning the moment Full Automation was
bought — was an undeclared variable. It shipped for thirty versions and past 620
assertions, because it was not a behaviour anyone would think to test; it was a
typo. There is now a linter in the build that rejects that entire class of
mistake, and it proves it can fail before each run trusts that it passed.

The scan found nothing else, which is the useful half of the result.

---

## Release checklist

1. Build and upload v31, version name `4.3`.
2. **No new telemetry and no new custom dimensions.** Nothing to register.
3. Store listing and screenshots unchanged.
4. Watch `notification_state` by `perm_state` from 4.2, not from this release —
   4.3 changes nothing about notifications and should not muddy that reading.
5. Remember that `objective_done` step 2 has meant *the second picker* since 4.1.
   The step numbers are unchanged, the event is not. Any funnel that spans 4.0 and
   4.1 is comparing two different questions at that step.
