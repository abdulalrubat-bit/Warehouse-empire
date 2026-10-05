# Warehouse Empire 4.8 (v35)

The core idea of the Autonomous Operations prototype: **a site is only as good as its
weakest department.** It also brings over the prototype's Manage screen as Site Setup:
manager focus, forklift attachments and packing lines.

Version code **35**, version name **4.8**. This assumes 4.7 went out as v34. If 4.7
hasn't shipped yet, this branch contains it, so build this as v34 / 4.7+4.8 and
combine the two sets of notes.

---

## Play Store release notes (short)

Your warehouse now works as one line: Receiving, Storage, Packing, Dispatch. Invest evenly and the whole site runs up to 25% faster; leave a department behind and it holds the rest back. The Floor shows which one.

New Site Setup in the Office: manager focus, forklift attachments and packing lines.

Existing businesses are protected for a week while you adjust.

---

## Longer version

### Flow balance

- Output is multiplied by **flow balance**, from **×0.90** to **×1.25**:
  - ×0.90: a department in play with nothing invested in it.
  - ×1.25: every department has its share.
- **Measured by investment, not output.** By output, receiving could never catch up late
  in the game: a picker moves 0.1/s and a crane 7,800/s. Unit prices compound with every
  purchase, so investment can always be evened up. It costs something, and that's the
  decision.
- **No cliffs.** A department counts once its first tier comes into reach, and blends
  in as your earnings grow tenfold from there. Unlocking the forklift moves the balance
  a little, not a quarter.
- **Each site type wants its own mix:**

  | Site | Wants more |
  |---|---|
  | General | even across all four |
  | Cold Storage | Storage |
  | Dangerous Goods | Packing |
  | Port | Dispatch |

- **Protection:**
  - An existing business gets **7 days** in which flow balance can only raise income.
    The journal says so, and the Flow tag reads "protected".
  - It never lowers income during the opening shift either.
- **Where to see it:**
  - The department strip marks the **Limiting** department.
  - A **Flow ×1.07**-style tag under the plan opens a short guide.
  - Freight visibly backs up at the limiting department on the plan.
  - When balance drops below ×1.00, the bottleneck card names the department and offers
    a **BUY** button for the best purchase there.
- Because the buy suggestions already measure what each purchase adds, they now include
  the effect on balance as well.

### Site Setup (Office)

| | Choice | Effect |
|---|---|---|
| **Manager focus** (kept through a sale) | Balanced | No change |
| | Fix the bottleneck | Limiting department +20% |
| | Prioritise dispatch | Contracts fill 20% faster, output −5% |
| **Forklift attachment** (fitted to the site, lost on sale) | Standard forks | No change |
| | Quick-change battery | Storage +40%, wages +10% |
| | Heavy-lift mast | On Heavy Industrial, receiving and storage +35%; otherwise −10% |
| | Precision scanner | On Cold Pharma, output +18%; packing −10% always |
| **Packing line** (fitted to the site, needs a Conveyor Line, free to switch) | Flexible | No change |
| | Bulk processing | On FMCG, packing +40%; otherwise −15% |
| | Precision handling | On Cold Pharma or Semiconductors, packing +25%; otherwise −10% |

Attachments cost 1% of lifetime earnings (×1.25 for the mast, ×1.5 for the scanner), at
least $5,000. Pricing on lifetime earnings means kit can't be bought cheaply right
after a sale.

---

## Release checklist

1. Build **v35 / 4.8**, or see the note at the top if 4.7 hasn't shipped.
2. **Register in GA4:** `setup_part` and `setup_choice` on `setup_change`.
3. **What to watch over the first two weeks:**
   - **Day 8 onwards:** income for existing players, once the grace week ends. If many
     saves sit near ×0.90, the target mixes are too demanding.
   - `setup_change`: whether anyone takes the attachments, and which.
   - `equipment_bought` by tier: whether purchases spread across departments, which is
     the point of the change.
