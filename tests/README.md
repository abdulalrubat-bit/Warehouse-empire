# Tests

A regression suite for `warehouse-empire-android.html`. The game is a single file with one
inline `<script>` and no build step, so the suite extracts that script and loads it into a
stubbed DOM under node. Four of the suites drive a real browser instead, for the
things a stub cannot answer — how much the canvas actually draws, and what the Network
panel looks like at forty sites.

```sh
cd tests
npm install
npx playwright install chromium      # only needed for the browser suites
node run.js                          # everything
node run.js --no-browser             # skip the ones that need Chromium
node run.js telemetry                # only suites whose filename matches
```

CI runs `node run.js` on every pull request and on every push to `main`.

## Layout

| | |
|---|---|
| `run.js` | Runs each suite in its own process and totals the assertions. Separate processes are deliberate: every suite loads the whole game and several rewrite `Date.now`, so sharing one would let one suite's fixtures decide another's result. |
| `extract.sh` | Pulls the inline script out of the HTML into `game.js`, plus three variants. Run by `run.js`; the outputs are gitignored. |
| `harness.js` | The DOM stub — enough `document`, `window`, `localStorage`, `fetch` and timer surface to load the game. Timers are collected rather than fired, so tests advance the clock by hand. |
| `paths.js` | Everything the suite reads, resolved from the repo. Override the file under test with `WE_HTML`. |
| `browser.js` | Finds a Chromium: `WE_CHROMIUM`, else one under `PLAYWRIGHT_BROWSERS_PATH`, else Playwright's own. |

## The four extracted variants

`extract.sh` writes four files, all from the same extract, so none of them can go stale
against the shipping file:

- `game.js` — the shipping script as-is.
- `game-sim.js` — the same, plus a `window.__sim` export of the balance functions, so a
  test can read `grossRate()` directly instead of inferring it from something on screen.
- `game-tele.js` — telemetry forced **on** with keys that are not the real ones.
- `game-off.js` — telemetry forced **off**.

The two telemetry variants force the constants rather than filling in blanks. An earlier
version substituted only into an empty string, which meant it quietly stopped substituting
the moment real keys were present — the configured test would then have sent events to the
live property, and the switched-off test would have had nothing switched off to check.

`extract.sh` also fails the run if the committed HTML contains a telemetry secret. The
release workflow injects those at build time; a key in git is a mistake, and a failing test
that prints the file would publish it.

## Writing a test

Suites are plain node scripts with no framework. They collect assertions into `ok` and
`bad`, print them, and exit non-zero if `bad` is non-empty. `run.js` counts the lines
beginning `  + `.

Two habits worth keeping, both learned from tests that lied:

**Assert a band, not a threshold on a ratio.** A `x10` growth check in `test-warehouse`
failed when the *early* scene got richer — the late scene had grown too, but the
denominator grew faster. A ratio between two moving numbers measures neither.

**Assert behaviour, not source text.** A regex in `test-content` pinned where a list broke
across lines, so appending a counter to that list failed the test for formatting. It now
checks that each key is in the list, which is the thing that actually matters.

## Cross-repo check

One assertion in `test-adunits.js` cross-checks the AdMob unit ids against the publisher id
in `app-ads.txt`, which lives in the Pages repo rather than this one. It reports as skipped
when that file is not present. Point `WE_APP_ADS` at it to enable it.
