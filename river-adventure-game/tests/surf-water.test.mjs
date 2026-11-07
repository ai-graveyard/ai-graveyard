import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import '../model.js';
function setup(){const gl=new Proxy({getShaderParameter:()=>true,getProgramParameter:()=>true},{get:(o,k)=>k in o?o[k]:()=>({})});const win={River3D:globalThis.River3D,devicePixelRatio:1};vm.runInNewContext(fs.readFileSync(new URL('../renderer.js',import.meta.url),'utf8'),{window:win});const r=new win.RiverRenderer({getContext:()=>gl,getBoundingClientRect:()=>({width:390,height:844})});const g=new River3D.Game(137);g.start();g.entities=[];g.bankSites=[];r.offset=g.distance;r.bend=0;r.prepareCurve(g.distance);return {r,g};}
test('stored surfing produces no spray or wake, and active water geometry stops on expiry',()=>{
 const {r,g}=setup();g.goldCharge=1;r.surfWater(g);assert.equal(r.count,0);g.goldBoost=2;r.surfWater(g);assert(r.count>1000);r.count=0;g.goldBoost=0;r.surfWater(g);assert.equal(r.count,0);
});
test('surf trails extend aft, droplets rise beside the hull, and all lanes stay inside the river',()=>{
 const {r,g}=setup();g.goldBoost=2;
 for(const low of [false,true])for(const z of [-3.7,0,3.7])for(const time of [0,.13,.4,.85,1.6]){r.low=low;g.z=z;g.time=time;r.count=0;r.surfWater(g);let minX=Infinity,maxY=0;
  for(let i=0;i<r.count;i+=r.stride){const x=r.buffer[i],y=r.buffer[i+1],actualZ=r.buffer[i+2]-Math.sin(x*.018)*3-Math.sin(x*.041)*1.5;minX=Math.min(minX,x);maxY=Math.max(maxY,y);assert(Math.abs(actualZ)<6.55);for(let j=0;j<r.stride;j++)assert(Number.isFinite(r.buffer[i+j]));}
  assert(minX<-7&&minX>-7.4);assert(maxY>.55&&maxY<1.7);assert(r.count/r.stride/3<1800);
 }
});
test('low quality and reduced motion retain clear foam with bounded simpler geometry',()=>{
 const {r,g}=setup();g.goldBoost=2;g.time=.3;r.surfWater(g);const fine=r.count;r.count=0;r.low=true;r.surfWater(g);const low=r.count;assert(low<fine);r.count=0;r.reducedMotion=true;r.surfWater(g);const quiet=r.buffer.slice(0,r.count);assert(r.count>0&&r.count<low);r.count=0;g.time=1.7;r.surfWater(g);assert.deepEqual(r.buffer.slice(0,r.count),quiet);
});
test('surf render geometry leaves physics and fixed GPU allocations untouched',()=>{
 const {r,g}=setup();g.goldBoost=2;g.time=.4;const before=JSON.stringify(g),buffer=r.buffer;r.surfWater(g);assert.equal(JSON.stringify(g),before);assert.equal(r.buffer,buffer);assert(r.count<buffer.length);for(const state of [{mode:'pause'},{stumble:1},{y:2}]){const h=new River3D.Game();h.start();h.goldBoost=2;Object.assign(h,state);r.count=0;r.surfWater(h);assert.equal(r.count,0);}
});
test('actual surfing releases use water particles and repeated releases never grow the particle pool',()=>{
 const {r,g}=setup();g.goldBoost=2;r.burst(g,'boost',1);assert(r.particles.length>0);assert(r.particles.every(p=>p.surf&&p.vx<0&&p.color==='#eafff9'));for(let i=0;i<100;i++)r.burst(g,'boost',1+i/100);assert(r.particles.length<=80);r.particles=[];g.goldBoost=0;r.burst(g,'boost',2);assert(r.particles.every(p=>!p.surf));
});
test('full surfing scenes with all companions and capped water particles fit the existing GPU buffer in both qualities',()=>{
 const {r,g}=setup(),buffer=r.buffer;g.boardBuddy('otter');g.boardBuddy('duck');g.boardBuddy('turtle');g.goldBoost=2;g.time=.3;g.fishCargo={from:0};
 for(const low of [false,true])for(const distance of [100,180,360,520,1180]){r.low=low;g.distance=distance;g.entities=[];g.generate();r.particles=[];for(let i=0;i<20;i++)r.burst(g,'boost',.3);r.render(g,.5,false,1/60);assert.equal(r.buffer,buffer);assert(r.count<buffer.length);assert(r.triangles<(low?50000:80000));assert(r.particles.length<=80);}
});
