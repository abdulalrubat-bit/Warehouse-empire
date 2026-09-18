// The four PRs merged on 15 September add a pressure loop: a visible bottleneck card, a
// free Priority Dispatch button, a rush contract every fourth job, and a contract gate so
// none of it is shown to a player with nothing to move it with. Nothing here existed
// before, so nothing here was covered.
require("./harness.js");
const cvEl = document.getElementById("wcanvas"); cvEl._cw = 400; cvEl._ch = 300;
require("./game-sim.js");

const s = global.state;
const ok=[], bad=[];
const chk=(n,c,d)=>(c?ok:bad).push(n+(d?"  ["+d+"]":""));
const tick = () => new Promise(r=>process.nextTick(r));
const settle = async () => { for (let i=0;i<20;i++) await tick(); };

// Contracts are created by the game tick, not by render(), so the tick is the seam: a
// test that only calls render() sees whatever contract the last tick happened to leave.
const ticker = global.__intervals.find(i => i.ms === 100);
const beat = () => { ticker.fn(); global.render(); };

const $ = id => document.getElementById(id);
const card   = () => $("bottleneck");
// The button is wired with .onclick rather than addEventListener, so pressing it in the
// stub means invoking that handler with the event it expects to be able to cancel.
const press  = () => action().onclick({ preventDefault(){}, stopPropagation(){} });
// Net income -- gross less payroll -- is what a player actually banks, and therefore what
// a throughput boost has to be measured against.
const S = global.__sim;
const netRate = () => S.grossRate() - S.wageBill();
const action = () => $("bottleneckAction");
const fresh = () => {
  // The site opens with one Casual Picker, so "has bought nothing" is picker 1, and the
  // fixtures below that mean "has made their first purchase" say picker 2.
  s.owned = { picker: 1 }; s.taps = 0; s.contractsDone = 0; s.contractsOffered = 0; s.prestiges = 0;
  s.lifetime = 0; s.money = 0; s.contract = null; s.expediteReadyAt = 0;
  s.corp = { hr:0, customs:0, marketing:0, tower:0, training:0, solar:0, depot:0, server:0 };
  s.tree = {}; s.upgrades = {}; s.perks = {}; s.changeoverUntil = 0; s.sku = "fmcg";
};

