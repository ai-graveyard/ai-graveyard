import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
function setup(){
 const win={};vm.runInNewContext(fs.readFileSync(new URL('../renderer.js',import.meta.url),'utf8'),{window:win});
 const r=Object.create(win.RiverRenderer.prototype);r.low=false;return r;
}
function skin(r,kind,phase){const vertices=[];r.vertex=(x,y,z,c,l,nx,ny,nz)=>vertices.push({p:[x,y,z],n:[nx,ny,nz],c:Array.from(c)});r.crocSkin(kind,phase);return vertices;}
const key=p=>p.map(n=>Math.round(n*1e7)).join(',');
test('tail/torso and torso/throat share every seam position, normal and colour throughout swimming',()=>{
 const r=setup();for(const low of [false,true])for(let i=0;i<24;i++){
  r.low=low;const phase=i*Math.PI/12;
  for(const [a,b,x] of [['tail','body',-5.2],['body','lower',-2.35]]){
   const ring=part=>new Map(skin(r,part,phase).filter(v=>Math.abs(v.p[0]-x)<1e-6).map(v=>[key(v.p),v]));
   const left=ring(a),right=ring(b);assert.equal(left.size,low?10:20);assert.equal(right.size,left.size);
   for(const [pos,v] of left){assert(right.has(pos),'open seam');assert.deepEqual(v.n,right.get(pos).n);assert.deepEqual(v.c,right.get(pos).c);}
  }
 }
});
test('merged tail/torso/lower skin and upper jaw have no open or duplicate surface edges',()=>{
 const r=setup();for(const low of [false,true])for(const phase of [0,1.3,3.1]){
  r.low=low;
  for(const parts of [['tail','body','lower'],['upper']]){
   const vertices=parts.flatMap(part=>skin(r,part,phase)),edges=new Map();
   for(let i=0;i<vertices.length;i+=3){const p=vertices.slice(i,i+3).map(v=>v.p),ab=p[1].map((v,j)=>v-p[0][j]),ac=p[2].map((v,j)=>v-p[0][j]);assert(Math.hypot(ab[1]*ac[2]-ab[2]*ac[1],ab[2]*ac[0]-ab[0]*ac[2],ab[0]*ac[1]-ab[1]*ac[0])>1e-9,'collapsed triangle');
    for(let e=0;e<3;e++){const k=[key(p[e]),key(p[(e+1)%3])].sort().join('|');edges.set(k,(edges.get(k)||0)+1);}
   }
   for(const [edge,count] of edges)assert.equal(count,2,`${parts}: unsealed or overlapping edge ${edge}`);
  }
 }
});
test('mouth corner roots coincide with the actual lower and hinged upper mesh in every mouth pose',()=>{
 const r=setup();for(const low of [false,true])for(const angle of [0,.15,.44,.88,1.408]){
  r.low=low;const upper=skin(r,'upper',0).map(v=>{const dx=v.p[0]+2.35,dy=v.p[1]-.34;return [-2.35+dx*Math.cos(angle)-dy*Math.sin(angle),.34+dx*Math.sin(angle)+dy*Math.cos(angle),v.p[2]];}),lower=skin(r,'lower',0).map(v=>v.p),surface=[...upper,...lower],roots=[];
  r.quad=(...args)=>roots.push(...args.slice(0,4));r.crocCheeks(angle);
  assert.equal(roots.length,12);for(const p of roots)assert(surface.some(q=>Math.hypot(...p.map((v,i)=>v-q[i]))<2e-7),`mouth root floats at ${p}`);
 }
});
function inside(p,mesh){
 let hits=0;const dx=.137,dy=.291,dz=1;
 for(let i=0;i<mesh.length;i+=3){const a=mesh[i].p,b=mesh[i+1].p,c=mesh[i+2].p,ux=b[0]-a[0],uy=b[1]-a[1],uz=b[2]-a[2],vx=c[0]-a[0],vy=c[1]-a[1],vz=c[2]-a[2],hx=dy*vz-dz*vy,hy=dz*vx-dx*vz,hz=dx*vy-dy*vx,det=ux*hx+uy*hy+uz*hz;if(Math.abs(det)<1e-10)continue;
  const sx=p[0]-a[0],sy=p[1]-a[1],sz=p[2]-a[2],u=(sx*hx+sy*hy+sz*hz)/det;if(u<0||u>1)continue;const qx=sy*uz-sz*uy,qy=sz*ux-sx*uz,qz=sx*uy-sy*ux,v=(dx*qx+dy*qy+dz*qz)/det;if(v<0||u+v>1)continue;if((vx*qx+vy*qy+vz*qz)/det>1e-8)hits++;
 }
 return hits%2===1;
}
test('shoulder/hip sockets and every tooth root stay embedded in the actual closed skin',()=>{
 for(const low of [false,true])for(const t of [0,.31,.67,1.11,1.63]){
  const r=setup();r.low=low;const trunk=['tail','body','lower'].flatMap(k=>skin(r,k,t*3.6)),upper=skin(r,'upper',t*3.6),sockets=[],teeth=[];
  r.vertex=r.shadow=r.crocSkin=r.crocScute=r.crocCheeks=r.round=()=>{};
  r.tube=(x,y,z,bx,by,bz,a,b,color)=>{if(color==='#608557')sockets.push([x,y,z]);};r.crocTooth=(x,y,z)=>teeth.push({p:[x,y,z],upper:!!r.jaw});
  r.croc(0,t,0,1.6,0,null);assert.equal(sockets.length,4);assert.equal(teeth.length,low?28:40);
  for(const p of sockets)assert(inside(p,trunk),`detached limb root ${p}`);
  for(const tooth of teeth)assert(inside(tooth.p,tooth.upper?upper:trunk),`floating ${tooth.upper?'upper':'lower'} tooth root ${tooth.p}, low=${low}`);
 }
});
