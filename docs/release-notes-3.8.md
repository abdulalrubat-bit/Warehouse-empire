# Warehouse Empire 3.8 (v25)

Play caps the release-notes field at 500 characters; the short version below is
inside that.

**3.7 (v24) is live**, so unlike the last set these notes cover one release
rather than a backlog.

---

## Play Store release notes (short)

Switching manifest now costs you a changeover: the site drops to 40% throughput
and climbs back over a minute. Chasing a Hot market usually pays for that. Peak
runs 90 seconds, so chasing one already half spent usually does not.

Flow Control halves the changeover. A level 10 Customs Office removes it.

The opening is sequenced: the fleet boosts, the Office and the daily calendar
now arrive when there is a reason for them rather than all at once.

---

## Longer version (for a store listing update or changelog page)

### Switching manifest is a decision now

**Changeover.** Assigning a different manifest stops the site: throughput falls
to 40% and climbs back over sixty seconds. Before this, switching was free,
instant, and — with the Customs mastery — actually rewarded, so the best manifest
was always whichever one you were not currently running. A choice you always make
the same way is not a choice.

The cost is priced against the market clock the game already runs. **Hot** lasts
three to six minutes at ×1.32 and usually repays a changeover. **Peak** is ×1.80
but runs only sixty to ninety seconds, so switching to catch one that is already
half spent usually loses you more than it earns. That calculation is the point.

Wages fall by the same proportion during a changeover, so it costs you a share of
your net income rather than all of it — output alone would have taken roughly
90% of a new site's earnings instead of 60%.

The cost is shown in the manifest list before you commit to it, and the
throughput bar names the changeover and counts it down while it runs.

**Two things that used to do nothing much now matter.** *Flow Control* on the
Directorship tree halves the changeover instead of smoothing a meaningless
wobble. A **Customs Office at level 10** removes it entirely — the paperwork is
already done — instead of handing out a bonus for switching. That is a far better
reason to finish the building.

### The opening is sequenced

Before your first tap, on an empty site, the game used to show you fourteen
separate things — and then open a seven-day streak calendar on top of them.
Nothing has been removed. Three things now arrive when they can mean something:

- **The fleet boosts** appear once you own any plant. Overtime Shift multiplies
  your output; offered before you have any, it multiplies nothing.
- **The Office** appears once you have completed a contract — which is the task
  the game sets you third, and the point at which it starts pointing you there.
- **The daily calendar** waits for your second visit. A seven-day return streak
  is not something that can be offered to someone who has not had a first visit
  yet.

If you already play, you have long since passed all three and nothing changes.

### Under the hood

**The anonymous statistics added in 3.7 now work properly.** They were reporting
more installs than sessions, which is impossible, and every session was being
recorded as about a third of a second long. Both are fixed, and every report now
carries the version of the game it came from so a fault can be traced to the
update that caused it. The privacy policy has been updated to list that.
