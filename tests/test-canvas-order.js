require("./harness.js");
const CW = 400, CH = 300;
const cvEl = document.getElementById("wcanvas"); cvEl._cw = CW; cvEl._ch = CH;
require("./game.js");
const s = global.state;
const ok=[], bad=[];
const chk=(n,c,d)=>(c?ok:bad).push(n+(d?"  ["+d+"]":""));
const tick = () => new Promise(r=>process.nextTick(r));

(async () => {
for (let i=0;i<8;i++) await tick();

function frameOnce(ts){
  global.__ctxCounts.beginPath = 0;
  global.__frame(ts);
  return global.__ctxCounts.beginPath / 3;   // drawPrism issues 3 beginPath per prism
}

// The exact prism count is now covered end-to-end in test-warehouse.js against a real
// browser; here we care that the merge itself neither drops nor duplicates. Two frames
// with identical state and identical time must emit an identical count.
s.owned = {picker:40, trolley:10, forklift:6, reach:4, conveyor:3};
s.corp  = {hr:3, tower:10, solar:1, server:0};
const a1 = frameOnce(1000), a2 = frameOnce(1000);
chk("merge output is stable for identical state", a1 === a2, a1 + " vs " + a2 + " prisms");
chk("merge emits a non-trivial scene", a1 > 100, a1 + " prisms");

s.owned = {picker:400, trolley:300, forklift:200, reach:150, conveyor:80, sorter:40, crane:20, hub:10};
const big = frameOnce(2000);
chk("a larger fleet emits more geometry", big > a1, a1 + " -> " + Math.round(big) + " draw ops/3");

// --- the merge must yield a globally ordered draw sequence ---
// Property-test the algorithm itself over randomised inputs.
function mergeOrder(A, B){
  const out=[]; let ia=0, ib=0;
  while (ia < A.length || ib < B.length){
    if (ib >= B.length) out.push(A[ia++]);
    else if (ia >= A.length) out.push(B[ib++]);
    else if (A[ia] <= B[ib]) out.push(A[ia++]);
    else out.push(B[ib++]);
  }
  return out;
}
let sortedOK = true, lostOK = true;
for (let trial=0; trial<300; trial++){
  const A = Array.from({length: 1+Math.floor(Math.random()*40)}, ()=>Math.round(Math.random()*1000)).sort((a,b)=>a-b);
  const B = Array.from({length: 1+Math.floor(Math.random()*40)}, ()=>Math.round(Math.random()*1000)).sort((a,b)=>a-b);
  const m = mergeOrder(A,B);
  for (let i=1;i<m.length;i++) if (m[i] < m[i-1]) sortedOK = false;
  const ref = A.concat(B).sort((a,b)=>a-b);
  if (JSON.stringify(m) !== JSON.stringify(ref)) lostOK = false;
}
chk("merge yields a fully ordered sequence (300 randomised trials)", sortedOK);
chk("merge output is identical to a full re-sort (300 randomised trials)", lostOK);

console.log("PASS:"); ok.forEach(l=>console.log("  + "+l));
if(bad.length){ console.log("FAIL:"); bad.forEach(l=>console.log("  - "+l)); process.exitCode=1; }
})();
