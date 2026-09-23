#!/bin/sh
# Pull the single inline <script> out of the shipping HTML so node can require it, and
# build the three variants from that same extract. game-sim.js used to be a hand-made
# copy, which went stale silently -- sim-prestige was still costing the perk tree at 130
# pallets well after tier two landed.
#
# Run this before the suite; run.sh does it for you.
set -e
D=$(cd "$(dirname "$0")" && pwd)
HTML=${WE_HTML:-$D/../warehouse-empire-android.html}

sed -n '/^<script>$/,/^<\/script>$/p' "$HTML" | sed '1d;$d' > "$D/game.js"

# The sim export, filtered to what the source actually defines. A fork that predates a
# symbol -- or a variant built from an older branch -- used to make game-sim.js throw
# ReferenceError on load, which failed every suite for a reason that had nothing to do
# with the build under test. The suite is a review tool for any variant, not just HEAD.
SYMS="GENS UPGRADES PERKS CORP_BUILDINGS costOf moneyRate totalRate grossRate wageBill activeRate networkRate tapValue prestigeMult repEarnedByLifetime pendingRep fmt THEMES OFFLINE_CAP_HOURS MARKET marketOf marketMult mgrMult SKUS invalidateUpMult upMult RANKS rankIndex SITES siteUnlocked skuUnlocked INCIDENTS clearIncident SUBURB_XY BAY_RING NET_SUBURBS geoX geoY marginalRate genRate multFor WAGE SUPPLIES supplyCost DISPATCH_MINUTES dispatchUsesToday TREE TREE_BY_ID hasNode buyNode repAvailable heldDirectorship nodeBlocked netCap netSiteRate netSetBonus netInvestCost netInvest netTypeCounts treeOutput"
EXPORT='  window.__sim = {'
for sym in $SYMS; do
  if grep -qE "(var|function) $sym\\b" "$D/game.js"; then EXPORT="$EXPORT $sym:$sym,"; fi
done
EXPORT="$EXPORT };"
awk -v ex="$EXPORT" '{ print } /^  window.render = render;$/ { print ex }' "$D/game.js" > "$D/game-sim.js"

# Both telemetry paths have to be testable whatever the shipping file happens to hold, so
# these force the constants rather than filling in blanks. The first version matched only
# an empty string, which quietly stopped substituting the moment real keys landed in the
# file -- the configured test would then have run against the live property and the
# switched-off test would have had nothing switched off to check.
#   game-tele.js  configured, with keys that are not the real ones
#   game-off.js   unconfigured, whatever the shipping file says
sed -e 's|var GA_MEASUREMENT_ID = "[^"]*";|var GA_MEASUREMENT_ID = "G-TESTONLY01";|' \
    -e 's|var GA_API_SECRET = "[^"]*";|var GA_API_SECRET = "test-secret";|' \
    "$D/game.js" > "$D/game-tele.js"
sed -e 's|var GA_MEASUREMENT_ID = "[^"]*";|var GA_MEASUREMENT_ID = "";|' \
    -e 's|var GA_API_SECRET = "[^"]*";|var GA_API_SECRET = "";|' \
    "$D/game.js" > "$D/game-off.js"

grep -q "__sim" "$D/game-sim.js" || { echo "sim export not injected"; exit 1; }
grep -q 'GA_MEASUREMENT_ID = "G-TESTONLY01"' "$D/game-tele.js" || { echo "tele keys not injected"; exit 1; }
grep -q 'GA_API_SECRET = "test-secret"'      "$D/game-tele.js" || { echo "tele secret not injected"; exit 1; }
grep -q 'GA_MEASUREMENT_ID = "";'            "$D/game-off.js"  || { echo "off variant still configured"; exit 1; }

# The real secret must never reach a test variant, or a failing run prints it. The keys are
# injected by the release workflow, so the file in git must always have them empty.
SHIPPED=$(sed -n 's|.*var GA_API_SECRET = "\([^"]*\)".*|\1|p' "$HTML")
if [ -n "$SHIPPED" ]; then
  echo "the shipping file carries a telemetry secret; it must be injected at build time"
  exit 1
fi
