# Warehouse Empire 4.0 (v27)

Play caps the release-notes field at 500 characters; the short version below is
inside that.

**3.9 (v26) is live.** This release changes how the game looks and reads.
**It changes no numbers at all** — not a rate, a cost, a multiplier or a goal.
Verified against the diff: every economy constant is untouched.

---

## Play Store release notes (short)

Freight moves now. Pallets travel from receiving through to shipping across the
plan, and the money a load earns appears over the dock before it reaches your
balance.

Tap Pick Order and a pallet joins the flow. Early on, the yard only moves when
you do.

The interface is quieter — steel instead of hi-vis — and your throughput leads
instead of your bank balance.

Three new readings: dispatched, payroll, network.

---

## Longer version (for a store listing update or changelog page)

### The warehouse does something now

**Freight moves.** Pallets travel receiving → sorting → racking → packing →
staging → shipping, spread across the width of each run rather than filing down
one line. They carry a shadow and a lit edge so a load in transit is not mistaken
for one sitting in a rack.

Before this, nothing in the game went anywhere. The pallets on the plan were
drawn from a fill level derived from how much plant you owned — they correlated
with your progress rather than being goods going somewhere. Which meant that
"where did that money come from" and "did that forklift actually help" were
questions the screen could not answer.

It is an **indicator, not a simulation**. How busy the yard looks is a
compressed reading of what your site earns; it says busy, it does not claim to
count pallets.

**Money has a source.** A load leaving the site carries the revenue banked since
the last one left, floating over the shipping docks before your balance moves.
Those figures are real income over real intervals — they add up to what you
earned rather than being invented for the animation.

**A tap does something.** Pick Order now pushes a pallet into the flow and throws
dust where it entered. There is a consequence to this that was not designed for
and is worth keeping: a site at the very start produces no freight on its own, so
**for the first few minutes the flow is your tapping** — and it becomes automatic
exactly as the site does.

### The interface got out of the way

**Steel, not hi-vis.** The accent colour used to be on the header rule, the tab
bar, the tap button, the quantity selector, the modal header, the modal button
and the equipment counter, all at once. An accent that is on everything is not an
accent. The furniture is now neutral, and orange is spent where it means
something: the site plan, an advert you chose to watch, a market gone Hot, a
bottleneck that is genuinely a problem.

This also settles something that never quite made sense — liveries are *site*
liveries, so it was never clear why buying one repainted your tab bar. Now it
does not.

**Throughput leads.** Your income per second is the bright figure; the bank
balance is quiet behind it. The throughput bar is more than twice as thick. The
tap button is a slim secondary control, because tap value is pegged at 5% of
your idle rate and it was the largest object on the screen.

### Three readings you could not get before

- **Dispatched** — loads that have left the site this shift. It counts real
  departures from the flow, so the number and the picture cannot disagree.
- **Payroll** — your wage bill as a share of gross. It has only ever been shown
  as a cash figure, so "is payroll a problem" had no answer.
- **Network** — how much of your income comes from retired sites. Appears once
  you have a Network to report on.

### Also

The Office now states which build you are running, which is the sort of thing
nobody needs until the day they very much do.

Weaker phones drop the freight animation rather than the frame rate: it has its
own budget per quality tier, the same way drawn plant already does. Measured at
62fps on 360×640, 412×915 and 800×1280 at late-game fleet with the animation at
its cap.

---

## Release checklist

1. Merge the branch, then build and upload v27, version name `4.0`.
2. **Verify the `kind` custom dimension is registered in GA4.** It could not be
   registered before v26 shipped, because no live build sent the parameter. If it
   still is not there, every day since v26 is launch-versus-resume data that
   cannot be recovered — custom dimensions are not retroactive.
3. **The store listing is unchanged by this release and does not need a rewrite.**
   `docs/store-listing.md` describes systems, and no system changed. The site-view
   section already says the plan is worth watching; it is now more true.
4. Screenshots in `docs/store-screenshots/` are from 3.7 and now show the old
   hi-vis chrome throughout. They are the one store asset this release dates.
