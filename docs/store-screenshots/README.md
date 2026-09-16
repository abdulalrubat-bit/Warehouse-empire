# Play Store phone screenshots

Captured from **4.0 (v27)**. 1080×1920 (9:16), which is Play's phone aspect —
a 540×960 viewport at deviceScaleFactor 2 hits it exactly, and the app's 520px
max-width sits inside that on its own background, so the thin side bands read as
page rather than letterboxing.

Play accepts 2–8 phone screenshots. This is eight, and the order matters: Play
shows the first two or three side by side, and the site canvas is only about a
fifth of a portrait frame, so **adjacent shots have to differ in colour** to read
as different at thumbnail size.

| | Shows | Listing section |
|---|---|---|
| `01-site` | The plan running, freight in transit, new steel chrome | WATCH THE SITE RUN |
| `02-port` | Port Terminal — containers and open water | FOUR SITES |
| `03-night-livery` | Dangerous Goods at night on another livery | FOUR SITES |
| `04-rush` | A rush contract behind schedule, Priority Dispatch offered | RUN FREIGHT AGAINST THE CLOCK |
| `05-zone` | Sorting inspected, with its equipment counts | WATCH THE SITE RUN |
| `06-manifests` | All five, in three different market states, two locked | CHOOSE YOUR MANIFEST |
| `07-fleet` | The eight-tier equipment ladder | CLIMB THE EQUIPMENT LADDER |
| `08-network` | Retired sites as a managed layer | SELL UP AND BUILD A NETWORK |

## Why the whole set was replaced

The previous set was captured from 3.7 and every frame showed the hi-vis chrome
that 4.0 removed, on a plan with no freight moving on it — so all eight
photographed the two things this release changed, as absent.

## Recapturing

`storeshots40.js` in the session scratchpad. Two things it has to get right,
both learned by getting them wrong:

- **Freight takes about ten seconds to cross the site.** A frame grabbed early
  catches an empty plan, which photographs the headline feature as missing. The
  capture waits, and prints the in-flight count so a shot taken on an idle site
  is obvious rather than silent.
- **A shot that is deliberately of a modal must not use `clean()`**, which hides
  every modal including the one being photographed. That is how the 3.7 manifests
  shot came back as the floor tab.

The run also asserts no page errors and routes Google Analytics to a 204, so a
capture can never post telemetry even though the committed file has no keys.
