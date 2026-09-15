const P = require("./paths.js");
// v21 content: the rank ladder past $250B, two rank-gated manifests, the Port Terminal,
// the yard-incident table, and the second tier of perks. Everything here is either a gate
// (can the player reach it, and are they stopped before they can) or a payout.
require("./harness.js");
require("./game.js");
const fs = require("fs");
const s = global.state;
const INC = global.incidents;
const ok=[], bad=[];
const chk=(n,c,d)=>(c?ok:bad).push(n+(d?"  ["+d+"]":""));
const $ = id => document.getElementById(id);
// The game sets className wholesale on these cards; the DOM stub keeps classList in a
// separate Set, so ask about the string the game actually wrote.
const has = (el, c) => String(el.className).split(/\s+/).indexOf(c) >= 0 || el.classList.contains(c);
const HTML = fs.readFileSync(P.HTML,"utf8");
const table = name => HTML.match(new RegExp("var "+name+" = \\[([\\s\\S]*?)\\n  \\];"))[1];

// Reset to a clean slate between sections: several of these move lifetime by orders of
// magnitude, and a stale rank silently unlocks the thing the next check wants locked.
const reset = () => {
  s.lifetime = 0; s.money = 0; s.total = 0; s.pallets = 0; s.rep = 0; s.prestiges = 0;
  s.perks = {}; s.corp = {hr:0,customs:0,marketing:0,tower:0,training:0,solar:0,depot:0,server:0};
  s.network = []; s.upgrades = {}; s.ach = {}; s.themesOwned = {};
  s.owned = {picker:50, trolley:20}; s.site = "general"; s.sku = "fmcg";
  s.incidentsCleared = 0; s.priorityDone = 0;
};

