# Warehouse Empire 4.5 (v32)

4.4 (v31) is live. This release is two fixes to the first session, one new
rewarded-ad option, and a new reward moment: milestone shipments.

---

## Play Store release notes (short)

The first task of the opening shift is easier to get going: its button now loads
the pallets for you, and the pallets you can tap are highlighted.

Finishing the opening shift now offers to remind you when your storage is full, so
your crew's work isn't wasted while you're away.

The daily stipend can now be doubled by watching a short ad.

New: Milestone Shipments. Every fifth contract, choose one reward from three.

---

## Longer version

### The first task's button did nothing

Across Sep 6 – Oct 3, only 36 of 69 active players ever bought equipment, and the
players who left the Last Truck left within its first two tasks. The first task's
button, "Locate pallets at S04", only re-centred the camera. A new player who pressed
the obvious thing saw nothing happen while a 60-second clock ran.

It now reads "Load pallet 1 of 3" and loads the next pallet, then offers "Dispatch
S04". Tapping pallets on the plan still works. Waiting pallets pulse (they show a
static frame instead under reduced motion), and the tap target is a finger's width.

### Reminders were asked of almost no one

The reminder card waited for a second launch, so a player who didn't come back on
their own was never asked. Five players saw it in a month. It now also comes up as
the Last Truck finishes, which is the moment every new player who stays reaches in
their first session. Android's system dialog is still only raised after the player
says yes on the card.

### Double the daily stipend

The daily calendar was the most-seen screen in the game with no ad: 30 of 69 active
players claimed it in a month, while only 14 had ever watched an ad anywhere. A
second button under Clock In & Claim, "Claim ×2", doubles the day's pallets for a
rewarded ad. A bonus-day crate stays at one, or crates would become an ad farm.
Skipping or failing the ad leaves the normal claim as it was.

It has its own ad unit, `daily` (`.../2661942413`), so it reports separately in
AdMob.

### Milestone Shipments

Every fifth completed contract offers a choice of one reward from three: a timed
boost (Relief crew, Rush hour, Hand-pick frenzy) or something now (Cash advance,
Pallet bonus, Crate shipment). Every offer has at least one of each. It's built from
rewards the game already has, so there is no new currency.

The offer is fixed and saved when the contract completes, so closing the app can't
reroll it, and it pays exactly once. Timed boosts start when picked, not when
offered. It only opens on its own when nothing else is on screen; otherwise, and
after "Decide later", it waits as a gold row in the Contracts panel.

---

## Release checklist

1. Build and upload **v32**, version name **4.5**.
2. **Register two custom dimensions in GA4** (Event scope):
   - `daily_reward` on `daily_claim`: `standard` or `double`, so it shows how many
     players take the doubled claim.
   - `milestone_choice` on `milestone_pick`: which reward players choose. `notification_prompt` also gains a `prompt_trigger` value,
   `shift`, on a dimension already registered in 4.2.
3. Store listing and screenshots unchanged. Don't change them while the icon
   before/after comparison is running.
4. **What to watch:**
   - `truck_beat` drop-off at beats 1–2 against 4.4.
   - `equipment_bought` users ÷ active users, from about 52% in 4.4.
   - `notification_prompt` shown with `prompt_trigger` = `shift`, and its
     accept rate.
   - `milestone_pick` by `milestone_choice`: which rewards players value. A choice
     nobody picks is a candidate to replace.
   - AdMob: impressions on the **Double Stipend** unit, and `rewarded_ad` users ÷
     active users, from about 20% in 4.4.
