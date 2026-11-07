import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import '../model.js';
import '../four-stage.js';
const R=globalThis.River3D;
function model(){const g=new R.Game(31029);g.start();g.zone();g.stageIndex=2;g.stageStartDistance=720;g.distance=720;g.time=13.2;g.gap=100;g.routeEvents=[];g.entities=[];return g;}
function projectile(g){return {kind:'rock',projectile:true,x:g.distance+2,y:.8,z:0,prevZ:0,launchZ:-10.3,targetZ:0,throwAt:12,flightSeconds:1.05,done:false};}
function renderer(){const gl=new Proxy({getShaderParameter:()=>true,getProgramParameter:()=>true},{get:(o,k)=>k in o?o[k]:()=>({})});const win={River3D:R,devicePixelRatio:1};vm.runInNewContext(fs.readFileSync(new URL('../renderer.js',import.meta.url),'utf8'),{window:win});const r=new win.RiverRenderer({getContext:()=>gl,getBoundingClientRect:()=>({width:390,height:844})});r.offset=720;r.bend=0;r.prepareCurve(720);return r;}
test('shore stone impact uses existing capsizing, companion loss and turtle shield rules',()=>{
 for(const role of [null,'duck','turtle']){const g=model();if(role)g.boardBuddy(role);g.entities=[projectile(g)];g.step(.01);const events=g.drain();assert(events.some(e=>e.type==='impact'&&e.data.projectile));assert.equal(g.hits,1);if(!role){assert(g.stumble>0);assert.equal(g.lastMistake,'撞上了岸边飞石');g.held=true;for(let i=0;i<180;i++)g.step(1/120);assert.equal(g.stumble,0);assert.equal(g.recoveries,1);}else{assert(!g.has(role));assert.equal(g.stumble,0);assert(events.some(e=>e.type==='shield'&&e.data===role));assert.equal(g.shieldSlow,role==='duck'?.8:0);}}
});
test('larger stone graphics preserve the existing narrow projectile collision corridor',()=>{
 for(const [z,hits] of [[0,1],[1.01,0]]){const g=model();g.z=g.targetZ=z;g.entities=[projectile(g)];g.step(.01);assert.equal(g.hits,hits);}
});
test('projectile and target graphics are finite, bounded and do not mutate simulation or GPU allocations',()=>{
 const r=renderer(),buffer=r.buffer,g=model();
 for(const low of [false,true])for(const targetZ of [-3.7,0,3.7])for(const age of [-2,-1,.2,.7,1.2]){r.low=low;r.reducedMotion=false;r.count=0;const e=projectile(g);e.targetZ=targetZ;e.z=targetZ;g.time=e.throwAt+age;r.entityZ=e.z;const before=JSON.stringify([g,e]);r.projectileStone(g,e,28);assert.equal(JSON.stringify([g,e]),before);assert.equal(r.buffer,buffer);assert(r.count/r.stride/3<3000);for(let i=0;i<r.count;i++)assert(Number.isFinite(r.buffer[i]));}
});
test('reduced motion keeps the faceted stone still and omits the falling chips',()=>{
 const r=renderer(),g=model(),e=projectile(g);g.time=12.5;r.projectileStone(g,e,20);const normal=r.count;r.count=0;r.reducedMotion=true;r.projectileStone(g,e,20);assert(r.count>0&&r.count<normal);const quiet=r.buffer.slice(0,r.count);r.count=0;g.time=12.6;r.projectileStone(g,e,20);assert.deepEqual(r.buffer.slice(0,r.count),quiet);
});
test('the flying stone uses flat faces with distinct normals and meets the water at its landed height',()=>{
 const r=renderer(),g=model(),e=projectile(g);
 r.curve.fill(0);e.y=.5;g.time=e.throwAt+e.flightSeconds;
 r.projectileStone(g,e,20);
 const normals=new Set();
 for(let i=0;i<r.count;i+=r.stride*3){
  const a=r.buffer.slice(i+6,i+9);
  assert.deepEqual(a,r.buffer.slice(i+r.stride+6,i+r.stride+9));
  assert.deepEqual(a,r.buffer.slice(i+r.stride*2+6,i+r.stride*2+9));
  normals.add(a.join(','));
 }
 const heights=r.buffer.subarray(0,r.count).filter((_,i)=>i%r.stride===1);
 assert(normals.size>=12);
 assert(r.count/r.stride/3<=40);
 assert(Math.min(...heights)<-.025&&Math.max(...heights)>1);
});
test('stone chips separate on independent falling arcs and freeze with the game clock',()=>{
 const r=renderer(),g=model(),e=projectile(g);
 const draws=[];r.flyingStoneMesh=(...args)=>draws.push(args);
 const draw=age=>{draws.length=0;g.time=e.throwAt+age;r.projectileStone(g,e,20);return draws.slice(1);};
 assert.equal(draw(.10).length,0);
 const chips=draw(.55);
 assert.equal(chips.length,6);
 assert(chips.some(([x])=>x<20)&&chips.some(([x])=>x>20));
 assert.equal(new Set(chips.map(([,y])=>y)).size,6);
 assert(chips.every(([,y,z,size])=>y>.02&&z<0&&size<.3));
 g.mode='pause';
 assert.deepEqual(draw(.55),chips);
 assert(draw(.65).length<chips.length);
 assert.equal(draw(1.05).length,0);
 r.low=true;assert.equal(draw(.55).length,3);
 r.reducedMotion=true;assert.equal(draw(.55).length,0);
});
test('every authored throw announces a fixed target at least 3.5 seconds before fastest possible contact',()=>{
 for(const n of [2,3])for(const seed of [1,31029,99991])for(const event of R.campaign.timeline(n,seed).filter(e=>e.kind==='throw')){
  const g=model();g.stageIndex=n;g.distance=g.stageStartDistance+event.x-(R.campaign.caps[n]*4+11);g.time=0;g.stageStartedAt=0;g.routeEvents=[event];g.routeSpawned=[];g.routeRampEnds=[];g.generate();const stone=g.nextProjectile();assert(stone);assert.equal(stone.targetZ,event.target);assert.equal(stone.throwAt,null);assert((stone.x-g.distance-2.4)/R.campaign.caps[n]>=R.campaign.projectileWarningSeconds-1e-8);stone.done=true;assert.equal(g.nextProjectile(),null);
 }
});
test('far landing targets render before launch beyond the normal 85-metre object cutoff in both qualities',()=>{
 const r=renderer(),g=model();g.entities=[projectile(g)];g.entities[0].x=g.distance+160;g.entities[0].throwAt=g.time+3;g.entities[0].z=-10.3;const original=r.projectileTarget;let called=0;r.projectileTarget=function(...args){called++;assert.equal(this.entityZ,0);return original.apply(this,args);};
 for(const low of [false,true]){r.low=low;r.render(g,0,false,1/60);assert(r.count<r.buffer.length);assert(r.triangles<(low?50000:80000));for(let i=0;i<r.count;i++)assert(Number.isFinite(r.buffer[i]));}assert.equal(called,2);
});
test('preview-length warning allows an ordinary lane change to avoid the real incoming stone',()=>{
 for(const dodge of [false,true]){const g=model();g.time=0;g.stageStartedAt=0;const e=projectile(g);Object.assign(e,{x:g.distance+104,z:-10.3,prevZ:-10.3,throwAt:3.5});g.entities=[e];if(dodge)g.changeLane(1);for(let i=0;i<720;i++)g.step(1/120);assert.equal(g.hits,dodge?0:1);}
});