// ---------------------------------------------------------------- rank ladder --------
{
  const ranks = [...table("RANKS").matchAll(/\{name:"([^"]+)", at:([0-9.e+]+)\}/g)]
                  .map(m => ({ name:m[1], at:Number(m[2]) }));
  chk("the ladder runs past the old $250B ceiling", ranks.length === 12, ranks.length + " ranks");
  let mono = true;
  for (let i=1;i<ranks.length;i++) if (!(ranks[i].at > ranks[i-1].at)) mono = false;
  chk("thresholds are strictly increasing", mono, ranks.map(r=>r.at).join(" "));
  chk("the top rank clears the most expensive Corporate building",
      ranks[ranks.length-1].at > 1e12 * 100, ranks[ranks.length-1].name + " at " + ranks[ranks.length-1].at);

  // The gap between rungs has to widen, not taper. Output growth accelerates late, so an
  // evenly spaced tail makes the last rung the cheapest one to climb: the first cut of
  // this ladder tapered, and the balance sim put the top rank four days into a run.
  const rBefore = ranks[5].at / ranks[4].at, rAfter = ranks[11].at / ranks[10].at;
  chk("the gap between rungs widens toward the top", rAfter > rBefore,
      "x" + rBefore.toFixed(0) + " early -> x" + rAfter.toFixed(0) + " late");

  reset();
  const rankAt = lt => { s.lifetime = lt; global.render(); return $("scRank").innerHTML; };
  chk("rank 1 at zero lifetime", rankAt(0).indexOf("1<i>") === 0, rankAt(0));
  chk("rank 6 just under the old ceiling", rankAt(2.5e11).indexOf("6<i>") === 0, rankAt(2.5e11));
  // Read the last two thresholds off the table rather than restating them, so a retune
  // moves one set of numbers and not two.
  chk("the ladder keeps climbing above it", rankAt(ranks[8].at).indexOf("9<i>") === 0, rankAt(ranks[8].at));
  chk("top rank reached at the last threshold",
      rankAt(ranks[11].at).indexOf("12<i>") === 0, rankAt(ranks[11].at));
  chk("and not one rung early", rankAt(ranks[11].at * 0.99).indexOf("11<i>") === 0, rankAt(ranks[11].at * 0.99));
}

// ------------------------------------------------------------------- manifests -------
{
  reset();
  const cards = () => { s.sku = s.sku; global.render(); return $("skuList").children; };
  const open = () => { $("openSkuBtn").fire("click"); return $("skuList").children; };

  s.lifetime = 0;
  let c = open();
  chk("all five manifests are listed from the start", c.length === 5, c.length + " cards");
  const locked = c.filter(x => has(x, "locked"));
  chk("the two late manifests start locked", locked.length === 2, locked.length + " locked");
  chk("a locked card advertises the rank it wants",
      /OPERATIONS MANAGER|STATE MANAGER/.test(locked[0].innerHTML), locked[0].innerHTML.slice(-60));

  // Clicking a locked card must not switch the manifest.
  locked[locked.length-1].fire("click");
  chk("clicking a locked manifest does not switch to it", s.sku === "fmcg", "sku=" + s.sku);
  chk("and it says what is missing", /needs the rank of/.test($("toast").innerHTML), $("toast").innerHTML);

  // Bonded Spirits wants rank 7 (index 6) -- Operations Manager, at $12T.
  s.lifetime = 1.2e13;
  c = open();
  const bonded = c.find(x => /Bonded Spirits/.test(x.innerHTML));
  chk("Bonded Spirits unlocks at Operations Manager", !has(bonded, "locked"));
  bonded.fire("click");
  chk("and is then selectable", s.sku === "bonded", "sku=" + s.sku);
  const semis = open().find(x => /Semiconductors/.test(x.innerHTML));
  chk("Semiconductors is still locked two ranks below it", has(semis, "locked"));

  s.lifetime = 2e16;
  chk("Semiconductors unlocks at State Manager",
      !open().find(x => /Semiconductors/.test(x.innerHTML)).classList.contains("locked"));

  // The Priority Client names a manifest and asks you to run it; naming one the player
  // cannot switch to would be an unfillable contract.
  reset();
  s.lifetime = 0;
  let sawLocked = false;
  for (let i=0;i<400;i++){
    s.priorityClient = null;
    global.render();
    const p = s.priorityClient;
    if (p && (p.sku === "bonded" || p.sku === "semis")) sawLocked = true;
  }
  chk("the Priority Client never names a locked manifest (400 rolls)", !sawLocked);
}

// ----------------------------------------------------------------------- sites -------
{
  reset();
  // The site list is only built when the business is sold, so drive it the way the game
  // does: SELL arms the button, a second press confirms and opens the picker.
  const sell = () => { s.lifetime = Math.max(s.lifetime, 1e6); global.render();
                       $("sellBtn").fire("click"); $("sellBtn").fire("click"); };

  s.lifetime = 1e6;
  sell();
  let cards = $("siteList").children;
  chk("four sites are offered", cards.length === 4, cards.length + " sites");
  const port = cards.find(x => /Port Terminal/.test(x.innerHTML));
  chk("the Port Terminal starts locked", has(port, "lock"));
  chk("and shows the capital it wants", /Unlocks at \$50B/.test(port.innerHTML), port.innerHTML);

  s.site = "general";
  port.fire("click");
  chk("commissioning a locked site is refused", s.site === "general", "site=" + s.site);
  chk("and it says what is missing", /lifetime capital/.test($("toast").innerHTML), $("toast").innerHTML);

  s.lifetime = 5e10;
  sell();
  const port2 = $("siteList").children.find(x => /Port Terminal/.test(x.innerHTML));
  chk("it unlocks at $50B lifetime", !has(port2, "lock"));
  port2.fire("click");
  chk("and can then be commissioned", s.site === "port", "site=" + s.site);

  // The Port Terminal has to be a real trade, not a strict upgrade.
  // It has to be dearer to run than General Distribution on the axes that actually bite.
  // Wages are only ~3% of gross, so a wage penalty alone is not a price: the first cut
  // gave it cheaper units and more output as well, which made it a free upgrade.
  const port3 = HTML.match(/\{ id:"port"[^}]*\}/)[0];
  const gen   = HTML.match(/\{ id:"general"[^}]*\}/)[0];
  const num = (blob, k) => Number(blob.match(new RegExp(k + ":([0-9.]+)"))[1]);
  chk("dearer fleet than General Distribution", num(port3,"cost") > num(gen,"cost"),
      num(gen,"cost") + " -> " + num(port3,"cost"));
  chk("and heavier wages", num(port3,"wage") > num(gen,"wage"), num(gen,"wage") + " -> " + num(port3,"wage"));
  chk("and worse by hand", num(port3,"tap") < num(gen,"tap"), num(gen,"tap") + " -> " + num(port3,"tap"));
  chk("what you get for it is contracts", num(port3,"conMult") === 3.2 &&
      num(port3,"conMult") > Math.max(...["general","cold","hazmat"].map(id =>
        num(HTML.match(new RegExp('\\{ id:"' + id + '"[^}]*\\}'))[0], "conMult"))),
      "x" + num(port3,"conMult"));
}

