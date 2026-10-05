# Warehouse Empire 4.5 (v32)

4.4 (v31) is live. This release is two fixes to the first session, both found in
4.4's own data.

---

## Play Store release notes (short)

The first task of the opening shift is easier to get going: its button now loads
the pallets for you, and the pallets you can tap are highlighted.

Finishing the opening shift now offers to remind you when your storage is full, so
your crew's work isn't wasted while you're away.

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

---

## Release checklist

1. Build and upload **v32**, version name **4.5**.
2. **No new events or parameters.** `notification_prompt` gains a new
   `prompt_trigger` value, `shift`, on a dimension already registered in 4.2.
3. Store listing and screenshots unchanged. Don't change them while the icon
   before/after comparison is running.
4. **What to watch:**
   - `truck_beat` drop-off at beats 1–2 against 4.4.
   - `equipment_bought` users ÷ active users, from about 52% in 4.4.
   - `notification_prompt` shown with `prompt_trigger` = `shift`, and its
     accept rate.
