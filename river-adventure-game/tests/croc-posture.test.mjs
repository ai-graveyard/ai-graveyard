import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
function setup(){
 const win={};vm.runInNewContext(fs.readFileSync(new URL('../renderer.js',import.meta.url),'utf8'),{window:win});
 const r=Object.create(win.RiverRenderer.prototype);r.low=false;r.offset=0;r.bend=0;r.curveStart=-150;r.curve=new Float64Array(1402);r.buffer=new Float32Array(2400000);r.stride=10;r.count=0;r.shadow=()=>{};
 const skin=r.crocSkin;r.crocSkin=function(kind,phase){const start=this.count;skin.call(this,kind,phase);this.parts[kind]=this.buffer.slice(start,this.count);};
 r.drawPose=open=>{r.count=0;r.parts={};r.croc(5,0,0,open,0,null);return r.parts;};return r;
}
function meanY(mesh){let total=0;for(let i=1;i<mesh.length;i+=10)total+=mesh[i];return total/(mesh.length/10);}
test('opening raises the chest, lower jaw and skull together while the tail stays anchored',()=>{
 const r=setup(),closed=r.drawPose(0),wide=r.drawPose(1.6);
 assert(meanY(wide.body)-meanY(closed.body)>.15,'chest does not participate');
 assert(meanY(wide.lower)-meanY(closed.lower)>.8,'neck/lower jaw remains rigidly flat');
 assert(meanY(wide.upper)-meanY(closed.upper)>1.5,'skull is not lifted');
 for(let i=0;i<wide.tail.length;i+=10)for(let k=0;k<3;k++)assert(Math.abs(wide.tail[i+k]-closed.tail[i+k])<1e-5,'tail rotates with the head');
 assert.equal(r.crocSpine,0);assert.equal(r.jaw,null);assert.equal(r.group,null);
});
test('blended waist normals remain perpendicular to the deformed skin without a fold',()=>{
 const r=setup();r.crocSpine=.24;
 for(const x of [-4.701,-4.699,-4.3,-3.8,-2.951,-2.949]){
  r.count=0;r.vertex(x,.5,0,[1,1,1],1,0,1,0,1);r.vertex(x-.002,.5,0,[1,1,1],1,0,1,0,1);r.vertex(x+.002,.5,0,[1,1,1],1,0,1,0,1);
  const b=r.buffer,tx=b[20]-b[10],ty=b[21]-b[11],length=Math.hypot(tx,ty),normal=Math.hypot(b[6],b[7]);
  assert(tx>0,'waist folds back on itself');assert(Math.abs((b[6]*tx+b[7]*ty)/(length*normal))<.001,'normal ignores spine bend');
 }
});
test('posed tail/chest/throat seams stay closed in both qualities throughout opening and redraws',()=>{
 const r=setup(),buffer=r.buffer;
 for(const low of [false,true])for(const open of [0,.12,.4,.8,1.2,1.6]){
  r.low=low;const parts=r.drawPose(open),edges=new Map();
  for(const part of ['tail','body','lower']){const b=parts[part];for(let i=0;i<b.length;i+=30){const keys=[0,10,20].map(k=>Array.from(b.subarray(i+k,i+k+3)).join(','));for(let e=0;e<3;e++){const key=[keys[e],keys[(e+1)%3]].sort().join('|');edges.set(key,(edges.get(key)||0)+1);}}}
  for(const count of edges.values())assert.equal(count,2,'posed skin tears at a seam');
  const pose=r.buffer.slice(0,r.count);r.drawPose(open);assert.deepEqual(r.buffer.slice(0,r.count),pose,'frozen pose drifts');assert.equal(r.buffer,buffer);assert.equal(r.crocSpine,0);
  for(const n of pose)assert(Number.isFinite(n));
 }
});
