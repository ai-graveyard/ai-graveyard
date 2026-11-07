import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

function pose(low,open){
 const win={};vm.runInNewContext(fs.readFileSync(new URL('../renderer.js',import.meta.url),'utf8'),{window:win});
 const r=Object.create(win.RiverRenderer.prototype);Object.assign(r,{low,offset:0,bend:0,curveStart:-150,curve:new Float64Array(1402),buffer:new Float32Array(2400000),stride:10,count:0});
 r.shadow=r.crocScute=r.round=r.tube=()=>{};
 const skin=r.crocSkin,tooth=r.crocTooth,parts={},rows={upper:[],lower:[]};
 r.crocSkin=function(kind,phase){const start=this.count;skin.call(this,kind,phase);parts[kind]=this.buffer.slice(start,this.count);};
 r.crocTooth=function(x,y,z,h,lean){
  const upper=!!this.jaw,vertex=this.vertex,start=this.count;let tip;
  this.vertex=function(a,b,c){const at=this.count;vertex.apply(this,arguments);if(Math.abs(a-x-lean)<1e-8&&Math.abs(b-y-h)<1e-8)tip=Array.from(this.buffer.subarray(at,at+3));};
  tooth.apply(this,arguments);this.vertex=vertex;
  if(z>0){const mesh=this.buffer.subarray(start,this.count);let rootY=0,rootX=0,n=0;
   // The base ring has u=0; identify it by its unchanged local Y.
   this.vertex=function(a,b,c){const at=this.count;vertex.apply(this,arguments);if(Math.abs(b-y)<1e-8){rootX+=this.buffer[at];rootY+=this.buffer[at+1];n++;}};
   const keep=this.count;tooth.apply(this,arguments);this.count=keep;this.vertex=vertex;
   rows[upper?'upper':'lower'].push({x:rootX/n,y:rootY/n,tip});assert(mesh.length>0);
  }
 };
 r.croc(0,0,0,open,0,null);return {parts,rows};
}

test('closed upper teeth sit halfway between consecutive lower teeth in both qualities',()=>{
 for(const low of [false,true]){
  const {rows}=pose(low,0),lower=rows.lower,upper=rows.upper;assert.equal(lower.length,low?7:10);assert.equal(upper.length,lower.length);
  for(let i=0;i<lower.length-1;i++){
   const phase=(upper[i].x-lower[i].x)/(lower[i+1].x-lower[i].x);
   assert(phase>.3&&phase<.7,`opposed tooth tips line up at ${i}, low=${low}: phase=${phase}`);
   const lowerTip=lower[i].tip[1]+(lower[i+1].tip[1]-lower[i].tip[1])*phase;
   assert(upper[i].tip[1]<lowerTip-.005,`teeth fail to overlap vertically at ${i}, low=${low}`);
  }
 }
});

test('the round snout closes at zero opening and separates continuously when opened',()=>{
 function front(mesh){let p=[-Infinity,0,0];for(let i=0;i<mesh.length;i+=10)if(mesh[i]>p[0])p=Array.from(mesh.subarray(i,i+3));return p;}
 for(const low of [false,true]){
  let last=-Infinity;
  for(const open of [0,.03,.06,.12,.3,.6,1,1.6]){
   const {parts}=pose(low,open),a=front(parts.upper),b=front(parts.lower),gap=a[1]-b[1];
   if(open===0)assert(Math.hypot(...a.map((v,i)=>v-b[i]))<.035,`closed snout keeps an open gap, low=${low}`);
   assert(gap>last,'mouth moves backwards while opening');last=gap;
  }
 }
});

function inside(p,mesh){
 let hits=0;const dx=.137,dy=.291,dz=1;
 for(let i=0;i<mesh.length;i+=30){
  const ax=mesh[i],ay=mesh[i+1],az=mesh[i+2],ux=mesh[i+10]-ax,uy=mesh[i+11]-ay,uz=mesh[i+12]-az,vx=mesh[i+20]-ax,vy=mesh[i+21]-ay,vz=mesh[i+22]-az,hx=dy*vz-dz*vy,hy=dz*vx-dx*vz,hz=dx*vy-dy*vx,det=ux*hx+uy*hy+uz*hz;if(Math.abs(det)<1e-10)continue;
  const sx=p[0]-ax,sy=p[1]-ay,sz=p[2]-az,u=(sx*hx+sy*hy+sz*hz)/det;if(u<0||u>1)continue;const qx=sy*uz-sz*uy,qy=sz*ux-sx*uz,qz=sx*uy-sy*ux,v=(dx*qx+dy*qy+dz*qz)/det;if(v<0||u+v>1)continue;if((vx*qx+vy*qy+vz*qz)/det>1e-8)hits++;
 }
 return hits%2===1;
}

test('interlocking tooth tips clear the opposite gum when the mouth is fully closed',()=>{
 for(const low of [false,true]){
  const {parts,rows}=pose(low,0);
  for(const part of ['upper','lower'])for(const tooth of rows[part])assert(!inside(tooth.tip,parts[part==='upper'?'lower':'upper']),`${part} tooth pierces the opposite gum, low=${low}, x=${tooth.tip[0]}`);
 }
});
