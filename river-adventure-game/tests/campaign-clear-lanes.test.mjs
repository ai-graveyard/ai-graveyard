import test, {after} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import '../model.js';
import '../four-stage.js';

const R=globalThis.River3D;
const SEEDS=[1,2,3,137,31029,31166,31303,123456789,4294967295];
const EXPECTED_ROWS=[4,10,20,50];
const CASES=[];

// Structural diagnostic only: disabled predator movement and collision protection
// let every authored encounter reach the camera. These are not player attempts.
// Physics, route generation, wind, ramp flight and entity retention still run.
function inspectStage(stage,seed,pattern){
 const g=new R.Game(seed);g.start();
 Object.assign(g,{stageIndex:stage,stageStartedAt:0,stageStartDistance:0,
  distance:0,time:0,gap:1e6,safe:1e6,entities:[],
  routeEvents:R.campaign.timeline(stage,seed),routeSpawned:[],routeRampEnds:[],routeAudit:[]});
 g.predatorSpeed=()=>0;
 const rows=new Map(),ramps=[],fixedPositions=new Map(),moved=[];
 const originalAdd=g.add;
 g.add=function(...args){
  const entity=originalAdd.apply(this,args);
  if(this.stageIndex===stage){
   fixedPositions.set(entity,entity.x);
   if(entity.kind==='ramp')ramps.push({x:entity.x,z:entity.z});
   if((entity.kind==='rock'||entity.kind==='log')&&!entity.projectile){
    if(!rows.has(entity.encounter))rows.set(entity.encounter,[]);
    rows.get(entity.encounter).push(entity);
   }
  }
  return entity;
 };
 g.generate();
 let minSpeed=Infinity,maxSpeed=0;
 const speeds=[];
 for(let tick=0;tick<60*R.campaign.durations[stage]+2&&g.mode==='play'&&g.stageIndex===stage;tick++){
  // Exercise changing speed promises at generation boundaries, including
  // returning from a crash-like slowdown. Values are fixture inputs only.
  if(pattern==='surges')g.goldBoost=tick%240<90?2:0;
  if(pattern==='slow-and-surge'){
   g.goldBoost=(tick+73)%300<100?2:0;
   if((tick+73)%780>540&&(tick+73)%780<630)g.shieldSlow=.1;
  }
  if(pattern==='shifted-slowdown'){
   g.escape=(tick+151)%420<100?1:0;
   if((tick+151)%660>300&&(tick+151)%660<450)g.shieldSlow=.1;
  }
  if(pattern==='capsize-and-surge'){
   // Geometry fixture: exercise the full crash speed, then a legal burst speed.
   // Keep survival disabled so every authored row remains observable.
   g.safe=1e6;g.stumble=tick%600>=180&&tick%600<300?2:0;
   g.goldBoost=tick%600>=300&&tick%600<420?2:0;
  }
  g.step(1/60);g.drain();
  minSpeed=Math.min(minSpeed,g.speed);maxSpeed=Math.max(maxSpeed,g.speed);
  if(tick%60===0)speeds.push({time:g.time,speed:g.speed});
  for(const entity of g.entities){
   if(fixedPositions.has(entity)&&entity.x!==fixedPositions.get(entity))moved.push(entity.kind);
  }
 }
 const gates=[...rows.values()].map(entities=>({x:entities[0].x,entities})).sort((a,b)=>a.x-b.x);
 const separations=gates.slice(1).map((gate,i)=>gate.x-gates[i].x);
 const corridorViolations=[];
 let protectedRows=0,minimumLateralClearance=Infinity;
 for(const ramp of ramps)for(const gate of gates){
  if(gate.x<=ramp.x-2.4||gate.x>=ramp.x+R.campaign.caps[stage]*2.6)continue;
  protectedRows++;
  for(const entity of gate.entities){
   const baseZ=Number.isFinite(entity.baseZ)?entity.baseZ:entity.z;
   const width=R.hazardHalfWidth(entity);
   const clearance=Math.abs(baseZ-ramp.z)-(entity.sway?entity.swayAmplitude:0)-width;
   minimumLateralClearance=Math.min(minimumLateralClearance,clearance);
   if(clearance<=0)corridorViolations.push({ramp,gate:gate.x,kind:entity.kind,baseZ,clearance,encounter:entity.encounter});
  }
 }
 return {stage:stage+1,seed,pattern,rowCount:gates.length,rampCount:ramps.length,
  minimumRowSeparation:Math.min(...separations),movedCount:moved.length,
  protectedRows,minimumLateralClearance:Number.isFinite(minimumLateralClearance)?minimumLateralClearance:null,
  corridorViolations,endDistance:g.distance,lastRow:gates[gates.length-1].x,
  minSpeed,maxSpeed,speeds,finishedStage:g.stageIndex!==stage||g.campaignWon};
}

