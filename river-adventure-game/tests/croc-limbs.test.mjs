import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import '../model.js';
function setup(){
 const win={River3D:globalThis.River3D};
 vm.runInNewContext(fs.readFileSync(new URL('../renderer.js',import.meta.url),'utf8'),{window:win});
 const r=Object.create(win.RiverRenderer.prototype);
 r.offset=0;r.bend=0;r.buffer=new Float32Array(2400000);r.curve=new Float64Array(1402);r.count=0;r.stride=10;r.prepareCurve(0);r.shadow=()=>{};
 return r;
}
function limbs(r,time,walking){
 const toes=[],claws=[],palms=[];
 r.tube=(ax,ay,az,bx,by,bz,r1,r2,color)=>{if(color==='#9db47b')toes.push({ax,ay,az,bx,by,bz});if(color==='#e3d5a8')claws.push({ax,ay,az,bx,by,bz});};
 r.round=(x,y,z,w,h,d,color)=>{if(color==='#8da66d')palms.push({x,y,z,w,h,d});};
 r.crocSkin=r.crocScute=r.crocTooth=()=>{};
 r.endingCrocPose=walking?{x:0,z:0,y:2,yaw:0,walk:true}:null;
 r.croc(0,time,0,.15,0,null);
 return {toes,claws,palms};
}
test('every toe and claw points toward the snout in both qualities and both gaits',()=>{
 for(const low of [false,true])for(const walking of [false,true])for(const time of [0,.2,.65,1.1,1.8,2.7]){
  const r=setup();r.low=low;const pose=limbs(r,time,walking);
  assert.equal(pose.toes.length,12);assert.equal(pose.claws.length,12);
  for(const segment of [...pose.toes,...pose.claws])assert(segment.bx>segment.ax,'a digit points toward the tail');
 }
});
test('land gait has planted soles, lifted returns and synchronized opposite diagonals',()=>{
 const r=setup();let planted=0,lifted=0;
 for(let frame=0;frame<120;frame++){
  const t=frame/120*Math.PI*2/3.6,p=limbs(r,t,true).palms;
  // Undo the world body bob; compare each sole to the staged road surface.
  const heights=p.map(f=>2*(f.y-f.h/2)+Math.sin(t*7.2)*.018-.12);
  assert(heights.every(y=>y>=.009999),'a planted sole penetrates the road');
  if(heights[0]<.011)planted++;if(heights[0]>.2)lifted++;
  assert(Math.abs(heights[0]-heights[3])<1e-10);assert(Math.abs(heights[1]-heights[2])<1e-10);
 }
 assert(planted>=70&&planted<=80);assert(lifted>15);
});
test('both gaits retain finite geometry and the fixed mesh buffer over a complete cycle',()=>{
 const r=setup(),buffer=r.buffer;let high=0,low=0;
 for(const quality of [false,true])for(const walking of [false,true])for(let frame=0;frame<16;frame++){
  r.low=quality;r.count=0;r.endingCrocPose=walking?{x:0,z:0,y:2,yaw:.5,walk:true}:null;
  r.croc(0,frame/16*Math.PI*2/3.6,0,frame/16,0,null);
  assert.equal(r.buffer,buffer);assert.equal(r.group,null);assert.equal(r.jaw,null);
  assert(r.count<buffer.length);for(let i=0;i<r.count;i++)assert(Number.isFinite(buffer[i]));
  const triangles=r.count/r.stride/3;if(quality)low=Math.max(low,triangles);else high=Math.max(high,triangles);
 }
 assert(high<12000&&low<6000);assert(low<high);console.log('Crocodile triangles fine / low:',high,low);
});
