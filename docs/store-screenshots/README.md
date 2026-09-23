# Play Store phone screenshots

Captured from **4.4 (v31)**. 1080×1920 (9:16), which is Play's phone aspect.
A 540×960 viewport at deviceScaleFactor 2 hits it exactly.

Play accepts 2–8 phone screenshots. This is eight, and the order matters: Play
shows the first two or three side by side, so **adjacent shots have to differ**
to read as different at thumbnail size.

| | Shows | Listing section |
|---|---|---|
| `01-site` | The working building at the new opening zoom, freight in transit | WATCH THE SITE RUN |
| `02-last-truck` | The opening shift: S04 two-thirds loaded, the task docked above PICK ORDER | *(new in 4.4)* |
| `03-port` | Port Terminal in Overview: container stacks in the racking | FOUR SITES |
| `04-night-livery` | Dangerous Goods on the Night Shift livery: drum cages, dark estate | FOUR SITES |
| `05-rush` | A rush behind schedule: the bottleneck card with Expedite, and the Contracts panel | RUN FREIGHT AGAINST THE CLOCK |
| `06-manifests` | All five, three open and two locked | CHOOSE YOUR MANIFEST |
| `07-fleet` | The equipment ladder, with the marginal gain on each card | CLIMB THE EQUIPMENT LADDER |
| `08-network` | Fourteen retired sites on the Melbourne map, above the list | SELL UP AND BUILD A NETWORK |

## Why the whole set was replaced

4.4 changed the three things every Floor shot contains: the readout (it folds, and
the brand row is gone), the cards below the site, and the default camera. `05-zone`
was dropped for `02-last-truck`, because the opening shift is the release's headline
and the zone panel is not. Every file after `01` was renumbered, so the old names were
removed rather than left beside the new ones.

## Recapturing

    node tools/storeshots.js          # all eight
    node tools/storeshots.js 05       # just one

It lives in the repo now. The 4.0 script was left in a session scratchpad and had
to be rebuilt from this README. Things it has to get right, all learned by getting
them wrong:

- **Freight takes about ten seconds to cross the site.** A frame grabbed early
  catches an empty plan, which photographs the headline feature as missing. The
  script waits, and prints the in-flight count so an idle shot is obvious.
- **A seasoned save opens on the streak calendar**, which re-queues behind the review
  prompt and lands over the shot after it has been dismissed once. The seeded save marks
  today's stipend claimed and the one-time asks asked, and every shot clears modals at
  the shutter.
- **The one shot that is of a modal (`06`) must keep it.** That is how the 3.7
  manifests shot came back as the Floor tab.
- **Port and night-livery shots need Overview.** At the working-building framing the
  quay and the estate are out of frame, and all four sites look like the same floor.

Google Analytics is answered with a 204 before it leaves the machine, and any page
error fails the run.
