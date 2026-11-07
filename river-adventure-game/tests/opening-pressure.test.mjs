import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';
import {setup as setupUI} from '../scripts/lib/four-stage-ui-harness.mjs';
import '../model.js';
import '../four-stage.js';
const {chaseDuration:chase,launchAt,biteAt,escapeDuration}=River3D.openingStory;

function setup(width=390,height=844){
 const gl=new Proxy({getShaderParameter:()=>true,getProgramParameter:()=>true},{get:(o,k)=>k in o?o[k]:()=>({})}),win={River3D:globalThis.River3D,devicePixelRatio:1};
 vm.runInNewContext(fs.readFileSync(process.env.RIVER_OPENING_SOURCE||new URL('../renderer.js',import.meta.url),'utf8'),{window:win});
 return new win.RiverRenderer({getContext:()=>gl,getBoundingClientRect:()=>({width,height})});
}

test('the first shot frames the pursuit before pushing close to the mouth and captain on both phone sizes',()=>{
 for(const [width,height] of [[390,844],[320,568]]){
  const r=setup(width,height),g=new River3D.Game(137);g.start();r.vertex=()=>{};r.openingTime=0;r.render(g,0,false,0);
  const first=r.camera.slice(),distanceFromAim=c=>Math.hypot(c[0]-c[3],c[1]-c[4],c[2]-c[5]);
  r.camera=null;r.openingTime=chase;r.render(g,chase,false,0);
  const c=r.camera,dx=c[0]-c[3],dy=c[1]-c[4],dz=c[2]-c[5],horizontal=Math.hypot(dx,dz),distance=Math.hypot(horizontal,dy);
  assert(distanceFromAim(first)>distance*1.25,'the pursuit lacks a wider view');
  assert(distance<17,`close shot stays distant: ${distance}`);
  assert(Math.atan2(dy,horizontal)<.28,'camera looks down from above the open mouth');
  r.camera=null;r.openingTime=chase+launchAt;r.render(g,chase+launchAt,false,0);
  const near=r.camera;
  assert(distanceFromAim(near)<distance*.91,'the near miss lacks a closer view');
 }
});

test('the rendered jaws clear the raft logs through the near miss',()=>{
 const r=setup();r.shadow=()=>{};
 // Use the flat river coordinates shared by the raft and crocodile before bending the scene.
 r.offset=0;r.bend=0;r.curveStart=-150;r.curve.fill(0);
 for(const low of [false,true])for(const gap of [11,20]){
  const g=new River3D.Game(137);g.start();g.gap=gap;r.low=low;
  let clearance=Infinity;
  for(let frame=0;frame<=Math.ceil((chase+biteAt+.08)*60);frame++){
   const t=frame/60,pose=r.openingPose(g,t);
   r.count=0;r.crocContactPose=pose.contact;r.croc(pose.crocX,t,0,pose.mouth,0,null);r.crocContactPose=null;
   const pitch=pose.rush*.055,cos=Math.cos(pitch),sin=Math.sin(pitch),scale=.9;
   const deckY=(.46+Math.sin(t*4)*.055)*scale/1.45;
   for(let at=0;at<r.count;at+=r.stride){
    const dx=r.buffer[at]-pose.boatX,dy=r.buffer[at+1]-deckY;
    const x=(dx*cos+dy*sin)/scale;
    if(Math.abs(x)>1.89)continue;
    const y=(dy*cos-dx*sin)/scale,z=r.buffer[at+2]/scale;
    for(let log=0;log<6;log++){
     const end=1.75+(log%2)*.09;
     if(Math.abs(x)>end+.05)continue;
     const taper=Math.max(0,Math.min(1,(x+end)/(2*end)));
     const radius=.255-.025*taper,center=(log-2.5)*.49;
     clearance=Math.min(clearance,Math.hypot(y,z-center)-radius);
    }
   }
  }
  assert(clearance>.02,`raft clearance ${clearance} with gap ${gap} and low quality ${low}`);
 }
});

test('the close view shows the empty bite and starts following the raft a beat later',()=>{
 for(const [width,height] of [[390,844],[320,568]]){
  const r=setup(width,height),g=new River3D.Game(137);g.start();r.vertex=()=>{};
  const cameras=[];
  for(const beat of [-.20,-.12,0,.07]){
   const time=chase+biteAt+beat;
   r.openingTime=time;r.render(g,time,false,1/30);
   const pose=r.openingPose(g,time);
   cameras.push({x:r.camera[0]-pose.crocX,y:r.camera[1],aim:r.camera[3]-pose.crocX});
  }
  for(const camera of cameras.slice(1))for(const key of ['x','y','aim']){
   assert(Math.abs(camera[key]-cameras[0][key])<.1,`camera leaves the jaws early at ${width}px: ${key}`);
  }
  r.camera=null;r.openingTime=chase+biteAt+.28;r.render(g,r.openingTime,false,0);
  assert(r.camera[1]>cameras[0].y+.5,'camera lingers on the closed jaws');
  r.camera=null;r.openingTime=chase+biteAt+1.46;r.render(g,r.openingTime,false,0);
  assert(r.camera[1]>cameras[0].y+2,'camera never pulls back after the bite');
 }
});

test('paused close and snap frames retain identical geometry and preserve the run',()=>{
 const r=setup(),g=new River3D.Game(137);g.start();g.entities=[];g.bankSites=[];const buffer=r.buffer,before=JSON.stringify(g);
 for(const quiet of [false,true])for(const t of [0,.64,chase+biteAt-.1,chase+biteAt+.06,chase+escapeDuration]){
  r.reducedMotion=quiet;r.camera=null;r.openingTime=t;r.render(g,t,false,0);const mesh=r.buffer.slice(0,r.count),camera=r.camera.slice();r.render(g,t,false,0);
  assert.deepEqual(r.buffer.subarray(0,r.count),mesh);assert.deepEqual(r.camera,camera);assert.equal(r.buffer,buffer);assert.equal(JSON.stringify(g),before);
 }
});

test('the opening growl, closing warning and snap fire once across pause and resume',async()=>{
 const h=await setupUI({sourceRoot:fileURLToPath(new URL('..',import.meta.url)),opening:true}),app=h.ctx.River3DApp,cues=[];
 app.audio.play=cue=>cues.push(cue);h.click('start');assert.equal(app.mode,'opening');assert(!cues.includes('croc-growl'));
 for(let i=0;i<6;i++)h.tick(50);const at=app.renderer.openingTime;h.click('pause');for(let i=0;i<8;i++)h.tick(50);assert.equal(app.renderer.openingTime,at);assert(!cues.includes('croc-growl'));
 h.click('resume');for(let i=0;i<58;i++)h.tick(50);
 assert.deepEqual(cues.filter(c=>c.startsWith('croc-')||c==='escape'),['croc-growl','croc-close','escape','croc-snap']);
 assert.equal(app.game.time,0);assert.equal(app.game.distance,0);
});
