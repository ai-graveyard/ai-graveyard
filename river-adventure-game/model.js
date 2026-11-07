(function(root){
'use strict';
var TAU=Math.PI*2;
var BALANCE={"status":"runtime","version":"river-balance-v1-20261104","units":{"distance":"m","time":"s","speed":"m/s"},"boatBase":10,"crocBaseByJourney":[12,12.2,12.4,12.6,12.8],"gap":{"initial":20,"comfortable":40,"hardCap":null,"warning":12,"critical":6},"difficultyTransitionMetres":80,"speedCap":18,"journeyLength":640,"regions":[{"name":"青苔河谷","start":0,"current":0},{"name":"红岩急流","start":140,"current":2},{"name":"失落遗迹","start":320,"current":1},{"name":"灯火营地","start":500,"current":-1}],"currentTransitionMetres":12,"gold":{"firstActivation":35,"interval":45,"coinsPerGroup":5,"groupLength":10,"chainGapSeconds":2,"extra":5,"seconds":2,"maxCharges":1},"otter":{"seconds":18,"meanExtra":1.1,"positions":[52.5]},"duck":{"seconds":22,"descendingGravity":10,"positions":[232.5]},"turtle":{"seconds":26,"shields":1,"positions":[412.5]},"combo":{"actions":3,"windowSeconds":12,"cooldown":8,"extra":5,"seconds":2},"kick":{"extra":6,"seconds":1,"cooldown":5,"companionCost":1},"tow":{"extra":5,"seconds":1.2,"position":610},"recover":{"extra":3,"seconds":0.9,"safeSeconds":1.5},"crash":{"boatBase":5,"minimumSeconds":0.8,"timeoutSeconds":3,"taps":3,"tapCooldown":0.12,"holdSeconds":1.2},"newcomerCrash":{"boatBase":6,"timeoutSeconds":3.8,"usesPerRun":2,"throughJourney":5},"shore":{"fishPosition":480,"deliveryPosition":555,"fishSeconds":0.42,"towSeconds":0.24,"fishCoins":3,"deliveryCoins":6,"giftCoins":4,"finishCoins":5},"stacking":"otter additive; bursts use maximum active extra, independent timers; all cancelled by crash","gapGifts":false,"speedRevision":"speed10-20261105","hazardCueSeconds":2.4,"steerSpeed":10.5,"ramps":{"small":8.3,"large":13.5}};
// Coins and action combos share one stored surf and one active effect.
BALANCE.surf=BALANCE.gold;
BALANCE.combo.extra=BALANCE.surf.extra;BALANCE.combo.seconds=BALANCE.surf.seconds;
function clamp(v,a,b){return Math.max(a,Math.min(b,v));}
var LANE_SPACING=3.7,WIND_INTERVAL=2;
var BUDDY_ROLES=['otter','duck','turtle'],BUDDY_SECONDS={otter:BALANCE.otter.seconds,duck:BALANCE.duck.seconds,turtle:BALANCE.turtle.seconds};
function buddyDuration(role){return Object.prototype.hasOwnProperty.call(BUDDY_SECONDS,role)?BUDDY_SECONDS[role]:0;}
function routeZ(z){var lane=clamp(Math.round(z/LANE_SPACING),-1,1);return lane===0?0:lane*LANE_SPACING;}
// Shared by physics and drawing: a 1.25 s stroke, 60% underwater drive / 40% recovery.
function paddlePose(phase,active){var p=((phase%1)+1)%1,drive=p<.6,u=drive?p/.6:(p-.6)/.4;return {x:active?(drive?.8-1.6*u:-.8+1.6*u):.15,lift:active?(drive?0:Math.sin(u*Math.PI)*1.05):1.05,contact:!!active&&drive,power:active&&drive?Math.sin(u*Math.PI):0};}
// One-time skill badges persist across runs; challenge counters belong to a single run.
var honors=[
 {id:'c01',name:'第一位搭子',label:'接上 1 位搭子',key:'rescues',target:1,icon:'友'},
 {id:'c02',name:'乘风出发',label:'单局漂过 100 米',key:'distance',target:100,icon:'帆'},
 {id:'c03',name:'灵巧掌舵',label:'主动绕开 1 次障碍',key:'dodges',target:1,icon:'舵'},
 {id:'c04',name:'轻盈越礁',label:'主动起跳越障 1 次',key:'clears',target:1,icon:'跃'},
 {id:'c05',name:'空中转身',label:'完成空翻并稳稳落水 1 次',key:'flips',target:1,icon:'翻'},
 {id:'c06',name:'金币串串',label:'连续收集 5 枚金币',key:'bestCoinChain',target:5,icon:'金'},
 {id:'c07',name:'一气呵成',label:'达成 3 连击',key:'bestCombo',target:3,icon:'连'},
 {id:'c08',name:'不服输',label:'翻船后成功自救 1 次',key:'recoveries',target:1,icon:'勇'},
 {id:'c09',name:'搭子集结',label:'单局接上 3 位搭子',key:'rescues',target:3,icon:'伴'},
 {id:'c10',name:'河谷探索者',label:'单局漂过 300 米',key:'distance',target:300,icon:'探'},
 {id:'c11',name:'空翻好手',label:'单局完成 3 次空翻',key:'flips',target:3,icon:'翼'},
 {id:'c12',name:'远航船长',label:'单局漂过 800 米',key:'distance',target:800,icon:'航'},
 {id:'c13',name:'三程远航',label:'单局完成 3 程（1920 米）',key:'lapsCompleted',target:3,icon:'程'},
 {id:'c14',name:'轻舟无痕',label:'完整通过 1 程，期间零碰撞',key:'bestCleanLaps',target:1,icon:'净'},
 {id:'c15',name:'越障熟手',label:'单局在 8 次主动起跳中成功越障',key:'clearJumps',target:8,icon:'越'},
 {id:'c16',name:'浪尖舞者',label:'单局在 4 次不同借浪中空翻并落稳',key:'rampFlipLandings',target:4,icon:'浪'},
 {id:'c17',name:'营地信使',label:'单局成功送鱼 2 次',key:'deliveries',target:2,icon:'信'},
 {id:'c18',name:'寻金好手',label:'单局从河道拾取 80 枚金币',key:'riverCoins',target:80,icon:'财'},
 {id:'c19',name:'八程远征',label:'单局完成 8 程（5120 米）',key:'lapsCompleted',target:8,icon:'征'},
 {id:'c20',name:'急流无伤',label:'从第 3 程或之后起，连续完整通过 3 程且零碰撞',key:'bestExpertCleanLaps',target:3,icon:'盾'},
 {id:'c21',name:'空翻大师',label:'单局在 12 次不同借浪中空翻并落稳',key:'rampFlipLandings',target:12,icon:'旋'},
 {id:'c22',name:'金牌信使',label:'单局成功送鱼 5 次',key:'deliveries',target:5,icon:'鱼'},
 {id:'c23',name:'冲浪专家',label:'单局通过动作连击自动触发 5 次冲浪',key:'comboBoosts',target:5,icon:'冲'},
 {id:'c24',name:'全能船长',label:'第 3 程或之后的同一程：绕障 2 次、起跳越障 2 次、借浪空翻落稳 1 次、送鱼 1 次，零碰撞抵达终点',key:'allRoundLaps',target:1,icon:'冠'}
];
var honorSeries=[{id:'beginner',name:'入门 · 初识河流',from:0,to:12},{id:'advanced',name:'进阶 · 熟练掌舵',from:12,to:18},{id:'master',name:'大师 · 河流挑战',from:18,to:24}];
honors.forEach(function(h,i){h.series=i<12?'beginner':i<18?'advanced':'master';});
var titles=['漂流学徒','浪花新秀','河谷好手','空翻达人','搭子船长','急流高手','河谷大师','远航专家','传奇船长','河流之王'];
var titleThresholds=[0,2,4,6,8,10,12,16,20,24];
var titleColors=['#bd8546','#4f8b67','#3e9296','#527fab','#8066ab','#c07543','#bd9233','#3d8190','#b6664d','#d09b36'];
function cleanHonors(list){return honors.filter(function(h){return Array.isArray(list)&&list.indexOf(h.id)!==-1;}).map(function(h){return h.id;});}
function titleInfo(earned,floor){var count=cleanHonors(earned).length,level=clamp(Math.floor(Number(floor))||0,0,9);for(var i=0;i<titleThresholds.length;i++)if(count>=titleThresholds[i])level=Math.max(level,i);return {level:level,name:titles[level],color:titleColors[level],count:count,total:honors.length,next:titles[level+1]||'',remaining:level<9?Math.max(0,titleThresholds[level+1]-count):0};}
// One shared layout for riverside art, interaction windows and route hints.
var LAP_LENGTH=BALANCE.journeyLength,REGION_STARTS=[0,140,320,500],REGION_LENGTHS=[140,180,180,140];
var SHORE=[{x:480,side:-1,kind:0},{x:555,side:1,kind:1},{x:610,side:1,kind:2}];
function bankSite(index){var s=SHORE[index%SHORE.length];return {id:index,x:Math.floor(index/SHORE.length)*LAP_LENGTH+s.x,side:s.side,kind:s.kind,progress:0,status:'ready',delivered:false};}
function bankSitesBetween(from,to){var out=[],lap=Math.max(0,Math.floor(from/LAP_LENGTH));for(;lap*LAP_LENGTH<=to;lap++)for(var i=0;i<SHORE.length;i++){var s=bankSite(lap*SHORE.length+i);if(s.x>=from&&s.x<=to)out.push(s);}return out;}
// Flag pickups use their own deterministic schedule, never the obstacle RNG.
var flagStyles=[
 {id:1,name:'疾风旗',effect:'speed',note:'加速4米/秒 · 3秒',color:'#e87768',accent:'#fff1c8',shape:'swallow'},
 {id:2,name:'聚宝旗',effect:'magnet',note:'吸取附近金币 · 8秒',color:'#4fa58d',accent:'#eaf3b7',shape:'pennant'},
 {id:3,name:'护航旗',effect:'guard',note:'挡一次障碍 · 10秒',color:'#548dc1',accent:'#fff2d5',shape:'shield'},
 {id:4,name:'紫夜星光',color:'#8671b2',accent:'#ffe5a0',shape:'point'},
 {id:5,name:'丰收旗',effect:'gold',note:'立即获得8金币',color:'#e4af4d',accent:'#fff5d6',shape:'square'},
 {id:6,name:'莓果方格',color:'#ba637e',accent:'#ffe9de',shape:'square'}
];
function flagStyle(id){return flagStyles.filter(function(f){return f.id===id;})[0]||null;}
// Keep every flag/buddy at least 15m from gold and other pickup types, across lanes too.
function flagSite(index){var places=[100,322.5,502.5,592.5],lanes=[-3.7,0,0,3.7];return {id:index,x:Math.floor(index/4)*LAP_LENGTH+places[index%4],z:lanes[index%4],skin:index%6+1,done:false};}
function Game(seed){
 this.seed=seed||31029;this.rng=this.seed;this.mode='ready';this.distance=0;this.time=0;this.speed=baseSpeed(0);this.currentSpeed=baseSpeed(0);this.currentForce=0;this.windGust=-1;this.windTime=0;this.paddlePhase=0;this.paddleDrive=0;this.z=0;this.targetZ=0;this.lateralVelocity=0;this.steerAxis=0;this.lastSteerAt=-99;this.dodges=0;this.y=0;this.vy=0;this.waveRide=null;this.rampFlight=false;this.rampTurnSpeed=0;this.waveSample={};this.angle=0;this.rotation=0;this.held=false;this.holdTime=0;this.gap=BALANCE.gap.initial;this.crocSpeed=BALANCE.crocBaseByJourney[0];this.goldCharge=0;this.goldBoost=0;this.surfChargeSource='';this.recoverBoost=0;this.comboCooldown=0;this.crashElapsed=0;this.recoveryQueued=false;this.shieldSlow=0;this.moveSerial=0;this.lastRewardKey=null;this.rewardEvents=[];this.goldNext=0;this.supplyNext=0;this.boost=0;this.boostSource='';this.escape=0;this.kickCooldown=0;this.departures=[];this.safe=0;this.combo=0;this.comboTime=0;this.score=0;this.coins=0;this.flips=0;this.rescues=0;this.hits=0;this.recoveries=0;this.crew=[];this.crewTime={};this.entities=[];this.events=[];this.next=0;this.stumble=0;this.taps=0;this.tapCooldown=0;this.air=0;this.bestCombo=0;this.drafted=0;this.landings=0;this.manualAir=false;this.accumulator=0;this.jumpBuffer=0;this.recoveryHold=0;this.lastChance=false;this.coinChain=0;this.coinTimer=0;this.lastPattern=-1;this.patternHistory=[];this.lastZone=0;this.contract=0;this.missionFlags=[false,false,false];this.contractComplete=false;this.lastMistake='';this.clears=0;this.bestCoinChain=0;this.honors=[];this.newHonors=[];this.honorFloor=0;this.honorLevel=0;
 this.flagSerial=0;this.flagSpeed=0;this.flagMagnet=0;this.flagGuard=0;this.flagCoins=0;this.flagPickups=0;this.flagSkin=0;this.flags=[];this.flagNext=0;this.recoverySupportUsed=0;this.recoveryGrace=false;
 this.riverCoins=0;this.clearJumps=0;this.rampFlipLandings=0;this.comboBoosts=0;this.bestCleanLaps=0;this.cleanLaps=0;this.expertCleanLaps=0;this.bestExpertCleanLaps=0;this.allRoundLaps=0;this.trackedHonor='';this.honorLap={lap:1,impacts:0,dodges:0,clears:0,flips:0,deliveries:0};this.honorActionKeys=[];
 this.bankSites=[];this.bankNext=0;this.bankEffects=[];this.bankVisits=0;this.deliveries=0;this.fishCargo=null;this.tow=null;this.encounters=[];this.lapsCompleted=0;this.lapFinishAt=-99;this.flyovers=0;this.flightEvent=null;this.rejoins=0;this.shieldAt=-99;this.generateBanks();
 this.generate();this.generateFlags();
}
// First journey keeps the basics; later river stages introduce optional skills.
var learningRoute=[
 {id:'steer',stage:0,name:'换道拾物',teach:0,practice:25,until:50},
 {id:'flag',stage:0,passive:true,name:'拾旗换装',teach:85,practice:100,until:120},
 {id:'jump',stage:0,name:'轻点跳跃',teach:145,practice:174,until:205},
 {id:'otter',stage:0,passive:true,name:'水獭划水',teach:37.5,practice:52.5,until:100},
 {id:'duck',stage:1,passive:true,name:'鸭鸭缓降',teach:217.5,practice:232.5,until:280},
 {id:'flip',stage:5,name:'借浪空翻',teach:880,practice:890,until:950},
 {id:'wind',stage:2,name:'宽水练横风',teach:360,practice:380,until:425},
 {id:'turtle',stage:2,passive:true,name:'龟龟挡一下',teach:397.5,practice:412.5,until:470},
 {id:'fish',stage:2,name:'靠岸钓鱼',teach:450,practice:480,until:490},
 {id:'camp',stage:7,name:'送鱼或接礼',teach:1170,practice:1195,until:1210},
 {id:'tow',stage:11,name:'码头接绳',teach:1860,practice:1890,until:1900}
];
function LessonPace(){this.active=null;this.nextTime=0;this.nextDistance=0;this.history=[];this.offered={};}
LessonPace.prototype.ready=function(g){return !this.active&&g.time>=this.nextTime&&g.distance>=this.nextDistance;};
LessonPace.prototype.begin=function(id,g,until){if(!this.ready(g))return false;this.active={id:id,phase:'explain',at:g.time,distance:g.distance,z:g.z,until:until||g.distance+140,started:false};return true;};
LessonPace.prototype.release=function(g){
 if(!this.active)return;var a=this.active;if(a.phase==='practice')return;
 a.phase='practice';a.practiceAt=g.time;if(a.id==='camp'&&!a.bankType)a.bankType=g.fishCargo?'delivery':'gift';a.attempts=1;a.manualTarget=null;a.windFrom=null;a.windDirection=0;a.correcting=false;a.descended=false;
 if(a.id==='wind'&&!a.optional)g.aim(0);
 // Only game data is copied; renderers, platform saves and lesson state stay outside.
 if(!a.optional)a.checkpoint=JSON.stringify(g);this.nextTime=g.time+(a.optional?9:8);this.nextDistance=g.distance+(a.optional?80:40);
};
LessonPace.prototype.finish=function(g,result){var a=this.active;if(!a)return null;var done={id:a.id,result:result,time:g.time,distance:g.distance,shownAt:a.at,shownDistance:a.distance,attempts:a.attempts||0};this.history.push(done);if(this.history.length>24)this.history.shift();this.active=null;this.nextTime=Math.max(this.nextTime,g.time+3);this.nextDistance=Math.max(this.nextDistance,g.distance+48);return done;};
LessonPace.prototype.retry=function(g){
 var a=this.active;if(!a||a.phase!=='practice'||!a.checkpoint)return false;
 var saved=JSON.parse(a.checkpoint),honors=g.honors.slice(),fresh=g.newHonors.slice(),floor=g.honorFloor,skin=g.skin,flagSkin=g.flagSkin;
 Object.keys(saved).forEach(function(key){g[key]=saved[key];});
 // Awards already persisted remain earned, while attempt coins and score roll back.
 g.initHonors(honors,Math.max(floor,g.honorFloor));g.newHonors=fresh;g.skin=skin;g.flagSkin=flagSkin;g.mode='play';g.events=[];g.accumulator=0;g.release();g.stopSteering();
 a.practiceAt=g.time;a.attempts++;a.started=false;a.manualTarget=null;a.windFrom=null;a.windDirection=0;a.correcting=false;a.descended=false;
 return true;
};
LessonPace.prototype.observe=function(type,data,g){var a=this.active;if(!a||a.phase!=='practice')return null;
 // Jump practice requires the player's own takeoff; a passive wave is separate.
 if(type==='jump'||type==='ramp'&&a.id!=='jump')a.started=true;
 if(type==='manual-lane'){
  if(a.id==='steer')a.manualTarget=data.to;
  if(a.id==='wind'&&a.windFrom!==null&&data.to===a.windFrom&&(data.to-data.from)*a.windDirection<0)a.correcting=true;
 }
 if(a.id==='wind'&&type==='wind-shift'){a.windFrom=data.from;a.windDirection=data.direction;a.correcting=false;}
 var bank=type==='bank'&&data&&(a.bankId===undefined||a.bankId===data.id)&&data.type===(a.bankType||a.id);
 var yes=a.id==='flag'&&type==='flag'||a.id==='jump'&&a.started&&(type==='land'||type==='flip')||a.id==='flip'&&type==='flip'||['fish','camp','tow'].indexOf(a.id)!==-1&&bank||a.id==='turtle'&&type==='shield'&&data==='turtle'||a.id==='duck'&&a.started&&a.descended&&(type==='land'||type==='flip')&&g.has('duck');
 if(yes&&!g.stumble)return this.finish(g,'practised');if(type==='crash'||type==='over')return {id:a.id,result:'retry'};return null;
};
LessonPace.prototype.tick=function(g){var a=this.active;if(!a||a.phase!=='practice')return null;
 if(a.id==='duck'&&g.has('duck')&&g.y>0&&g.vy<0)a.descended=true;
 if(a.id==='steer'&&a.manualTarget!==null&&Math.abs(g.z-a.manualTarget)<.3&&Math.abs(g.z-a.z)>2.8||a.id==='otter'&&g.has('otter')&&g.y<=.02&&!g.stumble&&g.paddleDrive>.3||a.id==='wind'&&a.correcting&&a.windFrom!==null&&g.y<=.02&&!g.stumble&&Math.abs(g.z-a.windFrom)<.3&&g.targetZ===a.windFrom)return this.finish(g,'practised');
 if(g.mode==='over'||g.stumble||(a.bankX!==undefined&&g.distance>a.bankX+8)||g.distance>a.until||g.time-a.practiceAt>22)return {id:a.id,result:'retry'};return null;
};
Game.prototype.initHonors=function(list,floor,tracked){this.honors=cleanHonors(list);this.honorFloor=floor||0;this.honorLevel=titleInfo(this.honors,this.honorFloor).level;if(tracked!==undefined)this.trackedHonor=cleanHonors([tracked])[0]||'';};
Game.prototype.honorInfo=function(){return titleInfo(this.honors,this.honorFloor);};
Game.prototype.honorDetail=function(id){var l=this.honorLap;if(id==='c24')return '本程：绕障 '+Math.min(2,l.dodges)+'/2 · 越障 '+Math.min(2,l.clears)+'/2 · 借浪空翻 '+Math.min(1,l.flips)+'/1 · 送鱼 '+Math.min(1,l.deliveries)+'/1'+(l.lap<3?' · 第3程起计':l.impacts?' · 已碰撞，下程再试':' · 零碰撞');if(id==='c20')return '当前连续 '+this.expertCleanLaps+'/3 程 · 搭子挡撞和保护期间撞障也算碰撞';if(id==='c14')return l.impacts?'本程已碰撞，下程再试':'本程零碰撞 · 须完整抵达终点';return '';};
Game.prototype.challenges=function(){var g=this;return honors.map(function(h){return {id:h.id,name:h.name,label:h.label,icon:h.icon,series:h.series,target:h.target,value:Math.min(h.target,Math.floor(g[h.key]||0)),detail:g.honorDetail(h.id),earned:g.honors.indexOf(h.id)!==-1};});};
Game.prototype.checkHonors=function(){if(this.practiceReplay)return;for(var i=0;i<honors.length;i++){var h=honors[i];if(this.honors.indexOf(h.id)===-1&&(this[h.key]||0)>=h.target){var before=this.honorLevel;this.honors.push(h.id);this.newHonors.push(h.id);this.honorLevel=this.honorInfo().level;this.emit('honor',{badge:h,promoted:this.honorLevel>before,title:this.honorInfo()});}}};
Game.prototype.noteHonor=function(type,data){if(this.practiceReplay)return;var l=this.honorLap,key='';if(type==='coin')this.riverCoins++;if(type==='boost'&&data==='combo')this.comboBoosts++;if(type==='impact'||type==='crash'||type==='shield')l.impacts++;if(type==='bank'&&data.type==='delivery')l.deliveries++;if(type==='dodge')key='dodge:'+this.lastRewardKey;if(type==='clear')key='clear:'+this.moveSerial;if(type==='flip'&&this.flightEvent&&this.y===0)key='ramp-flip:'+this.moveSerial;if(key&&this.honorActionKeys.indexOf(key)===-1){this.honorActionKeys.push(key);if(this.honorActionKeys.length>48)this.honorActionKeys.shift();if(type==='dodge')l.dodges++;if(type==='clear'){l.clears++;this.clearJumps++;}if(type==='flip'){l.flips++;this.rampFlipLandings++;}}};
Game.prototype.finishHonorLap=function(lap,completed){var l=this.honorLap,full=l.lap===lap&&completed,clean=full&&!l.impacts;this.cleanLaps=clean?this.cleanLaps+1:0;this.bestCleanLaps=Math.max(this.bestCleanLaps,this.cleanLaps);this.expertCleanLaps=clean&&lap>=3?this.expertCleanLaps+1:0;this.bestExpertCleanLaps=Math.max(this.bestExpertCleanLaps,this.expertCleanLaps);if(clean&&lap>=3&&l.dodges>=2&&l.clears>=2&&l.flips>=1&&l.deliveries>=1)this.allRoundLaps++;this.honorLap={lap:lap+1,impacts:0,dodges:0,clears:0,flips:0,deliveries:0};};
Game.prototype.random=function(){this.rng=(Math.imul(this.rng,1664525)+1013904223)>>>0;return this.rng/4294967296;};
Game.prototype.add=function(kind,x,y,data){var e={kind:kind,x:x,y:y||0,z:this.spawnZ||0,done:false};if(data)Object.keys(data).forEach(function(k){e[k]=data[k];});this.entities.push(e);return e;};
Game.prototype.emit=function(type,data){this.noteHonor(type,data);this.events.push({type:type,data:data});};
Game.prototype.drain=function(){var a=this.events;this.events=[];return a;};
Game.prototype.start=function(){this.mode='play';this.emit('start');};
Game.prototype.has=function(role){return this.crew.indexOf(role)!==-1;};
Game.prototype.buddyRemaining=function(role){var total=buddyDuration(role);return this.has(role)?clamp(Number.isFinite(this.crewTime[role])?this.crewTime[role]:total,0,total):0;};
Game.prototype.boardBuddy=function(role,remaining){if(!buddyDuration(role)||(!this.has(role)&&this.crew.length>=3))return false;if(!this.has(role))this.crew.push(role);this.crewTime[role]=Number.isFinite(remaining)?clamp(remaining,.01,buddyDuration(role)):buddyDuration(role);return true;};
Game.prototype.removeBuddy=function(role){var i=this.crew.indexOf(role);if(i<0)return false;this.crew.splice(i,1);delete this.crewTime[role];if(role==='otter'){this.paddleDrive=0;this.paddlePhase=0;}return true;};
Game.prototype.tickBuddies=function(dt){
 for(var i=this.crew.length-1;i>=0;i--){var role=this.crew[i],before=this.buddyRemaining(role),left=Math.max(0,before-dt);this.crewTime[role]=left;
  if(left<=1e-8){this.removeBuddy(role);var e={role:role,reason:'arrival',at:this.time,x:this.distance,y:this.y,z:this.z,side:this.z>0?-1:1};this.departures.push(e);if(this.departures.length>3)this.departures.shift();this.emit('buddy-arrival',e);}
  else if(before>5&&left<=5)this.emit('buddy-soon',role);
 }
 for(var j=0;j<BUDDY_ROLES.length;j++){var stale=BUDDY_ROLES[j];if(!this.has(stale))delete this.crewTime[stale];}
};

// Authored route rows are independent of pickup RNG. Every row has a water bypass.
function routeRows(lap,seed){
 var rows=[{x:110,kind:'log',safe:-3.7,blocked:0},{x:174,kind:'log',safe:-3.7,blocked:0},{x:286,kind:'rock',safe:0,blocked:-3.7},{x:358,kind:'log',safe:0,blocked:3.7},{x:454,kind:'rock',safe:-3.7,blocked:0}];
 if(lap>0){var tier=Math.min(4,lap),extra=[70,214,398];for(var i=0;i<Math.min(3,tier);i++)rows.push({x:extra[i],kind:i%2?'log':'rock',safe:[3.7,0,-3.7][(i+lap+seed%3)%3]});
  rows.forEach(function(r,i){r.safe=[-3.7,0,3.7][((seed>>>0)+lap+i)%3];delete r.blocked;});
  // The final row opens the fishing bank, after the last wind push.
  rows[4].safe=-3.7;
 }
 return rows.sort(function(a,b){return a.x-b.x;});
}
function goldLane(local,lap,seed){var group=Math.round((local-35)/45),first=[-3.7,0,-3.7,0,3.7,0,0,0,3.7,-3.7,0,3.7,0,0],z=lap===0?first[group]:[-3.7,0,3.7][(group+lap+seed%3)%3],rows=routeRows(lap,seed);
 for(var i=0;i<rows.length;i++)if(Math.abs(rows[i].x-local)<26)z=rows[i].safe;
 if(local===170&&lap===0)z=0;if(local===215&&lap===0)z=-3.7;
 if(local===485)z=-3.7;if(local===575||local===620)z=3.7;
 return z;
}
var SUPPLY=[];['otter','duck','turtle'].forEach(function(role){BALANCE[role].positions.forEach(function(x){SUPPLY.push({x:x,role:role});});});SUPPLY.sort(function(a,b){return a.x-b.x;});
Game.prototype.planEncounter=function(x,zone,beat){
 var length=zone.length/3,g=this,lap=zone.lap-1,rows=routeRows(lap,this.seed),end=x+length;
 this.encounters.push({id:x,start:x,end:end,name:zone.name,note:zone.id===3?'宽水靠岸，接礼或牵引':zone.id===1?'借浪可飞，也可沿水面走':'沿金币看路，提前换道',kind:beat,region:zone.id,safeLane:0,announced:x===0});
 for(var i=0;i<rows.length;i++){var r=rows[i],at=lap*LAP_LENGTH+r.x;if(at<x-.001||at>=end-.001)continue;
  for(var lane=-1;lane<=1;lane++){var z=lane*LANE_SPACING;if(z===r.safe||(lap===0&&z!==r.blocked))continue;this.add(r.kind,at,0,{z:z,gate:at,safeLane:r.safe,encounter:x});}
 }
 if(zone.id===1){var ramps=[250,305];for(var j=0;j<ramps.length;j++){var at=lap*LAP_LENGTH+ramps[j];if(at>=x&&at<end)this.add('ramp',at,0,{z:lap===0?-3.7:[-3.7,3.7][(lap+j+this.seed)%2],power:j?BALANCE.ramps.large:BALANCE.ramps.small,encounter:x});}}
 return length;
};
Game.prototype.generate=function(){
 var z=journey(this.distance);
 if(this.next<this.distance-100)this.next=z.start+Math.floor(z.offset/(z.length/3))*(z.length/3);
 while(this.next<this.distance+90){var x=this.next,zone=journey(x+.001),length=zone.length/3,beat=Math.min(2,Math.floor((zone.offset+.001)/length));this.planEncounter(x,zone,beat);this.next=x+length;}
 this.goldNext=Math.max(this.goldNext,Math.floor(Math.max(0,this.distance-12)/LAP_LENGTH)*14);
 while(true){var glap=Math.floor(this.goldNext/14),local=35+(this.goldNext%14)*45,last=glap*LAP_LENGTH+local;if(last-10>this.distance+80)break;this.goldNext++;
  if(last<this.distance-12)continue;var gz=goldLane(local,glap,this.seed);for(var c=0;c<5;c++)this.add('coin',last-10+c*2.5,1,{z:gz,group:glap*14+(this.goldNext-1)%14});
 }
 this.supplyNext=Math.max(this.supplyNext,Math.floor(Math.max(0,this.distance-12)/LAP_LENGTH)*SUPPLY.length);
 while(true){var si=this.supplyNext,slap=Math.floor(si/SUPPLY.length),site=SUPPLY[si%SUPPLY.length],sx=slap*LAP_LENGTH+site.x;if(sx>this.distance+80)break;this.supplyNext++;
  if(sx<this.distance-12)continue;var sz=site.role==='duck'?-3.7:site.x===515?3.7:0;if(slap>0)sz=goldLane(site.x,slap,this.seed);this.add('buddy',sx,0,{role:site.role,z:sz});
 }
 this.entities=this.entities.filter(function(e){var intact=(e.kind==='rock'||e.kind==='log'||e.kind==='ramp')&&(!e.done||e.passed);return e.x>this.distance-(intact?90:12);},this);
 this.encounters=this.encounters.filter(function(e){return e.end>this.distance-12;},this);
};
Game.prototype.generateFlags=function(){
 this.flagNext=Math.max(this.flagNext,Math.floor(Math.max(0,this.distance-8)/LAP_LENGTH)*4);
 while(flagSite(this.flagNext).x<this.distance+135){var f=flagSite(this.flagNext++),rows=routeRows(Math.floor(f.x/LAP_LENGTH),this.seed);for(var ri=0;ri<rows.length;ri++)if(Math.abs(rows[ri].x-f.x%LAP_LENGTH)<28)f.z=rows[ri].safe;if(f.skin===this.flagSkin)f.skin=f.skin%6+1;if(f.x>this.distance-8)this.flags.push(f);}
 this.flags=this.flags.filter(function(f){return f.x>this.distance-8;},this);
};
Game.prototype.initFlagSkin=function(skin){this.flagSkin=flagStyle(skin)?skin:0;for(var i=0;i<this.flags.length;i++){var f=this.flags[i];if(!f.done&&f.skin===this.flagSkin&&!flagStyle(f.skin).effect)f.skin=f.skin%6+1;}};
Game.prototype.nextFlag=function(){for(var i=0;i<this.flags.length;i++){var f=this.flags[i];if(!f.done&&f.x>=this.distance-2.2)return f;}return null;};
Game.prototype.activateFlag=function(skin){
 if(this.mode!=='play'||this.gap<=0)return;
 var style=flagStyle(skin);if(!style)return false;
 // A replacement ends the previous flag immediately, including gold/cosmetic flags.
 this.flagSerial++;this.flagSkin=skin;this.flagSpeed=0;this.flagMagnet=0;this.flagGuard=0;
 if(!style.effect)return true;
 if(style.effect==='speed')this.flagSpeed=3;
 if(style.effect==='magnet')this.flagMagnet=8;
 if(style.effect==='guard')this.flagGuard=10;
 if(style.effect==='gold'){this.coins+=8;this.flagCoins+=8;}
 this.flagPickups++;return true;
};
Game.prototype.checkFlags=function(prev,prevZ){
 if(this.mode!=='play'||this.gap<=0||this.stumble||this.y>1.8)return;
 for(var i=0;i<this.flags.length;i++){var f=this.flags[i];if(!f.done&&intersects(prev,prevZ,this.distance,this.z,f,2.2,1.25)){
  f.done=true;var previousSkin=this.flagSkin,style=flagStyle(f.skin);this.flagSkin=f.skin;this.activateFlag(f.skin);this.emit('flag',{skin:f.skin,previousSkin:previousSkin,name:style.name,serial:this.flagSerial,effect:style.effect||'',note:style.note||'换上小旗',x:f.x,z:f.z});
 }}
};
// Bounded, deterministic sites; never draw randomness from the obstacle stream.
Game.prototype.generateBanks=function(){
 this.bankNext=Math.max(this.bankNext,Math.floor(Math.max(0,this.distance-32)/LAP_LENGTH)*SHORE.length);
 while(bankSite(this.bankNext).x<this.distance+135){var site=bankSite(this.bankNext++);if(site.x>this.distance-32)this.bankSites.push(site);}
 this.bankSites=this.bankSites.filter(function(s){return s.x>this.distance-32;},this);
 this.bankEffects=this.bankEffects.filter(function(e){return this.time-e.at<2;},this);
};
// Allow reaction, two separate swipes and sustained fishing contact at higher speeds.
Game.prototype.bankApproachDistance=function(site){var ahead=Math.max(24,Math.max(this.speed,10)*2.4);if(site)for(var i=0;i<this.entities.length;i++){var e=this.entities[i];if((e.kind==='rock'||e.kind==='log')&&e.safeLane===site.side*LANE_SPACING&&e.x>=site.x-32&&e.x<=site.x+8)ahead=Math.max(ahead,site.x-e.x+24);}return ahead;};
Game.prototype.nextBank=function(){
 for(var i=0;i<this.bankSites.length;i++){var s=this.bankSites[i],dx=s.x-this.distance;
  if(dx>=-8&&dx<Math.max(52,this.bankApproachDistance(s))&&(s.status==='ready'||(s.kind===1&&this.fishCargo&&!s.delivered)))return s;
 }return null;
};
Game.prototype.bankReward=function(site,type,coins){
 this.coins+=coins;this.score+=type==='delivery'?120:60;this.bankVisits++;
 var e={id:site.id,kind:site.kind,side:site.side,x:site.x,type:type,coins:coins,at:this.time,raftX:this.distance,raftY:this.y,raftZ:this.z};
 this.bankEffects.push(e);if(this.bankEffects.length>4)this.bankEffects.shift();this.emit('bank',e);
};
Game.prototype.checkBanks=function(dt){
 if(this.mode!=='play'||this.gap<=0)return;
 for(var i=0;i<this.bankSites.length;i++){
  var s=this.bankSites[i],dx=s.x-this.distance,aligned=this.z*s.side>=3.25,water=this.y<.4&&this.vy<=0&&!this.stumble;
  if(dx < -8){if(s.status==='ready')s.status='missed';s.progress=0;continue;}
  if(dx>8)continue;
  // Delivery is separate from the aerial gift; both can be earned at one camp.
  if(s.status!=='scenery'&&s.kind===1&&this.fishCargo&&!s.delivered&&aligned&&!this.stumble&&Math.abs(dx)<6){
   s.delivered=true;this.fishCargo=null;this.deliveries++;this.bankReward(s,'delivery',BALANCE.shore.deliveryCoins);
  }
  if(s.status!=='ready')continue;
  if(s.kind===1){
   if(aligned&&!this.stumble&&this.manualAir&&this.y>1.1&&this.y<4.8&&Math.abs(dx)<5){s.status='done';s.completedAt=this.time;this.bankReward(s,'gift',BALANCE.shore.giftCoins);}
  }else{
   if(aligned&&water)s.progress+=dt;else s.progress=0;
   var required=s.kind===0?BALANCE.shore.fishSeconds:BALANCE.shore.towSeconds;
   if(s.progress+1e-8>=required){s.status='done';s.completedAt=this.time;
    if(s.kind===0){if(!this.fishCargo){this.fishCargo={from:s.id};this.bankReward(s,'fish',BALANCE.shore.fishCoins);}}
    else{this.tow={id:s.id,x:s.x,side:s.side,remaining:BALANCE.tow.seconds};this.bankReward(s,'tow',0);}
   }
  }
 }
};
Game.prototype.missions=function(){var tier=clamp(Math.floor(this.contract)||0,0,6);return [{label:'漂过 '+(300+tier*150)+' 米',value:this.distance,target:300+tier*150},{label:'接上 '+(3+tier)+' 位搭子',value:this.rescues,target:3+tier},{label:'完成 '+(1+Math.floor(tier/2))+' 次空翻',value:this.flips,target:1+Math.floor(tier/2)}];};
Game.prototype.checkMissions=function(){var list=this.missions();for(var i=0;i<list.length;i++){if(!this.missionFlags[i]&&list[i].value>=list[i].target){this.missionFlags[i]=true;this.score+=150;this.emit('mission',list[i].label);}}if(!this.contractComplete&&this.missionFlags.every(function(v){return v;})){this.contractComplete=true;this.score+=500;this.emit('contract');}};
var regions=[
 {id:0,name:'青苔河谷',note:'沿金币换道，接搭子',gravity:16,speed:BALANCE.regions[0].current},
 {id:1,name:'红岩急流',note:'轻点越障，也可沿水面绕行',gravity:14.5,speed:BALANCE.regions[1].current},
 {id:2,name:'失落遗迹',note:'横风每2秒推一列，及时纠正',gravity:16,speed:BALANCE.regions[2].current},
 {id:3,name:'灯火营地',note:'靠岸送鱼、接礼或牵引',gravity:16,speed:BALANCE.regions[3].current}
];
function journey(distance){var d=Math.max(0,distance),lap=Math.floor(d/LAP_LENGTH),local=d-lap*LAP_LENGTH,id=local<140?0:local<320?1:local<500?2:3,r=regions[id],offset=local-REGION_STARTS[id],length=REGION_LENGTHS[id];return {id:id,name:r.name,note:r.note,gravity:r.gravity,speed:r.speed,stage:lap*4+id,lap:lap+1,tier:Math.min(4,lap),start:lap*LAP_LENGTH+REGION_STARTS[id],offset:offset,length:length,progress:offset/length,next:regions[(id+1)%4].name,remaining:length-offset};}
function riverFlow(distance){var z=journey(distance);if(z.lap===1&&z.id===0)return 0;var before=regions[(z.id+3)%4].speed,u=clamp(z.offset/BALANCE.currentTransitionMetres,0,1);return before+(z.speed-before)*u*u*(3-2*u);}
function baseSpeed(distance){return BALANCE.boatBase+riverFlow(distance);}
function pursuitTier(distance){var lap=Math.floor(Math.max(0,distance)/LAP_LENGTH),u=clamp((distance%LAP_LENGTH)/BALANCE.difficultyTransitionMetres,0,1);return lap<=0?0:Math.min(4,lap-1+u*u*(3-2*u));}
function crocBase(distance){var t=pursuitTier(distance),i=Math.floor(t),j=Math.min(BALANCE.crocBaseByJourney.length-1,i+1);return BALANCE.crocBaseByJourney[i]+(BALANCE.crocBaseByJourney[j]-BALANCE.crocBaseByJourney[i])*(t-i);}
function openingRelief(){return 0;}
function crossCurrent(distance){var z=journey(distance),local=distance%LAP_LENGTH;if(z.id!==2||local<380||local>420)return 0;var u=local-380;return (z.lap===1?1:z.lap%2?-1:1)*Math.max(0,Math.min(1,u/6,(40-u)/6));}
// Wind advances one adjacent lane every two active seconds. Manual correction
// never resets this clock. Airborne/overturned ticks are skipped, not queued.
Game.prototype.applyWind=function(dt){
 var zone=this.zone(),flow=crossCurrent(this.distance),active=Math.abs(flow)>.2,gust=active?zone.stage*8+(zone.lap===1?0:Math.floor(zone.offset/120)):-1;
 if(gust!==this.windGust){this.windGust=gust;this.windTime=0;if(active)this.emit('wind-warning',{direction:flow>0?1:-1});}
 this.currentForce=this.y<=.02&&!this.stumble?flow:0;
 if(!active)return;
 this.windTime+=dt;
 if(this.windTime+1e-9<WIND_INTERVAL)return;
 this.windTime=Math.max(0,this.windTime-WIND_INTERVAL);
 if(!this.currentForce)return;
 var from=routeZ(this.targetZ),to=routeZ(from+(flow>0?LANE_SPACING:-LANE_SPACING));
 this.targetZ=to;
 if(to!==from)this.emit('wind-shift',{direction:flow>0?1:-1,from:from,to:to});
};
Game.prototype.zone=function(){return journey(this.distance);};
Game.prototype.story=function(){for(var i=0;i<this.encounters.length;i++){var e=this.encounters[i];if(e.start<=this.distance&&e.end>this.distance)return e;}return null;};
Game.prototype.checkJourney=function(prev){var e=this.story();if(e&&!e.announced){e.announced=true;if(e.start!==this.zone().start)this.emit('story',e);}var finish=(Math.floor(prev/LAP_LENGTH)+1)*LAP_LENGTH;if(prev<finish&&this.distance>=finish){var completed=this.gap>0&&!this.stumble;this.finishHonorLap(journey(prev).lap,completed);if(completed){this.lapsCompleted++;this.lapFinishAt=this.time;this.score+=250;this.coins+=BALANCE.shore.finishCoins;this.emit('lap-complete',{lap:journey(prev).lap,coins:BALANCE.shore.finishCoins});}}};
Game.prototype.propulsion=function(){var water=this.y<=.02&&this.vy<=0&&!this.stumble,rowing=water&&this.has('otter')&&this.mode==='play';return {water:water,rowing:rowing,pose:paddlePose(this.paddlePhase,rowing),current:this.currentSpeed,extra:this.paddleDrive};};
Game.prototype.burstExtra=function(){return Math.max(this.flagSpeed>0?4:0,this.goldBoost>0?BALANCE.gold.extra:0,this.boost>0?BALANCE.combo.extra:0,this.recoverBoost>0?BALANCE.recover.extra:0,this.escape>0?BALANCE.kick.extra:0,this.tow?BALANCE.tow.extra:0);};
Game.prototype.extraThrust=function(){return this.paddleDrive+this.burstExtra();};
Game.prototype.travelSpeed=function(){var flow=riverFlow(this.distance);if(this.stumble)return (this.recoveryGrace?BALANCE.newcomerCrash.boatBase:BALANCE.crash.boatBase)+flow;if(this.shieldSlow>0)return BALANCE.crash.boatBase+flow;return Math.min(BALANCE.speedCap,baseSpeed(this.distance)+this.extraThrust());};
Game.prototype.pursuitRate=function(){return this.travelSpeed()-(crocBase(this.distance)+riverFlow(this.distance));};
Game.prototype.speedReason=function(){if(this.stumble||this.shieldSlow>0)return '翻船减速';var extra=this.burstExtra();if(this.flagSpeed>0&&extra===4)return '疾风旗加速';if(this.escape>0&&extra===BALANCE.kick.extra)return '踢搭子冲刺';if(this.goldBoost>0&&extra===BALANCE.gold.extra)return '冲浪';if(this.boost>0&&extra===BALANCE.combo.extra)return '冲浪';if(this.tow&&extra===BALANCE.tow.extra)return '码头牵引';if(this.recoverBoost>0)return '自救加速';if(this.paddleDrive>.1)return this.y>.02?'收桨滑行':'水獭划桨';return ['顺流前进','急流提速','遗迹行舟','营地缓行'][this.zone().id];};
Game.prototype.flightInfo=function(){var gravity=this.has('duck')&&this.vy<0?10:this.zone().gravity;return {turn:Math.min(1,this.rotation/TAU),tilt:Math.abs(Math.atan2(Math.sin(this.angle),Math.cos(this.angle))),landingIn:(this.vy+Math.sqrt(this.vy*this.vy+2*gravity*this.y))/gravity};};
// Logical routes stay discrete; the raft travels continuously between them.
Game.prototype.aim=function(z){if(this.mode!=='play'||!Number.isFinite(z))return;var target=routeZ(z);if(target!==this.targetZ){this.targetZ=target;this.lastSteerAt=this.time;}};
Game.prototype.changeLane=function(direction){if(this.mode!=='play'||!Number.isFinite(direction)||!direction)return false;var before=this.targetZ;this.aim(routeZ(before)+(direction>0?LANE_SPACING:-LANE_SPACING));if(this.targetZ!==before){this.emit('manual-lane',{from:before,to:this.targetZ});return true;}return false;};
// Held controls accept one step per press, with release rearming the same direction.
Game.prototype.setSteer=function(axis){if(!Number.isFinite(axis))return;axis=axis>0?1:axis<0?-1:0;if(axis&&axis!==this.steerAxis)this.changeLane(axis);this.steerAxis=axis;};
Game.prototype.stopSteering=function(){this.steerAxis=0;};
function hazardHalfWidth(e){return e.projectile?.8:e.kind==='rock'?2.35+(e.reef==='ridge'?LANE_SPACING*.5:0):2.8;}
function width(e){return e.kind==='rock'||e.kind==='log'?hazardHalfWidth(e):e.kind==='ramp'?2.8:e.kind==='buddy'?1.65:1.25;}
// Forgive the leading edge of a real takeoff, never a missed tap or descent.
function obstacleClearance(g){return g.y+(g.manualAir&&g.vy>0&&g.air>=.06&&g.air<=.24?.4:0);}
// Swept X/Z corridor: moving back into an obstacle still hits until its stern is clear.
function intersects(x0,z0,x1,z1,e,rx,rz){var lo=0,hi=1,starts=[x0-e.x,z0-e.z],deltas=[x1-x0,z1-z0],r=[rx,rz];for(var a=0;a<2;a++){if(Math.abs(deltas[a])<1e-9){if(Math.abs(starts[a])>r[a])return false;}else{var t0=(-r[a]-starts[a])/deltas[a],t1=(r[a]-starts[a])/deltas[a];lo=Math.max(lo,Math.min(t0,t1));hi=Math.min(hi,Math.max(t0,t1));if(lo>hi)return false;}}return true;}
// Shared buoyant surface: a long rising swell and a short tumbling lee face.
// Render and collision sample the same height and tangent, without per-frame allocation.
var MANUAL_JUMP={speed:10.5,height:.04,step:1/120};
function jumpApex(gravity){return MANUAL_JUMP.height+Math.pow(MANUAL_JUMP.speed-gravity*MANUAL_JUMP.step*.5,2)/(2*gravity);}
var WAVE={approach:9,rear:3.2,halfWidth:2.8,maxExit:4.3};
function waveSurface(x,z,power,out){
 out=out||{};var large=(power||13.5)>=11,height=large?1.25:.78,exitSlope=large?.30:.23;
 var crest=.25*Math.sin(z*1.7)+.10*Math.sin(z*4.1),local=x-crest,v=clamp(z/WAVE.halfWidth,-1,1),edge=1-v*v;edge*=edge;
 var h=0,slope=0;
 if(local>=-WAVE.approach&&local<=0){var u=(local+WAVE.approach)/WAVE.approach,a=3*height-exitSlope*WAVE.approach,b=exitSlope*WAVE.approach-2*height;h=a*u*u+b*u*u*u;slope=(2*a*u+3*b*u*u)/WAVE.approach;}
 else if(local>0&&local<WAVE.rear){var u=local/WAVE.rear,a=exitSlope*WAVE.rear;h=height*(1-3*u*u+2*u*u*u)+a*(u-2*u*u+u*u*u);slope=(height*(-6*u+6*u*u)+a*(1-4*u+3*u*u))/WAVE.rear;}
 var variation=1+.09*Math.sin(z*2.3+.5)+.04*Math.sin(z*5.7),vd=.207*Math.cos(z*2.3+.5)+.228*Math.cos(z*5.7),ed=-4*v*(1-v*v)/WAVE.halfWidth,cd=.425*Math.cos(z*1.7)+.41*Math.cos(z*4.1);
 out.height=Math.max(0,h*edge*variation);out.slope=slope*edge*variation;out.crossSlope=h*(ed*variation+edge*vd)-slope*edge*variation*cd;out.crest=crest;out.local=local;out.edge=edge;return out;
}
Game.prototype.departWave=function(e,height,vertical,pitch,remaining,matchJump){
 var gravity=this.zone().gravity,air=Math.max(0,remaining||0),vy=clamp(vertical,0,WAVE.maxExit);
 // Use the same water-relative apex as Space. The crest height is already spent
 // from that budget; never add a full normal jump on top of the wave.
 if(matchJump)vy=gravity*MANUAL_JUMP.step*.5+Math.sqrt(Math.max(0,2*gravity*(jumpApex(gravity)-height-gravity*MANUAL_JUMP.step*air*.5)));
 this.waveRide=null;this.rampFlight=true;this.air=air;this.vy=vy-gravity*air;this.y=Math.max(0,height+vy*air-gravity*air*air*.5);this.angle=pitch||0;this.rotation=0;this.manualAir=false;this.moveSerial++;
 var duration=(vy+Math.sqrt(vy*vy+2*gravity*height))/gravity;
 // A held flip still fits one turn in the shorter flight; never spin on the water.
 this.rampTurnSpeed=TAU/Math.max(.28,duration-.30);e.done=true;e.passed=true;if(e.encounter!==undefined)this.flightEvent={id:e.encounter};this.emit('ramp');
};
Game.prototype.nextHazard=function(){var best=null;for(var i=0;i<this.entities.length;i++){var e=this.entities[i];if(!e.done&&(e.kind==='rock'||e.kind==='log')&&e.x>this.distance&&Math.abs(e.z-this.z)<width(e)&&(!best||e.x<best.x))best=e;}return best;};
Game.prototype.press=function(){if(this.mode!=='play'||this.held)return;this.held=true;this.holdTime=0;if(this.stumble>0){if(this.tapCooldown<=0){this.taps++;this.tapCooldown=BALANCE.crash.tapCooldown;this.emit('paddle',this.taps);if(this.taps>=3){this.recover();}}return;}if(this.waveRide){var e=this.waveRide;this.departWave(e,this.y,this.vy,this.angle,0,true);}else if(this.y<=.02){this.jump(MANUAL_JUMP.speed,'jump');}else if(this.y<.85&&this.vy<0){this.jumpBuffer=.16;}this.manualAir=true;};
Game.prototype.recover=function(){if(!this.stumble)return false;if(this.crashElapsed+1e-8<BALANCE.crash.minimumSeconds){this.recoveryQueued=true;return false;}this.stumble=0;this.y=0;this.vy=0;this.angle=0;this.safe=BALANCE.recover.safeSeconds;this.recoveryGrace=false;this.recoverBoost=BALANCE.recover.seconds;this.recoveries++;this.recoveryHold=0;this.recoveryQueued=false;this.emit('recover');return true;};
Game.prototype.release=function(){this.held=false;this.holdTime=0;};
Game.prototype.jump=function(v,type){this.waveRide=null;this.rampFlight=false;this.vy=v;this.y=MANUAL_JUMP.height;this.air=0;this.angle=0;this.rotation=0;this.manualAir=false;this.moveSerial++;this.emit(type);};
Game.prototype.reward=function(type,value,key){if(key!==undefined){var token=type+':'+key;if(this.rewardEvents.indexOf(token)!==-1)return;this.rewardEvents.push(token);if(this.rewardEvents.length>24)this.rewardEvents.shift();if(this.lastRewardKey===key){this.score+=value*Math.max(1,Math.min(this.combo,8));this.emit(type,this.combo);return;}}this.lastRewardKey=key;this.combo++;this.bestCombo=Math.max(this.bestCombo,this.combo);this.comboTime=BALANCE.combo.windowSeconds;this.score+=value*Math.min(this.combo,8);this.emit(type,this.combo);if(this.combo%3===0&&this.comboCooldown<=0){if(this.reserveSurf('combo'))this.comboCooldown=BALANCE.combo.cooldown;}};
Game.prototype.kickBuddy=function(role){if(this.mode!=='play'||this.gap<=0||this.stumble||this.kickCooldown>0||!this.crew.length)return false;role=role||this.crew[this.crew.length-1];if(!this.has(role))return false;this.removeBuddy(role);this.escape=BALANCE.kick.seconds;this.kickCooldown=BALANCE.kick.cooldown;var departure={role:role,reason:'kick',at:this.time,x:this.distance,y:this.y,z:this.z,side:this.z>0?-1:1,gain:0};this.departures.push(departure);if(this.departures.length>3)this.departures.shift();this.emit('kick',departure);return true;};
Game.prototype.reserveSurf=function(source){
 if(this.practiceReplay||this.mode!=='play'||this.gap<=0||this.goldCharge)return false;
 this.goldCharge=1;this.surfChargeSource=source==='combo'?'combo':'gold';this.emit('surf-ready',this.surfChargeSource);this.useSurf();return true;
};
Game.prototype.useSurf=function(){
 if(this.mode!=='play'||!this.goldCharge||this.gap<=0||this.stumble||this.shieldSlow>0||this.burstExtra()>=BALANCE.surf.extra)return false;
 var source=this.surfChargeSource||'gold';this.goldCharge=0;this.surfChargeSource='';this.goldBoost=BALANCE.surf.seconds;this.emit('boost',source);return true;
};
// Preserve the model entry point used by existing integrations.
Game.prototype.useGoldBoost=Game.prototype.useSurf;
Game.prototype.cancelBursts=function(){this.flagSpeed=0;this.boost=0;this.goldBoost=0;this.recoverBoost=0;this.escape=0;this.goldCharge=0;this.surfChargeSource='';this.tow=null;this.paddleDrive=0;};
Game.prototype.crash=function(reason){
 if(!this.practiceReplay)this.honorLap.impacts++;
 if(this.safe>0||this.stumble>0)return;this.hits++;this.lastMistake=reason;this.flightEvent=null;this.waveRide=null;this.rampFlight=false;this.angle=0;this.rotation=0;this.y=0;this.vy=0;
 if(this.flagGuard>0&&reason.indexOf('撞上了')===0){this.flagGuard=0;this.safe=.18;this.shieldAt=this.time;this.emit('shield','flag');return;}
 if(this.has('turtle')){this.removeBuddy('turtle');this.safe=1.5;this.shieldAt=this.time;this.emit('shield','turtle');return;}
 this.cancelBursts();this.combo=0;this.comboTime=0;this.held=false;
 if(this.fishCargo){this.fishCargo=null;this.bankEffects.push({type:'drop',at:this.time,raftX:this.distance,raftZ:this.z});if(this.bankEffects.length>4)this.bankEffects.shift();this.emit('cargo-lost');}
 if(this.crew.length){var role=this.crew[this.crew.length-1];this.removeBuddy(role);this.shieldSlow=.8;this.safe=1.5;this.emit('shield',role);return;}
 this.recoveryGrace=this.distance<LAP_LENGTH*BALANCE.newcomerCrash.throughJourney&&this.recoverySupportUsed<BALANCE.newcomerCrash.usesPerRun;if(this.recoveryGrace)this.recoverySupportUsed++;
 this.stumble=this.recoveryGrace?BALANCE.newcomerCrash.timeoutSeconds:BALANCE.crash.timeoutSeconds;this.crashElapsed=0;this.recoveryQueued=false;this.taps=0;this.recoveryHold=0;this.angle=.9;this.emit('crash',reason);
};
Game.prototype.step=function(dt){
 if(this.mode!=='play')return;if(this.gap<=0){this.mode='over';this.emit('over','被鳄鱼追上啦');return;}
 dt=clamp(dt,0,.05);this.time+=dt;this.tickBuddies(dt);
 var timers=['flagSpeed','flagMagnet','flagGuard','escape','kickCooldown','safe','boost','goldBoost','recoverBoost','comboCooldown','tapCooldown','comboTime','coinTimer','jumpBuffer','shieldSlow'];for(var ti=0;ti<timers.length;ti++)this[timers[ti]]=Math.max(0,this[timers[ti]]-dt);
 if(!this.comboTime)this.combo=0;if(!this.coinTimer)this.coinChain=0;if(this.held)this.holdTime+=dt;
 if(this.tow){this.tow.remaining-=dt;if(this.tow.remaining<=0||this.stumble||this.y>.4||this.z*this.tow.side<3.05)this.tow=null;}
 this.departures=this.departures.filter(function(e){return this.time-e.at<1.6;},this);
 var zone=this.zone();if(zone.stage!==this.lastZone){this.lastZone=zone.stage;this.score+=100;this.emit('zone',zone);}
 if(this.stumble){this.crashElapsed+=dt;this.stumble-=dt;if(this.held){this.recoveryHold+=dt;if(this.recoveryHold>=BALANCE.crash.holdSeconds/3){this.recoveryHold-=BALANCE.crash.holdSeconds/3;this.taps++;this.emit('paddle',this.taps);if(this.taps>=3)this.recover();}}else this.recoveryHold=0;
  if(this.recoveryQueued&&this.crashElapsed+1e-8>=BALANCE.crash.minimumSeconds)this.recover();
  if(this.stumble<=0&&this.taps<3){this.mode='over';this.emit('over','没能及时扶正木筏');return;}
 }
 // A pending surf starts as soon as the current equal/stronger burst ends.
 if(!this.practiceReplay)this.useSurf();
 var rowing=this.y<=.02&&this.vy<=0&&!this.stumble&&this.shieldSlow<=0&&this.has('otter');if(rowing)this.paddlePhase=(this.paddlePhase+dt/1.25)%1;else this.paddlePhase=0;
 var stroke=paddlePose(this.paddlePhase,rowing);this.paddleDrive+=(BALANCE.otter.meanExtra*Math.PI/1.2*stroke.power-this.paddleDrive)*Math.min(1,dt*6);if(this.stumble||this.shieldSlow>0||!this.has('otter'))this.paddleDrive=0;
 this.currentSpeed=this.flowSpeed?this.flowSpeed():baseSpeed(this.distance);this.speed=this.travelSpeed();this.crocSpeed=this.predatorSpeed?this.predatorSpeed():crocBase(this.distance)+riverFlow(this.distance);
 var prev=this.distance,prevZ=this.z;this.distance+=this.speed*dt;this.score+=this.speed*dt;this.gap+=(this.speed-this.crocSpeed)*dt;
 // Apply the current stage's limit before collisions, rewards and UI events.
 var gapLimit=this.gapLimit?this.gapLimit():BALANCE.gap.hardCap;
 if(gapLimit!==null&&Number.isFinite(gapLimit))this.gap=Math.min(this.gap,gapLimit);
 if(this.gap<=0){this.gap=0;this.mode='over';this.emit('over','被鳄鱼追上啦');return;}
 var previousRide=this.waveRide,previousY=this.y;
 if(!this.stumble&&!previousRide&&(this.y>0||this.vy>0)){
  this.air+=dt;var gravity=this.has('duck')&&this.vy<0?BALANCE.duck.descendingGravity:this.zone().gravity;this.vy-=gravity*dt;this.y+=this.vy*dt;
  if(this.held&&this.holdTime>.16){var turnSpeed=this.rampFlight?this.rampTurnSpeed:6.2;this.angle+=turnSpeed*dt;this.rotation+=turnSpeed*dt;}else{var nearest=Math.round(this.angle/TAU)*TAU;this.angle+=(nearest-this.angle)*Math.min(1,dt*11);}
  if(this.y<=0){this.y=0;this.vy=0;var tilt=Math.abs(Math.atan2(Math.sin(this.angle),Math.cos(this.angle))),flips=Math.floor((this.rotation+.2)/TAU);this.landings++;
   if(tilt>1.05)this.crash('落水前记得松手扶正');
   else if(this.flightEvent){this.flyovers++;this.score+=100;if(flips>0){this.flips+=flips;this.reward('flip',100*flips,'air-'+this.moveSerial);}else this.reward('flight-action',0,'air-'+this.moveSerial);this.emit('flyover',this.flyovers);}
   else if(flips>0){this.flips+=flips;this.score+=100*flips;this.emit('flip',this.combo);}else this.emit('land');
   this.flightEvent=null;this.rampFlight=false;this.angle=0;this.rotation=0;this.air=0;if(this.jumpBuffer>0&&!this.stumble){this.jumpBuffer=0;this.jump(MANUAL_JUMP.speed,'jump');this.manualAir=true;}
  }
 }
 this.applyWind(dt);this.targetZ=routeZ(this.targetZ);var error=this.targetZ-this.z,direction=error>0?1:error<0?-1:0,lateralLimit=this.stumble?4:this.y>0?BALANCE.steerSpeed:BALANCE.steerSpeed+this.currentForce*direction*.6,desired=clamp(error*16,-lateralLimit,lateralLimit);
 this.lateralVelocity+=(desired-this.lateralVelocity)*(1-Math.exp(-24*dt));var nextZ=this.z+this.lateralVelocity*dt;if(error*(this.targetZ-nextZ)<=0||(Math.abs(error)<.004&&Math.abs(this.lateralVelocity)<.12)){nextZ=this.targetZ;this.lateralVelocity=0;}this.z=clamp(nextZ,-LANE_SPACING,LANE_SPACING);
 this.waveRide=null;
 for(var i=0;i<this.entities.length;i++){var e=this.entities[i];if(e.done)continue;var dx=e.x-this.distance;
  if(e.kind==='coin'){
   var direct=intersects(prev,prevZ,this.distance,this.z,e,1.1,width(e))&&Math.abs(this.y+1-e.y)<2.1;
   // Keep the existing river/lateral sweep; reach one lane width above and below
   // the raft's pickup centre. Sweep height too, so rising/falling cannot skip it.
   var magnetic=!direct&&this.flagMagnet>0&&e.y>=Math.min(previousY,this.y)+1-LANE_SPACING-1e-9&&e.y<=Math.max(previousY,this.y)+1+LANE_SPACING+1e-9&&e.x>=prev-1.1&&e.x<=this.distance+1.1&&Math.abs(e.z)<=3.71;
   if((direct||magnetic)&&!this.stumble){
    e.done=true;this.coins++;this.score+=15;
    if(!magnetic){this.coinChain++;this.bestCoinChain=Math.max(this.bestCoinChain,this.coinChain);this.coinTimer=BALANCE.gold.chainGapSeconds;}
    this.emit('coin',{x:e.x,y:e.y,z:e.z,chain:magnetic?0:this.coinChain,total:this.coins,magnet:magnetic,flagSerial:magnetic?this.flagSerial:null});
    if(!magnetic&&this.coinChain%5===0){this.reserveSurf('gold');this.score+=75;this.emit('coin-chain');}
   }continue;
  }
  if(e.kind==='buddy'){if(intersects(prev,prevZ,this.distance,this.z,e,1.5,width(e))&&this.y<1.8&&!this.stumble){if(!this.boardBuddy(e.role))continue;e.done=true;this.rescues++;this.score+=80;this.emit('buddy',e.role);}continue;}
  if(e.kind==='thrower')continue;
  if(e.kind!=='ramp'&&dx>2.4&&dx<(this.hazardThreatDistance?this.hazardThreatDistance():24)&&Math.abs(this.z-e.z)<width(e))e.threatened=true;
  if(dx < -(e.kind==='ramp'?WAVE.rear+1:2.4)){e.done=true;e.passed=e.kind==='rock'||e.kind==='log'||e.kind==='ramp';if(e.kind!=='ramp'&&e.threatened&&this.time-this.lastSteerAt<Math.max(3,30/this.speed)&&!this.stumble&&this.y<.4){this.dodges++;this.reward('dodge',35,'row-'+e.x);}continue;}
  var moving=e.sway||e.projectile,hit=moving?intersects(prev,prevZ-(Number.isFinite(e.prevZ)?e.prevZ:e.z),this.distance,this.z-e.z,{x:e.x,z:0},e.kind==='ramp'?1:2.4,width(e)):intersects(prev,prevZ,this.distance,this.z,e,e.kind==='ramp'?1:2.4,width(e));
  // Ride the shared water surface, then leave the crest with Space's height budget.
  if(e.kind==='ramp'){
   var surface=waveSurface(-dx,this.z-e.z,e.power,this.waveSample),aligned=Math.abs(this.z-e.z)<WAVE.halfWidth-.15;
   if(!this.stumble&&aligned&&surface.local>=-WAVE.approach&&surface.local<=0&&surface.height>.0001){
    var catchSurface=previousRide===e||this.y<=.05||this.vy<=0&&this.y<=surface.height+.08&&previousY>=surface.height-.18;
    if(catchSurface){this.waveRide=e;var liftLimit=Math.max(2,this.speed*.36)*dt;this.y=Math.min(surface.height,this.y+liftLimit);this.vy=this.speed*surface.slope;this.angle=Math.atan(surface.slope);this.rotation=0;this.air=0;this.manualAir=false;}
   }else if(!this.stumble&&aligned&&previousRide===e&&surface.local>0){
    waveSurface(surface.crest,this.z-e.z,e.power,surface);this.departWave(e,Math.min(surface.height,this.y+Math.max(2,this.speed*.36)*dt),this.speed*surface.slope,Math.atan(surface.slope),Math.min(dt,Math.max(0,(this.distance-e.x-surface.crest)/this.speed)),true);
   }else if(!this.stumble&&aligned&&surface.local>0&&surface.local<WAVE.rear&&this.vy<0&&this.y<=surface.height+.05&&previousY>=surface.height-.12){
    // Descending onto the foamy lee side makes low contact, never a trampoline.
    this.departWave(e,Math.max(this.y,surface.height),0,Math.atan(surface.slope),0);
   }
   continue;
  }
  if(hit){e.done=true;if(this.stumble)continue;if(e.projectile?Math.abs(obstacleClearance(this)-e.y)<1.1:obstacleClearance(this)<(e.kind==='rock'?1.65:.9)){this.emit('impact',{kind:e.kind,projectile:!!e.projectile,x:this.distance+2.4,y:.65,z:this.z});if(this.safe>0)this.emit('protected');else this.crash('撞上了'+(e.projectile?'岸边飞石':e.kind==='rock'?'礁石':'浮木'));}else{e.passed=true;if(this.manualAir){this.clears++;this.reward('clear',40,'air-'+this.moveSerial);}else this.score+=10;}}
 }
 if(previousRide&&!this.waveRide&&!previousRide.done&&!this.stumble)this.departWave(previousRide,this.y,this.vy,this.angle,0);
 this.checkFlags(prev,prevZ);this.generateFlags();this.checkJourney(prev);this.checkBanks(dt);this.generateBanks();this.checkHonors();if(this.mode==='play')this.checkMissions();this.generate();
};
Game.prototype.advance=function(dt){this.accumulator+=clamp(dt,0,.25);while(this.accumulator+1e-9>=1/120){this.step(1/120);this.accumulator-=1/120;}this.accumulator=Math.max(0,this.accumulator);};
root.River3D={hazardHalfWidth:hazardHalfWidth,manualJump:MANUAL_JUMP,jumpApex:jumpApex,wave:WAVE,waveSurface:waveSurface,balance:BALANCE,riverFlow:riverFlow,crocBase:crocBase,routeRows:routeRows,openingStory:{lungeAt:.32,chaseDuration:1,launchAt:.84,biteAt:1.42,escapeDuration:3.86},defeatStory:{grip:1.45,crush:2.75,splash:3.9,help:4.7,duration:7.55},learningRoute:learningRoute,LessonPace:LessonPace,buddyDuration:buddyDuration,flagStyles:flagStyles,flagStyle:flagStyle,Game:Game,clamp:clamp,paddlePose:paddlePose,honors:honors,honorSeries:honorSeries,titles:titles,cleanHonors:cleanHonors,titleInfo:titleInfo,bankSite:bankSite,bankSitesBetween:bankSitesBetween,lapLength:LAP_LENGTH,baseSpeed:baseSpeed,pursuitTier:pursuitTier,openingRelief:openingRelief,journey:journey,crossCurrent:crossCurrent,windInterval:WIND_INTERVAL};
})(typeof window!=='undefined'?window:globalThis);
