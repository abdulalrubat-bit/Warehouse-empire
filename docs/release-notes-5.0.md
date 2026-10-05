# Warehouse Empire 5.0

A new look, from the Pocket Tycoon prototype. **Pocket** is now the default look and
the **3D site** is the default view. Both can be switched back in Office > Look:
Classic for the dark command centre, Plan for the flat site plan. Nothing changes how
the game plays.

**Version:** this branch contains 4.7 and 4.8. Ship it as one release, or after them.
Use the next version code you haven't used (v34, v35 or v36), with version name **5.0**.

---

## Play Store release notes (short)

A whole new look! Your warehouse is now a little 3D world: workers, forklifts, racks, conveyors and cranes appear as you buy them, and lorries roll in and out with your takings.

Bright new cards and a floating tab bar. Prefer the old look? Switch back any time in the Office.

---

## Longer version

### Pocket, the new default look

- **Palette:** light and pastel, in the prototype's greens and creams.
- **Readout:** Cash and Earning are stat tiles with round coin and parcel icons. Transit,
  payroll and REP sit in smaller tiles below. The throughput bar only appears during a
  manifest changeover, which is the only time it has anything to say.
- **The Floor:** the heading is your site's name, under the line "Build a little. Dream
  big.".
- **Cards and buttons:** every card is a rounded tile with a pressed edge, and primary
  buttons are green.
- **Navigation:** the tab bar floats, with coloured icons. PICK ORDER sits in a floating
  tray above it.
- **Dialogs, notices and the splash screen** use the same soft style.
- **Classic** (the dark command centre) is one tap away in Office > Look.

### The 3D site

- **Built from the prototype's isometric model, driven by your game.** Four department
  yards sit in a two-by-two block, and the fleet you own stands in them:

  | Yard | What you see |
  |---|---|
  | Receiving | hands and trolleys |
  | Storage | racks that grow taller with reach trucks, forklifts running between them |
  | Packing | the conveyor line and sorting robots |
  | Dispatch | a crane gantry and the hub, once bought |

- **Around the lot:**
  - lorries back on to receiving and pull out of dispatch, with a "+$" for the takings;
  - your company buildings (Head Office, People, Training and the rest) appear round
    the lot once bought;
  - the department limiting your flow balance is outlined, with freight waiting in it.
- **Liveries carry over.** Racking, pillars, lorries and grass take your livery's
  colours, and night liveries dim the lot.
- **Taps work as before:**
  - an incident clears and pays;
  - a yard opens its department;
  - a company building opens its plot;
  - Explore lets you drag and pinch, and Overview resets the view.
- **Readability:** the number of things drawn grows as your fleet doubles, not with every
  purchase, and each yard has a cap. That's what keeps it readable; the old isometric
  view was dropped because dense racking hid itself.
- **The opening shift still runs on the plan,** which is choreographed pallet by pallet.
  Everyone else can switch to the plan in Office > Look.

---

## Release checklist

1. Merge after #39 (4.7) and #40 (4.8). Build with the next unused version code and
   version name **5.0**.
2. **Register in GA4:** `look_choice` on `look_set`. It records switches to Classic or
   Plan and back.
3. **Store listing:** new screenshots are in `docs/store-screenshots/` (see that
   README's note about 03). The feature graphic and icon still show the old dark style.
   The icon test is still running, so decide whether to wait for it to finish before
   changing the art.
4. **What to watch:**
   - `look_set` with `look_choice` = `classic` or `view_plan`: how many players switch
     back. A large share means something in Pocket isn't working for them.
   - Frame time on older phones: the diorama draws more shapes than the plan.
     `quality_settled` events landing on Low more often than in 4.8 are the early warning.
   - Day-1 retention against 4.8. This is the first-impression change.
