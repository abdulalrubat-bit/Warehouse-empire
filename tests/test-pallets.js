// The pallet economy only contains a decision if the things you can spend pallets on are
// worth comparing. They were not.
//
// Instant Dispatch paid totalRate() x 3600 for a flat 5 pallets. A perk pays a percentage
// of the same rate, so the two scale together and the comparison between them is the same
// number at every point in the game. That number was: 200 pallets buys forty hours of
// production now, or Kaizen's +15% forever, which needs 267 hours of further play at that
// rate to catch up. Nobody plays 267 hours between prestiges, so no perk was ever the
// right buy and the entire tier-two tree was decoration.
//
// The last assertion in this file is the one that matters. It is not about the code, it is
// about the balance: it recomputes that break-even from the shipping tables, so a later
// retune of either side cannot quietly kill the perk tree again.
require("./harness.js");
require("./game-sim.js");
const S = global.__sim;
const s = global.state;
const ok=[], bad=[];
const chk=(n,c,d)=>(c?ok:bad).push(n+(d?"  ["+d+"]":""));

const DISPATCH = S.SUPPLIES.filter(x => x.id === "dispatch")[0];
const KAIZEN   = S.PERKS.filter(p => p.id === "kaizen")[0];

function fresh(){
  s.owned = { picker:200, trolley:120, forklift:60, reach:20, conveyor:7 };
  s.money = 0; s.total = 0; s.lifetime = 5e9; s.pallets = 10000;
  s.prestiges = 0; s.upgrades = {}; s.perks = {}; s.tree = {}; s.network = [];
  s.corp = { hr:0, customs:0, marketing:0, tower:0, training:0, solar:0, depot:0, server:0 };
  s.dispatchesToday = 0; s.dispatchDay = -1;
  S.invalidateUpMult();
}
fresh();

// ---- what it costs ---------------------------------------------------------------------
chk("the first dispatch of the day is the base price", S.supplyCost(DISPATCH) === 10,
    S.supplyCost(DISPATCH) + " PAL");

const prices = [];
const buy = () => {
  const c = S.supplyCost(DISPATCH);
  prices.push(c);
  s.pallets -= c;
  s.dispatchDay = Math.floor(Date.now() / (20 * 3600000));
  s.dispatchesToday = (s.dispatchesToday || 0) + 1;
  return c;
};
for (let i = 0; i < 4; i++) buy();
chk("each one doubles for the rest of the day", prices.join(",") === "10,20,40,80", prices.join(","));

// A flat price was the whole problem, so a price that stops climbing would reintroduce it.
for (let i = 0; i < 6; i++) buy();
chk("and it keeps climbing rather than flattening out",
    prices[9] === 10 * Math.pow(2, 9), prices[9] + " on the tenth");

// ---- and it resets ----------------------------------------------------------------------
s.dispatchDay = -1;
chk("a new day starts back at the base price", S.supplyCost(DISPATCH) === 10,
    S.supplyCost(DISPATCH) + " PAL");
chk("prestiging no longer changes the price", (function(){
  s.prestiges = 40; const a = S.supplyCost(DISPATCH); s.prestiges = 0;
  return a === 10; })(), "the old design scaled it to 25 across ten sales");

// ---- what it pays -------------------------------------------------------------------------
chk("it banks half an hour, not an hour", S.DISPATCH_MINUTES === 30, S.DISPATCH_MINUTES + " minutes");

// ---- the balance itself ---------------------------------------------------------------------
// How many hours of production does a perk's price buy if spent on dispatches instead, and
// how long must the player then keep playing at that rate for the perk to have been the
// better buy? Both sides are proportional to totalRate(), so this is one number for the
// whole game rather than a figure that needs a progression point to evaluate.
function hoursBoughtWith(pallets){
  let spent = 0, uses = 0, hours = 0;
  for (;;){
    const price = 10 * Math.pow(2, uses);
    if (spent + price > pallets) break;
    spent += price; uses++; hours += S.DISPATCH_MINUTES / 60;
  }
  return hours;
}
const kaizenPct   = 0.15;                       // "All output +15%, forever"
const hours       = hoursBoughtWith(KAIZEN.cost);
const breakEven   = hours / kaizenPct;
chk("Kaizen's price buys a sane amount of instant production instead",
    hours >= 1 && hours <= 4, KAIZEN.cost + " PAL = " + hours.toFixed(1) + "h of dispatches");
// 40 hours is generous -- a committed player puts that in across a few days -- but it is
// two orders off the 267 hours the old numbers demanded, which is the point.
chk("so a permanent perk is a real alternative rather than a trap",
    breakEven <= 40, "Kaizen pays for itself after " + breakEven.toFixed(0) +
    "h of play; the old design needed 267h");

// The cheap opening perks have to stay the obvious early buy, or this has just moved the
// problem to the other end of the game.
const gloves = S.PERKS.filter(p => p.id === "gloves")[0];
chk("and the first perk is still cheaper than a single dispatch",
    gloves.cost < 10, "Padded Gloves " + gloves.cost + " PAL vs " + 10 + " PAL");

console.log("PASS:"); ok.forEach(x=>console.log("  + " + x));
if (bad.length){ console.log("FAIL:"); bad.forEach(x=>console.log("  - " + x)); }
console.log(`\n${ok.length} passed, ${bad.length} failed`);
process.exit(bad.length ? 1 : 0);