test('the landing cue is one compact water shadow in both qualities and reduced motion',()=>{
 const r=renderer(),g=model(),e=projectile(g);
 for(const name of ['cone','loop','tube'])r[name]=()=>assert.fail(name+' is not part of the landing cue');
 for(const low of [false,true])for(const reduced of [false,true])for(const distance of [18,55,150]){
  r.low=low;r.reducedMotion=reduced;r.count=0;e.targetZ=3.7;
  r.projectileTarget(e,distance);
  assert.equal(r.count/r.stride/3,32);
  for(let i=0;i<r.count;i+=r.stride){
   assert(Math.abs(r.buffer[i]-distance)<1.56);
   assert(Math.abs(r.buffer[i+1]-.024)<1e-6);
   assert.equal(r.buffer[i+9],-1);
  }
 }
 r.count=0;e.throwAt=null;r.projectileStone(g,e,35);assert.equal(r.count,0);
});

test('throws occupy the preceding row’s open lane, with room clear of rows, landings and rewards',()=>{
 for(const [n,pace] of [[2,undefined],[3,undefined],[3,43.2],[3,150],[3,600]])for(const seed of [1,42,31029,4294967295]){
  const cap=pace?pace+8:R.campaign.caps[n],route=R.campaign.timeline(n,seed,pace);
  const rows=route.filter(e=>e.kind==='row'),stones=route.filter(e=>e.kind==='throw');
  assert.equal(stones.length,n===2?3:7);
  for(const stone of stones){
   assert([-3.7,0,3.7].includes(stone.target));
   if(stone.x<rows.at(-1).x)assert.equal(stone.target,rows.findLast(row=>row.x<stone.x).safe);
   for(const e of route){
    const dx=stone.x-e.x;
    if(e.kind==='row')assert(Math.abs(dx)>=4.8+cap*.25);
    if(e.kind==='ramp')assert(dx<=-12||dx>=cap*2.6);
    if(e.kind==='bank'&&e.side*3.7===stone.target)assert(Math.abs(dx)>=cap*1.3);
    if(e.kind==='buddy'||e.kind==='flag')assert(Math.abs(dx)>=cap*.8);
    if(e.kind==='gold')for(let i=0;i<5;i++)assert(Math.abs(dx+i*e.coinStep)>=cap*.8-1e-8);
   }
  }
 }
});

