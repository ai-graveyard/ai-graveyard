import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import '../model.js';
function setup(){
 const gl=new Proxy({getShaderParameter:()=>true,getProgramParameter:()=>true},{get:(o,k)=>k in o?o[k]:()=>({})});
 const win={River3D:globalThis.River3D,devicePixelRatio:1};
 vm.runInNewContext(fs.readFileSync(new URL('../renderer.js',import.meta.url),'utf8'),{window:win});
 const r=new win.RiverRenderer({getContext:()=>gl,getBoundingClientRect:()=>({width:390,height:844})});
 const g=new River3D.Game(137);g.start();g.crew=['otter','duck','turtle'];g.entities=[];g.bankSites=[];
 r.offset=0;r.bend=0;r.prepareCurve(0);return {r,g};
}
test('all boat skins keep every rower working across all playable lanes and turns',()=>{
 const {r,g}=setup();r.vertex=()=>{};
 for(const low of [false,true])for(const skin of [0,1,2,3,4])for(const z of [-3.7,0,3.7])for(const turn of [-8,0,8]){
  r.low=low;g.skin=skin;g.z=z;g.lateralVelocity=turn;const wet=new Set(),dry=new Set();
  for(let frame=0;frame<75;frame++){
   g.time=frame/60;g.paddlePhase=(g.time/1.25)%1;r.raft(g,g.time,false);
   for(const role of ['captain','otter','duck','turtle']){
    const s=r.paddleStates[role];assert(s.active,`${skin}/${z}/${turn}/${role} stowed`);
    assert(Math.abs(s.z)<6.55,'blade crosses bank');if(s.driving)wet.add(role);if(!s.contact)dry.add(role);
   }
  }
  assert.equal(wet.size,4);assert.equal(dry.size,4);
 }
});
test('complete hull including its lifebuoy fits within one lane in both qualities',()=>{
 const {r,g}=setup();g.crew=[];
 for(const low of [false,true])for(const skin of [0,1,2,3,4]){
  r.low=low;g.skin=skin;r.count=0;r.raft(g,0,false,true);let min=Infinity,max=-Infinity;
  for(let i=0;i<r.count;i+=r.stride){const x=r.buffer[i],z=r.buffer[i+2]-Math.sin(x*.018)*3-Math.sin(x*.041)*1.5;min=Math.min(min,z);max=Math.max(max,z);}
  assert(max-min<3.7,`${skin}: width ${max-min}`);assert(max-min>2,'boat became too small');
 }
});
test('shrinking the boat leaves simulation state and GPU allocation untouched',()=>{
 const {r,g}=setup(),buffer=r.buffer;g.z=3.7;g.lateralVelocity=8;g.y=4;g.angle=1.2;
 const before=JSON.stringify(g);r.raft(g,1,false);assert.equal(JSON.stringify(g),before);assert.equal(r.buffer,buffer);assert(r.count<buffer.length);
 for(let i=0;i<r.count;i++)assert(Number.isFinite(r.buffer[i]));
 assert.equal(r.group,null);assert.equal(r.actor,undefined);
});
