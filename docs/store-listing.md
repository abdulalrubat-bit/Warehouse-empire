# Play Store listing copy

Current as of **v26 (3.9)**. Paste the blocks below into Play Console → Main store
listing.

Every count in this copy was checked against the shipping source rather than
carried forward: 8 equipment tiers, 5 manifests, 4 sites, 12 ranks, 44 awards,
7 liveries, 8 corporate buildings, 6 incident types. The listing before the v25
rewrite had gone stale claiming three manifests when there were five and 32
achievements when there were 44 — which is what happens when copy is edited from
the copy instead of from the game.

---

## Title (30 char limit)

```
Warehouse Empire: Idle Tycoon
```

29 characters. Unchanged — it carries "idle" and "tycoon", which is what people
actually type into Play search, and there is no reason to spend the goodwill of
an existing title.

---

## Short description (80 char limit)

```
Run a logistics empire that keeps earning while you're away. Hire and automate.
```

79 characters. **Also unchanged, deliberately.** This line went live with v25 and
Play has been learning against it since; replacing it resets whatever that is
worth, for a rewrite that would say much the same thing.

---

## Full description (4000 char limit)

**On the wall of text.** The Play Console *summary* view collapses newlines when
it renders a stored description, so it shows one unbroken block whatever is
actually saved. Check the live store page, or About this game in the Play Store
app, before concluding anything is wrong with the text.

The block below is written so that a newline-collapsing bug cannot bite either
way: **every heading has a blank line after it as well as before it**, so the
structure survives even if single breaks are lost.

```
Build a logistics empire from a single pallet jack to an automated
distribution network.

Warehouse Empire is an idle tycoon game where every dollar you earn goes
back into the operation. Hire crew, buy plant, and watch a real site plan
fill up and start running itself — then keep earning while you're away.

WATCH THE SITE RUN

Your warehouse is drawn from above, the way a site actually is: receiving
along the top, sorting behind it, racking through the middle, packing and
staging down the side, shipping across the bottom. Trucks reverse onto the
docks, load, and pull out. Forklifts work the aisles. Tap any zone of the
plan to look closer at it.

CLIMB THE EQUIPMENT LADDER

Casual Pickers, Pallet Trolleys, Forklifts, Reach Trucks, Conveyor Lines,
Sorting Robots, Automated Cranes and full Distribution Hubs. Eight tiers,
each faster and more expensive than the last, each with upgrades and a
manager who runs it without you.

RUN FREIGHT AGAINST THE CLOCK

Take dispatch contracts. Every fourth one is a rush: two minutes on the
clock, more than double the pay, and no penalty at all for letting it go.
When you fall behind, Priority Dispatch clears the backlog — if you spend
it at the right moment. The floor tells you what is holding the site up,
and the yard fills with freight you cannot shift until you fix it.

CHOOSE YOUR MANIFEST

FMCG Groceries, Cold Pharma, Heavy Industrial, Bonded Spirits,
Semiconductors — trade output against wages against contract pay. Markets
move on their own clock, so what is worth running changes. Switching costs
you a changeover, so chasing a spike is a decision, not a reflex.

FOUR SITES, FOUR DIFFERENT PLACES

A Distribution Centre is aisles of pallet racking. A Cold Store is
insulated chambers. A Dangerous Goods Yard is separated bunded cells. A
Port Terminal is container stacks on a quay. Each one runs differently and
looks it.

SELL UP AND BUILD A NETWORK

Cash out for permanent Reputation, and spend it in the Directorship —
four branches ending in Freight Magnate, Logistics Tycoon, Property Mogul
or Full Automation. You can hold only one, and swapping refunds the last.
Every site you retire keeps its specialisation and joins your Network,
where it goes on earning and can be invested in.

GO IDLE, COME BACK RICH

Offline earnings accumulate while the app is shut. The game plays fully
without a connection.

ALSO IN THE BOX

• Twelve ranks, from Casual Hand to Empire Magnate
• 44 awards and a daily shift calendar with streak cover
• Six kinds of yard incident, each paying differently, each on a clock
• Seven site liveries, day and night
• Corporate real estate: eight buildings, ten levels each

Start on the warehouse floor. Build the empire that runs itself.
```

Run `sh docs/listing-length.sh` for the character count. It is measured rather
than quoted, because the previous version of this file claimed 2,311 characters
against an actual 2,318 and nobody noticed for a week.

### What changed from the v25 copy

- **A new section: RUN FREIGHT AGAINST THE CLOCK.** Rush contracts, Priority
  Dispatch and the visible backlog are the headline of v26, and the only part of
  the game with real time pressure in it. It sits third, above manifests and
  sites, because it is now the most distinctive thing the game does.
- **Contracts moved out of the manifest section**, which had been doing two jobs.
  Manifests are now purely the trade-off between output, wages and contract pay.
- **"Tap any zone of the plan to look closer at it"** — the plan became
  interactive in v26 and nothing in the listing said so.
- **"three branches" corrected to four.** The Directorship has `automation`,
  `capital`, `logistics` and `throughput`, ending in Freight Magnate, Logistics
  Tycoon, Property Mogul and Full Automation. The v25 copy said three and I
  carried it forward unchecked — the exact failure this file opens by warning
  about. The titles are now named, which is stronger copy anyway, and the
  exclusivity claim was verified against `heldDirectorship()` rather than assumed.
- **"no penalty at all for letting it go"** is stated outright. An idle player
  reading "two minutes on the clock" will assume a fail state, and that
  assumption costs installs from exactly the audience this game wants. Saying it
  plainly is worth the words.

### Kept from the v25 rewrite

- **Tapping does not lead.** Still the first thing you do, still not the point —
  its value is pegged at 5% of your idle rate.
- **The site view leads**, because it remains the strongest thing the game has.
- **"plays fully without a connection"** rather than "no internet required": the
  game sends anonymous statistics, as the privacy policy sets out.
- **Keyword coverage**: idle, tycoon, logistics, warehouse, automate, offline,
  empire, manager, dispatch. Play indexes this field.