// ------------------------------------------------------------------- incidents -------
{
  reset();
  const byId = id => INC.table.find(t => t.id === id);
  chk("six incident types", INC.table.length === 6, INC.table.map(t=>t.id).join(","));
  chk("every type declares a life", INC.table.every(t => t.ttl > 0));
  chk("every type pays in a kind the handler knows",
      INC.table.every(t => ["cash","speed","tap","pallet","rush"].indexOf(t.kind) >= 0));
  const kinds = new Set(INC.table.map(t=>t.kind));
  chk("the table spans more than the two rewards it replaced", kinds.size === 5, [...kinds].join(","));

  // Weighting: Express is the rare one, Chemical Spill the common one.
  const seen = {};
  for (let i=0;i<20000;i++){ const r = INC.roll().id; seen[r] = (seen[r]||0)+1; }
  chk("Chemical Spill is the most common", seen.spill === Math.max(...Object.values(seen)),
      Object.entries(seen).map(([k,v])=>k+" "+(v/200).toFixed(1)+"%").join("  "));
  chk("Express Courier is the rarest", seen.express === Math.min(...Object.values(seen)));
  chk("every type actually rolls", INC.table.every(t => seen[t.id] > 0));

  // Payouts.
  s.money = 0; s.lifetime = 0;
  INC.clear(byId("spill"));
  chk("a Chemical Spill pays cash", s.money > 0, "+" + s.money.toFixed(0));
  const spillPay = s.money;
  s.money = 0;
  INC.clear(byId("express"));
  chk("Express Courier pays far more for a far shorter fuse",
      s.money > spillPay * 3 && byId("express").ttl < byId("spill").ttl / 5,
      "$" + s.money.toFixed(0) + " in " + byId("express").ttl + "s vs $" + spillPay.toFixed(0) + " in " + byId("spill").ttl + "s");

  s.pallets = 0; INC.clear(byId("pallet"));
  chk("a Lost Pallet pays a pallet", s.pallets === 1, "pallets=" + s.pallets);

  const rateBefore = Number($("rate").textContent.replace(/[^0-9.]/g,""));
  INC.clear(byId("audit")); global.render();
  chk("a Data Cube lifts the rate", Number($("rate").textContent.replace(/[^0-9.]/g,"")) > rateBefore,
      rateBefore + " -> " + $("rate").textContent);
  chk("and it is announced in the boost tag", /SPEED/.test($("boostTag").innerHTML), $("boostTag").innerHTML);

  INC.clear(byId("surge")); global.render();
  chk("a Power Surge lifts hand picks", /TAP/.test($("boostTag").innerHTML), $("boostTag").innerHTML);
  INC.clear(byId("overtime")); global.render();
  chk("an Overtime Call starts a rush", /RUSH/.test($("boostTag").innerHTML), $("boostTag").innerHTML);

  // The Solar Array's mastery used to delete the system outright.
  s.incidentsCleared = 0; s.corp.solar = 0; s.money = 0;
  INC.clear(byId("spill"));
  const plain = s.money;
  s.corp.solar = 10; s.money = 0;
  INC.clear(byId("spill"));
  chk("Solar Array mastery doubles the payout rather than removing incidents",
      Math.abs(s.money - plain*2) < 1, "$" + plain.toFixed(0) + " -> $" + s.money.toFixed(0));
  chk("clearing an incident is counted", s.incidentsCleared === 2, "cleared=" + s.incidentsCleared);

  // The spawner has to still be reachable at Solar 10 -- that is the actual bug.
  // Spawning and expiry are shared by both renderers, so read them where they live.
  const gate = HTML.match(/function tickIncidents[\s\S]{0,1400}/)[0];
  chk("the spawner is no longer gated on the Solar Array", !/corp\.solar/.test(gate));
  chk("incidents expire", /h\.t >= h\.ttl/.test(gate));
}

