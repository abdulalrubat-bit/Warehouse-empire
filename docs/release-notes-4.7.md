# Warehouse Empire 4.7 (v34)

The first pieces of the Autonomous Operations prototype, brought into the main game:
- its look on the Floor and on every screen;
- its return screen;
- its operating policy;
- its named crew.

Nothing here resets or rebalances an existing save. The crew and the policies are new
choices, and Reliable service is the default.

Version code **34**, version name **4.7**. This assumes 4.6 went out as v33.

---

## Play Store release notes (short)

A fresh look: your site's four departments are numbered on the plan and in a strip below it, and every screen has a "How this screen works" guide.

Hire Big Mick, Shazza and Elena, and assign them to the departments that need them.

Choose how your site runs: Reliable, High throughput or Premium service.

Coming back now shows what your business did while you were away.

---

## Longer version

### The Floor and every screen

- **Numbered departments.** The plan shows four numbered cards: 1 Receiving, 2 Storage,
  3 Packing, 4 Dispatch. A strip under the plan repeats them, with each department's units
  and its share of the site's rate. The department earning most is outlined. An empty one
  says "Not staffed". Tapping a department opens the Fleet tab at its first tier.
- The fleet is grouped as:

  | Department | Fleet |
  |---|---|
  | Receiving | pickers and trolleys |
  | Storage | forklifts and reach trucks |
  | Packing | conveyors and sorters |
  | Dispatch | cranes and hubs |

  For now this is only a grouping, and each tier still earns on its own. 4.8 is planned
  to give the departments real capacity (see `docs/plan-4.8-departments.md`).
- **Screen headers.** Each tab opens with a short heading and a one-line description.
- **Field guides.** "How this screen works" opens three numbered points about that screen.
  The Floor's is behind the **?** next to Live Operations.
- **The header readout** is three equal columns: in transit, payroll and reputation. The
  Network share joins them once you have a Network.
- **Tags under the plan** show the operating policy in force and your rank. Tapping the
  policy tag opens it in the Office.
- The cards, strip and tags stay off the screen during the opening shift, which has its
  own.

### While you were away

The return screen now reads "While you were away / The business kept moving" and has
four readouts:

- capital added;
- the rate it came in at;
- sites operating, with the Network's share;
- the busiest department.

Every figure comes from the offline earnings themselves. Nothing is estimated afterwards.
Claim and Claim Double are unchanged.

### Operating policy (Office)

| Policy | Output | Wages | Contracts |
|---|---|---|---|
| Reliable service | — | — | — |
| High throughput | +20% | ×2 | — |
| Premium service | −15% | −15% | +50% per load |

Each is a trade, not an upgrade:

- **High throughput** loses money while wages are a large share of gross, and pays once
  they are a small one. Your payroll figure in the header tells you which side you are
  on.
- **Premium** is slower and earns it back on contracts. Contract pay is fixed when a job
  is posted, so switching just before a delivery doesn't reprice it.

The Office card shows what this site would net under each policy right now. Switching
is free.

### Crew (Fleet tab, under the fleet)

| | Best in | Hire |
|---|---|---|
| Big Mick | Storage | $500 |
| Shazza | Packing | $250K |
| Elena | Dispatch | $50M |

- Assign each one to any department. That department's fleet works +25% faster in their
  own trade, or +12% anywhere else.
- Each training level adds +10%, up to level 5. Each level costs four times the last.
- Two people on one department both count.
- The crew belong to the company, so they stay when you sell a site.
- The section appears after your first finished contract.

---

## Release checklist

1. Merge, then build **v34 / 4.7**.
2. **Register in GA4** (Event scope):
   - `help_screen` on `help_opened`
   - `policy_choice` on `policy_set`
   - `crew_member` on `crew_hire`, `crew_train` and `crew_assign`
   - `crew_level` on `crew_train`
   - `crew_dept` on `crew_assign`
3. **Store screenshots:** the Floor looks different now. Recapture with
   `node tools/storeshots.js` if you want the listing to match. The icon test is still
   running, so you may want to wait until it ends.
4. **What to watch:**
   - `policy_set`: which policy players settle on. If nearly everyone picks one, it's
     too strong.
   - `crew_hire` for Big Mick: how soon after the first contract players hire him.
   - `help_opened`: which screens players need explained.
