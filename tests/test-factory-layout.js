const fs = require('fs');
const vm = require('vm');
const assert = require('assert');
const P = require('./paths.js');
const source = fs.readFileSync(P.HTML, 'utf8');
const sandbox = { Math, animT:0 };
vm.createContext(sandbox);
for (const name of ['factoryRoute','ownedPlantCount','workCycle','ease']) {
  const start=source.indexOf('  function '+name+'(');
  assert(start>=0, name+' exists');
  const lineEnd=source.indexOf('\n',start);
  const end=source.slice(start,lineEnd).trimEnd().endsWith('}') ? lineEnd : source.indexOf('\n  }',start)+4;
  vm.runInContext(source.slice(start,end),sandbox);
}
let assertions=0;
function check(ok,message){assert(ok,message);assertions++;}
for (const points of [ [[536,270],[536,340],[477,340]], [[923,497],[864,497],[864,785]], [[923,654],[794,654],[794,765],[735,765]] ]) {
  for(let step=0;step<=100;step++){
    const p=sandbox.factoryRoute(points,step/100);
    check(Number.isFinite(p.angle),'finite heading');
    check(points.slice(1).some((b,i)=>{const a=points[i];return p.x>=Math.min(a[0],b[0])-.001&&p.x<=Math.max(a[0],b[0])+.001&&p.y>=Math.min(a[1],b[1])-.001&&p.y<=Math.max(a[1],b[1])+.001;}),'stays on an orthogonal segment');
    check(!(p.x>=322&&p.x<=447&&p.y>=286&&p.y<=712),'no left rack collision');
    check(!(p.x>=953&&p.x<=1078&&p.y>=286&&p.y<=712),'no right rack collision');
    check(!(p.x>=672&&p.x<=728&&p.y>=300&&p.y<=730),'no belt collision');
  }
}
check(sandbox.ownedPlantCount(0,12,14)===0,'no unowned equipment');
check(sandbox.ownedPlantCount(1,12,14)===1,'first purchase visible');
check(sandbox.ownedPlantCount(1000,12,5)===5,'quality cap');
sandbox.animT=0;check(sandbox.workCycle(0,.055).moving===false,'pickup dwell');
sandbox.animT=.5/.055;check(sandbox.workCycle(0,.055).moving===false,'drop dwell');
console.log('PASS: '+assertions+' factory route and ownership assertions');