// ------------------------------------------------------------------- perks -----------
{
  reset();
  // Output swings +/-15% on a sine of the wall clock, so a before/after ratio taken a few
  // milliseconds apart is not measuring the perk. Freeze the clock across each pair.
  const realNow = Date.now; const frozen = realNow();
  Date.now = () => frozen;
  const rate = () => { global.render(); return Number($("rate").textContent.replace(/[^0-9.]/g,"")); };
  const tap  = () => { global.render(); return Number($("tapval").textContent.replace(/[^0-9.]/g,"")); };

  s.perks = { gloves:true };
  const t0 = tap();
  s.perks = { gloves:true, crew:true };
  chk("Cross-Trained Crew lifts hand picks ~60% over Gloves",
      Math.abs(tap()/t0 - 1.6) < 0.02, "x" + (tap()/t0).toFixed(4));

  s.perks = { lean:true, maint:true };
  const r0 = rate();
  s.perks = { lean:true, maint:true, kaizen:true };
  const lift = rate() / r0;
  // Kaizen lifts gross output 15%, and the panel shows net -- gross minus the wage bill,
  // which Kaizen does not touch. So the figure on screen has to rise by MORE than 15%:
  // (1.15G - W)/(G - W) for a wage share W/G. Asserting a flat 1.15 here was wrong, and
  // sat close enough to the tolerance to pass about half the time.
  chk("Kaizen lifts the rate by more than its 15% on gross", lift > 1.15 && lift < 1.30,
      "x" + lift.toFixed(4) + " net for +15% gross");
  chk("and it is the gross rate the multiplier is applied to",
      /state\.perks\.kaizen \? 1\.15 : 1/.test(HTML) &&
      !/kaizen/.test(HTML.match(/function wageBill[\s\S]*?\n  }/)[0]));

  // Prerequisites: the shop must refuse a tier-two perk whose parent is unowned.
  const perkBtn = name => $("perkList").children.find(b => new RegExp(name).test(b.innerHTML));
  s.perks = {}; s.pallets = 500;
  perkBtn("Kaizen Program").fire("click");
  chk("Kaizen is refused without Preventive Maintenance", !s.perks.kaizen, JSON.stringify(s.perks));
  s.perks = { lean:true, maint:true };
  perkBtn("Kaizen Program").fire("click");
  chk("and bought once the chain is complete", !!s.perks.kaizen, "pallets left " + s.pallets);
  const kaizenCost = Number(HTML.match(/id:"kaizen"[^}]*cost:(\d+)/)[1]);
  chk("it cost what the table says", s.pallets === 500 - kaizenCost,
      kaizenCost + " pallets, " + s.pallets + " left");
  // Tier two has to be a real sink: the whole first tier is 130 pallets, and the balance
  // sim showed a player clearing it inside eight hours.
  const tier1 = ["gloves","lean","maint","radio","night"]
    .reduce((a,id)=>a + Number(HTML.match(new RegExp('id:"' + id + '"[^}]*cost:(\\d+)'))[1]), 0);
  const tier2 = ["crew","kaizen","telemetry"]
    .reduce((a,id)=>a + Number(HTML.match(new RegExp('id:"' + id + '"[^}]*cost:(\\d+)'))[1]), 0);
  chk("tier two costs several times tier one", tier2 > tier1 * 4, tier1 + " -> " + tier2 + " pallets");

  chk("Yard Telemetry halves the gap between incidents",
      /telemetry \? 0\.5 : 1/.test(HTML));
  Date.now = realNow;
}

