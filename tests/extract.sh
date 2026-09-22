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

EXPORT='  window.__sim = { GENS:GENS, UPGRADES:UPGRADES, PERKS:PERKS, CORP_BUILDINGS:CORP_BUILDINGS, costOf:costOf, moneyRate:moneyRate, totalRate:totalRate, grossRate:grossRate, wageBill:wageBill, activeRate:activeRate, networkRate:networkRate, tapValue:tapValue, prestigeMult:prestigeMult, repEarnedByLifetime:repEarnedByLifetime, pendingRep:pendingRep, fmt:fmt, THEMES:THEMES, OFFLINE_CAP_HOURS:OFFLINE_CAP_HOURS, MARKET:MARKET, marketOf:marketOf, marketMult:marketMult, mgrMult:mgrMult, SKUS:SKUS, invalidateUpMult:invalidateUpMult, upMult:upMult, RANKS:RANKS, rankIndex:rankIndex, SITES:SITES, siteUnlocked:siteUnlocked, skuUnlocked:skuUnlocked, INCIDENTS:INCIDENTS, clearIncident:clearIncident, SUBURB_XY:SUBURB_XY, BAY_RING:BAY_RING, NET_SUBURBS:NET_SUBURBS, geoX:geoX, geoY:geoY, marginalRate:marginalRate, genRate:genRate, multFor:multFor, WAGE:WAGE, SUPPLIES:SUPPLIES, supplyCost:supplyCost, DISPATCH_MINUTES:DISPATCH_MINUTES, dispatchUsesToday:dispatchUsesToday, TREE:TREE, TREE_BY_ID:TREE_BY_ID, hasNode:hasNode, buyNode:buyNode, repAvailable:repAvailable, heldDirectorship:heldDirectorship, nodeBlocked:nodeBlocked, netCap:netCap, netSiteRate:netSiteRate, netSetBonus:netSetBonus, netInvestCost:netInvestCost, netInvest:netInvest, netTypeCounts:netTypeCounts, treeOutput:treeOutput };'
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
