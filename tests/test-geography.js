// The Network's geography. These are real Melbourne freight suburbs, so the map can be the
// city it is named after rather than an abstract graph -- but only if every name the game
// can hand out has a position, and only if the projection is the right way round.
//
// The projection is the assertion that matters. A degree of longitude is the SHORT one away
// from the equator, so longitude is the axis that gets compressed. Having it backwards is
// invisible in the numbers and renders Port Phillip -- roughly square on the ground -- at
// two to one. It took looking at a picture to catch it the first time; this catches it
// without one.
require("./harness.js");
require("./game-sim.js");
const S = global.__sim;
const ok=[], bad=[];
const chk=(n,c,d)=>(c?ok:bad).push(n+(d?"  ["+d+"]":""));

// ---- every name the game can hand out has a place ------------------------------------
const missing = S.NET_SUBURBS.filter(n => !S.SUBURB_XY[n]);
chk("every suburb the Network can name has coordinates", missing.length === 0,
    missing.length ? missing.join(", ") : S.NET_SUBURBS.length + " placed");
const orphans = Object.keys(S.SUBURB_XY).filter(n => S.NET_SUBURBS.indexOf(n) < 0);
chk("and nothing is placed that the game never names", orphans.length === 0,
    orphans.join(", ") || "none");

// ---- and that place is in Melbourne ----------------------------------------------------
const outside = Object.keys(S.SUBURB_XY).filter(function(n){
  const p = S.SUBURB_XY[n];
  return !(p[0] > 144.3 && p[0] < 145.6 && p[1] < -37.5 && p[1] > -38.5);
});
chk("every one of them is inside greater Melbourne", outside.length === 0,
    outside.join(", ") || "all 40 in bounds");

// ---- the bay --------------------------------------------------------------------------
chk("the bay is a ring with enough points to read as Port Phillip", S.BAY_RING.length >= 24,
    S.BAY_RING.length + " points");
{ // Corio Bay is the western lobe. Without it the shape reads as a lake, which is what the
  // first attempt did, so its absence is worth failing over rather than eyeballing.
  const westmost = Math.min.apply(null, S.BAY_RING.map(p => p[0]));
  chk("and it reaches Geelong, so Corio is in it", westmost < 144.45, "west edge " + westmost);
  const southmost = Math.min.apply(null, S.BAY_RING.map(p => p[1]));
  chk("and down to the Heads", southmost < -38.30, "south edge " + southmost);
}

// ---- the projection ---------------------------------------------------------------------
{ // Port Phillip is about 60km by 60km. Project its own extent and the aspect has to come
  // back near 1. Backwards, this lands near 0.5 or 2.
  const lons = S.BAY_RING.map(p => p[0]), lats = S.BAY_RING.map(p => p[1]);
  const w = S.geoX(Math.max.apply(null,lons)) - S.geoX(Math.min.apply(null,lons));
  const h = S.geoY(Math.min.apply(null,lats)) - S.geoY(Math.max.apply(null,lats));
  const aspect = w / h;
  chk("the bay projects roughly square, as it is on the ground",
      aspect > 0.8 && aspect < 1.25, "aspect " + aspect.toFixed(2) + " (backwards lands near 0.5 or 2)");
}
{ // The same thing said directly: a degree of longitude must come out SHORTER than a degree
  // of latitude at this latitude.
  const dLon = S.geoX(145) - S.geoX(144), dLat = S.geoY(-38) - S.geoY(-37);
  chk("a degree of longitude is the shorter one", Math.abs(dLon) < Math.abs(dLat),
      "lon " + Math.abs(dLon).toFixed(3) + " vs lat " + Math.abs(dLat).toFixed(3));
}
{ // North is up and east is right, or every position is a mirror of itself.
  chk("north is up", S.geoY(-37.60) < S.geoY(-38.10), "Craigieburn above Cranbourne");
  chk("east is right", S.geoX(144.66) < S.geoX(145.485), "Werribee left of Pakenham");
}

// ---- a spot check a Victorian would make -------------------------------------------------
// Not exhaustive: the three relationships that would look obviously wrong on screen.
const at = n => ({ x: S.geoX(S.SUBURB_XY[n][0]), y: S.geoY(S.SUBURB_XY[n][1]) });
chk("Dandenong sits east of Keysborough", at("Dandenong").x > at("Keysborough").x);
chk("Somerton sits north of Broadmeadows", at("Somerton").y < at("Broadmeadows").y);
chk("Truganina sits west of Port Melbourne", at("Truganina").x < at("Port Melbourne").x);
chk("Pakenham is the eastern edge of the belt",
    Object.keys(S.SUBURB_XY).every(n => n === "Pakenham" || at(n).x <= at("Pakenham").x));

console.log("PASS:"); ok.forEach(x=>console.log("  + " + x));
if (bad.length){ console.log("FAIL:"); bad.forEach(x=>console.log("  - " + x)); }
console.log(`\n${ok.length} passed, ${bad.length} failed`);
process.exit(bad.length ? 1 : 0);
