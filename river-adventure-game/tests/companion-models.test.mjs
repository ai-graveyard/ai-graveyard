import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import '../model.js';
function setup(){const win={River3D:globalThis.River3D};vm.runInNewContext(fs.readFileSync(new URL('../renderer.js',import.meta.url),'utf8'),{window:win});const r=Object.create(win.RiverRenderer.prototype);Object.assign(r,{count:0,stride:10,offset:0,bend:0,curveStart:-150,buffer:new Float32Array(2400000),curve:new Float64Array(1402),waterTint:new Float64Array(3),palette:{rock:'#8b9d91',deep:'#3e9f99'}});r.shadow=()=>{};return r;}
function prepare(r,phase){const g=new River3D.Game(13);g.start();g.time=phase;r.group={x:0,y:(.46+Math.sin(phase*4)*.055)*.9/1.45,z:0,scale:.9,cos:1,sin:0};r.paddleRun=g;r.paddleClock=phase;r.paddleFlow=0;r.paddleStates={};r.paddleMarks=[];r.paddleSerial=0;r.paddleRigs={};r.crewPoses={};for(const role of ['otter','duck','turtle']){const pose=River3D.paddlePose(phase,true);pose.phase=phase;pose.side=role==='otter'?1:-1;r.crewPoses[role]=pose;}r.strokePose=r.crewPoses.otter;}
test('rowing companions have two working arms without duplicate wings or forefeet',()=>{for(const role of ['duck','turtle'])for(const low of [false,true]){const r=setup();r.low=low;prepare(r,.22);const rounds=[],arms=[];r.round=(...a)=>rounds.push(a);const arm=r.paddleArm;r.paddleArm=function(...a){const p=arm.apply(this,a);arms.push(p);return p;};r.vertex=()=>{};r.person(0,.27,0,role,0);assert.equal(arms.length,2);if(role==='duck'){assert(!rounds.some(a=>a[6]==='#e9cf83'),'static wings overlap rowing arms');const feet=rounds.filter(a=>a[6]==='#e5a047');assert.equal(feet.length,2);assert(feet.every(a=>Math.abs(a[1]-a[4]/2-.015)<1e-8));}else{const feet=rounds.filter(a=>a[6]==='#86a66a'&&a[3]===.34);assert.equal(feet.length,2);assert(feet.every(a=>a[2]>0&&Math.abs(a[1]-a[4]/2-.015)<1e-8));}}});
test('every rowing arm remains reachable with its original fixed bone lengths through a stroke',()=>{for(const role of ['otter','duck','turtle']){const r=setup();r.vertex=()=>{};for(let frame=0;frame<48;frame++){prepare(r,frame/48);r.person(0,.27,0,role,frame/48);const rig=r.paddleRigs[role];for(const p of [rig.upperArm,rig.lowerArm]){assert(p.distance<p.upper+p.fore);assert(Math.abs(Math.hypot(...p.elbow.map((v,i)=>v-p.shoulder[i]))-p.upper)<1e-8);assert(Math.abs(Math.hypot(...p.hand.map((v,i)=>v-p.elbow[i]))-p.fore)<1e-8);}}}});
test('each animal eye intersects its head surface instead of floating ahead of it',()=>{for(const head of [[0,1.17,.16,.37,.365,.35],[0,.83,.51,.29,.285,.275],[0,1.36,.01,.48,.405,.4]])for(const side of [-1,1]){const r=setup(),x=side*(head[3]>.4?.21:head[3]>.3?.19:.145),y=head[1]+.11,levels=[];r.vertex=(px,py,pz,c)=>{if(c[0]<.2&&c[1]<.3)levels.push(((px-head[0])/head[3])**2+((py-head[1])/head[4])**2+((pz-head[2])/head[5])**2);};r.animalEye(x,y,head,false);assert(Math.min(...levels)<.99,'no embedded eye root');assert(Math.max(...levels)>1.05,'eye buried in head');}});
test('moss is part of the closed reef surface in both qualities',()=>{
 for(const low of [false,true])for(const reef of ['slab','spire','ridge']){
  const r=setup(),vertices=[];r.low=low;
  r.vertex=(x,y,z,c)=>vertices.push({p:[x,y,z],moss:c[0]===135/255&&c[1]===151/255});
  r.stone(0,0,reef);
  const edges=new Map();
  let mossFaces=0;
  for(let i=0;i<vertices.length;i+=3){
   const face=vertices.slice(i,i+3);
   if(face[0].moss){
    assert(face.every(v=>v.moss&&v.p[1]>.2));
    mossFaces++;
   }
   for(let j=0;j<3;j++){
    const a=face[j].p.join(','),b=face[(j+1)%3].p.join(','),key=a<b?a+'|'+b:b+'|'+a;
    edges.set(key,(edges.get(key)||0)+1);
   }
  }
  assert(mossFaces>=2);
  assert([...edges.values()].every(count=>count===2),'reef surface has an unmatched edge');
 }
});
test('river reefs use distinct gray stone colors in the red canyon',()=>{
 const r=setup(),colors=[];
 r.palette=r.scenePalette(250);
 assert.equal(r.palette.rock,'#b8704e');
 r.vertex=(x,y,z,c)=>colors.push(c);
 const stoneColors=[];
 for(const reef of ['slab','spire','ridge']){
  colors.length=0;r.stone(0,0,reef);
  assert(colors.every(c=>Math.max(...c)-Math.min(...c)<.09));
  stoneColors.push(colors[3].join(','));
 }
 assert.equal(new Set(stoneColors).size,3);
});
test('paired logs are staggered and angled, with long and short versions of each of two styles',()=>{
 for(const low of [false,true]){
  const r=setup();r.low=low;
  let shadow;
  r.shadow=(x,y,z,rx,rz,strength,yaw)=>{shadow={x,yaw};};
  const draw=(encounter,baseZ,safeLane,z=baseZ)=>{
   r.count=0;r.riverLog(0,{encounter,x:300,z,baseZ,safeLane});
   const mesh=r.buffer.slice(0,r.count);
   assert(mesh.every(Number.isFinite)&&mesh.length/r.stride/3<=224);
   const y=mesh.filter((_,i)=>i%r.stride===1),zRange=mesh.filter((_,i)=>i%r.stride===2);
   assert(Math.min(...y)<-.025);
   assert(zRange.every(z=>Math.abs(z)<2.2));
   return {mesh,span:Math.max(...zRange)-Math.min(...zRange),color:mesh.slice(3,6).join(','),shadow};
  };
  const styles=new Map();
  for(const encounter of [101,103,105,107])for(const safeLane of [-3.7,0,3.7]){
   const [a,b]=[-3.7,0,3.7].filter(z=>z!==safeLane).map(z=>draw(encounter,z,safeLane));
   assert.notEqual(a.color,b.color);
   assert(Math.abs(a.span-b.span)>.55);
   assert(Math.abs(a.shadow.x-b.shadow.x)>.35&&a.shadow.yaw*b.shadow.yaw<0);
   for(const log of [a,b])styles.set(log.color,[...(styles.get(log.color)||[]),log.span]);
  }
  assert.equal(styles.size,2);
  for(const spans of styles.values())assert(Math.max(...spans)-Math.min(...spans)>.7);
  assert.deepEqual(draw(101,0,3.7,.7),draw(101,0,3.7,-.7));
 }
});
test('fish and basket retain the surrounding raft transform through jumps and rotation',()=>{const r=setup();r.fish(0,0,0);const original=Array.from(r.buffer.subarray(0,r.count)),n=r.count;r.count=0;const group={x:7,y:4,z:-2,scale:.9,cos:Math.cos(.6),sin:Math.sin(.6)};r.group=group;r.fish(0,0,0);assert.equal(r.group,group);assert.equal(r.count,n);for(let i=0;i<n;i+=10){const x=original[i]*.9,y=original[i+1]*.9,z=original[i+2]*.9;assert(Math.abs(r.buffer[i]-(x*group.cos-y*group.sin+7))<1e-6);assert(Math.abs(r.buffer[i+1]-(x*group.sin+y*group.cos+4))<1e-6);assert(Math.abs(r.buffer[i+2]-(z-2))<1e-6);}r.count=0;r.basket(0,0,0,false);assert.equal(r.group,group);});
test('all repaired props produce finite geometry within the fixed buffer in both qualities',()=>{for(const low of [false,true]){const r=setup();r.low=low;const buffer=r.buffer;for(const draw of [()=>r.stone(0,0),()=>r.fish(0,0,0),()=>r.basket(0,0,0,false),()=>r.canoe(0,.22,0)]){r.count=0;draw();assert.equal(r.buffer,buffer);assert(r.count>0&&r.count<buffer.length);assert(Array.from(r.buffer.subarray(0,r.count)).every(Number.isFinite));}}});

test('moored canoe keeps its keel immersed and its gunwale clear throughout the bob cycle',()=>{for(const low of [false,true])for(const t of [0,.8,1.7,2.8,4]){const r=setup();r.low=low;r.bankVisitor=()=>{};r.bankScene(0,1,2,t,{});let min=Infinity,max=-Infinity;for(let i=0;i<r.count;i+=10){const b=r.buffer;if(Math.abs(b[i+3]-181/255)>1e-5||Math.abs(b[i+4]-117/255)>1e-5)continue;min=Math.min(min,b[i+1]);max=Math.max(max,b[i+1]);}assert(min<-.09,'keel floats above water');assert(max>.20,'gunwale submerged');}});
