# Warehouse Empire 4.6 (v33)

Four features, all from the portfolio comparison doc: a save backup with save codes,
a bottleneck card that names the fix, an optional express clause on contracts, and
specialist jobs earned by what the business can handle.

**Version code:** this assumes 4.5 goes out as v32 first. If 4.5 has not been
uploaded when this merges, build this instead as **v32 / 4.5**. It contains
everything in 4.5, and the 4.5 notes still apply. Either way, never reuse a code
Play has seen.

---

## Play Store release notes (short)

Your business is now backed up on your phone, and Export / Import Save in the Office moves it to a new phone.

When a contract falls behind, the bottleneck card names the best purchase to fix it and buys it in one tap.

Take a contract on express terms: half the time, double the cash. Miss it and the job is gone.

Specialist jobs (oversized, refrigerated, dangerous goods) unlock as your business grows, and pay more.

---

## Longer version

### Save backup and save codes

The game keeps a second copy of the save in its own slot. It refreshes the copy at
launch and then every 30 minutes. If the main save won't read, the damaged copy is
set aside and the backup is loaded, with a notice. A missing main save is also
restored from the backup. Wiping the business removes the backup too, so a reset is
still a reset.

In the Office, **Export Save** shows a code to copy, and **Import Save** takes one
from another phone. The code is checksummed, so a code that was cut short or altered
in a message is refused rather than loaded half-broken. Importing takes two presses,
and the business it replaces is set aside rather than deleted.

### The bottleneck card names the fix

The card used to say "Expedite or add <the first tier you don't own>". That was
usually something far out of reach, and the arithmetic was left to the player. When a
contract is behind, the card now:

- weighs every fleet tier by what one more of it adds per second for what it costs;
- names the best one you can afford, what it adds, and how many would close the gap;
- shows a **BUY** button beside Expedite. It buys one, whatever the ×1/×10 setting is.

A player who can't afford any fix is told what to save for.

### Express clause

At the start of a standard job, the contract card offers **Take the express
clause**: half the time left, for twice the cash and two more pallets. A standard
job is sized at 60% of the window's throughput, so express terms ask for about 120%.
That is a stretch you can meet by buying capacity or using Priority Dispatch, and
the bottleneck card will say so.

It is offered only:

- before the job is under way: under 20% done, with over 80% of its clock left;
- from the third contract on;
- never on a rush;
- never during the opening shift.

Signing takes two presses and cannot be undone. A missed express job is lost.

The contract card now also shows the time left on the job. That slot existed but was
never filled in.

### Specialist work

Every third standard job is specialist freight if the business qualifies for it:

| Kind | Unlocked by | Pays |
|---|---|---|
| Oversized loads | 5 Reach Trucks, or an Automated Crane | +40% cash, +2 pallets |
| Refrigerated freight | Running a Cold Storage site, or holding one in the Network | +60% cash, +1 pallet |
| Dangerous goods | Running a Dangerous Goods site, or holding one in the Network | +80% cash, +1 pallet |

The goal is the same as the standard job's would have been. When more than one kind
is unlocked, they take turns. A new **Specialist Work** block in the Office lists all
three and what each locked one still needs, so a locked kind is a goal you can work
towards, not a surprise.

---

## Release checklist

1. Merge, then build and upload **v33** with version name **4.6** (or see the
   version-code note at the top).
2. **Register these custom dimensions in GA4** (Event scope). None of them apply
   retroactively:
   - `bottleneck_buy_equipment` on `bottleneck_buy`: which tier the card's BUY
     button bought.
   - `express_progress` on `express_taken` and `express_missed`: how far along the
     job was.
   - `express_secs` on `express_taken`: the time the player signed up for.
   - `contract_express` on `contract_complete`: 1 if the job was done on express terms.
   - `contract_kind` on `contract_complete`: `standard`, `oversize`, `reefer` or `dg`.
3. **Privacy policy and data safety: no change.** Save codes never leave the phone
   unless the player copies one. The new events are app interactions, which are
   already declared.
4. **What to watch:**
   - `bottleneck_buy` users ÷ `bottleneck_intervention` users: whether a named fix
     gets used as much as Expedite.
   - `express_taken` count against `express_missed`. If almost nobody misses, the
     terms are too soft. If most miss, they're too hard.
   - `contract_complete` split by `contract_kind`, to see how far players get
     before specialist work starts.
