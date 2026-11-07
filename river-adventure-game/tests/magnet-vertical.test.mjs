import test from 'node:test';
import assert from 'node:assert/strict';
import '../model.js';
import '../four-stage.js';
const R=globalThis.River3D;
function world(y=0){const g=new R.Game(305029);g.start();g.routeEvents=[];g.entities=[];g.flags=[];g.bankSites=[];g.gap=20;g.y=y;g.vy=0;g.events=[];return g;}
function coin(g,y,z=0,x=g.distance+1){return g.add('coin',x,y,{z});}
test('magnet catches same-lane coins above the raft which ordinary pickup cannot reach',()=>{
 for(const active of [false,true]){const g=world();g.flagMagnet=active?8:0;const c=coin(g,4);g.step(1/120);assert.equal(c.done,active);assert.equal(g.coins,active?1:0);if(active){const e=g.drain().find(e=>e.type==='coin');assert.equal(e.data.magnet,true);assert.equal(g.coinChain,0);}}
});
test('an airborne raft attracts coins below it in its own and adjacent lanes',()=>{
 for(const z of [-3.7,0,3.7]){const g=world(3);g.flagMagnet=8;const c=coin(g,1,z);g.step(1/120);assert(c.done);assert.equal(g.coins,1);assert(g.y>2.9);assert(g.drain().find(e=>e.type==='coin').data.magnet);assert.equal(g.coinChain,0);}
});
test('one lane width is an inclusive vertical limit and out-of-range coins remain in the river',()=>{
 const g=world();g.flagMagnet=8;const edge=coin(g,4.7),outside=coin(g,4.701);g.step(1/120);assert(edge.done);assert(!outside.done);assert.equal(g.coins,1);
 const high=world(6);high.flagMagnet=8;const low=coin(high,1);high.step(1/120);assert(!low.done);assert.equal(high.coins,0);
});
test('vertical magnet keeps the longitudinal window, duplicate protection and five-coin rules',()=>{
 const g=world();g.flagMagnet=8;for(let i=0;i<5;i++)coin(g,4,0);const future=coin(g,4,0,g.distance+50);g.step(1/120);g.step(1/120);assert.equal(g.coins,5);assert(!future.done);assert.equal(g.goldBoost,0);assert.equal(g.goldCharge,0);assert.equal(g.coinChain,0);
 for(let i=0;i<5;i++)coin(g,1,0);g.step(1/120);assert.equal(g.coins,10);assert.equal(g.coinChain,5);assert(g.goldBoost>0);
});
test('expiry, pause and capsize do not allow vertical collection',()=>{
 for(const state of ['expired','paused','capsized']){const g=world();g.flagMagnet=state==='expired'?.001:8;const c=coin(g,4);if(state==='paused')g.mode='pause';if(state==='capsized')g.stumble=2;g.step(1/120);assert(!c.done);assert.equal(g.coins,0);}
});
test('magnet still covers the existing far water lane when the raft is at the opposite edge',()=>{
 const g=world();g.z=g.targetZ=3.7;g.flagMagnet=8;const water=coin(g,1,-3.7),air=coin(g,4,-3.7);g.step(1/120);assert(water.done);assert(air.done);assert.equal(g.coins,2);
});
