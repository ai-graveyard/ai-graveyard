import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import '../model.js';
import '../four-stage.js';
const R=globalThis.River3D;
function setup(stage=1){const g=new R.Game(137);g.start();Object.assign(g,{stageIndex:stage,entities:[],routeEvents:[],bankSites:[],flags:[],gap:1000});g.drain();return g;}
function run(g,seconds){for(let i=0;i<Math.round(seconds*120);i++)g.step(1/120);}
function spacePeak(stage=1,duck=false){const g=setup(stage);if(duck)g.boardBuddy('duck');g.press();g.release();let peak=0;for(let i=0;i<400;i++){g.step(1/120);peak=Math.max(peak,g.y);}return peak;}
function renderer(){const gl=new Proxy({getShaderParameter:()=>true,getProgramParameter:()=>true},{get:(o,k)=>k in o?o[k]:()=>({})}),win={River3D:R,devicePixelRatio:1};vm.runInNewContext(fs.readFileSync(new URL('../renderer.js',import.meta.url),'utf8'),{window:win});return new win.RiverRenderer({getContext:()=>gl,getBoundingClientRect:()=>({width:390,height:844})});}
test('all stages and both waves lift the raft along water before a single crest departure at the same apex as Space',()=>{
 for(const stage of [0,1,2,3])for(const power of [8.3,13.5])for(const boost of [false,true])for(const duck of [false,true]){
  const g=setup(stage);if(boost)g.goldBoost=2;if(duck)g.boardBuddy('duck');const wave=g.add('ramp',24,0,{power,encounter:150});let rides=0,launches=0,landings=0,peak=0,oldY=0,departed=false;
  for(let i=0;i<600;i++){
   g.step(1/120);peak=Math.max(peak,g.y);
   if(g.waveRide){rides++;assert(!wave.done);assert.equal(g.air,0);const surface=R.waveSurface(g.distance-wave.x,g.z-wave.z,power);assert(Math.abs(g.y-surface.height)<1e-8);assert(Math.abs(g.angle-Math.atan(surface.slope))<1e-8);assert.equal(g.rotation,0);}
   for(const e of g.drain()){if(e.type==='ramp'){launches++;departed=true;assert(rides>=18);assert(g.distance>=wave.x-.4);assert(g.y>.5&&g.y<1.5);assert(g.vy<=R.manualJump.speed);assert(Math.abs(g.y-oldY)<.16);}if(e.type==='flyover')landings++;assert(!['impact','crash','smash','shield'].includes(e.type));}
   if(!departed)assert(Math.abs(g.y-oldY)<.16);oldY=g.y;
  }
  assert.equal(launches,1);assert.equal(landings,1);assert(wave.done&&wave.passed);assert(Math.abs(peak-spacePeak(stage,duck))<.001);assert.equal(g.hits,0);
 }
});
test('normal, surfing and protected contact retain the physical wave after takeoff',()=>{
 for(const state of [{},{goldBoost:2},{safe:2}]){const g=setup();Object.assign(g,state);const wave=g.add('ramp',18,0,{power:13.5,encounter:150});while(!wave.done)g.step(1/120);assert(g.entities.includes(wave));assert(wave.passed);const count=g.drain().filter(e=>e.type==='ramp').length;assert.equal(count,1);run(g,.5);assert(g.entities.includes(wave));assert(!g.drain().some(e=>e.type==='ramp'));}
});
test('descending into the uphill water catches its surface instead of snapping back to water level',()=>{
 const g=setup();g.distance=13;g.y=1.3;g.vy=-2;const wave=g.add('ramp',18,0,{power:13.5,encounter:150});g.step(1/120);assert(!g.waveRide&&!wave.done);let caught=false,contactY=0;
 for(let i=0;i<80;i++){g.step(1/120);if(g.waveRide){caught=true;contactY=Math.max(contactY,g.y);assert(!wave.done);}}
 assert(caught&&contactY>.4);assert(wave.done&&wave.passed);assert.equal(g.drain().filter(e=>e.type==='ramp').length,1);
});
test('missed, high airborne and stalled recovery contact retain the wave without an upward impulse',()=>{
 for(const state of [{z:3.7,targetZ:3.7},{y:5,vy:0},{stumble:2,crashElapsed:.1,travelSpeed:function(){return 0;}}]){const g=setup();Object.assign(g,state);const wave=g.add('ramp',.9,0,{power:13.5});run(g,1.3);if(state.stumble){assert.equal(g.distance,0);assert.equal(g.y,0);assert.equal(wave.done,false);assert.equal(wave.passed,undefined);}else assert(wave.done&&wave.passed);assert(g.entities.includes(wave));assert(!g.drain().some(e=>['ramp','smash','impact'].includes(e.type)));}
});
test('side exits remain low and tapping on a ridden swell shares the Space apex',()=>{
 for(const action of ['lane','press']){const g=setup();const wave=g.add('ramp',18,0,{power:13.5,encounter:150});while(!g.waveRide||g.y<.35)g.step(1/120);if(action==='lane')g.changeLane(1);else{const before=g.y;g.press();assert.equal(g.y,before);g.release();}let peak=g.y;for(let i=0;i<300;i++){g.step(1/120);peak=Math.max(peak,g.y);}if(action==='press')assert(Math.abs(peak-spacePeak())<.001);else assert(peak<2.1);assert(wave.done&&wave.passed);assert.equal(g.drain().filter(e=>e.type==='ramp').length,1);}
});
test('pause freezes a raft resting on the wave and standard-height flights can still complete a held flip',()=>{
 const g=setup();const wave=g.add('ramp',18,0,{power:13.5,encounter:150});while(!g.waveRide||g.y<.3)g.step(1/120);g.mode='pause';const before=JSON.stringify(g);g.step(.05);assert.equal(JSON.stringify(g),before);g.mode='play';while(!wave.done)g.step(1/120);g.press();let safety=0;while(g.rotation<Math.PI*2&&g.y>0&&safety++<200)g.step(1/120);g.release();run(g,1);assert.equal(g.flips,1);assert.equal(g.rampFlipLandings,1);assert.equal(g.hits,0);
});
test('shared surface has a continuous crest tangent, submerged boundaries and finite slopes',()=>{
 for(const power of [8.3,13.5])for(const z of [-2.79,-1,0,1,2.79]){
  const crest=R.waveSurface(0,z,power).crest,a=R.waveSurface(crest-1e-6,z,power),b=R.waveSurface(crest+1e-6,z,power);assert(Math.abs(a.height-b.height)<1e-5);assert(Math.abs(a.slope-b.slope)<1e-5);
  for(const x of [-10,-7,-3,0,1,4]){const q=R.waveSurface(x,z,power),plus=R.waveSurface(x+1e-5,z,power),minus=R.waveSurface(x-1e-5,z,power);assert(Number.isFinite(q.height+q.slope+q.crossSlope));assert(Math.abs(q.slope-(plus.height-minus.height)/2e-5)<1e-5);}
 }
 for(const x of [-10,4])assert.equal(R.waveSurface(x,0,13.5).height,0);assert.equal(R.waveSurface(0,2.8,13.5).height,0);
});
test('rendered water body exactly follows collision height in both qualities, with bounded finite geometry',()=>{
 const r=renderer();r.offset=r.bend=0;r.prepareCurve(0);
 for(const low of [false,true])for(const power of [8.3,13.5]){r.low=low;r.count=0;r.wave(0,1,power);const N=low?18:30,M=low?12:20,body=N*M*6;
  for(let i=0;i<body*r.stride;i+=r.stride){const x=r.buffer[i],z=r.buffer[i+2]-Math.sin(x*.018)*3-Math.sin(x*.041)*1.5,surface=R.waveSurface(x,z,power);assert(Math.abs(r.buffer[i+1]+.025-surface.height)<.001);}
  assert(r.count/r.stride/3<2500);for(const value of r.buffer.subarray(0,r.count))assert(Number.isFinite(value));
 }
});
test('real scene keeps drawing a used wave, and reduced motion freezes foam without changing collision',()=>{
 const r=renderer(),g=setup(),wave=g.add('ramp',18,0,{power:13.5});while(!wave.done)g.step(1/120);const original=r.wave,draws=[];r.wave=function(x,t,power){draws.push(x);return original.call(this,x,t,power);};
 for(const low of [false,true]){r.low=low;r.render(g,g.time,false,1/60);assert(draws.length);assert(r.count<r.buffer.length);assert(r.triangles<(low?50000:80000));draws.length=0;}
 r.count=0;r.reducedMotion=true;original.call(r,0,1,13.5);const first=r.buffer.slice(0,r.count);r.count=0;original.call(r,0,7,13.5);assert.deepEqual(r.buffer.slice(0,r.count),first);
});
test('wave riding and low departure remain identical at 15, 30, 60 and 120 input frames per second',()=>{
 const states=[15,30,60,120].map(fps=>{const g=setup();g.add('ramp',18,0,{power:13.5,encounter:150});for(let i=0;i<fps*4;i++)g.advance(1/fps);return [g.distance,g.y,g.vy,g.gap,g.flyovers,g.moveSerial];});
 for(const result of states)result.forEach((v,i)=>assert(Math.abs(v-states[0][i])<1e-8));
});
test('the same supported Space-height flight works from each of the three river lanes',()=>{
 for(const lane of [-3.7,0,3.7]){const g=setup();g.z=g.targetZ=lane;g.add('ramp',18,0,{power:13.5,z:lane,encounter:150});let peak=0,rides=0;for(let i=0;i<420;i++){g.step(1/120);peak=Math.max(peak,g.y);if(g.waveRide)rides++;}assert(rides>60);assert(Math.abs(peak-spacePeak())<.001);assert.equal(g.flyovers,1);assert.equal(g.hits,0);}
});
test('game UI shows supported ascent separately from airborne flip controls',async()=>{
 const {setup:setupUI}=await import('../scripts/lib/four-stage-ui-harness.mjs'),root=new URL('../',import.meta.url).pathname,t=await setupUI({sourceRoot:root,flagGuide:true});t.click('start');const g=t.ctx.River3DApp.game;
 Object.assign(g,{stageIndex:1,stageStartedAt:g.time,stageStartDistance:0,distance:0,gap:100,routeEvents:[],entities:[],bankSites:[],flags:[]});g.add('ramp',18,0,{power:13.5,encounter:150});t.tick(1);for(let i=0;i<25;i++)t.tick(50);
 assert(g.waveRide);assert.match(t.elements['action-label'].textContent,/顺浪抬升/);assert(t.elements.flight.hidden);for(let i=0;i<10;i++)t.tick(50);assert(!g.waveRide&&g.y>0);assert(!t.elements.flight.hidden);
});
test('a downward contact on the far face is supported without a fresh upward impulse',()=>{
 const g=setup(0);g.distance=18.1;g.y=1.5;g.vy=-4;const wave=g.add('ramp',18,0,{power:13.5,encounter:150});let contact=false;
 for(let i=0;i<80;i++){g.step(1/120);if(wave.done){contact=true;assert(g.y>.6);assert(g.vy<=0);break;}}assert(contact);assert.equal(g.drain().filter(e=>e.type==='ramp').length,1);assert(wave.passed);
});
test('crest contains substantial bright froth and detached spray in both qualities',()=>{
 for(const low of [false,true]){const r=renderer(),drops=[],drop=r.paddleDrop;r.low=low;r.offset=r.bend=0;r.prepareCurve(0);r.paddleDrop=function(x,y,z,size,color){drops.push({x,y,z,size,color});return drop.call(this,x,y,z,size,color);};r.wave(0,1,13.5);
  let bright=0;for(let i=0;i<r.count;i+=r.stride)if(r.buffer[i+3]>.87&&r.buffer[i+4]>.87&&r.buffer[i+5]>.87)bright++;
  assert(bright>r.count/r.stride*.12);assert(drops.length>5);assert(drops.every(d=>d.size<.09&&d.color==='#f4fff9'));assert(drops.some(d=>d.y-R.waveSurface(d.x,d.z,13.5).height>.2));assert(r.count/r.stride/3<2500);
 }
});
test('an actual Space key tap and a crest departure reach the same height in the game UI loop',async()=>{
 const {setup:setupUI}=await import('../scripts/lib/four-stage-ui-harness.mjs'),root=new URL('../',import.meta.url).pathname,peaks=[];
 for(const wave of [false,true]){const t=await setupUI({sourceRoot:root,flagGuide:true});t.click('start');const g=t.ctx.River3DApp.game;Object.assign(g,{stageIndex:1,stageStartedAt:g.time,stageStartDistance:0,distance:0,gap:100,routeEvents:[],entities:[],bankSites:[],flags:[]});
  if(wave)g.add('ramp',18,0,{power:13.5,encounter:150});else{t.listeners.keydown({code:'Space',target:t.elements.scene,repeat:false,preventDefault(){}});t.listeners.keyup({code:'Space'});}
  let peak=g.y;t.tick(1);for(let i=0;i<180;i++){t.tick(20);peak=Math.max(peak,g.y);}peaks.push(peak);
 }assert(Math.abs(peaks[0]-peaks[1])<.01);assert(peaks[0]>3.7&&peaks[0]<3.9);
});
