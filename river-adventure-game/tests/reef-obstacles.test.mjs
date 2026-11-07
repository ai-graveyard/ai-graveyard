import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import '../model.js';
import '../four-stage.js';

const R=globalThis.River3D,lanes=[-3.7,0,3.7];

function rowGame(stage,seed,event){
 const g=new R.Game(seed);g.start();g.zone();
 Object.assign(g,{stageIndex:stage,stageStartedAt:0,stageStartDistance:0,time:0,distance:event.x-16,
  gap:50,safe:0,routeEvents:[event],routeSpawned:[],routeRampEnds:[],entities:[]});
 g.generate();
 return g;
}

test('ordinary reefs vary in both early stages and long reefs replace only adjacent blocked lanes',()=>{
 for(const seed of [42,31029])for(let stage=0;stage<4;stage++){
  const route=R.campaign.timeline(stage,seed),variants=new Set();
  for(const event of route.filter(e=>e.kind==='row'&&e.row%2===0)){
   const g=rowGame(stage,seed,event),rocks=g.entities.filter(e=>e.kind==='rock');
   for(const rock of rocks)variants.add(rock.reef);
   const ridge=rocks.find(e=>e.reef==='ridge');
   if(!ridge)continue;
   assert.equal(rocks.length,1);
   assert.notEqual(event.safe,0);
   const blocked=lanes.filter(z=>z!==event.safe);
   assert.equal(ridge.z,(blocked[0]+blocked[1])/2);
   for(let i=-370;i<=370;i++){
    const z=i/100,covered=Math.abs(z-ridge.z)<R.hazardHalfWidth(ridge);
    const coveredBefore=blocked.some(lane=>Math.abs(z-lane)<R.hazardHalfWidth({kind:'rock'}));
    if(blocked.some(lane=>Math.abs(Math.abs(z-lane)-2.35)<1e-8))continue;
    assert.equal(covered,coveredBefore);
   }
  }
  assert(variants.has('slab')&&variants.has('spire'));
  assert.equal(variants.has('ridge'),stage>0);
 }
});

test('a generated long reef hits on either occupied lane, leaves its safe lane open, and can be jumped',()=>{
 for(const seed of [42,31029]){
  const stage=3,event=R.campaign.timeline(stage,seed).find(e=>e.kind==='row'&&e.row===2);
  for(const z of lanes)for(const jump of [false,true]){
   const g=rowGame(stage,seed,event),ridge=g.entities[0];
   assert.equal(ridge.reef,'ridge');
   g.z=g.targetZ=z;
   assert.equal(g.nextHazard(),z===event.safe?null:ridge);
   if(jump){g.press();g.release();}
   for(let i=0;i<120&&g.distance<=event.x+2.5;i++)g.step(1/120);
   assert.equal(g.hits,!jump&&z!==event.safe?1:0);
   if(jump&&z!==event.safe)assert(ridge.passed);
  }
 }
});

test('crossing the join of a long reef consumes a guard once',()=>{
 const seed=42,event=R.campaign.timeline(1,seed).find(e=>e.kind==='row'&&e.row===2),g=rowGame(1,seed,event);
 g.distance=event.x-2.41;g.z=-1.85;g.targetZ=0;g.activateFlag(3);g.drain();
 for(let i=0;i<80;i++)g.step(1/120);
 const events=g.drain();
 assert.equal(g.hits,1);
 assert.equal(events.filter(e=>e.type==='impact').length,1);
 assert.equal(events.filter(e=>e.type==='shield'&&e.data==='flag').length,1);
 assert.equal(g.stumble,0);
});

test('both qualities use closed reefs with distinct heights, submerged bases and a two-lane ridge span',()=>{
 const gl=new Proxy({getShaderParameter:()=>true,getProgramParameter:()=>true},{get:(o,k)=>k in o?o[k]:()=>({})});
 const win={River3D:R,devicePixelRatio:1};
 vm.runInNewContext(fs.readFileSync(new URL('../renderer.js',import.meta.url),'utf8'),{window:win});
 const r=new win.RiverRenderer({getContext:()=>gl,getBoundingClientRect:()=>({width:390,height:844})});
 r.offset=0;r.bend=0;r.prepareCurve(0);r.curve.fill(0);
 for(const low of [false,true]){
  r.low=low;
  const measurements={};
  for(const reef of ['slab','spire','ridge']){
   r.count=0;r.stone(0,0,reef);
   assert(r.count/r.stride/3<=72);
   assert(r.buffer.subarray(0,r.count).every(Number.isFinite));
   const mesh=[];
   for(let i=0;i<r.count;i+=r.stride)if(r.buffer[i+9]===1)mesh.push([r.buffer[i],r.buffer[i+1],r.buffer[i+2]]);
   const edges=[];
   for(let i=0;i<mesh.length;i+=3)for(let j=0;j<3;j++){
    const a=mesh[i+j],b=mesh[i+(j+1)%3];
    if(a[1]*b[1]<0)edges.push(a[2]+(b[2]-a[2])*(-a[1])/(b[1]-a[1]));
   }
   assert(Math.min(...mesh.map(([,y])=>y))<-.025);
   measurements[reef]={maxY:Math.max(...mesh.map(([,y])=>y)),width:Math.max(...edges)-Math.min(...edges)};
  }
  assert(measurements.spire.maxY>measurements.slab.maxY+.5);
  assert(measurements.spire.maxY<1.65);
  assert(measurements.ridge.width>6);
  assert(measurements.slab.width<3.7&&measurements.spire.width<3.7);
 }
});
