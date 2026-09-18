# Warehouse Empire 4.2 (v29)

Play caps the release-notes field at 500 characters; the short version below is
inside that.

**One change**, and it is the other half of what 4.1 started. 4.1 made the game
earn while it is shut. This one makes it able to tell you.

**If 4.1 (v28) was never published, this build contains it.** Use the 4.1 notes
as well when writing the store entry.

---

## Play Store release notes (short)

The game can now ask to send you reminders — properly, at a sensible moment,
rather than only from a button buried in the Office.

Android will not deliver a reminder it was never given permission for. Until
now the game scheduled them anyway and nothing was ever shown. Reminders should
now actually arrive.

---

## Longer version

### Reminders were never reaching anyone

`ensureNotifPermission()` had exactly two callers, and both were inside the
Office settings panel: toggling a reminder row on, or pressing the permission
button there. Nothing at launch, nothing after a purchase, nothing on
backgrounding.

On Android 13 and up, notification permission is not granted at install. So
unless a player went looking in settings and pressed a button, the game had no
permission and never would. One player in twenty-three had ever answered the
dialog.

And it failed silently, which is why it lasted this long. `scheduleNotifications()`
skips only when permission has been explicitly refused; never having asked leaves
that state empty, which reads as "has not refused". So the game scheduled, the
plugin resolved successfully, and Android displayed nothing at all. Every
reminder since notifications shipped may have gone nowhere, with no error
anywhere to say so.

### What this release does about it

**It finds out what your device actually permits.** At launch the game asks
Android what the current permission state is — a check that never raises a
dialog — and records the answer. Crucially it keeps "never asked" and "refused"
apart, because treating them as the same thing is the bug above.

**It asks at a moment worth asking at.** A card in the game's own words, showing
your real storage cap, appears before Android's system dialog: on your second
launch, or the moment you collect a shift of offline earnings and the point of a
reminder has just demonstrated itself. Never on a first launch — Android gives an
app one dialog, a refusal cannot be undone from inside the app, and spending it
on someone four seconds into the game is the worst possible use of it.

Declining is not treated as a refusal, and the Office still holds the switch.

### Also

Two bugs found while building this, both of which would have shipped:

The new reporting event was being dropped before it was sent. Telemetry goes live
behind two storage reads and the permission check is a single plugin call, so
whichever finished first won — and when the check won, the event was discarded.
That race applied to anything reporting at launch, not just this.

The card would never have appeared at all. The streak calendar opens on the
second launch, which is exactly the launch the card wants, and the two share a
z-index — so the card correctly stood aside, and then stood aside again on every
qualifying launch after that, forever. It now waits behind the calendar and comes
up when that closes.

---

## Release checklist

1. Build and upload v29, version name `4.2`.
2. **Register three custom dimensions in GA4 before this goes out** — none of them
   are retroactive, so every day they are missing is a day that cannot be
   recovered:
   - `display` — the device's real permission state, on `notification_state`.
     This is the one that turns "reminders might be broken for everyone" into a
     count.
   - `action` and `trigger` on `notification_prompt` — whether people accept, and
     which of the two moments they were asked at.
3. The privacy policy was updated for this release and is already live. It now
   covers reading the device's permission state without prompting, and the launch
   count. Neither adds a Play data-safety category; both are app interaction,
   already declared.
4. Store listing and screenshots unchanged.
5. This ships with the 4.1 starting-picker change. If 4.1 was never published,
   the two land together and neither can be read separately in the data — worth
   knowing before drawing conclusions from whatever moves next.
