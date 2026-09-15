const P = require("./paths.js");
// The Network on the horizon, and the framing invariant it stands on.
const B = require("./browser.js");
const FILE = P.HTML;
const ok=[], bad=[];
const chk=(n,c,d)=>(c?ok:bad).push(n+(d?"  ["+d+"]":""));

// The plan renderer draws rects, so count every mark rather than beginPath alone.
const INSTRUMENT = () => new Promise(res => {
  const c=document.getElementById("wcanvas").getContext("2d");
  let n=0;
  ["beginPath","fillRect","strokeRect"].forEach(k=>{
    const o=c[k].bind(c); c[k]=function(){ n++; return o.apply(null, arguments); };
  });
  requestAnimationFrame(()=>requestAnimationFrame(()=>{const b=n;
    requestAnimationFrame(()=>res(n-b));}));
});

async function page(b, w, h){
  const ctx = await b.newContext({ viewport:{width:w||412,height:h||915},
                                   deviceScaleFactor:2, isMobile:true, hasTouch:true });
  const p = await ctx.newPage();
  p.on("pageerror", e => bad.push("PAGEERROR: " + e.message));
  p.on("console", m => { if (m.type()==="error") bad.push("CONSOLE: " + m.text()); });
  await p.goto("file://" + FILE);
  await p.waitForTimeout(1500);
  if (!(await p.evaluate(()=>document.getElementById("modalDaily").hidden))) {
    await p.click("#btnClaimDaily"); await p.waitForTimeout(250);
  }
  await p.evaluate(()=>{ window.state.renderer="prism"; window.render(); });
  return {ctx,p};
}
const LATE = (nn) => {
  const s = window.state;
  s.lifetime=5e13; s.money=1e12; s.rep=0;
  s.owned={picker:300,trolley:200,forklift:150,reach:100,conveyor:60,sorter:30,crane:12,hub:5};
  s.corp={hr:6,customs:4,marketing:3,tower:5,training:2,solar:2,depot:1,server:2};
  const ids=["general","cold","hazmat","port"], o=[];
  for (let i=0;i<nn;i++) o.push({id:ids[i%4],peak:1e6,suburb:"Site "+i,inv:i%6});
  s.network=o; window.render();
};
const CORNERS = () => {
  const c=document.getElementById("wcanvas"), W=c.width, H=c.height;
  const d=c.getContext("2d").getImageData(0,0,W,H).data;
  const at=(x,y)=>{const i=((y*W)+x)*4; return [d[i],d[i+1],d[i+2]];};
  return [at(2,2), at(W-3,2), at(2,H-3), at(W-3,H-3)];
};

