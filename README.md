# Warehouse Empire

Idle logistics game for Android. Published on Google Play as
`com.abdulgames.warehouseempire`.

**This repository is the source of truth for the game.** The whole game is the
single self-contained file `warehouse-empire-android.html` — no build step, no
dependencies, no external assets. Edit that file and the next build picks it up.

`abdulalrubat-bit.github.io` is the studio site and hosts `app-ads.txt` at the
domain root (AdMob requires it there). It does not carry a copy of the game.

## Building

Both builds are GitHub Actions workflows — run them from the Actions tab. Each
one generates a fresh Capacitor project around the HTML file, so there is no
`android/` folder committed here.

| Workflow | Produces | Trigger |
|---|---|---|
| `build-debug.yml` | Debug APK, sideloadable | Automatic on push to the game file, or manual |
| `build-release.yml` | Signed AAB for Play | Manual, takes `version_code` and `version_name` |
| `generate-keystore.yml` | Signing keystore | Manual, **run once ever** |

`version_code` must increase on every Play upload. The release workflow fails
early if the substitution did not apply, rather than building an AAB that Play
would reject.

## Ads

Five rewarded AdMob placements, mapped in `AD_UNITS` near the top of the game's
script block. Each has its own ad unit so they report separately.

Debug builds force `AD_TESTING = true` so they always serve Google test ads —
tapping your own live ads is an AdMob policy violation. Release builds fail if
`AD_TESTING` is true, if any unit is empty, or if two placements share a unit.

The AdMob app ID and the `AD_ID` permission are injected into the manifest by
both workflows; without the app ID the app crashes on launch, and without the
permission Android 13+ zeroes the advertising ID.

## Icons

`assets/icon.png` (512x512 or larger) is the source for every density. The
release build fails if the generated launcher icon is unchanged, so a default
icon cannot ship by accident.

Optionally add `assets/icon-foreground.png` for the Android 8+ adaptive layer.
Without it, launchers crop roughly the outer 19% of each edge.
