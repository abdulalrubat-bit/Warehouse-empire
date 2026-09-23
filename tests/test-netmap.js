const P = require("./paths.js");
// The Network map in the Office. It exists to show the Network as the city it is named
// after, so what has to hold is: it appears only once there is a Network, it keeps the
// bay's own shape rather than the card's, a held site is visibly marked in its
// specialisation's colour, and tapping a marker takes you to the row you can invest from.
const B = require("./browser.js");
const FILE = P.HTML;
const ok=[], bad=[];
const chk=(n,c,d)=>(c?ok:bad).push(n+(d?"  ["+d+"]":""));

const SEED = (list) => {
  const s = window.state;
  s.lifetime=5e13; s.money=1e12; s.rep=0; s.contractsDone=Math.max(s.contractsDone||0, 1);
  s.network = list; window.render();
};

(async () => {
  const b = await B.launch();
  const ctx = await b.newContext({ viewport:{width:412,height:915}, deviceScaleFactor:2,
                                   isMobile:true, hasTouch:true });
  const p = await ctx.newPage();
  p.on("pageerror", e => bad.push("PAGEERROR: " + e.message));
  p.on("console", m => { if (m.type()==="error") bad.push("CONSOLE: " + m.text()); });
  await p.goto("file://" + FILE);
  await p.waitForTimeout(1500);
  if (!(await p.evaluate(()=>document.getElementById("modalDaily").hidden))) {
    await p.click("#btnClaimDaily"); await p.waitForTimeout(250);
  }
  await p.evaluate(()=>{ const t=document.querySelector('.tabs button[data-tab="office"]'); if(t) t.click(); });
  await p.waitForTimeout(300);

  // ---- nothing to map, no map ----
  await p.evaluate(SEED, []); await p.waitForTimeout(200);
  chk("no Network, no map", await p.evaluate(()=>document.getElementById("netMapWrap").hidden));

  // ---- three sites, one of each colour we can find by pixel ----
  const sites = [
    { id:"general", peak:1e6, suburb:"Truganina",  inv:0 },
    { id:"cold",    peak:1e6, suburb:"Dandenong",  inv:3 },
    { id:"port",    peak:1e6, suburb:"Craigieburn", inv:1 }
  ];
  await p.evaluate(SEED, sites); await p.waitForTimeout(300);
  const info = await p.evaluate(()=>{
    const w = document.getElementById("netMapWrap"), c = document.getElementById("netMap");
    const r = c.getBoundingClientRect();
    return { hidden: w.hidden, cw: r.width, ch: r.height, pw: c.width, ph: c.height };
  });
  chk("a Network shows the map", !info.hidden);
  chk("the map is drawn at device resolution", info.pw === Math.round(info.cw * 2),
      `${info.pw}px backing for ${info.cw}px`);
  // A card in the Office, not the whole Office. And the cap has to shrink the map rather
  // than squash it: the bay's east-west to north-south ratio on the card must match the
  // projection's, or Melbourne has been stretched to fit a box.
  chk("the map does not swamp the Office on a phone", info.ch <= 240, `${info.ch}px tall`);
  const ratio = await p.evaluate(()=>{
    const L = window.__netMap.layout(document.getElementById("netMap").getBoundingClientRect().width);
    const a = window.__netMap.xy["Werribee"], b2 = window.__netMap.xy["Pakenham"];
    const c = window.__netMap.xy["Craigieburn"], d = window.__netMap.xy["Seaford"];
    const onCard = (L.px(b2[0]) - L.px(a[0])) / (L.py(d[1]) - L.py(c[1]));
    const onGround = ((b2[0] - a[0]) * Math.cos(38 * Math.PI / 180)) / (c[1] - d[1]);
    return onCard / onGround;
  });
  chk("the map keeps Melbourne's shape, not the card's", Math.abs(ratio - 1) < 0.03,
      `card/ground ${ratio.toFixed(3)}`);

  // Sample the marker centre for each held site and check it carries the right ink.
  const px = await p.evaluate(()=>{
    const c = document.getElementById("netMap"), g = c.getContext("2d");
    const L = window.__netMap.layout(c.getBoundingClientRect().width), out = {};
    for (const n of ["Truganina","Dandenong","Craigieburn","Werribee"]) {
      const xy = window.__netMap.xy[n];
      const x = Math.round(L.px(xy[0]) * 2), y = Math.round(L.py(xy[1]) * 2);
      out[n] = Array.from(g.getImageData(x, y, 1, 1).data.slice(0, 3));
    }
    return out;
  });
  const hex = h => [1,3,5].map(i => parseInt(h.substr(i,2),16));
  const near = (a, b2) => Math.abs(a[0]-b2[0]) + Math.abs(a[1]-b2[1]) + Math.abs(a[2]-b2[2]) < 30;
  chk("a Distribution Centre is marked in its colour", near(px.Truganina, hex("#9aa2aa")), px.Truganina.join(","));
  chk("a Cold Store is marked in its colour", near(px.Dandenong, hex("#8fb6d8")), px.Dandenong.join(","));
  chk("a Port Terminal is marked in its colour", near(px.Craigieburn, hex("#457e9f")), px.Craigieburn.join(","));
  chk("a suburb you do not hold is not marked as held",
      !near(px.Werribee, hex("#9aa2aa")) && !near(px.Werribee, hex("#8fb6d8")) && !near(px.Werribee, hex("#457e9f")),
      px.Werribee.join(","));

  // ---- tap a marker, land on its row ----
  const tapped = await p.evaluate(()=>{
    const c = document.getElementById("netMap"), r = c.getBoundingClientRect();
    const L = window.__netMap.layout(r.width), xy = window.__netMap.xy["Dandenong"];
    // A few pixels off-centre, as a finger would be.
    c.dispatchEvent(new MouseEvent("click", { bubbles:true,
      clientX: r.left + L.px(xy[0]) + 6, clientY: r.top + L.py(xy[1]) - 5 }));
    const row = document.querySelector('#netList .netrow.flash');
    return row ? row.querySelector(".nname b").textContent : null;
  });
  chk("tapping a marker highlights that site's row", tapped === "Dandenong", String(tapped));

  const missed = await p.evaluate(()=>{
    document.querySelectorAll("#netList .netrow.flash").forEach(r=>r.classList.remove("flash"));
    const c = document.getElementById("netMap"), r = c.getBoundingClientRect();
    const L = window.__netMap.layout(r.width), xy = window.__netMap.xy["Werribee"];
    c.dispatchEvent(new MouseEvent("click", { bubbles:true,
      clientX: r.left + L.px(xy[0]), clientY: r.top + L.py(xy[1]) }));
    return document.querySelectorAll("#netList .netrow.flash").length;
  });
  chk("tapping empty map highlights nothing", missed === 0, missed + " rows");

  // ---- the Office re-renders ten times a second; the map must not ----
  const redraws = await p.evaluate(()=>new Promise(res=>{
    const g = document.getElementById("netMap").getContext("2d");
    let n = 0; const o = g.arc.bind(g); g.arc = function(){ n++; return o.apply(null, arguments); };
    setTimeout(()=>{ g.arc = o; res(n); }, 1200);
  }));
  chk("an unchanged Network is not redrawn every tick", redraws === 0, redraws + " arcs in 1.2s");

  // ---- a full Network still draws, and old saves without a suburb do not break it ----
  const full = await p.evaluate(()=>{
    const names = window.__netMap.names;
    const list = names.map((n, i)=>({ id:["general","cold","hazmat","port"][i%4], peak:1e6+i, suburb:n, inv:i%6 }));
    list.push({ id:"general", peak:5e5, inv:0 });           // a save from before suburbs
    list.push({ id:"cold", peak:5e5, suburb:"Dandenong", inv:0 }); // a name reused past forty
    const s = window.state; s.network = list; window.render();
    return document.getElementById("netMapWrap").hidden;
  });
  await p.waitForTimeout(300);
  chk("a full Network with legacy entries still shows the map", full === false);

  await ctx.close();
  await b.close();
  console.log("PASS:"); ok.forEach(l=>console.log("  + "+l));
  if(bad.length){ console.log("FAIL:"); bad.forEach(l=>console.log("  - "+l)); process.exitCode=1; }
})();