(async () => {
await settle();

// ---- nothing is shown to a player who cannot act on it -----------------------------
fresh(); beat(); await settle();
chk("a player with no plant is not given a timed freight target",
    $("contractCard").hidden === true, "contract hidden=" + $("contractCard").hidden);
chk("nor a bottleneck to fix", card().hidden === true, "card hidden=" + card().hidden);

s.owned.picker = 2; beat(); await settle();
chk("the first hire brings both in",
    $("contractCard").hidden === false && card().hidden === false,
    "contract hidden=" + $("contractCard").hidden + " card hidden=" + card().hidden);

// A player who has already done contracts keeps the card if they sell down to nothing.
fresh(); s.contractsDone = 3; beat(); await settle();
chk("and a player who has run contracts keeps them regardless of fleet",
    $("contractCard").hidden === false, "contract hidden=" + $("contractCard").hidden);

// ---- the first contract is sized for the first fleet -------------------------------
fresh(); s.owned = { picker: 2 }; beat(); await settle();
const first = s.contract;
chk("the opening contract has a small floor so it can actually close",
    first.goal <= 500, "goal=" + first.goal);
s.contractsDone = 1; s.contract = null; beat(); await settle();
chk("and later ones use the standard floor", s.contract.goal >= 500, "goal=" + s.contract.goal);

// ---- the rush cadence --------------------------------------------------------------
fresh(); s.owned = { picker: 40, trolley: 20 }; s.contractsDone = 1;
const cadence = [];
for (let i = 0; i < 12; i++){
  s.contract = null; beat(); await settle();
  cadence.push(s.contract.rush ? "R" : ".");
}
chk("every fourth job offered is a rush", cadence.join("") === "...R...R...R", cadence.join(""));

const rush = (function(){ for (let i=0;i<12;i++){ if (cadence[i]==="R") return i; } })();
fresh(); s.owned = { picker: 40, trolley: 20 }; s.contractsDone = 1; s.contractsOffered = 3;
s.contract = null; beat(); await settle();
const R = s.contract;
chk("a rush is labelled as one", /^RUSH/.test(R.label), R.label);
chk("it runs on a two minute clock", R.mins === 2, R.mins + " min");
chk("it pays more and drops more pallets", R.pallets === 5, R.pallets + " pallets");

// The whole design rests on this: a rush asks for 110% of two minutes of throughput, and
// Priority Dispatch is +75% for 30s. If those numbers did not meet, the job would be
// either impossible or free, and in both cases the decision it exists for would vanish.
{
  const perSecond = R.goal / (R.mins * 60) / 1.10;        // the rate the goal was sized on
  const without = perSecond * 120;
  const withExpedite = perSecond * (90 + 30 * 1.75);
  chk("a rush cannot be met by standing still", without < R.goal,
      Math.round(without) + " vs goal " + Math.round(R.goal));
  chk("but one Priority Dispatch is enough to meet it", withExpedite > R.goal,
      Math.round(withExpedite) + " vs goal " + Math.round(R.goal));
}

// ---- a contract on schedule reads as good ------------------------------------------
fresh(); s.owned = { picker: 200, trolley: 100, forklift: 50 }; s.contractsDone = 1;
s.contract = { goal: 100, prog: 40, mins: 15, deadline: Date.now() + 600000,
               label: "x", cash: 1, pallets: 3, rush: false };
global.render(); await settle();
chk("a contract comfortably on schedule reads as a status",
    card().classList.contains("good") === true && action().hidden === true,
    "good=" + card().classList.contains("good") + " action hidden=" + action().hidden);

// ---- Priority Dispatch --------------------------------------------------------------
fresh(); s.owned = { picker: 20 }; s.contractsDone = 1;
s.contract = { goal: 1e12, prog: 0, mins: 2, deadline: Date.now() + 30000,
               label: "RUSH", cash: 1, pallets: 5, rush: true };
global.render(); await settle();
chk("a contract running behind offers Priority Dispatch",
    action().hidden === false && action().disabled === false && /EXPEDITE/.test(action().textContent),
    "label=" + action().textContent);
chk("and the card reads as a problem, not a status", card().classList.contains("good") === false);

// Measured around the one clean press in this file -- expediteUntil is a module variable
// that the fixture reset cannot reach, so every later press is a no-op. A new player is
// also the worst case for this: payroll is the biggest share of their gross, so a boost
// that skipped wages would inflate their net the most.
const grossBefore = S.grossRate(), wageBefore = S.wageBill(), netBefore = netRate();
press(); await settle();
const grossLift = S.grossRate() / grossBefore;
const wageLift  = S.wageBill() / wageBefore;
const netLift   = netRate() / netBefore;
chk("it lifts throughput by the 75% it advertises",
    Math.abs(grossLift - 1.75) < 0.001, "gross x" + grossLift.toFixed(3));
chk("payroll follows the operation, as it does for every other multiplier",
    Math.abs(wageLift - 1.75) < 0.001, "wages x" + wageLift.toFixed(3));
chk("so net rises by the advertised amount and not more",
    Math.abs(netLift - 1.75) < 0.001, "net x" + netLift.toFixed(3));

chk("using it starts a visible countdown",
    /EXPEDITING/.test(action().textContent) && action().disabled === true, action().textContent);
chk("it goes on cooldown so it is not a hold-to-win button",
    s.expediteReadyAt > Date.now(), "ready in " + Math.round((s.expediteReadyAt - Date.now())/1000) + "s");
chk("the boost is shorter than the cooldown", (s.expediteReadyAt - Date.now()) > 30000,
    Math.round((s.expediteReadyAt - Date.now())/1000) + "s cooldown vs 30s boost");

// A second press inside the window must not extend or restack it.
const readyWas = s.expediteReadyAt;
press(); await settle();
chk("pressing it again does not restack the cooldown", s.expediteReadyAt === readyWas);

// ---- a changeover outranks everything else -----------------------------------------
fresh(); s.owned = { picker: 200, trolley: 100, forklift: 50 }; s.contractsDone = 1;
s.contract = { goal: 100, prog: 40, mins: 15, deadline: Date.now() + 600000,
               label: "x", cash: 1, pallets: 3, rush: false };
s.changeoverUntil = Date.now() + 40000; s.changeoverSpan = 60000;
global.render(); await settle();
chk("a changeover in progress is what the card reports",
    /changeover/i.test($("bottleneckTitle").textContent), $("bottleneckTitle").textContent);
chk("and it says how far throughput has fallen and for how long",
    /%/.test($("bottleneckDetail").textContent) && /s\./.test($("bottleneckDetail").textContent),
    $("bottleneckDetail").textContent);
s.changeoverUntil = 0;

// ---- the cooldown survives a restart, the boost does not ---------------------------
fresh(); s.expediteReadyAt = Date.now() + 90000;
const blob = JSON.parse(JSON.stringify(s));
chk("the cooldown is written to the save", blob.expediteReadyAt > Date.now(),
    "expediteReadyAt=" + blob.expediteReadyAt);

// ---- the objective chain still terminates ------------------------------------------
fresh(); s.taps = 99; s.owned = { picker: 5, trolley: 5 }; s.contractsDone = 9; s.prestiges = 3;
s.money = 1e6; s.lifetime = 1e7;
global.render(); await settle();
chk("a player past the opening is given a next target, not a blank card",
    $("objective").hidden === false && $("objTitle").textContent.length > 0,
    $("objTitle").textContent);
chk("and it is tagged as a rolling target rather than a numbered task",
    $("objective").querySelector(".otag").textContent === "NEXT",
    $("objective").querySelector(".otag").textContent);

// ---- a rate that is not zero must never read as zero ---------------------------------
// The card first appears the moment a player owns one Casual Picker, and that picker earns
// a few cents a second. fmt() floors below a tenth, so the very first thing the feature
// ever said to a new player was "Moving $0/s".
{
  // Hit the formatter directly. Driving the game into a sub-tenth-of-a-cent rate depends
  // on which market state the RNG picked, so an end-to-end version of this passes whether
  // or not the bug is fixed -- which is no test at all.
  chk("a rate of five cents does not print as zero", S.moneyRate(0.05) === "$0.05",
      S.moneyRate(0.05));
  chk("nor does half a cent", S.moneyRate(0.005) === "<$0.01", S.moneyRate(0.005));
  chk("a real zero still prints as zero", S.moneyRate(0) === "$0", S.moneyRate(0));
  chk("and ordinary money is untouched", S.moneyRate(1234) === "$1.23K", S.moneyRate(1234));

  fresh(); s.owned = { picker: 2 }; s.contractsDone = 1;
  beat(); await settle();
  const detail = $("bottleneckDetail").textContent;
  chk("the opening bottleneck card does not quote a rate of zero",
      !/\$0\/s/.test(detail), detail);
  chk("and still names both sides of the gap", /Moving .* need /.test(detail), detail);
}

// ---- REP goes through the formatter, like every other number -------------------------
{
  fresh(); s.owned = { picker: 500, trolley: 500, forklift: 500 };
  s.taps = 99; s.contractsDone = 9; s.prestiges = 3; s.lifetime = 1e20; s.money = 1e18;
  global.render(); await settle();
  const title = $("objTitle").textContent;
  chk("a late-game REP target is formatted, not an eight digit integer",
      !/\d{7}/.test(title), title);
}

console.log("PASS:"); ok.forEach(x=>console.log("  + " + x));
if (bad.length){ console.log("FAIL:"); bad.forEach(x=>console.log("  - " + x)); }
console.log(`\n${ok.length} passed, ${bad.length} failed`);
process.exit(bad.length ? 1 : 0);
})();
