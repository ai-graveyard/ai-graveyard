import test from 'node:test';
import assert from 'node:assert/strict';
import '../model.js';
import '../four-stage.js';
const R=globalThis.River3D,lanes=[-3.7,0,3.7];
const seeds=[1,2,3,137,31029,31166,31303,99991,123456789,4294967295,...Array.from({length:22},(_,i)=>(i*2654435761)>>>0)];
function points(e,n){return e.kind==='gold'?Array.from({length:5},(_,i)=>e.x+(i-4)*R.campaign.speeds[n]*.2):[e.x];}

test('each whole-stage plan separates every gold trail, buddy and flag by at least 15 metres',()=>{
 for(const seed of seeds)for(let n=0;n<4;n++){
  const route=R.campaign.timeline(n,seed),pickups=route.filter(e=>['gold','buddy','flag'].includes(e.kind));
  for(let i=0;i<pickups.length;i++)for(let j=i+1;j<pickups.length;j++)for(const a of points(pickups[i],n))for(const b of points(pickups[j],n))
   assert(Math.abs(a-b)>=15-1e-8,JSON.stringify({seed,n,a:pickups[i],b:pickups[j]}));
  assert.equal(pickups.filter(e=>e.kind==='gold').length,[4,6,8,10][n]);
 }
});
test('every single coin and companion clears the full moving-log envelope and flight/landing zones',()=>{
 for(const seed of seeds)for(let n=0;n<4;n++){
  const route=R.campaign.timeline(n,seed),cap=R.campaign.caps[n];
  for(const e of route.filter(e=>['gold','buddy','flag'].includes(e.kind)))for(const x of points(e,n))for(const r of route){
   const dx=x-r.x;
   if(r.kind==='row'&&Math.abs(dx)<Math.max(6,cap*.5))for(const z of lanes){
    if(z===r.safe||n===0&&z!==lanes.filter(v=>v!==r.safe)[r.row%2])continue;
    const envelope=r.row%2?2.8+(n>=2&&r.row%4===1?.72:0):2.35;
    assert(Math.abs(e.z-z)>=envelope+.15-1e-8,JSON.stringify({seed,n,e,r,x}));
   }
   if(r.kind==='ramp')assert(dx<=-12||dx>=cap*2.6,JSON.stringify({seed,n,e,r}));
   if(r.kind==='throw')assert(Math.abs(dx)>=cap*.8,JSON.stringify({seed,n,e,r}));
  }
 }
});
test('fastest-speed encounter budgets fall progressively while the finale retains adjacent escape columns',()=>{
 const intervals=[];
 for(let n=0;n<4;n++){
  const rows=R.campaign.timeline(n,31029).filter(e=>e.kind==='row');
  assert.equal(rows.length,[4,10,20,50][n]);
  intervals.push(Math.min(...rows.slice(1).map((r,i)=>(r.x-rows[i].x-4.8)/R.campaign.caps[n])));
  for(let i=1;i<rows.length;i++)assert(Math.abs(rows[i].safe-rows[i-1].safe)<=3.7+1e-8);
 }
 assert(intervals[0]>2&&intervals[1]>1.3&&intervals[2]>1&&intervals[3]>.6);
 for(let n=1;n<4;n++)assert(intervals[n]<intervals[n-1]);
});
test('first stage teaches basic steering before waves, banks, wind, projectiles and extra buddy mechanics',()=>{
 const route=R.campaign.timeline(0,31029);
 assert.deepEqual(route.filter(e=>e.kind==='buddy').map(e=>e.role),['otter']);
 assert(!route.some(e=>['ramp','throw','bank'].includes(e.kind)));
 assert(route.find(e=>e.kind==='gold').at<route.find(e=>e.kind==='row').at-3);
 for(let n=0;n<3;n++){
  const g=new R.Game(31029);g.start();g.stageIndex=n;g.routeEvents=[];g.entities=[];g.time=10.01;g.stageStartedAt=0;g.applyWind(.01);
  assert.equal(!!g.currentForce,n===2);
 }
 const route3=R.campaign.timeline(2,31029);
 assert(route3.filter(e=>e.kind==='throw').every(e=>e.at>R.campaign.durations[2]*.38+3));
});
test('acceleration and capsize cannot move an already authored entity or change a future reward slot',()=>{
 for(let n=0;n<4;n++){
  const g=new R.Game(31166);g.start();Object.assign(g,{stageIndex:n,stageStartedAt:0,stageStartDistance:0,distance:0,time:0,gap:1e6,safe:1e6,entities:[],flags:[],bankSites:[],routeEvents:R.campaign.timeline(n,31166),routeSpawned:[],routeRampEnds:[],routeAudit:[]});
  g.predatorSpeed=()=>0;const fixed=new Map();const add=g.add;
  g.add=function(...args){const e=add.apply(this,args);fixed.set(e,e.x);return e;};
  const plan=JSON.stringify(g.routeEvents);
  while(g.mode==='play'&&g.stageIndex===n){
   g.goldBoost=Math.floor(g.time)%6<2?2:0;
   if(g.time>8&&g.time<9)g.shieldSlow=.1;
   g.step(1/60);g.drain();
   for(const e of g.entities)if(fixed.has(e))assert.equal(e.x,fixed.get(e));
   if(g.stageIndex===n)assert.equal(JSON.stringify(g.routeEvents),plan);
  }
 }
});
