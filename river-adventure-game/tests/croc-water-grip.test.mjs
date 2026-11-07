import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import '../model.js';
function setup(){
 const gl=new Proxy({getShaderParameter:()=>true,getProgramParameter:()=>true},{get:(o,k)=>k in o?o[k]:()=>({})});
 const win={River3D:globalThis.River3D,devicePixelRatio:1};vm.runInNewContext(fs.readFileSync(new URL('../renderer.js',import.meta.url),'utf8'),{window:win});
 const r=new win.RiverRenderer({getContext:()=>gl,getBoundingClientRect:()=>({width:390,height:844})});r.offset=0;r.bend=0;r.curveStart=-150;r.curve.fill(0);r.shadow=()=>{};return r;
}
test('swimming keeps palms and most of the lower jaw underwater with the torso straddling the surface',()=>{
 const r=setup(),skin=r.crocSkin,round=r.round,parts={};let feet=[];
 r.crocSkin=function(kind,phase){const start=this.count;skin.call(this,kind,phase);parts[kind]=this.buffer.slice(start,this.count);};
 r.round=function(x,y,z,w,h,d,color){const start=this.count;round.apply(this,arguments);if(color==='#8da66d')for(let i=start;i<this.count;i+=10)feet.push(this.buffer[i+1]);};
 for(const low of [false,true])for(const time of [0,.4,1.2]){
  r.low=low;r.count=0;feet=[];r.croc(0,time,0,.12,0,null);
  const ratio=mesh=>{let wet=0;for(let i=1;i<mesh.length;i+=10)if(mesh[i]<0)wet++;return wet/(mesh.length/10);};
  assert(ratio(parts.body)>.35&&ratio(parts.body)<.7,'torso is above the water or completely submerged');assert(ratio(parts.lower)>.8,'lower jaw stands above the water');assert(Math.max(...feet)<-.3,'a swimming foot stands on the surface');
  assert.equal(r.crocImmersion,0);
 }
 r.endingCrocPose={x:0,z:0,y:0,yaw:0,walk:true};r.count=0;feet=[];r.croc(0,0,0,.12,0,null);assert(Math.min(...feet)>.1,'land gait retains swim immersion');
});
test('rendered upper and lower tooth tips clamp the real rear hull section until the break',()=>{
 const r=setup(),original=r.crocTooth,croc=r.croc;let front=0; r.croc=function(){var start=this.count;croc.apply(this,arguments);front=-Infinity;for(var i=start;i<this.count;i+=10)front=Math.max(front,this.buffer[i]);};let tips={lower:[],upper:[]};
 r.crocTooth=function(x,y,z,h,lean){const upper=!!this.jaw,vertex=this.vertex;let tip;
  this.vertex=function(a,b,c){const at=this.count;vertex.apply(this,arguments);if(Math.abs(a-x-lean)<1e-8&&Math.abs(b-y-h)<1e-8)tip=Array.from(this.buffer.subarray(at,at+3));};
  original.apply(this,arguments);this.vertex=vertex;if(z>0)tips[upper?'upper':'lower'].push(tip);
 };
 for(const low of [false,true])for(const quiet of [false,true])for(const skin of [0,4])for(const z of [-3.7,0,3.7])for(const t of [1.45,1.8,2.25,2.65]){
  r.low=low;r.reducedMotion=quiet;const g=new River3D.Game(137);g.start();g.mode='over';g.skin=skin;g.z=z;const before=JSON.stringify(g),phase=quiet?2.25:t,p=r.crocGrip(g,phase);tips={lower:[],upper:[]};r.count=0;r.defeatScene(g,t);
  for(const part of ['lower','upper']){const actual=tips[part][p[part].index],expected=p[part];for(let k=0;k<3;k++)assert(Math.abs(actual[k]-expected[['x','y','z'][k]])<.00001,`${part} contact diverges from mesh`);}
  assert(Math.abs(p.lower.y-p.bottom-.0175)<1e-8);assert(Math.abs(p.top-p.upper.y-.0175)<.0003,'upper teeth float above the hull');assert(Math.abs(p.lower.x-p.contactX)<1e-8);assert(p.upper.x>-(skin===4?1.485:1.65)&&p.upper.x<-.5,'upper teeth miss the rear hull material');
  assert(p.open<.3,'gripping jaw stays wide open');assert(front<.5,'snout reaches the captain area');assert.equal(JSON.stringify(g),before);assert.equal(r.crocContactPose,null);assert.equal(r.crocImmersion,0);
 }
});
test('closing completes before the grip caption and the jaw stays clamped until crush starts',()=>{
 const r=setup(),g={skin:0,z:0},start=r.crocGrip(g,.9),grip=r.crocGrip(g,River3D.defeatStory.grip),late=r.crocGrip(g,2.6),broken=r.crocGrip(g,3);
 assert(start.open>1.2);assert(grip.open<.3);assert(Math.abs(grip.open-late.open)<.0001);assert(broken.open<grip.open*.5);
});

test('the capture bites farther into the hull while the opening stays back for the near miss',()=>{
 const r=setup();for(const skin of [0,4]){const g=new River3D.Game(137);g.start();g.skin=skin;const oldX=skin===4?-1.30:-1.42,shallow=r.crocGrip(g,2,oldX),deep=r.crocGrip(g,2);assert(deep.lower.x-shallow.lower.x>.54);assert(deep.lower.x-shallow.lower.x<.61);const opening=r.openingPose(g,River3D.openingStory.chaseDuration),reference=r.crocGrip(g,River3D.openingStory.chaseDuration,oldX);assert(Math.abs(opening.crocX-(oldX-(reference.lower.x-reference.x)+.55))<1e-9);}
});