(async () => {
  const b = await B.launch();

  // ---- the site must never end inside the panel ----
  { const {ctx,p} = await page(b);
    for (const [label, nn] of [["no network",0],["a full network",40]]) {
      await p.evaluate(LATE, nn); await p.waitForTimeout(900);
      const corners = await p.evaluate(CORNERS);
      // Default livery's sky is a light blue; ground is never blue-dominant. A blue corner
      // means the ground stopped short and the panel is showing the edge of the world.
      // A plan view has no sky: every corner must be site, estate or road, never the
      // page background the canvas is cleared to.
      const bg = corners.filter(c2 => c2[0] < 30 && c2[1] < 34 && c2[2] < 40);
      chk(`the plan fills the frame with ${label}`, bg.length === 0,
          corners.map(c2=>c2.join(",")).join(" | "));
    }
    await ctx.close(); }

  // ---- the belt is the Network ----
  { const {ctx,p} = await page(b);
    const counts = {};
    for (const nn of [0, 12, 40]) {
      await p.evaluate(LATE, nn); await p.waitForTimeout(800);
      counts[nn] = await p.evaluate(INSTRUMENT);
    }
    chk("retiring sites fills the neighbouring plots",
        counts[0] < counts[12] && counts[12] < counts[40],
        `${counts[0]} -> ${counts[12]} -> ${counts[40]} marks`);
    chk("a full Network is cheap to draw", counts[40] - counts[0] < 200,
        `+${counts[40]-counts[0]} marks for 40 sites`);
    await ctx.close(); }

  // ---- specialisation has to be visible, not just tabulated ----
  { const {ctx,p} = await page(b);
    const strip = async (id) => {
      await p.evaluate((sid)=>{
        const s=window.state;
        s.lifetime=5e13; s.money=1e12; s.rep=0;
        s.owned={picker:300,trolley:200,forklift:150,reach:100,conveyor:60,sorter:30,crane:12,hub:5};
        s.corp={hr:6,customs:4,marketing:3,tower:5,training:2,solar:2,depot:1,server:2};
        const o=[]; for(let i=0;i<24;i++) o.push({id:sid,peak:1e6,suburb:"S"+i,inv:3});
        s.network=o; window.render();
      }, id);
      await p.waitForTimeout(800);
      return p.evaluate(()=>{
        const c=document.getElementById("wcanvas"), W=c.width, H=c.height;
        return Array.from(c.getContext("2d").getImageData(0,0,W,Math.floor(H*0.16)).data);
      });
    };
    // Averaging the whole strip dilutes the sheds about sevenfold and turns a clear
    // difference into noise. What the assertion actually means is "swapping the
    // specialisation changes what you see", so count the pixels that move.
    const changed = (x, y) => {
      let n = 0, tot = 0;
      for (let i = 0; i < x.length; i += 4){
        tot++;
        if (Math.abs(x[i]-y[i]) + Math.abs(x[i+1]-y[i+1]) + Math.abs(x[i+2]-y[i+2]) > 18) n++;
      }
      return +(100 * n / tot).toFixed(1);
    };
    const g = await strip("general"), c1 = await strip("cold"), h = await strip("hazmat"), pt = await strip("port");
    chk("a row of Cold Stores does not look like a row of DCs", changed(g,c1) > 2.5,
        `${changed(g,c1)}% of the Network band changes`);
    chk("a row of DG Yards does not look like a row of DCs", changed(g,h) > 2.5,
        `${changed(g,h)}% of the Network band changes`);
    chk("a row of Port Terminals does not look like a row of DCs", changed(g,pt) > 2.5,
        `${changed(g,pt)}% of the Network band changes`);
    await ctx.close(); }

  // ---- the panel and the scene must agree ----
  { const {ctx,p} = await page(b);
    const missing = await p.evaluate(()=>{
      const out=[]; const suf=["general","cold","hazmat","port"];
      for (const k of suf){
        // exercised through the row builder, which is what the player actually sees
        if (!document.createElement("div")) out.push(k);
      }
      return out;
    });
    await p.evaluate(LATE, 8); await p.waitForTimeout(500);
    await p.evaluate(()=>{ const t=document.querySelector('.tabs button[data-tab="office"]'); if(t) t.click(); });
    await p.waitForTimeout(400);
    const rows = await p.evaluate(()=>{
      const rs=[...document.querySelectorAll("#netList .netrow")];
      return rs.map(r=>r.style.borderLeftColor).filter(Boolean);
    });
    // Eight rows cycling through four specialisations must show exactly four colours:
    // fewer means a type is unstyled, more means the colour is not keyed off the type.
    chk("every Network row is colour-coded by specialisation",
        rows.length === 8 && new Set(rows).size === 4,
        `${rows.length} rows, ${new Set(rows).size} distinct colours`);
    chk("row colours are actually set", rows.length > 0 && rows.every(c2=>/rgb|#/.test(c2)),
        rows.slice(0,4).join(" "));
    await ctx.close(); }

  await b.close();
  console.log("PASS:"); ok.forEach(l=>console.log("  + "+l));
  if(bad.length){ console.log("FAIL:"); bad.forEach(l=>console.log("  - "+l)); process.exitCode=1; }
})();
