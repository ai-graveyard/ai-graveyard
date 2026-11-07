import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import '../model.js';
import '../four-stage.js';
const {chaseDuration:chase,escapeDuration,launchAt,biteAt}=River3D.openingStory,duration=chase+escapeDuration;
function setup(){
 const values={};const gl=new Proxy({getShaderParameter:()=>true,getProgramParameter:()=>true,getUniformLocation:(_,name)=>name,uniform1f:(name,value)=>values[name]=value},{get:(o,k)=>k in o?o[k]:()=>({})});
 const win={River3D:globalThis.River3D,devicePixelRatio:1};vm.runInNewContext(fs.readFileSync(process.env.RIVER_OPENING_SOURCE||new URL('../renderer.js',import.meta.url),'utf8'),{window:win});
 return {r:new win.RiverRenderer({getContext:()=>gl,getBoundingClientRect:()=>({width:390,height:844})}),values};
}
test('the crocodile swims behind the raft, then accelerates and opens its jaws',()=>{
 const {r}=setup(),g=new River3D.Game(137);g.start();
 const first=r.openingPose(g,0),cruise=r.openingPose(g,.30),lunge=r.openingPose(g,.64),close=r.openingPose(g,chase);
 const gap=p=>p.boatWorld-p.crocWorld;
 assert(gap(first)-gap(close)>3,'the crocodile starts too close to the raft');
 assert(Math.abs(gap(first)-gap(cruise))<.01);
 assert(first.mouth<.2&&cruise.mouth<.2);
 assert(gap(lunge)<gap(cruise)-1&&lunge.predatorSpeed>lunge.boatSpeed+6);
 assert(lunge.mouth>.8&&close.mouth>1.3);
 assert(Math.abs(close.predatorSpeed-close.boatSpeed)<.01);
});
test('the opening moves both actors downstream and grows the gap by accelerating the boat',()=>{
 const {r}=setup();for(const low of [false,true])for(const skin of [0,4])for(const gap of [11,20]){
  r.low=low;const g=new River3D.Game(137);g.start();g.skin=skin;g.gap=gap;const before=JSON.stringify(g);let last=r.openingPose(g,0);
  for(let frame=1;frame<=Math.round(duration*50);frame++){
   const time=frame/50,p=r.openingPose(g,time);assert(p.boatWorld>last.boatWorld);assert(p.crocWorld>last.crocWorld,'crocodile swims backwards');
   if(time>chase)assert(Math.abs((p.crocWorld-last.crocWorld)/.02-9)<1e-8);
   last=p;
  }
  const ready=r.openingPose(g,chase+launchAt-.10),launch=r.openingPose(g,chase+launchAt+.22),clear=r.openingPose(g,chase+biteAt-.22),snap=r.openingPose(g,chase+biteAt),end=r.openingPose(g,duration);
  assert.equal(ready.rush,0);assert.equal(ready.boatSpeed,9);assert(launch.boatSpeed>launch.predatorSpeed+5);assert(launch.boatX>0);
  assert(clear.boatX-1.70-(clear.crocX+3.5)>.50,'the stern stays too close to the jaws before the snap');
  assert(clear.mouth>r.crocGrip(g,chase+biteAt-.22,skin===4?-1.30:-1.42).clampOpen+.35,'the jaws close too early');
  assert(ready.mouth<1.05&&ready.mouth>.65,'jaw is not closing before the burst');assert(snap.mouth<.01);
  for(let t=.15;t+.025<biteAt-.02;t+=.025){
   assert(r.openingPose(g,chase+t).mouth-r.openingPose(g,chase+t+.025).mouth>.006,`jaw stalls before the snap at ${t.toFixed(3)}s`);
  }
  assert.equal(end.boatX,0);assert.equal(end.origin,g.distance);assert.equal(end.boatWorld,g.distance);assert.equal(end.crocX,-6.1-gap);assert.equal(end.boatSpeed,8);assert.equal(end.mouth,.12);assert.equal(JSON.stringify(g),before);
 }
});
test('boat and shadow advance together while rendering leaves gameplay and GPU allocation untouched',()=>{
 const {r,values}=setup(),g=new River3D.Game(137);g.start();g.entities=[];g.bankSites=[];g.crew=[];const buffer=r.buffer,before=JSON.stringify(g),person=r.person;let boatX;
 r.person=function(x,y,z,role){if(role==='captain'&&this.group&&this.group.scale===.9)boatX=this.group.x;return person.apply(this,arguments);};
 for(const t of [0,.64,chase+launchAt,chase+biteAt,chase+biteAt+.08,chase+3.1,duration]){r.openingTime=t;r.render(g,t,false,1/30);const p=r.openingPose(g,t);assert.equal(boatX,p.boatX);assert.equal(values.raftX,p.boatX);assert.equal(r.buffer,buffer);assert.equal(r.crocContactPose,null);assert.equal(r.crocImmersion,0);for(let i=0;i<r.count;i++)assert(Number.isFinite(r.buffer[i]));}
 r.openingTime=null;r.render(g,duration,false,0);assert.equal(boatX,0);assert.equal(values.raftX,0);assert.equal(JSON.stringify(g),before);
});
test('the last camera target and virtual world position join gameplay without a jump',()=>{
 const {r}=setup(),g=new River3D.Game(137);g.start();r.vertex=()=>{};r.openingTime=duration;r.render(g,duration,false,0);const end=r.camera.slice();r.openingTime=null;r.camera=null;r.render(g,duration,false,0);for(let i=0;i<end.length;i++)assert(Math.abs(end[i]-r.camera[i])<1e-8);
 const p=r.openingPose(g,duration),near=r.openingPose(g,duration-.001);assert(Math.abs((p.boatWorld-near.boatWorld)/.001-8)<.01);
});
