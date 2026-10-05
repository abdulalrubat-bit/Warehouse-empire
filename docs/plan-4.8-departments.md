# 4.8 plan: departments with real capacity

**Goal:** bring across the core idea of the Autonomous Operations prototype. Freight
moves Receiving → Storage → Packing → Dispatch, and the slowest department limits the
site. That gives the bottleneck card a real cause ("Packing can't keep up") and makes
*where* you buy matter, not just *how much*.

**4.7 already laid the groundwork:** the four numbered departments on the plan and in
the strip, the fleet grouped by department, and the crew boosting a department. 4.8
gives the departments capacity.

---

## The hard part: existing saves

Today every fleet tier earns on its own. Most players have bought the cheapest-per-dollar
tiers, which means lopsided departments. A late player might hold 300 pickers and no
crane. A strict "slowest department wins" rule would cut that player's income overnight.
Nobody should open the game to find their business earning half what it did yesterday.

## Two ways to do it

### A. Strict flow, as in the prototype

- Each department has a capacity in pallets per second: a base from the building, plus
  its fleet.
- Site output is set by the slowest department.
- **Good:** exactly the prototype's feel. Every purchase is a decision about where.
- **Cost:** a full rebalance of every tier's numbers, and a migration for every save.
  Income changes for everyone, and the balance tests need rewriting. About two builds of
  work.

### B. Flow balance multiplier (recommended)

- Income is earned exactly as now. On top of it sits a **flow balance** multiplier,
  from **×0.9 to ×1.25**, set by how even the departments are.
- Only departments you can already buy for count. Dispatch doesn't count against you
  before the crane unlocks.
- The weakest department is marked **LIMITING** in the strip and named by the
  bottleneck card, with the purchase that fixes it. The card's buy button from 4.6 is
  already there.
- Freight visibly queues at the limiting department on the plan, like the prototype's
  pallet stacks.
- **Good:** no save can lose more than 10%. A balanced site gains up to 25%. It's one
  build, and the existing balance tests stay valid.
- **Cost:** softer than the prototype. Lopsided buying is taxed, not blocked.

### Protecting existing saves (either option)

- For the first 7 days after updating, a save never earns less than it did before the
  update. The figure is recorded at the first 4.8 launch. A card explains the new rule
  and points at the limiting department.
- The return screen and the bottleneck card call the limiting department by name, so
  the change explains itself.

---

## Proposed shape of 4.8 (option B)

1. Work out each department's share of the site's raw rate. The strip already does
   this.
2. Set an ideal share for each unlocked department, e.g. even split across unlocked
   departments, adjustable per site type: Cold Storage wants more Storage, Port wants
   more Dispatch.
3. Flow balance = 0.9 + 0.35 × (how close the weakest department is to its ideal).
   That gives ×0.9 when it's empty and ×1.25 when it's at or above ideal.
4. Strip: LIMITING badge. Bottleneck card: "Packing is limiting your site, +X%/s if
   fixed", with a BUY button.
5. Plan: queued pallets drawn at the limiting zone.
6. The crew become the cheap way to lift a weak department, which gives Shazza and
   Elena a clear job.
7. Tests:
   - no save loses more than 10%;
   - a balanced site reaches ×1.25;
   - the 7-day floor;
   - the bottleneck card names the right department.

---

## Decisions for you

1. **A or B?** I recommend B.
2. **Worst case for an unbalanced save:** −10% (my suggestion), −20%, or nothing (bonus
   only)?
3. **Should site types want different mixes** (Cold Storage wants more Storage, Port
   wants more Dispatch), or should every site want an even split?
