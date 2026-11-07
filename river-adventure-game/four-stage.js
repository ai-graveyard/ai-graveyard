(function(root){
'use strict';
// Timed campaign over the existing input, swept collisions and 120Hz physics.
var R=root.River3D,P=R.Game.prototype,B=R.balance;
var SPEEDS=[8,12,20,36],TIMES=[30,40,50,60],CROCS=[9,12.4,21.1,37.8],CAPS=[16,20,28,44];
var GAP_CAPS=[20,30,40,50];
var CRASH_EXTRA=[0,0,0,0];
var REVISION='jump-recovery-20261105';
var FIRST_RECOVERY={speedLoss:1,boostSeconds:2};
var ENDLESS_ACCEL=.12;
var PROJECTILE_WARNING=3.5;
var STONE_FLIGHT=1.05;
var COUNTS=[4,6,8,10],CUES=[2.5,2.3,2,1.6],BUDDY={otter:[14,16,18,20],duck:[16,18,20,22],turtle:[18,20,22,24]};
var NAMES=['青苔河谷','红岩急流','失落遗迹','灯火营地'],NOMINAL=[0,240,720,1720,3880];
function rowTimes(count,first,last){var times=[];for(var i=0;i<count;i++)times.push(first+i*(last-first)/(count-1));return times;}
var ROWS=[[10,15,20,25],rowTimes(10,6,32),rowTimes(20,6,41),rowTimes(50,4,52)];
var RAMPS=[[],[12.5,23.5],[15,28],[19.5,35]],BANKS=[[],[34,37,39],[43,47,49],[53,57,59]];
var PICKUP_GAP=15,LANES=[-3.7,0,3.7];
B.version='river-four-stage-obstacle-hard-20261105';B.campaign=true;B.stageSpeeds=SPEEDS;B.stageDurations=TIMES;B.boatBase=8;B.crocBaseByJourney=CROCS.slice();B.speedCap=44;
B.gap.hardCap=GAP_CAPS[3];B.gap.hardCapsByStage=GAP_CAPS.slice();
B.gold.extra=4;B.gold.seconds=2;B.combo.extra=4;B.combo.seconds=2;B.kick.extra=5;B.kick.seconds=1.2;B.tow.extra=4;B.tow.seconds=1.5;B.recover.extra=2;
B.newcomerCrash.throughJourney=1e9;B.hazardCueSeconds=2.5;B.speedRevision=B.version;
var changes={c13:{name:'三关远航',label:'单局完成3关'},c14:{label:'完整通过1关，期间零碰撞'},c19:{name:'四关远征',label:'单局完成全部4关',target:4},c20:{label:'第3、4关连续完整通过且零碰撞',target:2},c21:{label:'单局在6次不同借浪中空翻并落稳',target:6},c22:{label:'单局成功送鱼3次',target:3},c24:{label:'第3或第4关内：绕障2次、起跳越障2次、借浪空翻落稳1次、送鱼1次，零碰撞完成本关'}};
R.honors.forEach(function(h){if(changes[h.id])Object.keys(changes[h.id]).forEach(function(k){h[k]=changes[h.id][k];});});
R.learningRoute.forEach(function(l){l.stage=l.id==='flip'||l.id==='fish'||l.id==='camp'||l.id==='tow'?1:l.id==='wind'?2:0;});
function idx(g){return Math.max(0,Math.min(3,g.stageIndex||0));}
function elapsed(g){return Math.max(0,g.time-(g.stageStartedAt||0));}
function ensure(g){if(g.stageIndex!==undefined)return;g.stageIndex=0;g.stageStartedAt=0;g.stageStartDistance=0;g.stageHistory=[];g.routeEvents=timeline(0,g.seed);g.routeSpawned=[];g.routeRampEnds=[];g.campaignWon=false;g.crewDurations={};g.routeAudit=[];}
// Compile one immutable, whole-stage distance plan. Spawn timing never changes
// geometry, so a boost, capsize or later obstacle cannot invalidate a pickup.
function timeline(n,seed,pace){
 var list=[],T=TIMES[n],v=pace||SPEEDS[n],cap=pace?pace+8:CAPS[n],count=COUNTS[n],lanes=LANES,used=[];
 function add(e){e.x=e.at*v;list.push(e);return e;}
 RAMPS[n].forEach(function(t,i){add({kind:'ramp',at:t,z:i?-3.7:3.7,power:i?13.5:8.3});});
 BANKS[n].forEach(function(t,i){add({kind:'bank',at:t,bankKind:i,side:i===0?-1:1});});
 var previous=1;
 ROWS[n].forEach(function(t,i){
  // Adjacent safe columns avoid an unreactable double swipe in the finale.
  var phrase=[1,2,3,3][n],next=previous;
  if(i%phrase===0)next=(Math.floor(i/phrase)+(seed>>>0)+n)%2?previous+1:previous-1;
  next=Math.max(0,Math.min(2,next));
  var e={kind:'row',at:t,safe:lanes[next],row:i,forced:false};
  list.forEach(function(r){if(r.kind==='ramp'&&t*v>r.x-12&&t*v<r.x+cap*2.6){e.safe=r.z;e.forced=true;}});
  list.forEach(function(r){if(r.kind==='bank'&&Math.abs(t*v-r.x)<cap*1.3){e.safe=r.side*3.7;e.forced=true;}});
  previous=lanes.indexOf(e.safe);add(e);
 });
 var rows=list.filter(function(e){return e.kind==='row';});
 for(var ri=1;ri<rows.length;ri++)if(Math.abs(rows[ri].safe-rows[ri-1].safe)>3.8&&!rows[ri-1].forced)rows[ri-1].safe=0;
 if(n>=2){
  // Aim at the lane the raft can actually approach in, between obstacle rows.
  var slots=[];
  for(var si=1;si<rows.length;si++){
   var before=rows[si-1],after=rows[si];
   slots.push({at:(before.at+after.at)*.5,target:before.safe});
  }
  if(n===3)slots.push({at:56,target:0});
  slots=slots.filter(function(slot){return list.every(function(e){
   var dx=slot.at*v-e.x;
   return !(e.kind==='ramp'&&dx>-12&&dx<cap*2.6)&&!(e.kind==='bank'&&Math.abs(dx)<cap*1.3&&slot.target===e.side*3.7);
  });});
  var throws=n===2?[24,32,40]:[8,16,24,32,40,48,56];
  throws.forEach(function(t,i){
   var best=0;
   for(var j=1;j<slots.length;j++)if(Math.abs(slots[j].at-t)<Math.abs(slots[best].at-t))best=j;
   var slot=slots.splice(best,1)[0],side=slot.target?Math.sign(slot.target):(i+n)%2?1:-1;
   add({kind:'throw',at:slot.at,side:side,target:slot.target,id:i});
  });
 }
 function points(e,x){if(e.kind!=='gold')return [x];var out=[];for(var c=0;c<5;c++)out.push(x+(c-4)*v*.2);return out;}
 function clear(e,x,z){
  if(e.after!==undefined&&x<e.after)return false;
  if(e.flagKind==='magnet'&&!list.some(function(r){return r.kind==='gold'&&r.x>x+15&&r.x-x<v*7;}))return false;
  var ps=points(e,x);if(ps[0]<v*2||x>v*(T-2))return false;
  for(var j=0;j<used.length;j++){var other=used[j];for(var a=0;a<ps.length;a++)for(var b=0;b<other.points.length;b++)if(Math.abs(ps[a]-other.points[b])<PICKUP_GAP)return false;}
  for(var k=0;k<list.length;k++){
   var r=list[k];
   // Give a newly accelerated boat almost a second before a blocking row.
   if(e.flagKind==='speed'&&r.kind==='row'&&r.x>x&&r.x-x<cap*.9&&r.safe!==z)return false;
   for(var q=0;q<ps.length;q++){
    var dx=ps[q]-r.x;
    if(r.kind==='row'&&Math.abs(dx)<Math.max(6,cap*.5)){
     // Inflate the obstacle by its full sway and a visible pickup margin.
     // A long reef spans the same interval as the two adjacent rocks it replaces.
     for(var l=0;l<lanes.length;l++)if(lanes[l]!==r.safe&&!(n===0&&lanes[l]!==lanes.filter(function(w){return w!==r.safe;})[r.row%2])){
      var envelope=r.row%2?2.8+(n>=2&&r.row%4===1?.72:0):2.35;
      if(Math.abs(z-lanes[l])<envelope+.15)return false;
     }
    }
    if(r.kind==='throw'&&Math.abs(dx)<cap*.8)return false;
    // Keep ground rewards outside the full takeoff/landing corridor.
    if(r.kind==='ramp'&&dx>-12&&dx<cap*2.6)return false;
    if(r.kind==='bank'&&Math.abs(dx)<cap*.65&&z!==r.side*3.7)return false;
   }
  }
  return true;
 }
 function place(e){
  var desired=e.at*v,best=null,bestCost=Infinity;
  // Visit nearby half-metre slots first, stopping once none can beat the
  // current cost. This keeps stage entry off the full-route quadratic scan.
  var origin=Math.round(desired*2)/2;
  for(var offset=0;offset<=v*T&&offset<=bestCost+.5;offset+=.5){
   for(var sign=-1;sign<=1;sign+=2){
    if(offset===0&&sign===1)continue;
    var x=origin+offset*sign;if(x<v*2||x>v*(T-2))continue;
    for(var l=0;l<lanes.length;l++){
     var z=lanes[l],cost=Math.abs(x-desired)+(z===e.z?0:2);
     if((cost<bestCost||cost===bestCost&&best&&x<best.x)&&clear(e,x,z)){best={x:x,z:z};bestCost=cost;}
    }
   }
  }
  if(!best)throw new Error('No clear pickup slot in stage '+(n+1));
  e.x=best.x;e.at=e.x/v;e.z=best.z;if(e.kind==='gold')e.coinStep=v*.2;list.push(e);used.push({kind:e.kind,event:e,points:points(e,e.x)});
 }
 // Buddies and flags reserve their own readable 15m windows before coin trails.
 var roles=n===0?['otter']:['otter','duck','turtle'];
 roles.forEach(function(role,i){place({kind:'buddy',role:role,at:i===0?7:i===1?T*.26:T*.61,z:i===1?3.7:0});});
 var firstFlag={kind:'flag',at:T*.42,z:0};place(firstFlag);
 for(var k=0;k<count;k++)place({kind:'gold',at:3+k*(T-7)/(count-1),z:lanes[(k+n+(seed>>>0))%3],group:k});
 // Reserve the old single-flag slot before gold as before, then re-place
 // functional flags around those frozen gold/buddy/hazard coordinates.
 list.splice(list.indexOf(firstFlag),1);used=used.filter(function(u){return u.event!==firstFlag;});
 var weighted=['speed','guard','speed','guard','gold','speed','guard','magnet','speed','guard'];
 var choice=(seed>>>0)%weighted.length;
 var kinds=n===0?['speed','gold']:n===1?['magnet','speed']:n===2?['guard','magnet']:[weighted[choice],weighted[(choice+3)%weighted.length]];
 var skins={speed:1,magnet:2,guard:3,gold:5};
 firstFlag.flagKind=kinds[0];firstFlag.skin=skins[kinds[0]];firstFlag.slot=0;place(firstFlag);
 place({kind:'flag',at:T*.72,z:0,after:firstFlag.x+PICKUP_GAP,flagKind:kinds[1],skin:skins[kinds[1]],slot:1});
 function order(e){return e.kind==='ramp'?0:e.kind==='row'?1:2;}
 return list.sort(function(a,b){return a.x-b.x||order(a)-order(b);});
}
// A rolling route reuses fourth-stage mechanics without completing campaign laps.
// Plan with the coming minute's upper speed so landing/reward corridors stay clear.
function endlessRoute(g){
 var start=g.endlessRouteEnd||0,pace=g.flowSpeed()+ENDLESS_ACCEL*60;
 g.endlessRouteStart=start;g.endlessRouteEnd=start+pace*60;
 g.endlessRouteSerial=(g.endlessRouteSerial||0)+1;
 g.routeEvents=timeline(3,(g.seed+Math.imul(g.endlessRouteSerial-1,137))>>>0,pace);
 g.routeSpawned=[];
}
function endlessZone(d){
 var start=Math.floor(Math.max(0,d)/2160)*2160,z=makeZone(3,start,start+2160,d,0);
 z.name='无尽急流';z.note='持续加速，挑战更远距离';z.next='无尽急流';return z;
}
P.startEndless=function(){
 ensure(this);this.endless=true;this.stageIndex=3;this.speed=SPEEDS[3];this.currentSpeed=SPEEDS[3];this.crocSpeed=CROCS[3];
 this.routeEvents=[];this.routeSpawned=[];this.entities=[];this.flags=[];this.bankSites=[];this.endlessRouteEnd=0;
 endlessRoute(this);this.start();this.generate();
};
function nominalZone(d){var n=0;while(n<3&&d>=NOMINAL[n+1])n++;return makeZone(n,NOMINAL[n],NOMINAL[n+1],d,0);}
function makeZone(n,start,end,d,progress){return {id:n,name:NAMES[n],note:['沿金币换道，轻点跳跃','借浪空翻，靠岸送鱼','横风、摆动原木与岸边飞石','密集摆动原木和岸边飞石，高速终章'][n],gravity:n===1?14.5:16,speed:0,stage:n,lap:n+1,tier:n,start:start,offset:Math.max(0,d-start),length:Math.max(1,end-start),progress:progress||0,next:n<3?NAMES[n+1]:'MVP终点',remaining:Math.max(0,end-d)};}
P.zone=function(){ensure(this);if(this.endless)return endlessZone(this.distance);var n=idx(this),t=elapsed(this),end=this.distance+Math.max(0,TIMES[n]-t)*SPEEDS[n];return makeZone(n,this.stageStartDistance,end,this.distance,Math.min(1,t/TIMES[n]));};
P.story=function(){var z=this.zone();return {start:z.start,end:z.start+z.length,name:z.name,note:z.note,announced:true};};
P.flowSpeed=function(){return this.endless?SPEEDS[3]+this.time*ENDLESS_ACCEL:SPEEDS[idx(this)];};
P.predatorSpeed=function(){return this.endless?this.flowSpeed()+CROCS[3]-SPEEDS[3]:CROCS[idx(this)];};
P.gapLimit=function(){return this.practiceReplay?null:GAP_CAPS[idx(this)];};
function firstRecovery(g){return !g.practiceReplay&&!g.endless&&idx(g)===0&&g.recoveryGrace;}
P.travelSpeed=function(){var n=idx(this),b=this.flowSpeed(),loss=this.practiceReplay?0:CRASH_EXTRA[n];if(this.stumble)return b-(firstRecovery(this)?FIRST_RECOVERY.speedLoss:this.recoveryGrace?3:4)-loss;if(this.shieldSlow>0)return b-4-loss/2;return Math.min(this.endless?b+8:CAPS[n],b+this.extraThrust());};
// Keep the first two supported capsizes recoverable without gifting gap.
var baseRecover=P.recover;
P.recover=function(){var supported=firstRecovery(this),ok=baseRecover.call(this);if(ok&&supported)this.recoverBoost=FIRST_RECOVERY.boostSeconds;return ok;};
P.hazardThreatDistance=function(){return (this.endless?this.flowSpeed()+8:CAPS[idx(this)])*CUES[idx(this)];};
P.pursuitRate=function(){return this.travelSpeed()-this.predatorSpeed();};
P.buddyDuration=function(role){return this.crewDurations&&this.crewDurations[role]||BUDDY[role]&&BUDDY[role][idx(this)]||0;};
P.buddyRemaining=function(role){return this.has(role)?Math.max(0,Number(this.crewTime[role])||0):0;};
P.boardBuddy=function(role,remaining){ensure(this);if(!BUDDY[role])return false;if(!this.has(role))this.crew.push(role);this.crewDurations[role]=BUDDY[role][idx(this)];this.crewTime[role]=Number.isFinite(remaining)?Math.max(.01,Math.min(remaining,this.buddyDuration(role))):this.buddyDuration(role);return true;};
var oldDetail=P.honorDetail;
P.honorDetail=function(id){
 if(this.endless&&['c13','c14','c19','c20','c24'].indexOf(id)!==-1)return '请在普通四关模式挑战此徽章';
 if(['c14','c20','c24'].indexOf(id)!==-1&&(this.campaignWon||this.mode==='over'))return '本局已结束 · 未获得的徽章可下局再挑战';
 if(id==='c20')return '第3、4关连续无碰撞 · 当前 '+Math.min(2,this.expertCleanLaps)+'/2关'+((idx(this)>=2&&this.honorLap.impacts||idx(this)===3&&this.expertCleanLaps===0)?' · 本局已中断，下局再试':'');
 return oldDetail.call(this,id).replace(/本程/g,'本关').replace(/第3程起计/g,'第3、4关计入').replace(/下程/g,idx(this)===3?'下局':'下关');
};
P.generateBanks=function(){ensure(this);this.bankSites=this.bankSites.filter(function(s){return s.x>this.distance-(s.halfWindow||8)-10;},this);this.bankEffects=this.bankEffects.filter(function(e){return this.time-e.at<2;},this);};
P.generateFlags=function(){this.flags=this.flags.filter(function(f){return f.x>this.distance-8;},this);};
P.checkJourney=function(){};
P.generate=function(){
 ensure(this);if(this.practiceReplay)return;
 var n=idx(this),g=this,cap=this.endless?this.flowSpeed()+8:CAPS[n],lead=cap*4+12;
 if(this.endless&&this.routeSpawned.length===this.routeEvents.length&&this.routeSpawned.every(function(v){return v;})&&this.distance+lead>=this.endlessRouteEnd)endlessRoute(this);
 var offset=this.endless?this.endlessRouteStart:this.stageStartDistance,serial=this.endless?this.endlessRouteSerial*1000:n*100;
 this.routeEvents.forEach(function(e,i){
  var x=offset+e.x;
  if(g.routeSpawned[i]||x-g.distance>lead)return;g.routeSpawned[i]=true;
  var safe=e.safe,z=e.z||0;
  if(e.kind==='row'){
   var kind=e.row%2?'log':'rock',blocked=LANES.filter(function(lane){return lane!==safe;});
   if(kind==='rock'&&n>0&&safe!==0&&e.row%8===2){
    g.add('rock',x,0,{z:(blocked[0]+blocked[1])*.5,safeLane:safe,gate:x,encounter:serial+e.row,reef:'ridge'});
   }else{
    if(n===0)blocked=[blocked[e.row%2]];
    blocked.forEach(function(lane,j){
     var sway=kind==='log'&&n>=2&&e.row%4===1;
     var reef=kind==='rock'?((g.seed+e.row/2+j)%2?'slab':'spire'):null;
     g.add(kind,x,0,{z:lane,safeLane:safe,gate:x,encounter:serial+e.row,reef:reef,sway:sway,baseZ:lane,swayAmplitude:sway?.72:0,swayPhase:((g.seed+e.row*1.73)%628)/100,swayRate:2.45});
    });
   }
   g.routeAudit.push({kind:'row',x:x,at:g.time,stage:n+1,safe:safe,cue:(x-g.distance-2.4)/cap});
  }else if(e.kind==='ramp'){
   g.add('ramp',x,0,{z:z,power:e.power,encounter:serial+50+i});g.routeRampEnds.push({start:x,end:x+cap*2.6,z:z});
  }else if(e.kind==='gold'){
   for(var c=0;c<5;c++)g.add('coin',x+(c-4)*(e.coinStep||SPEEDS[n]*.2),1,{z:z,group:g.endless?serial+e.group:n*10+e.group});
  }else if(e.kind==='buddy'){
   g.add('buddy',x,0,{role:e.role,z:z});
  }else if(e.kind==='bank'){
   g.bankSites.push({id:g.endless?serial+e.bankKind:n*3+e.bankKind,x:x,kind:e.bankKind,side:e.side,halfWindow:cap*.55,progress:0,status:'ready',delivered:false});
  }else if(e.kind==='throw'){
   var launchZ=e.side*10.3;
   var stone=g.add('rock',x,.8,{z:launchZ,projectile:true,prevZ:launchZ,launchZ:launchZ,targetZ:e.target,throwAt:null,flightSeconds:STONE_FLIGHT,throwId:g.endless?serial+e.id:n*20+e.id});
   g.add('thrower',x,0,{z:e.side*10.5,side:e.side,stone:stone});
  }else if(e.kind==='flag'){g.flags.push({id:(g.endless?serial:n*100)+(e.slot||0),x:x,z:z,skin:e.skin||n%6+1,done:false});}
 });
 this.entities=this.entities.filter(function(e){return e.x>g.distance-35;});
 if(this.endless){this.routeRampEnds=this.routeRampEnds.filter(function(r){return r.end>g.distance-35;});if(this.routeAudit.length>120)this.routeAudit.splice(0,this.routeAudit.length-120);}
};
// Warn about the landing lane, including while the stone is still on shore.
P.nextProjectile=function(){var best=null;for(var i=0;i<this.entities.length;i++){var e=this.entities[i];if(e.projectile&&!e.done&&e.x-this.distance>=-2.4&&(!best||e.x<best.x))best=e;}return best;};
P.bankApproachDistance=function(){return (this.endless?this.flowSpeed()+8:CAPS[idx(this)])*2.5;};
P.nextBank=function(){for(var i=0;i<this.bankSites.length;i++){var s=this.bankSites[i],dx=s.x-this.distance;if(dx>=-(s.halfWindow||8)&&dx<this.bankApproachDistance(s)&&(s.status==='ready'||s.kind===1&&this.fishCargo&&!s.delivered))return s;}return null;};
P.checkBanks=function(dt){
 if(this.mode!=='play'||this.gap<=0)return;
 for(var i=0;i<this.bankSites.length;i++){
  var s=this.bankSites[i],dx=s.x-this.distance,w=s.halfWindow||8,aligned=this.z*s.side>=3.25,water=this.y<.4&&this.vy<=0&&!this.stumble;
  if(dx < -w){if(s.status==='ready')s.status='missed';s.progress=0;continue;}if(Math.abs(dx)>w)continue;
  if(s.kind===1&&this.fishCargo&&!s.delivered&&aligned&&!this.stumble){s.delivered=true;this.fishCargo=null;this.deliveries++;this.bankReward(s,'delivery',6);}
  if(s.status!=='ready')continue;
  if(s.kind===1){if(aligned&&!this.stumble&&this.manualAir&&this.y>1.1&&this.y<4.8){s.status='done';this.bankReward(s,'gift',4);}}
  else{if(aligned&&water)s.progress+=dt;else s.progress=0;var need=s.kind===0?.42:.24;if(s.progress+1e-8>=need){s.status='done';s.completedAt=this.time;if(s.kind===0&&!this.fishCargo){this.fishCargo={from:s.id};this.bankReward(s,'fish',3);}else if(s.kind===2){this.tow={id:s.id,x:s.x,side:s.side,remaining:1.5};this.bankReward(s,'tow',0);}}}
 }
};
P.applyWind=function(dt){
 var n=idx(this),t=this.endless?this.time%60:elapsed(this),active=this.practiceWind||n>=2&&t>TIMES[n]*.2&&t<TIMES[n]*(n===2?.38:.65),dir=n===3?-1:1;
 if(!active){this.windGust=-1;this.windTime=0;this.currentForce=0;return;}
 if(this.windGust!==n){this.windGust=n;this.windTime=0;this.emit('wind-warning',{direction:dir});}
 this.currentForce=this.y<=.02&&!this.stumble?dir:0;this.windTime+=dt;
 if(this.windTime+1e-9<2)return;this.windTime-=2;if(!this.currentForce)return;var from=this.targetZ,to=R.clamp(from+3.7*dir,-3.7,3.7);this.targetZ=to;if(to!==from)this.emit('wind-shift',{direction:dir,from:from,to:to});
};
var physics=P.step;
P.step=function(dt){
 ensure(this);if(this.mode!=='play')return;
 if(this.practiceReplay){physics.call(this,Math.max(0,Math.min(.05,dt)));return;}
 var n=idx(this),left=this.endless?Infinity:TIMES[n]-elapsed(this);dt=Math.max(0,Math.min(.05,dt,left));
 var nextTime=this.time+dt,launchSpeed=this.endless?this.flowSpeed()+8+ENDLESS_ACCEL*STONE_FLIGHT:CAPS[n];
 for(var i=0;i<this.entities.length;i++){
  var e=this.entities[i];
  if(e.done)continue;
  if(e.sway){e.prevZ=e.z;e.z=e.baseZ+e.swayAmplitude*Math.sin(nextTime*e.swayRate+e.swayPhase);}
  if(e.projectile){
   // Start from distance to the collision window so a slowdown after spawn
   // does not send the stone across the river long before the raft arrives.
   if(e.throwAt===null){
    if(e.x-this.distance>2.4+launchSpeed*(e.flightSeconds+dt))continue;
    e.throwAt=this.time;
   }
   e.prevZ=e.z;
   var u=R.clamp((nextTime-e.throwAt)/e.flightSeconds,0,1),ease=u*u*(3-2*u);
   e.z=e.launchZ+(e.targetZ-e.launchZ)*ease;
   e.y=.8-.3*u+1.25*Math.sin(Math.PI*u);
  }
  if(e.kind==='thrower'&&e.stone.throwAt!==null&&nextTime>e.stone.throwAt+1.4)e.done=true;
 }
 if(dt>1e-9)physics.call(this,dt);
 if(this.endless||this.mode!=='play'||elapsed(this)<TIMES[n]-1e-8)return;
 if(this.stumble){this.mode='over';this.emit('over','抵达终点前没能扶正木筏');return;}
 this.time=this.stageStartedAt+TIMES[n];this.finishHonorLap(n+1,true);this.lapsCompleted=n+1;this.lapFinishAt=this.time;this.coins+=5;this.score+=250;this.stageHistory.push({stage:n+1,start:this.stageStartDistance,end:this.distance,seconds:TIMES[n]});this.emit('lap-complete',{lap:n+1,coins:5});this.checkHonors();
 if(n===3){this.campaignWon=true;this.mode='won';this.held=false;this.emit('victory',{stages:4,seconds:180,distance:this.distance});return;}
 this.stageIndex++;this.stageStartedAt=this.time;this.stageStartDistance=this.distance;this.routeEvents=timeline(this.stageIndex,this.seed);this.routeSpawned=[];this.routeRampEnds=[];this.entities=[];this.flags=[];this.bankSites=[];this.encounters=[];this.windTime=0;this.windGust=-1;this.generate();
};
var renderGame=null;
R.setRenderGame=function(g){renderGame=g;};
R.journey=function(d){
 if(!renderGame||renderGame.stageIndex===undefined)return nominalZone(d);
 var g=renderGame;if(g.endless)return endlessZone(d);for(var i=0;i<g.stageHistory.length;i++){var h=g.stageHistory[i];if(d<h.end)return makeZone(i,h.start,h.end,d,(d-h.start)/Math.max(1,h.end-h.start));}
 var n=idx(g),end=Math.max(g.stageStartDistance+1,g.distance+Math.max(0,TIMES[n]-elapsed(g))*SPEEDS[n]);return makeZone(n,g.stageStartDistance,end,d,g.zone().progress);
};
R.bankSitesBetween=function(from,to){return renderGame?renderGame.bankSites.filter(function(s){return s.x>=from&&s.x<=to;}):[];};
R.crossCurrent=function(d){return renderGame&&renderGame.currentForce&&d>=renderGame.distance-15&&d<=renderGame.distance+70?renderGame.currentForce:0;};
R.buddyDuration=function(role){return BUDDY[role]?BUDDY[role][renderGame?idx(renderGame):0]:0;};
R.endless={acceleration:ENDLESS_ACCEL,startSpeed:SPEEDS[3]};
R.campaign={revision:REVISION,gapCaps:GAP_CAPS,crashExtras:CRASH_EXTRA,projectileWarningSeconds:PROJECTILE_WARNING,speeds:SPEEDS,durations:TIMES,crocs:CROCS,caps:CAPS,cues:CUES,nominalStarts:NOMINAL,timeline:timeline,elapsed:elapsed,index:idx,buddyDurations:BUDDY,pickupGap:PICKUP_GAP,rowCounts:ROWS.map(function(r){return r.length;}),firstStageRecovery:FIRST_RECOVERY};
})(typeof window!=='undefined'?window:globalThis);
