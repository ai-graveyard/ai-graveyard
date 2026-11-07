import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const ctx=vm.createContext({});ctx.window=ctx;
for(const file of ['model.js','renderer.js'])vm.runInContext(fs.readFileSync(new URL('../'+file,import.meta.url),'utf8'),ctx);
function cloth(skin,t,scale=1,spread=1,low=false,reducedMotion=false){
 const r=Object.create(ctx.RiverRenderer.prototype),faces=[];Object.assign(r,{low,reducedMotion});
 r.tri=(a,b,c,color)=>faces.push({points:[a,b,c],color});
 r.quad=(a,b,c,d,color)=>faces.push({points:[a,b,c,d],color});
 r.flagCloth(0,0,0,skin,t,scale,spread);return faces;
}
test('gold flag and its coin emblem stay fixed through the animation clock in both qualities',()=>{
 for(const low of [false,true])for(const scale of [1,1.45])for(const spread of [.85,1]){
  const first=cloth(5,0,scale,spread,low);
  for(let i=1;i<=40;i++)assert.deepEqual(cloth(5,i/20,scale,spread,low),first);
 }
});
test('coin engraving sits strictly in front of its disk at every scale and cloth phase',()=>{
 const accent=ctx.River3D.flagStyle(5).accent;
 for(const scale of [1,1.45])for(let i=0;i<24;i++){
  const faces=cloth(5,i/12,scale),disk=faces.filter(f=>f.color===accent&&f.points.length===3),bar=faces.find(f=>f.color==='#b77c2e');
  assert.equal(disk.length,12);assert(bar);
  const diskX=disk[0].points[0][0];
  assert(bar.points.every(p=>diskX-p[0]>.01*scale),'coplanar coin disk and engraving cause depth flicker');
 }
});