test('generated stones reach their fixed lane at contact under steady, boosted and changing pace',()=>{
 for(const [n,endless] of [[2,false],[3,false],[3,true]])for(const speed of ['steady','boosted','late-surge'])for(const action of ['straight','swipe','jump']){
  const g=model(),start=50,cap=endless?R.endless.startSpeed+start*R.endless.acceleration+8:R.campaign.caps[n],pace=endless?49.2:undefined;
  const event=R.campaign.timeline(n,g.seed,pace).find(e=>e.kind==='throw');
  Object.assign(g,{stageIndex:n,endless,stageStartedAt:start,time:start,distance:g.stageStartDistance+event.x-(cap*4+11),endlessRouteStart:g.stageStartDistance,
   endlessRouteEnd:1e6,endlessRouteSerial:1,routeEvents:[event],routeSpawned:[],routeRampEnds:[],z:event.target,targetZ:event.target});
  g.predatorSpeed=()=>0;
  const limit=()=>endless?g.flowSpeed()+8:cap;
  g.travelSpeed=()=>speed==='boosted'||speed==='late-surge'&&stone.throwAt!==null?limit():g.flowSpeed();
  g.generate();const stone=g.nextProjectile();
  assert(stone);assert.equal(stone.throwAt,null);
  if(action==='swipe')g.changeLane(event.target===3.7?-1:1);
  let jumped=false,impact=false;
  while(!stone.done&&g.time-start<12){
   if(action==='jump'&&!jumped&&stone.x-g.distance<2.4+.31*g.travelSpeed()){
    g.press();g.release();jumped=true;
   }
   g.step(1/120);
   impact=g.drain().some(e=>e.type==='impact'&&e.data.projectile)||impact;
  }
  assert(stone.done);
  assert(Math.abs(stone.z-event.target)<1e-6);
  assert(Math.abs(stone.y-.5)<1e-6);
  assert.equal(impact,action==='straight',JSON.stringify({n,endless,speed,action}));
  if(action==='jump')assert(stone.passed);
 }
});

test('a timed jump clears each campaign throw and its adjacent obstacle rows at top speed',()=>{
 for(const n of [2,3])for(const seed of [42,31029]){
  const route=R.campaign.timeline(n,seed),rows=route.filter(e=>e.kind==='row'),cap=R.campaign.caps[n];
  for(const event of route.filter(e=>e.kind==='throw')){
   const next=rows.find(e=>e.x>event.x);
   if(!next)continue;
   const before=rows.findLast(e=>e.x<event.x),g=model();
   Object.assign(g,{seed,stageIndex:n,time:40,stageStartedAt:40,distance:g.stageStartDistance+event.x-(cap*4+11),
    routeEvents:[before,event,next],routeSpawned:[],routeRampEnds:[],z:event.target,targetZ:event.target});
   g.predatorSpeed=()=>0;
   g.travelSpeed=()=>cap;
   g.generate();
   const stone=g.nextProjectile();
   let jumped=false;
   while(g.distance<g.stageStartDistance+next.x+2.5&&g.time<48){
    if(!jumped&&stone.x-g.distance<2.4+.31*cap){
     g.press();g.release();jumped=true;
     if(next.safe!==event.target)g.changeLane(Math.sign(next.safe-event.target));
    }
    g.step(1/120);
   }
   assert(jumped&&stone.done&&stone.passed);
   assert.equal(g.hits,0,JSON.stringify({n,seed,event,before,next}));
  }
 }
});