for(let stage=0;stage<4;stage++)for(const seed of SEEDS)
 for(const pattern of ['steady','surges','slow-and-surge','shifted-slowdown','capsize-and-surge'])
  CASES.push(inspectStage(stage,seed,pattern));

test('fourth-stage ramp and nearby obstacles leave the entire takeoff lane open',()=>{
 for(const seed of [31166,31303]){
  const timeline=R.campaign.timeline(3,seed),simultaneous=timeline.filter(e=>Math.abs(e.at-35)<1);
  assert(simultaneous.some(e=>e.kind==='ramp'));
  assert(simultaneous.some(e=>e.kind==='row'));
  // Test the spawned geometry rather than only checking the sort order.
  for(const result of CASES.filter(c=>c.stage===4&&c.seed===seed))
   assert.deepEqual(result.corridorViolations,[],JSON.stringify(result));
 }
});

test('all authored rows remain separate and fixed under acceleration and slowdown',()=>{
 for(const result of CASES){
  assert.equal(result.movedCount,0,JSON.stringify(result));
  // Each row has a +/-2.4m longitudinal collision window. Distinct rows must
  // not merge those windows, even when a boost expires before later spawns.
  assert(result.minimumRowSeparation>4.8,JSON.stringify(result));
 }
});

test('ramp landing corridors remain clear even at the full sway envelope',()=>{
 for(const result of CASES){
  assert.equal(result.rampCount,result.stage===1?0:2,JSON.stringify(result));
  assert.deepEqual(result.corridorViolations,[],JSON.stringify(result));
  if(result.protectedRows)assert(result.minimumLateralClearance>0,JSON.stringify(result));
 }
 assert(CASES.some(c=>c.stage===3&&c.protectedRows>=3));
 assert(CASES.some(c=>c.stage===4&&c.protectedRows>=3));
});

test('all authored late-stage rows still pass before their timed stage finishes',()=>{
 for(const result of CASES){
  assert.equal(result.rowCount,EXPECTED_ROWS[result.stage-1],JSON.stringify(result));
  assert(result.finishedStage,JSON.stringify(result));
  assert(result.lastRow+2.4<result.endDistance,JSON.stringify(result));
 }
 assert(CASES.some(c=>c.pattern!=='steady'&&c.maxSpeed-c.minSpeed>=7.9));
});

after(()=>{
 const output=process.env.RIVER_ROUTE_PRESSURE_OUTPUT;
 if(!output)return;
 fs.mkdirSync(path.dirname(output),{recursive:true});
 fs.writeFileSync(output,JSON.stringify({
  method:'Route-structure diagnostics over actual 60Hz model steps. Disabled predator movement and collision protection, plus fixture burst/slow timers, keep every stage observable. These are not normal-player attempts or evidence of pass rates. No route entities are deleted and no existing X coordinates are moved by the fixture.',
  cases:CASES.length,seeds:SEEDS,patterns:['steady','surges','slow-and-surge','shifted-slowdown','capsize-and-surge'],
  totalRows:CASES.reduce((sum,c)=>sum+c.rowCount,0),
  overlappingCollisionWindows:CASES.filter(c=>c.minimumRowSeparation<=4.8).length,
  movingEntityCases:CASES.filter(c=>c.movedCount).length,
  blockedLandingCorridors:CASES.filter(c=>c.corridorViolations.length).length,
  lastRowsPastFinish:CASES.filter(c=>c.lastRow+2.4>=c.endDistance).length,
  results:CASES
 },null,2)+'\n');
});