// ------------------------------------------------------------------ awards -----------
{
  reset();
  // checkAch is throttled to once a second, so step a fake clock between renders rather
  // than rendering in a tight loop and concluding nothing fires.
  const realNow = Date.now;
  let clock = realNow();
  Date.now = () => clock;
  const settle = () => { for (let i=0;i<3;i++){ clock += 1500; global.render(); } };

  settle();
  const total = Number($("achCountTag").textContent.split("/")[1]);
  chk("the grid grew past the 32 it shipped with", total === 44, "total=" + total);
  chk("the markup placeholder matches", /id="scAch">0<i>\/44<\/i>/.test(HTML));
  chk("the throttle comment was updated with it", /44 predicates plus 44 classList/.test(HTML));

  s.ach = {}; s.lifetime = 1e18; settle();
  chk("late cash tiers now award", !!s.ach.cash7 && !!s.ach.cash8 && !!s.ach.cash9,
      Object.keys(s.ach).filter(k=>/cash/.test(k)).join(","));
  chk("Regional Director awards on the way up", !!s.ach.rank1 && !s.ach.rank2,
      Object.keys(s.ach).filter(k=>/rank/.test(k)).join(","));
  s.ach = {}; s.lifetime = 3e20; settle();
  chk("Board Level waits for the top of the ladder", !!s.ach.rank2,
      Object.keys(s.ach).filter(k=>/rank/.test(k)).join(","));

  s.ach = {}; s.lifetime = 0; s.incidentsCleared = 200; s.priorityDone = 50; settle();
  chk("incident awards fire", !!s.ach.inc1 && !!s.ach.inc2, Object.keys(s.ach).join(","));
  chk("priority-load awards fire", !!s.ach.pri1 && !!s.ach.pri2);

  s.ach = {}; s.incidentsCleared = 0; s.priorityDone = 0;
  s.corp = {hr:1,customs:1,marketing:1,tower:10,training:0,solar:0,depot:0,server:0};
  settle();
  chk("corporate awards fire", !!s.ach.corp1 && !!s.ach.corp2, Object.keys(s.ach).join(","));

  s.ach = {}; s.corp = {hr:0,customs:0,marketing:0,tower:0,training:0,solar:0,depot:0,server:0};
  s.themesOwned = { nightshift:true, biohazard:true, radioactive:true };
  settle();
  chk("the livery award counts the free one too", !!s.ach.livery1, Object.keys(s.ach).join(","));

  Date.now = realNow;
}

// ------------------------------------------------------------- save round trip -------
{
  const before = { inc: 41, pri: 7 };
  s.incidentsCleared = before.inc; s.priorityDone = before.pri;
  const blob = JSON.stringify(s);
  const back = JSON.parse(blob);
  chk("the new counters persist", back.incidentsCleared === 41 && back.priorityDone === 7,
      back.incidentsCleared + "/" + back.priorityDone);
  // Assert the membership, not the line wrapping. The old regex pinned where the list
  // broke across lines, so appending a counter to it failed the test for formatting.
  const sanitised = HTML.match(/\[("(?:\w+)",\s*\n?\s*)*"repSpent"[^\]]*\]\.forEach\(function\(k\)\{\s*\n\s*var v = Number\(state\[k\]\);/);
  const listed = sanitised ? sanitised[0].match(/"(\w+)"/g).map(x=>x.slice(1,-1)) : [];
  const mustSanitise = ["incidentsCleared","priorityDone","incidentPalletsToday","repSpent",
                        "expediteReadyAt","contractsOffered"];
  const missing = mustSanitise.filter(k => listed.indexOf(k) < 0);
  chk("every numeric counter is sanitised, not left undefined on an old save",
      sanitised && missing.length === 0,
      missing.length ? "not sanitised: " + missing.join(",") : listed.length + " counters");
}

ok.forEach(x=>console.log("  + " + x));
bad.forEach(x=>console.log("  - " + x));
console.log(`\n${ok.length} passed, ${bad.length} failed`);
process.exit(bad.length ? 1 : 0);
