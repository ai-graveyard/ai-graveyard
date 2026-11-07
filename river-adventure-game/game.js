(function(){'use strict';var $=function(id){return document.getElementById(id);},game=new River3D.Game(),renderer,mode='intro',last=0,time=0,noticeUntil=0,uiTick=0,raf=0,slow=0,slowLow=0,muted=false,audio=new RiverAudio(),stats={best:0},pressed=false,pointerId=null,manualLow=false,lost=false,coachGate='',coachJump=false,coachFlip=false,haptics=true,renderDirty=true,noticePriority=0,drag=null,steerPointers={},steerKeys={};
var mvpElapsed=0;
var roles={otter:'水獭 · 划水加速',duck:'鸭鸭 · 撑伞缓降',turtle:'龟龟 · 挡住礁石'},reduced=window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;
var lessonPace=new River3D.LessonPace(),welcomePending=false;
// The same runtime balance drives the manual, companion cards and reward feedback.
function syncRuleCopy(){
 var b=River3D.balance;
 $('rule-otter-title').textContent=River3D.buddyDuration('otter')+'秒同行，水面自动划桨加速';
 $('rule-duck-title').textContent=River3D.buddyDuration('duck')+'秒同行，下降时撑伞缓降';
 $('rule-duck-end').textContent='仍要自己起跳、松手。'+River3D.buddyDuration('duck')+'秒到站后伞会收起，也不能替你躲撞击。';
 $('rule-turtle-title').textContent=River3D.buddyDuration('turtle')+'秒内，替你挡一次礁石或浮木';
 $('rule-turtle-end').textContent='挡一次或'+River3D.buddyDuration('turtle')+'秒到站就离船，以先发生的为准；挡不住鳄鱼。';
 ['otter','duck'].forEach(function(role){$('rule-guide-'+role).textContent='同行'+River3D.buddyDuration(role)+'秒';});
 $('rule-guide-turtle').textContent=River3D.buddyDuration('turtle')+'秒内有效 · 挡完即离船';
 $('rule-chase-detail').textContent=(River3D.campaign?'共4关，船与鳄鱼的基础速度逐关提高。每关按实际游玩时间推进，加速不会缩短过关时间。前两关循序练习换道与借浪，第三关熟悉横风和飞石，第四关是高速挑战。翻船后及时扶正。':'速度会随河段和旅程变化。')+'水獭划桨、冲浪、自救、踢搭子和码头牵引都能提速；腾空后划桨推力减弱。是否正在拉开，看鳄鱼距离条；'+(b.gap.hardCapsByStage?'第1至4关领先距离上限分别为'+b.gap.hardCapsByStage.join('、')+'米。过关不补距离，达到上限后不能继续积攒。':b.gap.hardCap===null?'间距没有固定上限。':'间距最多'+b.gap.hardCap+'米。');
 $('rule-gold-summary').textContent='连续收满'+b.gold.coinsPerGroup+'枚金币，或主动绕障、越障、借浪落稳达成'+b.combo.actions+'连击，都会自动触发冲浪，无需额外操作。';
 $('rule-gold-detail').textContent='金币五连与动作三连击共用'+b.surf.maxCharges+'次冲浪储备，每次持续'+b.surf.seconds+'秒，速度增加'+b.surf.extra+'米/秒；储备已满时不会叠加或延长。达成后自动释放，已有同等或更强加速时先保留，结束后自动接上；三连击成功储备后冷却'+b.combo.cooldown+'秒。不会直接赠送追赶间距。第1关船基础速度'+b.boatBase+'米/秒，鳄鱼基础速度'+b.crocBaseByJourney[0]+'米/秒，开局领先'+b.gap.initial+'米。暂停不消耗能力时间；翻船会清除冲浪和储备。';
 ['otter','duck','turtle'].forEach(function(role){$('kick-'+role).setAttribute('aria-label','踢'+({otter:'水獭',duck:'鸭鸭',turtle:'龟龟'})[role]+'下船，冲刺'+b.kick.seconds+'秒');});
 $('kick-note').textContent='踢一位 · 冲刺'+b.kick.seconds+'秒';
 $('rule-kick-detail').textContent='可点击左侧搭子旁的「踢」，让指定搭子下船：立刻加速'+b.kick.extra+'米/秒，持续'+b.kick.seconds+'秒，代价是失去该搭子的能力。同种再次拾取会刷新同行时间。';
}
syncRuleCopy();

var lessonCopy={
 jump:['先练轻点起跳、落稳','点一下河面或跳跃键，不用按住；稳稳落水就完成这次练习。','现在试试：轻点起跳，稳稳落水'],
 flip:['借浪飞起来，再练空翻','这次只练按住和松手：按住转一圈，看到「松手」就抬手，扶正后落水。','现在试试：按住转一圈，松手落稳'],
 wind:['宽水面，单独练一次横风','先等风把船推到旁边，再反向滑回原位，稳住一次才完成。滑动矫正不会重置风的计时。','现在试试：观察箭头，换道纠正'],
 fish:['靠岸稳住，帮忙拉条鱼','向左换到最外侧，保持在水面，不用点按。靠近鱼圈后稳住，鱼篮就会上船。','现在试试：左侧靠岸，稳住拉鱼'],
 camp:['带着鱼篮，到右岸送鱼','向右换到最外侧，靠近营地就会自动送到。先完成这一件事，再看下一段水面。','现在试试：右侧靠岸，送到营地'],
 gift:['右岸有礼物，用学过的跳跃接住','先换到最右侧，接近礼物时轻点跳起。这里只练跳跃，不需要空翻。','现在试试：右侧靠岸，轻点接礼'],
 tow:['最后练接绳，借一点力前进','向右靠近码头，保持在水面接住绳索；接上后起跳或换道就能松开。','现在试试：右侧靠岸，稳住接绳']
};
var passedGuides={},flagLessonsSeen={},flagIntro=null,pendingFlagIntros=[],flagLessonEpoch=0,practiceReplay=null,replayPicker=false;
function rememberGuides(data){
 (data.flagLessons||[]).forEach(function(id){flagLessonsSeen[id]=true;});
 if(data.gestureGuide)passedGuides.steer=true;if(data.flagGuide)passedGuides.flag=true;
 (data.lessonGuides||[]).concat(data.buddyGuides||[]).forEach(function(id){passedGuides[id]=true;});
}
function lessonKnown(id){return !!passedGuides[id]||Array.isArray(stats.lessonGuides)&&stats.lessonGuides.indexOf(id)!==-1;}
var practiceSuccessAt=-99,practiceSuccessText='',practiceRetryAt=-99,practiceRetryDelay=0;
function lessonResult(result){
 if(!result)return;
 if(result.result==='retry'){if(practiceReplay)retryPractice();else lessonPace.finish(game,'missed');return;}
 if(result.result!=='practised')return;
 var id=result.id,pending;
 if(['jump','flip','wind','fish','camp','tow'].indexOf(id)!==-1&&!lessonKnown(id)){
  stats.lessonGuides=(stats.lessonGuides||[]).concat([id]);pending=RiverPlatform.completeLesson?RiverPlatform.completeLesson(id):Promise.resolve(false);
 }else if(id==='steer'&&!stats.gestureGuide){stats.gestureGuide=true;pending=RiverPlatform.completeGestureGuide?RiverPlatform.completeGestureGuide():Promise.resolve(false);}
 else if(['otter','duck','turtle'].indexOf(id)!==-1&&!buddySeen(id)){stats.buddyGuides=(stats.buddyGuides||[]).concat([id]);pending=RiverPlatform.completeBuddyGuide?RiverPlatform.completeBuddyGuide(id):Promise.resolve(false);}
 if(id==='flag'&&practiceReplay&&!passedGuides.flag){stats.flagGuide=true;pending=RiverPlatform.saveFlagAppearance?RiverPlatform.saveFlagAppearance(stats.flagSkin||0,true):Promise.resolve(false);}
 passedGuides[id]=true;
 if(practiceReplay)practiceReplay.completedAt=time;
 if(pending)Promise.resolve(pending).then(function(ok){if(!ok)$('mode-note').textContent='练习本局已完成，暂未保存，下次可能再次提示';});
 practiceSuccessAt=game.time;practiceSuccessText=(practiceReplay?'练习完成 ✓ ':'做到了！')+({steer:'成功换道',flag:'捡到小旗',jump:'跳跃落稳',flip:'完成空翻',wind:'风后矫正成功',fish:'钓到鱼了',camp:'岸边任务成功',tow:'成功接绳',otter:'水獭开始划水',duck:'缓降后落稳',turtle:'龟龟挡住撞击'}[id]||'继续漂流');
 practiceRetryDelay=0;if(practiceReplay)rewardNotice('练好了，前面歇一歇','practice','练习完成');
}
function retryPractice(){
 if(!lessonPace.retry(game))return;
 clearSteering();pressed=false;pointerId=null;practiceSuccessAt=-99;practiceRetryAt=game.time;practiceRetryDelay=1;
 clearNotices();honorQueue=[];honorCurrent=null;honorTimer=0;$('honor-toast').hidden=true;$('action').classList.remove('down');
 if(renderer){renderer.camera=null;renderer.endingTime=null;document.body.classList.remove('shore-ending');$('shore-ending').hidden=true;renderer.particles=[];renderer.coinPops=[];renderer.impact=0;renderer.impactPop=null;}
 audio.stop();renderDirty=true;updateUI();
}
function releaseLesson(){lessonPace.release(game);practiceSuccessAt=-99;practiceRetryDelay=0;}
function finishCourseCoach(){
 var kind=coachGate;coachGate='';$('coach').hidden=true;$('action').focus();if(kind==='jump')coachJump=true;if(kind==='flip')coachFlip=true;
 releaseLesson();
}
function updateLessonPractice(){
 var a=lessonPace.active,playing=mode==='play'&&!coachGate,success=playing&&game.time-practiceSuccessAt<1.8;
 $('practice-cue').hidden=!playing||(!a&&!success)||!!game.stumble||game.gap<10||!!(a&&a.optional&&game.time-a.practiceAt>6&&!success);
 document.body.classList[$('practice-cue').hidden?'remove':'add']('lesson-practice');document.body.classList[success?'add':'remove']('lesson-success');
 if($('practice-cue').hidden)return;
 if(success){$('practice-cue').textContent=practiceSuccessText;return;}
 if(!a||a.phase!=='practice'){$('practice-cue').hidden=true;return;}
 var copy=lessonCopy[a.id==='camp'&&a.bankType==='gift'?'gift':a.id],text=copy?copy[2].replace(/[左右]侧/g,(a.side<0?'左':'右')+'侧'):a.id==='steer'?'向左滑一次，让船稳稳换到旁边':a.id==='flag'?'换到小旗的位置，靠近就能捡到':a.id==='otter'?'接上水獭，看它在水面划水加速':a.id==='duck'?'接上鸭鸭，借浪后缓缓落稳':'接上龟龟，让它挡下一次浮木';
 if(a.id==='wind')text=a.windFrom===null?'先等横风推船，再反向滑回':a.correcting?'正在矫正，等木筏稳住':(a.windDirection>0?'← 向左':'向右 →')+'滑回被吹前的位置';
 if(a.optional){text=({steer:'向左滑一下，沿金币走',jump:'轻点起跳，稳稳落水就完成练习',flip:game.y>0?'离水后按住转一圈，再松手落稳':'浪头会带你飞，离水后按住，转一圈松手',wind:'风推船后，反向滑回一格',fish:'想钓鱼？靠'+(a.side<0?'左':'右')+'岸稳住就行',camp:a.bankType==='gift'?'靠'+(a.side<0?'左':'右')+'岸，轻点跳起接礼':'靠'+(a.side<0?'左':'右')+'岸，鱼篮会自动送到',tow:'靠'+(a.side<0?'左':'右')+'岸接绳，跳起就能松开'})[a.id];$('practice-cue').textContent=text;return;}
 var again=game.time-practiceRetryAt<1.8?'再试一次 · ':'实操 0/1 · ';$('practice-cue').textContent=again+text;
}
function syncDialogBackdrop(){
 var open=!!coachGate&&!$('coach').hidden||['flag-intro','endless-lock-panel','mvp','overlay','result-details','buddy-panel','guide-panel','settings-panel','honors-panel','skin-panel','boats-panel','leaderboard-panel','fallback'].some(function(id){return !$(id).hidden;});
 $('dialog-backdrop').hidden=!open;document.body.classList[open?'add':'remove']('dialog-open');
}
function lessonUnlocked(id){
 var plan=River3D.learningRoute.filter(function(l){return l.id===id;})[0];
 return !!plan&&!plan.passive&&game.zone().stage>=plan.stage;
}
function offerLesson(id,until){
 if(lessonPace.offered[id]||!lessonUnlocked(id)||!lessonPace.begin(id,game,until))return false;
 lessonPace.offered[id]=true;lessonPace.active.optional=true;
 var bank=game.nextBank();if(bank&&['fish','camp','tow'].indexOf(id)!==-1){var a=lessonPace.active;a.side=bank.side;a.bankId=bank.id;a.bankX=bank.x;a.bankType=id==='camp'?(game.fishCargo?'delivery':'gift'):id;}
 lessonPace.release(game);clearNotices();return true;
}
function guideCourse(){
 lessonResult(lessonPace.tick(game));
 if(practiceReplay||game.endless)return;
 if(mode!=='play'||coachGate||!lessonPace.ready(game)||game.stumble||game.gap<10)return;
 if(welcomePending){
  var near=game.nextHazard();
  if(game.time>=3&&game.y===0&&(!near||near.x-game.distance>game.speed*2)){welcomePending=false;offerLesson('steer',game.distance+110);}
  return;
 }
 var hazard=game.nextHazard(),bank=game.nextBank(),d=game.distance;
 if(!lessonKnown('jump')&&lessonUnlocked('jump')&&!lessonPace.offered.jump&&!coachJump&&game.y===0&&hazard&&hazard.x-d<game.speed*3.2&&hazard.x-d>game.speed*1.8){offerLesson('jump',hazard.x+55);return;}
 if(!lessonKnown('flip')&&lessonUnlocked('flip')&&!lessonPace.offered.flip&&!coachFlip){
  var ramp=null;for(var ri=0;ri<game.entities.length;ri++){var re=game.entities[ri],rd=re.x-d;if(re.kind==='ramp'&&!re.done&&Math.abs(re.z-game.targetZ)<1.25&&rd>8&&rd<game.speed*3.2&&(!ramp||re.x<ramp.x))ramp=re;}
  if(ramp&&game.y===0&&(!hazard||hazard.x-d>game.speed*2)){offerLesson('flip',ramp.x+110);return;}
  if(game.y>2&&game.vy>0&&game.flightEvent&&game.time-(lastRampAt||-99)<.65){offerLesson('flip',game.distance+110);return;}
 }
 if(game.y>0)return;
 if(!lessonKnown('wind')&&lessonUnlocked('wind')&&!lessonPace.offered.wind&&River3D.journey(d).id===2&&(!hazard||hazard.x-d>game.speed*3)&&((d<River3D.lapLength&&d>=360&&d<380)||(d>=River3D.lapLength&&Math.abs(River3D.crossCurrent(d+30))>.2))){offerLesson('wind',d+150);return;}
 if(bank&&bank.status==='ready'&&bank.x-d>8&&bank.x-d<Math.max(35,game.speed*2.2)){
  var id=bank.kind===0?'fish':bank.kind===1?'camp':'tow';if(!lessonKnown(id)&&lessonUnlocked(id)){offerLesson(id,bank.x+10);return;}
 }
}
var lastRampAt=-99;
var honorQueue=[],honorTimer=0,honorCurrent=null,honorReturn='intro',honorBookSeries='beginner',honorSaveMessage='',honorSaveRevision=0,settingsReturn='intro',discardAction='';
function setupHonors(){game.initFlagSkin(stats.flagSkin||0);game.initHonors(stats.badges,stats.honorFloor,stats.trackedHonor);updateHonors();}
function titleSummary(){var h=game.honorInfo();return h.next?'再获 '+h.remaining+' 枚 → '+h.next:h.total+' 枚徽章已集齐';}
function trackedChallenge(){var list=game.challenges(),chosen=list.filter(function(c){return c.id===game.trackedHonor&&!c.earned;})[0];return chosen||list.filter(function(c){return !c.earned;})[0];}
function updateHonors(){var h=game.honorInfo(),next=trackedChallenge();$('captain-name').textContent=h.name;$('captain-seal').textContent=['Ⅰ','Ⅱ','Ⅲ','Ⅳ','Ⅴ','Ⅵ','Ⅶ','Ⅷ','Ⅸ','Ⅹ'][h.level];$('captain-seal').style.background=h.color;$('captain-progress').textContent=h.count+' / '+h.total+' 徽章';$('progression').textContent=h.name+' · '+h.count+' / '+h.total+' 徽章';$('camp-honors').textContent=titleSummary();$('challenge-name').textContent=next?(game.trackedHonor===next.id?'追踪 · ':'下一枚 · ')+next.name:'河流之王 · 荣誉集齐';$('challenge-count').textContent=next?next.value+' / '+next.target:h.total+' / '+h.total;$('challenge-fill').style.width=(next?next.value/next.target*100:100)+'%';$('challenge-next').textContent=next?next.label:'继续刷新纪录，带着你的荣誉出发';$('honor-track-hud').hidden=!game.trackedHonor||!next||game.trackedHonor!==next.id||mode!=='play'||!!practiceReplay;$('honor-track-name').textContent=next?next.name:'';$('honor-track-count').textContent=next?next.value+'/'+next.target:'';}
function persistHonors(){stats.badges=game.honors.slice();var revision=++honorSaveRevision;honorSaveMessage='荣誉保存中…';var pending=RiverPlatform.saveHonors?RiverPlatform.saveHonors(stats.badges):Promise.resolve(false);pending.then(function(ok){if(revision!==honorSaveRevision)return;honorSaveMessage=ok?'荣誉已保存，下次出发继续佩戴':'荣誉本次已生效，暂未保存；离开后可能丢失';$('honor-save-status').textContent=honorSaveMessage;$('mode-note').textContent=ok?'':honorSaveMessage;});}
function honorFeedback(data){var count=(honorQueue.length?honorQueue[0].count:honorCurrent?honorCurrent.count:0)+1;data.count=count;data.scope=noticeScope();honorQueue=[data];persistHonors();updateHonors();}
function animateHonors(dt){
 document.body.classList.remove('honoring');
 if(mode!=='play'){$('honor-toast').hidden=true;return;}
 if(operationActive()||game.flightEvent||game.time-game.lapFinishAt<2.6||game.bankEffects.some(function(e){return e.type!=='drop'&&game.time-e.at<1.7;})){
  honorQueue=[];honorCurrent=null;honorTimer=0;$('honor-toast').hidden=true;return;
 }
 if(honorCurrent&&!noticeValid({key:'honor',scope:honorCurrent.scope})){honorCurrent=null;honorTimer=0;}
 if(honorQueue.length){
  var item=honorQueue[0];honorQueue=[];
  if(noticeValid({key:'honor',scope:item.scope})){
   var fresh=!honorCurrent;honorCurrent=item;if(fresh){honorTimer=3.2;sound(item.promoted?'boost':'flip');touchFeedback('medium');if(!reduced)renderer.burst(game,'boost',time);}
   $('honor-toast-icon').textContent=item.badge.icon;$('honor-toast-icon').className='badge-art badge-'+item.badge.id;
   $('honor-toast-kicker').textContent=item.promoted?'船长晋升 · 胸章已升级':'挑战达成 · 徽章 +1';
   $('honor-toast-title').textContent=item.count>1?'新徽章 +'+item.count+' · '+item.title.name:item.promoted?'晋升 · '+item.title.name:'徽章 · '+item.badge.name;
   $('honor-toast-detail').textContent=item.badge.label;$('honor-toast').className=item.promoted?'promotion':'';
  }
 }
 honorTimer=Math.max(0,honorTimer-dt);if(honorTimer<=0)honorCurrent=null;
 $('honor-toast').hidden=!honorCurrent;if(honorCurrent)document.body.classList.add('honoring');
}

var resultNewBoats=0,resultNewBadges=0,resultRewardsSaved=false;
function syncRewardAction(){
 var boat=resultRewardsSaved&&resultNewBoats>0,honor=resultRewardsSaved&&!boat&&resultNewBadges>0;
 $('result-boats-open').hidden=!boat;$('result-honors-open').hidden=!honor;$('result-rank-open').hidden=true;
 $('result-reward-links').hidden=resultTab!=='rewards'||!boat&&!honor;
 $('overlay').setAttribute('data-reward-action',boat?'boats':honor?'honors':'none');
 if(mode==='over'&&((document.activeElement===$('result-boats-open')&&!boat)||(document.activeElement===$('result-honors-open')&&!honor)))$('result-tab-rewards').focus();
}
function resultHonors(){
 resultNewBadges=game.challenges().filter(function(c){return game.newHonors.indexOf(c.id)!==-1;}).length;
 $('result-honors').textContent='新徽章 +'+resultNewBadges;$('result-honors').hidden=!resultNewBadges;
 syncRewardAction();
}
var resultTab='score';
function selectResultTab(id,focus){
 if(id!=='score'&&id!=='rewards')return;
 resultTab=id;
 $('overlay').setAttribute('data-result-tab',id);$('result-detail-open').hidden=mode!=='over'||id==='rewards';syncRewardAction();
 ['score','rewards'].forEach(function(name){var selected=name===id,button=$('result-tab-'+name);button.setAttribute('aria-selected',String(selected));button.setAttribute('tabindex',selected?'0':'-1');$('result-'+name).hidden=!selected;});
 $('result-details').hidden=true;$('result-detail-open').setAttribute('aria-expanded','false');
 if(focus)$('result-tab-'+id).focus();
}
['score','rewards'].forEach(function(id){
 $('result-tab-'+id).addEventListener('click',function(){if(mode==='over')selectResultTab(id,false);});
 $('result-tab-'+id).addEventListener('keydown',function(e){if(mode!=='over')return;var next;if(e.key==='ArrowRight'||e.key==='ArrowLeft')next=id==='score'?'rewards':'score';else if(e.key==='Home')next='score';else if(e.key==='End')next='rewards';else return;e.preventDefault();selectResultTab(next,true);});
});
function renderResultDetail(){
 var actions=[['灵巧绕行',game.dodges,'次'],['送达鱼篮',game.deliveries,'次']];
 $('result-detail-metrics').innerHTML=actions.map(function(row){return '<div class="detail-metric"><strong>'+row[1]+'<small>'+row[2]+'</small></strong><span>'+row[0]+'</span></div>';}).join('');
 var missions=game.missions(),count=missions.filter(function(m,index){return !!game.missionFlags[index];}).length;
 $('result-detail-goal-count').textContent=count+' / '+missions.length+' 完成';
 $('result-goals').hidden=!game.contractComplete;
 $('result-goals').textContent='本组委托全部完成，下局开启新目标。';
}
function closeResultDetail(){if($('result-details').hidden)return;$('result-details').hidden=true;$('result-detail-open').setAttribute('aria-expanded','false');if(mode==='over'){$('overlay').hidden=false;$('result-detail-open').focus();}syncDialogBackdrop();}
$('result-detail-open').addEventListener('click',function(){if(mode!=='over'||resultTab!=='score')return;renderResultDetail();$('result-detail-content').scrollTop=0;$('overlay').hidden=true;$('result-details').hidden=false;$('result-detail-open').setAttribute('aria-expanded','true');syncDialogBackdrop();$('result-detail-close').focus();});
$('result-detail-close').addEventListener('click',closeResultDetail);
$('result-detail-dismiss').addEventListener('click',closeResultDetail);
$('result-details').addEventListener('click',function(e){if(e.target===$('result-details'))closeResultDetail();});
function setResultUI(active){if(active)$('flag-status').hidden=true;resultNewBoats=0;resultNewBadges=0;resultRewardsSaved=false;$('endless-invite').hidden=true;$('endless-challenge').disabled=true;$('result-heading').hidden=!active;$('result-highlights').hidden=!active;$('settle').hidden=true;if(!active){retryResultSave=null;$('result-save-retry').hidden=true;}document.body.classList[active?'add':'remove']('result-open');$('overlay').classList[active?'add':'remove']('result-view');$('result-extra').hidden=!active;$('result-tabs').hidden=!active;$('result-savebar').hidden=!active;$('result-detail-open').hidden=!active;$('result-stage').hidden=!active;$('overlay-text').hidden=active;$('run-guide-open').hidden=active;selectResultTab('score',false);$('result-score').setAttribute('role',active?'tabpanel':'group');if(!active){$('overlay-title').classList.remove('long-distance');}}
function resultSaveStatus(completed,ok){if(game!==completed||mode!=='over')return;$('result-save-status').textContent=ok?'已保存':'未能保存，请重试';$('result-save-status').setAttribute('data-state',ok?'saved':'failed');if(ok&&document.activeElement===$('result-save-retry'))$('result-tab-'+resultTab).focus();}
function renderHonorBook(){var h=game.honorInfo(),list=game.challenges();$('honor-current').textContent=h.name+' · '+h.count+' / '+h.total;$('honor-current').style.color=h.color;$('honor-explain').textContent='徽章跨局保留，挑战每局重计。';$('honor-ladder').textContent='';$('honor-ladder').hidden=true;$('honor-grid').innerHTML=River3D.honorSeries.map(function(series){var group=list.slice(series.from,series.to),count=group.filter(function(c){return c.earned;}).length,active=series.id===honorBookSeries;$('honor-count-'+series.id).textContent=count+' / '+group.length;$('honor-tab-'+series.id).setAttribute('aria-selected',String(active));$('honor-tab-'+series.id).setAttribute('tabindex',active?'0':'-1');return '<section id="honor-page-'+series.id+'" class="honor-series" role="tabpanel" tabindex="0" aria-labelledby="honor-tab-'+series.id+'"'+(active?'':' hidden')+'><div class="honor-series-grid">'+group.map(function(c){var tracked=game.trackedHonor===c.id;return '<div class="honor-tile '+(c.earned?'earned':'locked')+(tracked?' tracked':'')+'"><span aria-hidden="true" class="badge-stamp badge-art badge-'+c.id+'">'+c.icon+'</span><div><b>'+c.name+'</b><small>'+c.label+'</small><em>'+(c.earned?'✓ 已获得':(honorReturn==='intro'?'待挑战':c.value+' / '+c.target))+'</em>'+(c.detail&&!c.earned?'<p class="honor-detail">'+c.detail+'</p>':'')+(!c.earned?'<button type="button" class="honor-track" data-honor-track="'+c.id+'" aria-pressed="'+tracked+'" aria-label="'+(tracked?'取消追踪':'追踪')+c.name+'">'+(tracked?'取消追踪':'追踪挑战')+'</button>':'')+'</div></div>';}).join('')+'</div></section>';}).join('');$('honor-save-status').textContent=honorSaveMessage;}
function selectHonorSeries(id){if(!River3D.honorSeries.some(function(series){return series.id===id;}))return;honorBookSeries=id;renderHonorBook();$('honor-grid').scrollTop=0;$('honor-tab-'+id).focus();}
River3D.honorSeries.forEach(function(series,index){var button=$('honor-tab-'+series.id);button.addEventListener('click',function(){selectHonorSeries(series.id);});button.addEventListener('keydown',function(e){var next=index;if(e.key==='ArrowRight')next=(index+1)%3;else if(e.key==='ArrowLeft')next=(index+2)%3;else if(e.key==='Home')next=0;else if(e.key==='End')next=2;else return;e.preventDefault();selectHonorSeries(River3D.honorSeries[next].id);});});
function showHonorBook(){honorReturn=mode;pause();$('overlay').hidden=true;renderHonorBook();$('honors-panel').hidden=false;$('honors-close').textContent=honorReturn==='play'?'继续漂流':'返回';$('honors-close').focus();}
$('honor-grid').addEventListener('click',function(e){var button=e.target.closest('[data-honor-track]');if(!button)return;var id=button.getAttribute('data-honor-track');game.trackedHonor=game.trackedHonor===id?'':id;stats.trackedHonor=game.trackedHonor;var revision=++honorSaveRevision;honorSaveMessage='追踪保存中…';renderHonorBook();updateHonors();var next=$('honor-grid').querySelector('[data-honor-track="'+id+'"]');if(next)next.focus();var pending=RiverPlatform.saveHonorTracking?RiverPlatform.saveHonorTracking(game.trackedHonor):Promise.resolve(false);pending.then(function(ok){if(revision!==honorSaveRevision)return;honorSaveMessage=ok?'追踪选择已保存，下次出发继续挑战':'追踪本次已生效，暂未保存；离开后可能丢失';$('honor-save-status').textContent=honorSaveMessage;});});
function closeHonorBook(){$('honors-panel').hidden=true;if(honorReturn==='play')resume();else if(mode==='pause'||mode==='over'){$('overlay').hidden=false;(mode==='pause'?$('resume'):resultTab==='rewards'&&!$('result-honors-open').hidden?$('result-honors-open'):$('restart')).focus();}else $('honors-open').focus();}
$('honors-open').addEventListener('click',showHonorBook);$('result-honors-open').addEventListener('click',showHonorBook);$('honors-close').addEventListener('click',closeHonorBook);
function clearSteering(){document.body.classList.remove('river-touch');if(drag&&drag.holding)inputUp();drag=null;steerPointers={};steerKeys={};game.stopSteering();$('steer-left').classList.remove('down');$('steer-right').classList.remove('down');}
function unlockSteering(){if(coachGate==='flag')finishFlagGuide();else if(coachGate&&coachGate!=='welcome'&&coachGate!=='flip')finishCourseCoach();}
function shiftRoute(axis){unlockSteering();practiceRetryDelay=0;if(game.changeLane(axis)){sound('steer');touchFeedback();}}
function fallback(message){$('fallback-text').textContent=message;$('fallback').hidden=false;syncDialogBackdrop();cancelAnimationFrame(raf);lost=true;game.release();clearSteering();}
try{renderer=new RiverRenderer($('scene'));}catch(e){fallback(e.message);}
// One live notice, with one merged reward summary. Never replay a scene backlog.
var noticeCurrent=null;
function clearNotices(){noticeCurrent=null;noticeUntil=0;noticePriority=0;$('callout').className='';$('callout').textContent='';}
function noticeScope(){var scene=game.story();return {stage:game.zone().stage,end:scene?scene.end:game.zone().start+game.zone().length,distance:game.distance,at:game.time};}
function noticeValid(item){
 if(item.scope.stage!==game.zone().stage||game.distance>=item.scope.end||game.distance-item.scope.distance>48)return false;
 if(item.key==='wind')return Math.abs(game.currentForce||0)>.2&&item.gust===game.windGust;
 if(item.key==='flight')return game.y>0;
 if(item.key==='rescue')return !!game.stumble;
 if(item.key==='close-call')return game.gap<10;
 if(item.key==='cargo')return !game.fishCargo;
 if(item.key.indexOf('soon-')===0){var role=item.key.slice(5);return game.has(role)&&game.buddyRemaining(role)>0&&game.buddyRemaining(role)<=5;}
 if(item.key.indexOf('full-')===0){var r=item.key.slice(5);return game.has(r)&&game.entities.some(function(e){return e.kind==='buddy'&&e.role===r&&!e.done&&e.x-game.distance>=-2.8&&e.x-game.distance<=Math.min(48,game.speed*2.2);});}
 return game.time-item.scope.at<=4.2;
}
function selectNotice(item){noticeCurrent=item;noticePriority=item.priority;noticeUntil=time+item.remaining;$('callout').textContent=item.text;}
function noticeRank(key){return key==='rescue'||key==='close-call'?5:key==='wind'||key==='flight'?4:['impact','recovered','cargo'].indexOf(key)!==-1?3:key.indexOf('full-')===0?2:1;}
function makeNotice(text,priority,key){return {rank:noticeRank(key),text:text,priority:priority,key:key,scope:noticeScope(),gust:game.windGust,remaining:Math.max(2.6,Math.min(4.2,Array.from(text).length*.12)),visible:0,mergeAt:.8};}
function notify(msg,priority,key){
 if(!msg)return;priority=priority||1;key=key||'scene';
 if(noticeCurrent&&!noticeValid(noticeCurrent))clearNotices();
 if(noticeCurrent&&(noticeCurrent.text===msg||noticeCurrent.rank>noticeRank(key)))return;
 var immediate=['wind','flight','rescue','impact','recovered','close-call','cargo'].indexOf(key)!==-1||key.indexOf('soon-')===0||key.indexOf('full-')===0;
 if(!noticeCurrent||immediate||noticeCurrent.scope.stage!==game.zone().stage)selectNotice(makeNotice(msg,priority,key));
}
function rewardNotice(message,key,label){
 if(noticeCurrent&&!noticeValid(noticeCurrent))clearNotices();
 if(noticeCurrent&&noticeCurrent.key!=='reward'){if(noticeCurrent.priority>=2)return;clearNotices();}
 if(!noticeCurrent){var item=makeNotice(message,1,'reward');item.rewards=[];item.total=0;selectNotice(item);}
 var rewards=noticeCurrent.rewards,entry=rewards.filter(function(r){return r.key===key;})[0];noticeCurrent.total++;
 if(entry)entry.count++;else if(rewards.length<3)rewards.push({key:key,label:label,count:1});
 // Hold one summary instead of retaining individual messages for later playback.
 noticeCurrent.merged=noticeCurrent.total>1;
}
function manoeuvreCue(){return !$('flight').hidden||!$('approach').hidden||!$('bank-cue').hidden||!$('hint').hidden;}
function operationActive(ignoreWind){var hazard=game.nextHazard(),bank=game.nextBank();return (!ignoreWind&&Math.abs(game.currentForce||0)>.2)||!!coachGate||!!game.stumble||game.gap<10||game.y>0||!!lessonPace.active||(hazard&&(hazard.x-game.distance)/game.speed<2)||(bank&&Math.abs(bank.x-game.distance)<game.bankApproachDistance(bank))||!!game.tow;}
function animateNotices(dt){
 if(mode!=='play'){$('callout').className='';return;}
 if(!noticeCurrent)return;
 if(!noticeValid(noticeCurrent)||noticeCurrent.remaining<=0){clearNotices();return;}
 // Contextual HUD instructions win. Covered feedback is discarded, not resumed.
 if(operationActive(noticeCurrent.key==='wind')||manoeuvreCue()||!$('practice-cue').hidden||!$('honor-toast').hidden){clearNotices();return;}
 var n=noticeCurrent;
 if(n.merged&&(n.visible===0||n.visible>=n.mergeAt)){
  n.text='本段收获 · '+n.rewards.map(function(r){return r.label+(r.count>1?'×'+r.count:'');}).join(' · ')+(n.total>n.rewards.reduce(function(sum,r){return sum+r.count;},0)?' 等'+n.total+'项':'');n.mergeAt=n.visible+.8;
 }
 $('callout').textContent=n.text;$('callout').className='show';noticeUntil=time+n.remaining;n.visible+=dt;n.remaining=Math.max(0,n.remaining-dt);
}

var coinPulse=0,coinNotice=0,coinBatch=0,lastCoinFeedback=-99,lastHaptic=-99,pendingHaptic=0,coinJackpotUntil=0,dangerLatched=false,kickReaction=0,reactionRoles=[],reactionMerged=false,reactionElapsed=0,reactionScope=null;
function reactToBuddy(message,role){
 if(!kickReaction){kickReaction=2.6;reactionRoles=[];reactionMerged=false;reactionElapsed=0;reactionScope=noticeScope();$('kick-reaction').textContent=message;}
 if(role&&reactionRoles.indexOf(role)===-1)reactionRoles.push(role);reactionMerged=reactionRoles.length>1;$('kick-reaction').hidden=false;
}
function sound(type,chain){if(!muted)audio.play(type,chain);}
// Keep the strongest request across the frame and the short motor cooldown.
function touchFeedback(type){if(haptics)pendingHaptic=Math.max(pendingHaptic,type==='heavy'?3:type==='medium'?2:1);}
function flushHaptics(){if(!haptics||mode!=='play'){pendingHaptic=0;return;}if(pendingHaptic&&time-lastHaptic>=.12){RiverPlatform.vibrate(['','light','medium','heavy'][pendingHaptic]);pendingHaptic=0;lastHaptic=time;}}
function dangerFeedback(){if(mode!=='play'||coachGate||game.mode!=='play')return;if(game.gap>=13){if(dangerLatched){dangerLatched=false;$('danger-status').textContent='';}}else if(game.gap<=10&&!dangerLatched){dangerLatched=true;sound('danger');touchFeedback('medium');$('danger-status').textContent='鳄鱼靠近了，留意距离！';}}
// One distance scale for the buffer and predator; urgency follows actual proximity.
var speedRun=null,speedAt=0,speedShown=0,speedCause='';
function updateSpeed(){
 var value=Math.max(0,game.speed),cause=game.speedReason(),elapsed=game.time-speedAt;
 // Freeze with physics. Snap on an action/region change; smooth only paddle ripple.
 if(speedRun!==game||elapsed<0||cause!==speedCause||Math.abs(value-speedShown)>2||reduced)speedShown=value;
 else if(elapsed>0)speedShown+=(value-speedShown)*(1-Math.exp(-elapsed/.12));
 speedRun=game;speedAt=game.time;speedCause=cause;
 var roundedSpeed=String(Math.round(speedShown*10)/10);
 $('speed').textContent=roundedSpeed;$('speed-state').textContent=cause;
 $('speed-readout').setAttribute('aria-label','前进速度 '+roundedSpeed+' 米每秒，'+cause);
 $('speed-readout').classList[!game.stumble&&value>game.currentSpeed+.15?'add':'remove']('accelerated');
 $('speed-state').classList[game.stumble?'add':'remove']('slowed');
}
function updateChase(){
 var gap=Math.max(0,game.gap),limit=game.gapLimit?game.gapLimit():River3D.balance.gap.hardCap,scale=limit||40,bar=Math.min(scale,gap),active=mode==='play'&&game.mode==='play'&&!coachGate,rate=game.speed-game.crocSpeed,full=limit!==null&&gap>=limit-1e-6,pulling=rate>.05&&!full;
 $('gap').textContent=Math.round(gap)+' m';
 $('chase-label').textContent=gap<=6?'要被咬了！':gap<=12?'鳄鱼靠近了':full?'距离已拉满':pulling?'正在拉开':'鳄鱼追赶';
 $('chase').style.setProperty('--chase-period',(1.15-.6*(1-Math.min(12,gap)/12)).toFixed(2)+'s');$('chase').classList[active&&gap<=12?'add':'remove']('critical');$('chase').classList[active&&gap<=6?'add':'remove']('imminent');$('chase').classList[pulling?'add':'remove']('pulling-away');
 $('chase').setAttribute('aria-label','鳄鱼距离 '+Math.round(gap)+' 米，'+(limit!==null?'本关上限 '+limit+' 米，':'')+$('chase-label').textContent);
 $('gap-fill').style.width=bar/scale*100+'%';$('chase-predator').style.left=(1-bar/scale)*100+'%';
}
function resetFeedback(){flagIntro=null;pendingFlagIntros=[];$('flag-intro').hidden=true;$('combo-notice').hidden=true;document.body.classList.remove('combo-active');welcomePending=false;practiceSuccessAt=-99;practiceRetryAt=-99;practiceRetryDelay=0;document.body.classList.remove('lesson-practice');document.body.classList.remove('lesson-success');clearNotices();honorCurrent=null;lessonPace=new River3D.LessonPace();lastRampAt=-99;$('practice-cue').hidden=true;$('flag-cue').hidden=true;$('flag-status').hidden=true;kickReaction=0;reactionRoles=[];reactionMerged=false;reactionElapsed=0;reactionScope=null;$('crew-escape').hidden=true;$('kick-reaction').hidden=true;$('chase').classList.remove('critical');$('chase').classList.remove('imminent');pendingHaptic=0;lastHaptic=-99;coinJackpotUntil=0;dangerLatched=false;$('danger-status').textContent='';honorQueue=[];honorTimer=0;$('honor-toast').hidden=true;coinPulse=0;coinNotice=0;coinBatch=0;lastCoinFeedback=-99;$('coin-bank').classList.remove('collecting');$('coin-feedback').hidden=true;$('coin-bank').style.transform='';if(renderer){renderer.endingTime=null;document.body.classList.remove('shore-ending');$('shore-ending').hidden=true;renderer.particles=[];renderer.coinPops=[];renderer.flagTransfer=null;renderer.flagGold=null;renderer.flagBlock=null;renderer.impact=0;renderer.impactPop=null;}audio.stop();}
function collectFeedback(data){data=data||{chain:game.coinChain,total:game.coins};if(data.magnet&&data.flagSerial!==undefined&&data.flagSerial!==game.flagSerial)return;coinBatch=time-lastCoinFeedback<.12?coinBatch+1:1;lastCoinFeedback=time;coinPulse=1;coinNotice=flagTimerActive()?0:1.1;if(!data.magnet&&data.chain>0&&data.chain%5===0){coinJackpotUntil=time+1.1;}var jackpot=!data.magnet&&time<coinJackpotUntil;$('coins').textContent=data.total;$('score').textContent=Math.floor(game.score)+' 分';$('coin-feedback').hidden=false;$('coin-feedback').textContent='+'+coinBatch+(data.magnet?' · 聚宝吸金':jackpot?(game.goldCharge?' · 五连收 冲浪已储备':' · 五连收 自动冲浪'):data.chain>1?' · 连收 '+data.chain:'');$('coin-feedback').className=data.magnet?'magnet-reward':jackpot?'jackpot':'';if(!reduced)renderer.burst(game,'coin',time,data);sound('coin',data.chain);touchFeedback(data.chain%5===0?'medium':'light');}
function animateFeedback(dt){if(mode!=='play')return;
 if(kickReaction>0){if(operationActive()||!reactionScope||reactionScope.stage!==game.zone().stage||game.distance>=reactionScope.end||game.distance-reactionScope.distance>48){kickReaction=0;reactionRoles=[];}else{kickReaction=Math.max(0,kickReaction-dt);reactionElapsed+=dt;if(reactionMerged&&reactionElapsed>=.8){$('kick-reaction').textContent=reactionRoles.map(function(r){return buddyNames[r];}).join('、')+'：我们先下船啦！';reactionMerged=false;}}}
 $('kick-reaction').hidden=kickReaction<=0;coinPulse=Math.max(0,coinPulse-dt*3.6);coinNotice=Math.max(0,coinNotice-dt);$('coin-bank').classList[coinNotice>0&&!reduced?'add':'remove']('collecting');$('coin-bank').style.transform=reduced?'':'scale('+(1+Math.sin(coinPulse*Math.PI)*.22)+')';$('coin-feedback').hidden=coinNotice<=0||flagTimerActive();$('coin-feedback').setAttribute('aria-label',$('coin-feedback').className==='flag-gold-reward'?'丰收金币，获得8枚金币':$('coin-feedback').textContent);$('coin-feedback').style.opacity=String(Math.min(1,coinNotice*4));$('coin-feedback').style.transform='';}
var openingTime=null,openingPaused=false,openingBeat=-1;
// The run is already over: only this presentation clock advances, never gameplay.
var defeatTime=null,defeatPaused=false,defeatBeat=-1,defeatReason='';
function clearDefeat(){defeatTime=null;defeatPaused=false;renderer.defeatTime=null;document.body.classList.remove('defeat');$('defeat').hidden=true;}
function beginDefeat(reason){
 if(defeatTime!==null||mode==='over')return;
 defeatReason=reason;defeatTime=0;defeatBeat=-1;mode='defeat';clearNotices();resetFeedback();coachGate='';$('coach').hidden=true;$('honor-toast').hidden=true;honorQueue=[];clearSteering();drag=null;game.release();pressed=false;pointerId=null;pendingHaptic=0;$('action').classList.remove('down');
 renderer.openingTime=null;renderer.defeatTime=0;renderer.camera=null;renderer.endingTime=null;document.body.classList.remove('shore-ending');$('shore-ending').hidden=true;renderer.particles=[];renderer.coinPops=[];renderer.flagTransfer=null;renderer.flagGold=null;renderer.flagBlock=null;renderer.impact=0;renderer.impactPop=null;
 document.body.classList.remove('rescuing');document.body.classList.remove('boosting');document.body.classList.add('defeat');$('defeat').hidden=false;$('defeat-skip').focus();audio.stop();updateDefeat(0);renderDirty=true;
}
function updateDefeat(dt){
 var story=River3D.defeatStory;defeatTime+=dt;renderer.defeatTime=defeatTime;var beat=defeatTime<story.grip?0:defeatTime<story.crush?1:defeatTime<story.splash?2:defeatTime<story.help?3:4;
 if(beat!==defeatBeat){defeatBeat=beat;$('defeat-title').textContent=['哇！好大一张嘴！','船身被咬住了！','咔嚓！船被咬碎了！','扑通！船长落水了！','救命啊！救命啊！'][beat];$('defeat-note').textContent=['糟糕，鳄鱼追上来啦……','别、别咬！这可是我们的船！','木板飞散，友谊的小船碎啦！','还好穿着救生衣，快抓住救生圈！','有人吗？拉我一把呀！'][beat];$('defeat-cry').hidden=beat<4;sound(['danger','grip','boat-break','land','help'][beat]);}
 $('defeat-progress').style.width=Math.min(100,defeatTime/story.duration*100)+'%';if(defeatTime>=story.duration)finishDefeat();
}
function finishDefeat(){if(defeatTime===null||mode!=='defeat')return;var reason=defeatReason;clearDefeat();renderer.defeatTime=River3D.defeatStory.duration;over(reason);renderDirty=true;}
$('defeat-skip').addEventListener('click',finishDefeat);
function start(replay,withoutOpening,endless){var useEndless=endless===true||replay===true&&game.endless===true;if(useEndless&&!stats.endlessUnlocked)return;$('mvp').hidden=true;mvpElapsed=0;if(!$('skin-panel').hidden)return;clearDefeat();clearDiscard();setPausedUI(false);setResultUI(false);document.body.classList.remove('teaching');resetFeedback();audio.unlock('start');noticeUntil=0;noticePriority=0;var seed=replay===true?game.seed:31029+(stats.runs||0)*137;$('game').scrollTop=0;coachGate='';coachJump=false;coachFlip=false;$('coach').hidden=true;game=new River3D.Game(seed);game.contract=stats.rank||0;game.skin=stats.skin||0;setupHonors();if(useEndless)game.startEndless();else game.start();clearSteering();mode='play';pressed=false;pointerId=null;document.body.classList.add('running');$('intro').hidden=true;$('hud').hidden=false;$('controls').hidden=false;$('overlay').hidden=true;$('pause').disabled=false;$('pause').setAttribute('aria-label','暂停游戏');last=0;updateUI();if(!useEndless&&replay!==true&&!withoutOpening&&!reduced)beginOpening();else enterRiver();}
function enterRiver(){renderer.crocClockOffset=mode==='opening'&&openingTime!==null?openingTime-game.time:0;openingTime=null;openingPaused=false;renderer.openingTime=null;document.body.classList.remove('opening');$('opening').hidden=true;mode='play';last=0;clearSteering();pressed=false;pointerId=null;game.release();renderDirty=true;welcomePending=!game.endless&&!passedGuides.steer&&!stats.gestureGuide;notify(welcomePending?'出发啦，先漂一小段':lessonKnown('jump')?'左右滑动换道 · 轻点跳跃':'先向左滑，沿着金币试一试');$('action').focus();}
function beginOpening(){clearNotices();mode='opening';openingTime=0;openingBeat=-1;openingPaused=false;renderer.openingTime=0;renderer.camera=null;document.body.classList.add('opening');$('opening').hidden=false;$('opening-skip').focus();updateOpening(0);}
function updateOpening(dt){
 var story=River3D.openingStory,previous=openingTime;openingTime+=dt;renderer.openingTime=openingTime;
 var t=openingTime-story.chaseDuration,bite=story.chaseDuration+story.biteAt,duration=story.chaseDuration+story.escapeDuration;
 var beat=openingTime<story.lungeAt?0:t<.43?1:t<story.launchAt?2:t<story.biteAt+.46?3:4;
 if(beat!==openingBeat){
  openingBeat=beat;
  $('opening-title').textContent=['鳄鱼追来了！','它突然加速了！','要合嘴了！','冲出去！','差一点！逃出来了！'][beat];
  $('opening-note').textContent=['快划，别让它追上！','小心，它张嘴了！','抓紧，它的嘴要闭上了……','就是现在！快划！','咔哒，咬空了！轮到你掌舵。'][beat];
  if(beat>0)sound(['','croc-growl','croc-close','escape','start'][beat]);
 }
 if(previous<bite&&openingTime>=bite)sound('croc-snap');
 $('opening-progress').style.width=Math.min(100,openingTime/duration*100)+'%';if(openingTime>=duration)enterRiver();
}
$('opening-skip').addEventListener('click',function(){if(mode==='opening')enterRiver();});
function showLessonDiagram(kind,side){
 var assets={steer:'move',flag:'flag',jump:'jump',flip:'flip',wind:'wind',fish:'fish',camp:'delivery',gift:'gift',tow:'tow'};
 var notes={steer:'每滑一次，只切到相邻位置。',flag:'靠近自动挂旗，本局获得对应能力。',jump:'轻点起跳 → 不用按住 → 稳稳落水。',flip:'按住转圈 → 松手扶正 → 平稳落水。',fish:'靠岸稳住 → 鱼篮上船，不用点按。',camp:'带着鱼篮靠岸 → 自动送到营地。',gift:'先靠岸 → 接近礼物时轻点跳起。',tow:'靠岸稳住接绳 → 借力前进，起跳可松绳。'};
 var asset=assets[kind]||'move',note=notes[kind]||'';
 if(kind==='wind'){
  var flow=game.currentForce||River3D.crossCurrent(game.distance+30)||River3D.crossCurrent(game.distance+60)||1;
  asset=flow<0?'wind-left':'wind';note=flow<0?'风向左吹：每2秒推一列，向右滑回矫正。':'风向右吹：每2秒推一列，向左滑回矫正。';
 }else if(kind==='fish'&&side>0)asset='fish-right';
 else if(['camp','gift','tow'].indexOf(kind)!==-1&&side<0)asset=assets[kind]+'-left';
 $('coach-image').setAttribute('src','./assets/guide/'+asset+'.svg');$('coach-image').setAttribute('alt',note);$('coach-visual-note').textContent=note;
 $('coach-content').scrollTop=0;
}
function coach(kind){
 var key=kind==='camp'&&!game.fishCargo?'gift':kind,copy=lessonCopy[key],plan=River3D.learningRoute.filter(function(l){return l.id===kind;})[0];if(!copy||!lessonPace.begin(kind,game,game.distance<River3D.lapLength&&plan?plan.until:game.distance+140))return;
 var site=game.nextBank();if(site&&['fish','camp','tow'].indexOf(kind)!==-1){lessonPace.active.side=site.side;lessonPace.active.bankId=site.id;lessonPace.active.bankX=site.x;lessonPace.active.bankType=kind==='camp'?(game.fishCargo?'delivery':'gift'):kind;copy=copy.map(function(text){var direction=site.side<0?'左':'右';return text.replace(/向[左右]/g,'向'+direction).replace(/[左右]岸/g,direction+'岸').replace(/最[左右]侧/g,'最'+direction+'侧').replace(/[左右]侧/g,direction+'侧');});}
 if(noticePriority<2)clearNotices();document.body.classList.remove('teaching');$('coach').setAttribute('role','region');$('coach').setAttribute('aria-modal','false');$('coach').className='';$('gesture-steps').hidden=true;$('skip-coach').textContent='开始练习';coachGate=kind;game.release();clearSteering();pressed=false;pointerId=null;$('action').classList.remove('down');$('coach').hidden=false;$('coach-title').textContent=copy[0];$('coach-text').textContent=copy[1];showLessonDiagram(key,site?site.side:1);$('skip-coach').focus();
}
function welcomeGuide(replay){if(replay&&lessonPace.active)lessonResult(lessonPace.finish(game,'replay'));document.body.classList.add('teaching');$('coach').setAttribute('role','dialog');$('coach').setAttribute('aria-modal','true');coachGate='welcome';clearSteering();drag=null;game.release();pressed=false;pointerId=null;$('action').classList.remove('down');$('coach').className='welcome-guide';$('coach-title').textContent='直接在河面上操作';$('coach-text').textContent=replay?'当前 '+Math.floor(game.distance)+' 米已暂停，看完后继续这一局。':'这次只学左右换道。前方是宽水面，向左滑一次，沿着金币试一试。跳跃和空翻后面再学。';$('gesture-steps').hidden=false;$('skip-coach').textContent='开始换道练习';$('coach').hidden=false;showLessonDiagram('steer');clearNotices();$('skip-coach').focus();}
function finishWelcome(){if(lessonPace.ready(game))lessonPace.begin('steer',game,game.distance+110);releaseLesson();document.body.classList.remove('teaching');coachGate='';$('coach').hidden=true;$('gesture-steps').hidden=true;$('action').focus();}
$('skip-coach').addEventListener('click',function(){if(coachGate==='flag'){finishFlagGuide();return;}if(coachGate==='welcome'){finishWelcome();return;}finishCourseCoach();});

var flagInfo={
 speed:{name:'疾风旗',title:'疾风旗 · 加速',result:'+4米/秒 · 持续3秒',action:'靠近自动拾取。',demo:'甩开鳄鱼',color:'#e87768'},
 gold:{name:'丰收旗',title:'丰收旗 · 加金币',result:'立即获得8枚金币',action:'靠近自动拾取。',demo:'拿到就入账',color:'#e4af4d'},
 magnet:{name:'聚宝旗',title:'聚宝旗 · 吸金币',result:'自动吸金 · 持续8秒',action:'靠近拾取，可吸水面与空中金币。',demo:'上下左右都能吸',color:'#4fa58d'},
 guard:{name:'护航旗',title:'护航旗 · 挡撞',result:'10秒内挡撞1次',action:'靠近拾取，不挡落水和鳄鱼。',demo:'挡一次撞击',color:'#548dc1'}
};
function flagLessonKnown(effect){return !!flagLessonsSeen[effect]||Array.isArray(stats.flagLessons)&&stats.flagLessons.indexOf(effect)!==-1;}
function queueFlagIntro(data){if(!practiceReplay&&flagInfo[data.effect]&&!flagLessonKnown(data.effect)&&!pendingFlagIntros.some(function(p){return p.effect===data.effect;}))pendingFlagIntros.push({effect:data.effect,skin:data.skin,serial:data.serial,picked:true});}
function maybeFlagIntro(){
 if(mode!=='play'||coachGate||practiceReplay||game.stumble||game.y>.1||game.gap<6||Math.abs(game.currentForce||0)>.2)return false;
 var hazard=game.nextHazard(),bank=game.nextBank();
 if(hazard&&(hazard.x-game.distance)/Math.max(1,game.speed)<1.6||bank&&Math.abs(bank.x-game.distance)<game.bankApproachDistance(bank))return false;
 pendingFlagIntros=pendingFlagIntros.filter(function(p){return !flagLessonKnown(p.effect)&&(p.serial===undefined||p.serial===game.flagSerial);});
 var offer=pendingFlagIntros[0],f=game.nextFlag(),style=f&&River3D.flagStyle(f.skin),dx=f?f.x-game.distance:Infinity;
 if(!offer&&f&&style&&flagInfo[style.effect]&&!flagLessonKnown(style.effect)&&dx>2.5&&dx<=Math.min(80,Math.max(30,game.speed*3)))offer={effect:style.effect,skin:f.skin,picked:false,z:f.z};
 if(!offer)return false;
 var info=flagInfo[offer.effect];flagIntro=offer;mode='flag-intro';clearSteering();game.release();pressed=false;pointerId=null;drag=null;$('action').classList.remove('down');audio.stop();
 $('flag-intro').setAttribute('data-effect',offer.effect);$('flag-intro-kicker').textContent='初次遇见';
 $('flag-intro-title').textContent=info.title;$('flag-intro-result').textContent=info.result;
 $('flag-intro-action').textContent=offer.picked?'已拾取，自动生效。':info.action;
 $('flag-intro-demo-label').textContent=info.demo;$('flag-intro-icon').src='./assets/flags/'+offer.effect+'.svg?v=magnet-transparent-20261107';
 $('flag-intro-note').textContent='已暂停 · 换旗结束旧效果';$('flag-intro-next').textContent=offer.picked?'继续漂流':'知道了';
 $('flag-intro-content').scrollTop=0;$('flag-intro').hidden=false;$('flag-cue').hidden=true;$('practice-cue').hidden=true;$('flag-status').hidden=true;
 renderDirty=true;syncDialogBackdrop();$('flag-intro-next').focus();return true;
}
function closeFlagIntro(){
 if(!flagIntro||mode!=='flag-intro')return;
 var effect=flagIntro.effect,epoch=flagLessonEpoch;flagLessonsSeen[effect]=true;pendingFlagIntros=pendingFlagIntros.filter(function(p){return p.effect!==effect;});
 flagIntro=null;$('flag-intro').hidden=true;mode='play';clearSteering();game.release();pressed=false;pointerId=null;drag=null;last=0;renderDirty=true;syncDialogBackdrop();$('action').focus();
 var pending=RiverPlatform.completeFlagLesson?RiverPlatform.completeFlagLesson(effect):Promise.resolve(false);
 Promise.resolve(pending).then(function(ok){if(epoch!==flagLessonEpoch)return;if(ok){stats.flagLessons=(stats.flagLessons||[]).filter(function(id){return id!==effect;}).concat([effect]);}else $('mode-note').textContent='这面旗本次已认识，暂未保存，下次可能再次提示';},function(){if(epoch===flagLessonEpoch)$('mode-note').textContent='这面旗本次已认识，暂未保存，下次可能再次提示';});
}
$('flag-intro-next').addEventListener('click',closeFlagIntro);

var flagSaveRevision=0;
function persistFlag(){
 stats.flagSkin=game.flagSkin;var revision=++flagSaveRevision,failure=game.flagSkin?'小旗已换上，暂未保存；离开后可能丢失':'小旗教学本次已看过，暂未保存，下次可能再次提示';
 var pending=RiverPlatform.saveFlagAppearance?RiverPlatform.saveFlagAppearance(stats.flagSkin,stats.flagGuide):Promise.resolve(false);
 Promise.resolve(pending).then(function(ok){if(revision===flagSaveRevision&&!ok)$('mode-note').textContent=failure;},function(){if(revision===flagSaveRevision)$('mode-note').textContent=failure;});
}
function finishFlagGuide(){if(coachGate!=='flag')return;releaseLesson();coachGate='';$('coach').hidden=true;clearSteering();$('action').focus();}
function flagDirection(f){return f.z<game.z-1.25?'← 向左换道':f.z>game.z+1.25?'向右换道 →':'沿当前航道';}
function flagFeedback(data){
 if(data.serial!==undefined&&data.serial!==game.flagSerial)return;
 coinNotice=0;coinBatch=0;coinJackpotUntil=0;$('coin-feedback').hidden=true;$('coin-feedback').className='';
 if(noticeCurrent&&noticeCurrent.key==='impact'&&noticeCurrent.text.indexOf('护航旗')!==-1)clearNotices();
 if(renderer.syncFlagEffects)renderer.syncFlagEffects(game);
 queueFlagIntro(data);
 if(practiceReplay){if(!reduced)renderer.burst(game,'flag',time,data);sound('join');return;}
 passedGuides.flag=true;stats.flagSkin=data.skin;stats.flagGuide=true;persistFlag();if(!reduced)renderer.burst(game,'flag',time,data);if(!flagInfo[data.effect])rewardNotice(data.name+' · '+data.note,'flag-'+data.skin,data.name);if(data.effect==='gold'){coinPulse=1;coinNotice=1.8;$('coins').textContent=game.coins;$('coin-feedback').hidden=false;$('coin-feedback').textContent='丰收金币';$('coin-feedback').className='flag-gold-reward';}sound('join');touchFeedback();renderDirty=true;
}
function flagTimerActive(){var style=River3D.flagStyle(game.flagSkin),key=style&&({speed:'flagSpeed',magnet:'flagMagnet',guard:'flagGuard'})[style.effect];return !!key&&game[key]>0;}
function updateFlagUI(){
 var style=River3D.flagStyle(game.flagSkin),effect=style&&style.effect,active=mode==='play'&&!coachGate,any=false;
 [['speed',game.flagSpeed,'疾风加速'],['magnet',game.flagMagnet,'聚宝吸金'],['guard',game.flagGuard,'护航挡撞']].forEach(function(row){var on=active&&effect===row[0]&&row[1]>0;$('flag-status-'+row[0]).hidden=!on;if(on){any=true;var fill=Math.max(0,Math.min(1,row[1]/({speed:3,magnet:8,guard:10})[row[0]]));$('flag-status-'+row[0]).textContent=row[2];$('flag-status-'+row[0]).style.setProperty('--flag-fill',String(fill));$('flag-status-'+row[0]).setAttribute('aria-valuenow',String(Math.ceil(fill*100)));$('flag-status-'+row[0]).setAttribute('aria-valuetext','剩余'+Math.ceil(row[1])+'秒'+(row[0]==='guard'?'，可抵挡一次撞击':''));}});
 $('flag-status').hidden=!any;
 var f=game.nextFlag(),hazard=game.nextHazard(),bank=game.nextBank();
 $('flag-cue').hidden=any||coinNotice>0||mode!=='play'||!!coachGate||!!game.stumble||game.gap<10||!f||f.x-game.distance>55||(hazard&&(hazard.x-game.distance)/game.speed<1.5)||(bank&&Math.abs(bank.x-game.distance)<game.bankApproachDistance(bank));
 if($('flag-cue').hidden)return;var style=River3D.flagStyle(f.skin);$('flag-cue').style.borderColor=style.color;$('flag-cue-title').textContent=flagInfo[style.effect]?flagInfo[style.effect].name:style.name;$('flag-cue-note').textContent=flagDirection(f);
}
var followGift,boatPicker;
function skinLabel(){game.skin=stats.skin||0;if(followGift)followGift.sync(stats);if(boatPicker)boatPicker.sync(stats);renderDirty=true;}
followGift=RiverFollowSkin.create({platform:RiverPlatform,canOpen:function(){return mode==='intro';},boats:function(){boatPicker.open('home');},start:function(){start(false);},changed:function(data){rememberGuides(stats);rememberGuides(data);stats=data;skinLabel();}});
boatPicker=RiverBoats.create({platform:RiverPlatform,changed:function(data){rememberGuides(stats);rememberGuides(data);stats=data;skinLabel();},returned:function(){$('overlay').hidden=false;$('result-boats-open').focus();}});
function showBoatProgress(before,total,state){
 resultRewardsSaved=state==='saved';
 var earned=RiverBoats.progress(total,before),shown=RiverBoats.progress(resultRewardsSaved?total:before,before);
 resultNewBoats=resultRewardsSaved?earned.unlocked.length:0;
 $('result-boat-unlocks').textContent='新船 +'+resultNewBoats;$('result-boat-unlocks').hidden=!resultNewBoats;
 $('result-boat-progress').textContent=shown.next?'还差 '+shown.remaining+' 枚，解锁'+shown.next.name:'金币船只已集齐';
 $('result-boat-track').hidden=!shown.next;
 if(shown.next){$('result-boat-track').setAttribute('aria-label',shown.next.name+'解锁进度');$('result-boat-track').setAttribute('aria-valuemin','0');$('result-boat-track').setAttribute('aria-valuemax',String(shown.next.cost));$('result-boat-track').setAttribute('aria-valuenow',String(shown.total));$('result-boat-fill').style.width=Math.min(100,shown.total/shown.next.cost*100)+'%';}
 $('result-boats-open').textContent='查看新船';$('result-boats-open').setAttribute('aria-label','查看本局解锁的新船');
 $('result-honors-open').textContent='查看新徽章';$('result-honors-open').setAttribute('aria-label','查看本局新徽章');
 syncRewardAction();
}
$('result-boats-open').addEventListener('click',function(){if(mode!=='over')return;$('overlay').hidden=true;boatPicker.open('result');});
var leaderboard=RiverLeaderboard.create({platform:RiverPlatform,canOpen:function(){return !practiceReplay&&(mode==='intro'||mode==='over');},opened:function(){$('intro').hidden=true;$('overlay').hidden=true;syncDialogBackdrop();},closed:function(){if(mode==='intro')$('intro').hidden=false;else if(mode==='over')$('overlay').hidden=false;syncDialogBackdrop();}});
function setPausedUI(active){document.body.classList[active?'add':'remove']('paused');$('overlay').classList[active?'add':'remove']('pause-view');}
function pauseSummary(){return Math.floor(game.distance)+' 米 · 本局 '+game.coins+' 金币';}
function clearDiscard(){discardAction='';$('discard-panel').hidden=true;$('run-actions').hidden=false;$('overlay').classList.remove('confirm-view');if(mode==='pause'){$('overlay-title').textContent='已暂停';$('overlay-text').textContent=pauseSummary();}}
function requestDiscard(action){
 if(mode==='over'){if(action==='restart')start(true);else goHome();return;}
 if(mode!=='pause')return;
 discardAction=action;$('overlay').classList.add('confirm-view');$('overlay-title').textContent=action==='restart'?'重新出发？':'回到首页？';$('run-actions').hidden=true;$('discard-panel').hidden=false;
 $('discard-text').textContent='当前已漂流 '+Math.floor(game.distance)+' 米。'+(game.coins?'本局 '+game.coins+' 金币尚未结算。':'')+'确认后结束当前冒险。';
 if(action==='settle'){$('overlay-title').textContent='结束并结算？';$('discard-text').textContent='当前已漂流 '+Math.floor(game.distance)+' 米，本局 '+game.coins+' 金币。确认后按当前成绩结算，结束这次漂流。';}
 $('discard-confirm').textContent=action==='settle'?'确认结算':action==='restart'?'确认重新出发':'确认回到首页';$('discard-cancel').focus();
}
$('discard-cancel').addEventListener('click',function(){clearDiscard();$('resume').focus();});
$('discard-confirm').addEventListener('click',function(){var action=discardAction;if(!action||mode!=='pause')return;clearDiscard();if(action==='settle'){game.mode='over';over('已主动结束本次漂流');}else if(action==='restart')start(true);else goHome();});
var buddyLesson='',buddyResume=false,buddyFromGuide=false;
var buddyNames={otter:'水獭',duck:'鸭鸭',turtle:'龟龟'};
function buddySeen(role){return !!passedGuides[role]||Array.isArray(stats.buddyGuides)&&stats.buddyGuides.indexOf(role)!==-1;}
function openBuddyBook(role,entity){
 if(role&&noticePriority<2){$('callout').className='';noticeUntil=0;noticePriority=0;}buddyLesson=role||'';buddyResume=mode==='play';buddyFromGuide=!$('guide-panel').hidden;if(practiceReplay)mode='pause';else pause();$('overlay').hidden=true;$('settings-panel').hidden=true;$('guide-panel').hidden=true;
 var owned=role&&game.has(role);$('buddy-title').textContent=role?(owned?buddyNames[role]+'上船了！':'前方遇见'+buddyNames[role]):'动物能力说明';
 $('buddy-kicker').textContent=role?'第一次认识 · 自动生效':'三位搭子 · 各有用处';$('buddy-intro').textContent=role?'上船开始计时，到站自动下船，能力结束。':'每种只接一位；到站或踢下船，能力都会结束。向上滑动查看。';
 ['otter','duck','turtle'].forEach(function(r){$('buddy-'+r).hidden=!!role&&role!==r;$('buddy-state-'+r).textContent=game.has(r)?'剩'+Math.ceil(game.buddyRemaining(r))+'秒':River3D.buddyDuration(r)+'秒同行';});
 var direction='靠近动物就会自动上船，不用点击它。';if(owned)direction='已经上船了，留意左侧头像下的同行时间条。';else if(entity){var steps=Math.round(Math.abs(entity.z-game.targetZ)/3.7);direction=steps?'向'+(entity.z>game.targetZ?'右':'左')+'滑'+(steps===2?'两':'一')+'次，靠近就会自动上船。':'保持当前航道，靠近就会自动上船。';}
 $('buddy-pickup').textContent=role?direction:'同种只接一位，再次拾取会刷新同行时间。';$('buddy-freeze-note').textContent=role?'暂停阅读 · '+({otter:'上船后划水成功一次',duck:'接上后缓降落稳一次',turtle:'接上后挡住一次浮木'})[role]+'再继续':buddyResume?'阅读时河流与鳄鱼已暂停。':'看完后返回原来的页面。';
 $('buddy-close').textContent=role&&!owned?'开始接搭子练习':buddyResume?'知道了，继续漂流':'知道了，返回';$('buddy-content').scrollTop=0;$('buddy-panel').hidden=false;renderDirty=true;$('buddy-close').focus();
}
function closeBuddyBook(){
 var role=buddyLesson;buddyLesson='';$('buddy-panel').hidden=true;
 if(role&&(!buddySeen(role)||practiceReplay))releaseLesson();
 if(buddyFromGuide){$('guide-panel').hidden=false;$('buddy-book-open').focus();}
 else if(buddyResume&&!lost)resume();
 else if(mode==='pause'||mode==='over'){$('overlay').hidden=false;(mode==='pause'?$('resume'):$('restart')).focus();}
 else $('settings-open').focus();
}
$('buddy-close').addEventListener('click',closeBuddyBook);$('buddy-book-open').addEventListener('click',function(){openBuddyBook();});
function pause(){if(practiceReplay){endReplay(false);return;}if(mode!=='play'&&mode!=='opening'&&mode!=='defeat')return;defeatPaused=mode==='defeat';$('flag-cue').hidden=true;$('flag-status').hidden=true;openingPaused=mode==='opening';clearDiscard();$('run-details').scrollTop=0;$('restart').className='secondary';mode='pause';pendingHaptic=0;setPausedUI(true);setResultUI(false);audio.stop();clearSteering();game.release();pressed=false;pointerId=null;$('action').classList.remove('down');$('overlay').hidden=false;$('pause').setAttribute('aria-label','继续游戏');$('overlay-kicker').textContent='' ;$('overlay-title').textContent='已暂停';$('overlay-text').textContent=pauseSummary();$('stats').textContent='';$('run-summary').textContent='';$('result-goals').textContent='';$('result-honors').textContent='';$('resume').hidden=false;$('resume').textContent='继续漂流';$('restart').textContent='重新出发';$('settle').hidden=openingPaused||defeatPaused;$('resume').focus();}
function resume(){if(mode!=='pause'||lost)return;clearDiscard();setPausedUI(false);setResultUI(false);mode=defeatPaused?'defeat':openingPaused?'opening':'play';defeatPaused=false;openingPaused=false;audio.unlock();$('pause').setAttribute('aria-label','暂停游戏');$('overlay').hidden=true;last=0;(mode==='defeat'?$('defeat-skip'):mode==='opening'?$('opening-skip'):coachGate==='welcome'?$('skip-coach'):$('action')).focus();}
function retryAdvice(reason){if(/松手/.test(game.lastMistake))return '空翻后提早松手扶正，轻点即可越障。';if(/扶正/.test(reason))return '翻船后连点三次，或持续按住自救。';if(/撞上/.test(game.lastMistake))return '先左右绕开障碍；选择跳跃时，留意前方障碍提示，提前轻点。';return '五连金币或动作三连击都会自动冲浪，帮你拉开距离。';}
var retryResultSave=null;
$('result-save-retry').addEventListener('click',function(){if(mode==='over'&&retryResultSave)retryResultSave();});
function beginVictory(){if(mode!=='play')return;mode='victory';mvpElapsed=0;clearSteering();game.release();pressed=false;pointerId=null;drag=null;clearNotices();honorQueue=[];$('honor-toast').hidden=true;$('coach').hidden=true;$('flag-cue').hidden=true;$('mvp').hidden=true;$('flag-status').hidden=true;$('shore-ending').hidden=false;document.body.classList.add('shore-ending');renderer.endingTime=0;$('ending-fade').style.opacity='0';$('ending-line').textContent='前面就是岸边';$('ending-skip').focus();audio.stop();renderDirty=true;}
function showVictory(){mvpElapsed=Math.max(mvpElapsed,River3D.ending.duration);renderer.endingTime=River3D.ending.duration;$('shore-ending').hidden=true;document.body.classList.remove('shore-ending');$('mvp-summary').textContent=Math.floor(game.distance)+'米 · '+game.coins+'金币 · '+game.honorInfo().count+'枚勋章';$('mvp').hidden=false;$('mvp-finish').focus();sound('boost');renderDirty=true;}
function finishVictory(){if(mode!=='victory'||mvpElapsed<River3D.ending.duration)return;$('mvp').hidden=true;over('四关全部通关 · 靠岸换乘，冒险完成');}
$('ending-skip').addEventListener('click',function(){if(mode==='victory'&&mvpElapsed<River3D.ending.duration)showVictory();});
$('mvp-finish').addEventListener('click',finishVictory);
function over(reason){
 if(mode==='over')return;
 if(practiceReplay){endReplay(false);return;}
 clearDiscard();setPausedUI(false);$('run-details').scrollTop=0;mode='over';setResultUI(true);
 honorQueue=[];honorTimer=0;$('honor-toast').hidden=true;resultHonors();audio.stop();clearSteering();game.release();pressed=false;$('action').classList.remove('down');$('overlay').hidden=false;
 if(game.campaignWon&&!game.endless&&game.lapsCompleted===4){stats.endlessUnlocked=true;syncEndlessEntry();}
 var distance=Math.floor(game.distance);$('overlay-title').setAttribute('data-digits',String(distance).length);$('overlay-kicker').textContent=game.endless?'无尽模式 · 本局结束':game.campaignWon?'四关通关':distance>stats.best?'新的漂流纪录':'本局结束';$('overlay-title').textContent=distance+' 米';$('overlay-title').innerHTML='<span class="result-distance">'+distance+'</span><span class="result-unit"> 米</span>';$('overlay-title').classList[String(distance).length>6?'add':'remove']('long-distance');
 $('overlay-text').textContent=String(reason).replace(/[。！!]+$/,'');$('result-advice').textContent=game.campaignWon?'四关挑战完成！再出发，试着收集更多金币与徽章。':'下次试试：'+retryAdvice(reason);
 $('result-stage').textContent=game.endless?'无尽模式 · 坚持 '+Math.floor(game.time)+' 秒':game.campaignWon?'四关通关 · 成功抵达终点':'第 '+Math.min(4,(game.stageIndex||0)+1)+' 关止步 · '+String(reason).replace(/[。！!]+$/,'');
 $('result-heading-title').textContent=game.endless?'无尽挑战完成':game.campaignWon?'四关闯过啦':'这一程，辛苦啦';
 $('result-record').hidden=!(distance>(Number(stats.best)||0));
 $('result-highlights').innerHTML=[['最高连击',game.bestCombo,'连'],['漂亮空翻',game.flips,'次'],['接上搭子',game.rescues,'位']].map(function(row){return '<div><strong>'+row[1]+'<small>'+row[2]+'</small></strong><span>'+row[0]+'</span></div>';}).join('');
 $('result-rewards').setAttribute('data-long',String(game.coins).length>8?'true':'false');$('result-score').setAttribute('data-huge',Math.max(game.score,game.coins,game.distance)>=1e12?'true':'false');$('result-score').setAttribute('data-long',String(Math.floor(Math.max(game.score,game.coins))).length>8?'true':'false');$('stats').setAttribute('data-long',String(Math.floor(Math.max(game.score,game.coins))).length>8?'true':'false');$('result-coins').textContent=(game.coins?'+':'')+game.coins;$('result-coins').setAttribute('data-digits',String(game.coins).length);
 $('stats').innerHTML='<span><b>'+Math.floor(game.score)+'</b>得分</span><span><b>'+(game.coins?'+'+game.coins:'0')+'</b>金币</span>';
 $('run-summary').textContent=['搭子获救 '+game.rescues+' 位','空翻 '+game.flips+' 次','最高 '+game.bestCombo+' 连击','失误 '+game.hits+' 次','绕行 '+game.dodges+' 次','岸边互动 '+game.bankVisits+' 次','送鱼 '+game.deliveries+' 次','飞跃 '+game.flyovers+' 次','接回搭子 '+game.rejoins+' 次',game.endless?'无尽模式 · 坚持 '+Math.floor(game.time)+' 秒':'完成 '+game.lapsCompleted+(River3D.campaign?' / 4 关':' 程')].join('\n');
 $('result-goals').textContent=game.contractComplete?'本组委托全部完成，下局开启新目标。':game.missions().map(function(m,i){return (game.missionFlags[i]?'已完成 · ':'未完成 · ')+m.label;}).join('\n');
 $('resume').hidden=true;$('restart').textContent=game.endless?'再挑战无尽':game.campaignWon?'再闯四关':'再来一次';$('endless-invite').hidden=!game.campaignWon||!!game.endless;$('overlay').setAttribute('data-endless-invite',game.campaignWon&&!game.endless?'true':'false');$('restart').className=game.campaignWon?'secondary':'primary';$('restart').focus();
 var collectionBefore=Number(stats.totalCoins)||0;showBoatProgress(collectionBefore,collectionBefore+game.coins,'saving');
 var completed=game,saveBusy=false;
 function saveResult(retry){
  if(saveBusy||game!==completed||mode!=='over')return;saveBusy=true;
  if(retry&&document.activeElement===$('result-save-retry'))$('result-tab-'+resultTab).focus();
  $('result-save-retry').hidden=true;$('endless-challenge').disabled=true;$('result-save-status').textContent='正在保存…';$('result-save-status').setAttribute('data-state','saving');$('result-rank-status').textContent='正在同步排行榜…';
  var saving=retry?RiverPlatform.retrySave(completed):RiverPlatform.save(completed);
  Promise.resolve(saving).then(function(ok){
   if(game===completed&&mode==='over'){if(ok&&completed.campaignWon&&!completed.endless&&completed.lapsCompleted===4){stats.endlessUnlocked=true;syncEndlessEntry();$('endless-challenge').disabled=false;if(document.activeElement===$('restart')){$('endless-challenge').focus();if($('home').scrollIntoView)$('home').scrollIntoView({block:'nearest'});}}resultSaveStatus(completed,ok);showBoatProgress(collectionBefore,collectionBefore+completed.coins,ok?'saved':'failed');$('result-save-retry').hidden=ok||!RiverPlatform.retrySave;}
   return ok?leaderboard.submit(completed):{state:'pending'};
  },function(){if(game===completed&&mode==='over'){resultSaveStatus(completed,false);showBoatProgress(collectionBefore,collectionBefore+completed.coins,'failed');$('result-save-retry').hidden=!RiverPlatform.retrySave;}return {state:'pending'};}).then(function(result){
   if(game!==completed||mode!=='over')return;if(result.state==='pending'&&$('result-save-status').getAttribute('data-state')==='saved')$('result-save-status').textContent=result.boards&&(result.boards.distance==='range'||result.boards.coins==='range')?'已保存 · 超出榜单范围的成绩保留在个人纪录':'已保存 · 排行榜待同步';$('result-rank-status').textContent=result.state==='submitted'?'排行榜成绩已同步':result.state==='local'?'当前环境暂不支持公开排行，个人纪录已保留':'排行榜暂未同步，下次正式结算时再次核对';
  },function(){if(game===completed&&mode==='over')$('result-rank-status').textContent='排行榜暂未同步，下次正式结算时再次核对';}).then(function(){saveBusy=false;});
 }
 retryResultSave=function(){saveResult(true);};saveResult(false);stats.best=Math.max(stats.best,distance);
}
function inputDown(e,owner){if(mode!=='play'||pressed||coachGate==='welcome')return;practiceRetryDelay=0;audio.unlock();if(e){e.preventDefault();if(e.pointerId!==undefined){pointerId=e.pointerId;try{e.currentTarget.setPointerCapture(e.pointerId);}catch(err){}}}if(!e)pointerId=owner===undefined?'keyboard':owner;if(coachGate==='flag')finishFlagGuide();else if(coachGate)finishCourseCoach();pressed=true;game.press();$('action').classList.add('down');touchFeedback();updateUI();}
function inputUp(e){if(e&&e.pointerId!==undefined&&pointerId!==null&&e.pointerId!==pointerId)return;game.release();pressed=false;pointerId=null;$('action').classList.remove('down');}
function bankFeedback(data){
 var messages={fish:'拉到鱼啦 · +3 币，带去右岸营地',gift:'接住野餐礼物 · +4 币',tow:'抓住绳索 · 借力前冲',delivery:'鲜鱼送到营地 · +6 币'};
 rewardNotice(messages[data.type],'bank-'+data.type,({fish:'钓鱼+3币',gift:'接礼+4币',delivery:'送鱼+6币',tow:'借力加速'})[data.type]);sound(data.type==='tow'?'boost':data.type==='fish'?'join':'flip');touchFeedback('medium');
 if(data.coins){coinPulse=1;coinNotice=1.3;$('coins').textContent=game.coins;$('coin-feedback').textContent='+'+data.coins+' · 岸边';$('coin-feedback').className='';$('coin-feedback').hidden=false;}
 if(!reduced)renderer.burst(game,'buddy',time);
}
function updateBankUI(){
 var s=game.nextBank(),hazard=game.nextHazard(),urgent=hazard&&(hazard.x-game.distance)/game.speed<1.2;
 $('cargo').hidden=!game.fishCargo;
 $('bank-cue').hidden=mode!=='play'||!!coachGate||!!game.stumble||game.gap<10||!!urgent||!$('flight').hidden||!$('approach').hidden||(!s&&!game.tow)||(!game.tow&&s&&(s.x-game.distance>game.bankApproachDistance(s)||s.x-game.distance< -5));
 if($('bank-cue').hidden)return;
 var bankLesson=s?(s.kind===0?'fish':s.kind===1?'camp':'tow'):null;
 if(!practiceReplay&&bankLesson&&!lessonKnown(bankLesson)&&!lessonUnlocked(bankLesson)&&!game.tow){$('bank-cue').hidden=true;return;}
 var text='',progress=0;
 if(game.tow){text='起跳松绳';progress=game.tow.remaining/River3D.balance.tow.seconds;}
 else{
  var dir=s.side<0?'← ':'→ ';
  if(s.kind===0){text=dir+'靠岸稳住钓鱼';progress=s.progress/.42;}
  else if(s.kind===1){text=dir+(game.fishCargo&&!s.delivered?'靠岸送鱼':'靠岸，接近时跳起接礼');}
  else{text=dir+(s.progress>0?'正在接绳':'靠岸接绳');progress=s.progress/.24;}

 }
 $('bank-cue-text').textContent=text;$('bank-progress').style.width=Math.min(100,progress*100)+'%';
}
function events(){var batch=game.drain(),active=lessonPace.active;if(practiceReplay&&active&&active.phase==='practice'&&batch.some(function(e){return e.type==='over'||e.type==='crash'||e.type==='impact'&&!(active.id==='turtle'&&batch.some(function(n){return n.type==='shield'&&n.data==='turtle';}));})){retryPractice();return;}var impacts=batch.filter(function(e){return e.type==='impact';}),hit=impacts.length?impacts[0].data:null,hitPlayed=false,rejoining=batch.filter(function(e){return e.type==='rejoin';}).map(function(e){return e.data;});batch.forEach(function(e){var type=e.type;if(type==='ramp')lastRampAt=game.time;lessonResult(lessonPace.observe(type,e.data,game));if(type==='flag')flagFeedback(e.data);if(type==='impact'){if(!reduced)renderer.burst(game,'impact',time,e.data);if(!hitPlayed){if(!batch.some(function(n){return ['crash','shield','smash'].indexOf(n.type)!==-1;}))notify('砰！撞上'+(e.data.projectile?'岸边飞石':e.data.kind==='rock'?'礁石':'浮木'),2,'impact');sound(e.data.kind+'-hit');touchFeedback('medium');hitPlayed=true;}}if(type==='honor'&&!practiceReplay)honorFeedback(e.data);if(type==='buddy-arrival'){reactToBuddy(buddyNames[e.data.role]+'：我到站啦，下次见！',e.data.role);notify(buddyNames[e.data.role]+'到站下船 · 能力结束',1);sound('join');}if(type==='buddy-soon')notify(buddyNames[e.data]+'即将到站'+(e.data==='duck'?'，留意落地':''),1,'soon-'+e.data);if(type==='buddy-full')notify(buddyNames[e.data]+'已经在船上，先踢旧的才能接新',2,'full-'+e.data);if(type==='kick'){reactToBuddy(({otter:'水獭：这笔账记下了！',duck:'鸭鸭：嘎？！你认真的？',turtle:'龟龟：友谊的小船呢？'})[e.data.role],e.data.role);rewardNotice('搭子 −1 · 冲刺'+River3D.balance.kick.seconds+'秒！','kick','踢搭子冲刺');sound('escape');touchFeedback('medium');}if(type==='bank')bankFeedback(e.data);if(type==='story'&&!operationActive())notify(e.data.note,1);if(type==='wind-warning')notify((e.data.direction>0?'→':'←')+' 横风每2秒推'+(e.data.direction>0?'右':'左')+'一列 · 滑动可矫正',2,'wind');if(type==='wind-shift'){sound('steer');touchFeedback();}if(type==='flyover'){rewardNotice('飞跃落稳！技巧加分','flyover','飞跃成功');sound('flip');touchFeedback('medium');}if(type==='rejoin'){rewardNotice('接回'+roles[e.data].split(' · ')[0]+'，继续一起漂！','rejoin','接回搭子');sound('join');}if(type==='lap-complete'){coinPulse=1;coinNotice=1.3;$('coins').textContent=game.coins;$('coin-feedback').textContent='+5 · 完成'+(River3D.campaign?'一关':'一程');$('coin-feedback').className='jackpot';$('coin-feedback').hidden=false;rewardNotice('第 '+e.data.lap+(River3D.campaign?' 关':' 程')+'完成！全船庆祝 · +5 币','lap','完成'+(River3D.campaign?'一关':'一程')+'+5币');sound('boost');touchFeedback('medium');if(!reduced)renderer.burst(game,'boost',time);}if(type==='cargo-lost')notify('鱼篮掉落了 · 下次再送',2,'cargo');if(['land','crash','flip','boost','buddy','recover','smash'].indexOf(type)!==-1&&!reduced&&!(hit&&(type==='crash'||type==='smash')))renderer.burst(game,type,time);if(type==='jump')sound('jump');if(type==='land'){sound('land');touchFeedback();}if(type==='buddy'&&rejoining.indexOf(e.data)===-1){rewardNotice(roles[e.data]+' · 同行'+Math.ceil(game.buddyRemaining(e.data))+'秒','buddy-'+e.data,'接上'+buddyNames[e.data]);sound('join');}else if(type==='mission'){rewardNotice('委托完成 · '+e.data+' +150','mission','委托+150分');sound('flip');}else if(type==='contract'){rewardNotice('本组委托全完成！下局解锁新目标','contract','本组委托完成');sound('boost');}else if(type==='zone'){if(!operationActive())notify(e.data.name+' · '+e.data.note,1);sound('flip');}else if(type==='ramp'){notify(!lessonUnlocked('flip')?(game.has('duck')?'这次不用按，看看鸭鸭缓缓落水':'不用按也能落稳，先享受乘浪'):'浪头起飞！长按可以空翻',1,'flight');sound('jump');}else if(type==='flip'){rewardNotice('漂亮空翻！连击 ×'+e.data,'flip','漂亮空翻');sound('flip');}else if(type==='boost'){rewardNotice('冲浪出发！持续'+River3D.balance.surf.seconds+'秒','boost','冲浪');sound('boost');}else if(type==='dodge'){rewardNotice('灵巧绕开！连击 ×'+e.data,'dodge','灵巧绕障');sound('join');}else if(type==='clear'){rewardNotice('越过去啦！连击 ×'+e.data,'clear','越过障碍');}else if(type==='crash'){clearSteering();pressed=false;pointerId=null;drag=null;$('action').classList.remove('down');notify((hit?'砰！撞上'+(hit.projectile?'岸边飞石':hit.kind==='rock'?'礁石':'浮木')+' · ':'翻船啦！')+'点三次或按住扶正',3,'rescue');if(!hit)sound('crash');touchFeedback('medium');}else if(type==='paddle'){sound('paddle');}else if(type==='recover'){notify('站起来，接着漂！',3,'recovered');sound('flip');}else if(type==='shield'){if(e.data==='flag'&&!reduced)renderer.burst(game,'flag-guard',time);notify((hit?'砰！':'')+(e.data==='flag'?'护航旗挡住了！':e.data==='turtle'?'龟龟挡住了！':'搭子挡了一下，暂时下船啦'),2,'impact');if(!hit)sound('crash');}else if(type==='smash'){rewardNotice('砰！冲浪撞碎障碍！','smash','撞碎障碍');sound('flip');}else if(type==='close-call'){notify('险些被追上！还有最后机会',3,'close-call');sound('crash');}else if(type==='coin')collectFeedback(e.data);else if(type==='victory')beginVictory();if(type==='over'){if(/鳄鱼|没能及时扶正/.test(e.data))beginDefeat(e.data);else over(e.data);}});if(batch.some(function(e){return ['flag','impact','crash','shield','recover','ramp','wind-warning','cargo-lost','buddy-full','coin-chain','surf-ready'].indexOf(e.type)!==-1;}))updateUI();}
function hudNumber(n){return n>=1e12?(n/1e12).toFixed(1)+'万亿':n>=1e8?(n/1e8).toFixed(2)+'亿':n>=1e6?(n/1e4).toFixed(1)+'万':String(n);}
function updateUI(){updateSpeed();var meters=Math.floor(game.distance);$('meters').textContent=hudNumber(meters);$('meters').setAttribute('aria-label',meters+'米');$('meters').setAttribute('data-digits',String(meters).length);$('distance-readout').classList[String(meters).length>5?'add':'remove']('long-distance');$('coin-panel').classList[game.coins>=1e6?'add':'remove']('large-coins');$('coins').textContent=hudNumber(game.coins);$('coins').setAttribute('aria-label',game.coins+'金币');$('score').textContent=Math.floor(game.score)+' 分';var journey=game.zone(),windActive=(journey.id===2||River3D.campaign&&journey.id===3)&&Math.abs(game.currentForce||0)>.2;document.body.classList[windActive?'add':'remove']('has-current');$('zone').textContent=game.endless?'无尽模式 · '+Math.floor(game.time)+'秒':River3D.campaign?journey.name+' · '+journey.lap+'/4关 · '+Math.ceil(Math.max(0,River3D.campaign.durations[game.stageIndex||0]-River3D.campaign.elapsed(game)))+'秒':journey.name+' · 第 '+journey.lap+' 程';if(practiceReplay)$('zone').textContent='练习 · '+practiceReplay.label;$('river-progress').style.width=journey.progress*100+'%';var story=game.story();$('river-next').textContent=windActive?((game.currentForce>0?'→':'←')+(' 每2秒推一列 · '+Math.max(0,River3D.windInterval-game.windTime).toFixed(1)+'秒')):story?story.name+' · '+Math.ceil(journey.remaining)+' m 后'+(journey.id===3?(River3D.campaign?'抵达终点':'开启下一程'):'进入'+journey.next):Math.ceil(journey.remaining)+' m 后 · '+journey.next;if(game.endless)$('river-next').textContent='持续加速 · 挑战没有终点';if(practiceReplay)$('river-next').textContent='练习奖励不计入冒险';updateChase();var kickVisible=mode==='play'&&!coachGate&&!game.stumble;$('crew-escape').hidden=!kickVisible||(!game.crew.length&&kickReaction<=0);$('kick-note').hidden=!game.crew.length;$('crew-tickets').hidden=!game.crew.length;
 ['otter','duck','turtle'].forEach(function(role){var active=game.has(role),remaining=game.buddyRemaining(role),total=game.buddyDuration?game.buddyDuration(role):River3D.buddyDuration(role);$('ticket-'+role).hidden=!active;$('ticket-'+role).classList[active&&remaining<=5?'add':'remove']('expiring');$('ticket-time-'+role).textContent=Math.ceil(remaining)+'秒';$('ticket-fill-'+role).style.transform='scaleX('+(remaining/total)+')';$('ticket-meter-'+role).setAttribute('aria-valuemin','0');$('ticket-meter-'+role).setAttribute('aria-valuemax',String(total));$('ticket-meter-'+role).setAttribute('aria-valuenow',String(Math.ceil(remaining)));$('kick-'+role).disabled=game.kickCooldown>0||!active;});
 var arriving=null;for(var bi=0;bi<game.entities.length;bi++){var buddy=game.entities[bi],ahead=buddy.x-game.distance;if(buddy.kind==='buddy'&&!buddy.done&&game.has(buddy.role)&&ahead>=-2.8&&ahead<Math.min(48,game.speed*2.2)&&(!arriving||buddy.x<arriving.x))arriving=buddy;}$('crew-incoming').hidden=!arriving;$('crew-incoming').textContent=arriving?(arriving.returning?'落水'+buddyNames[arriving.role]+' · 余'+Math.ceil(Number.isFinite(arriving.remaining)?arriving.remaining:River3D.buddyDuration(arriving.role))+'秒，同种限一位':'前方'+buddyNames[arriving.role]+' · 接上可刷新时间'):'';
 $('danger').hidden=game.gap>=10||mode!=='play';$('combo').textContent=game.combo>0?'×'+game.combo+' 连击':'';var comboActive=game.combo>0,noticeActive=mode==='play'&&(comboActive||game.goldCharge||game.goldBoost>0);$('combo').hidden=!comboActive;$('combo-notice').hidden=!noticeActive;document.body.classList[noticeActive?'add':'remove']('combo-active');$('combo-meter').hidden=!noticeActive;$('combo-track').hidden=!comboActive;$('combo-next').hidden=false;$('combo-next').textContent=game.goldBoost>0?'正在冲浪 · +'+River3D.balance.surf.extra+'m/s':game.goldCharge?'已储备 · 加速结束后自动冲浪':game.comboCooldown>0?'冲浪蓄力恢复中':'再连 '+(3-game.combo%3)+' 次蓄好冲浪';$('combo-time').style.width=game.comboTime/River3D.balance.combo.windowSeconds*100+'%';document.body.classList[game.burstExtra()>0?'add':'remove']('boosting');document.body.classList[reduced?'add':'remove']('reduced-motion');document.body.classList[game.stumble?'add':'remove']('rescuing');document.body.classList[journey.id>=2?'add':'remove']('dark-water');if(game.stumble){$('action-label').textContent='扶正 '+game.taps+'/3';$('action-note').textContent=game.held?'继续按住扶正':'连点或按住自救';$('hint').textContent=game.held?'继续按住 · 正在扶正':'连点或按住自救';}else if(game.waveRide){$('action-label').textContent='顺浪抬升';$('action-note').textContent='浪尖自然离水';$('hint').textContent='顺着浪面前行 · 浪尖低跃';}else if(game.y>0){$('action-label').textContent=game.held?'松手扶正':'长按空翻';$('action-note').textContent=game.held?'落水前松手':'不按也能落地';$('hint').textContent=game.has('duck')?'鸭鸭撑伞，落得更慢啦':'腾空收桨 · 松手扶正再入水';}else{var next=game.nextHazard(),drive=game.propulsion();$('action-label').textContent='跳跃';$('action-note').textContent='长按空翻';$('hint').textContent=next&&next.x-game.distance<game.speed*.7?'前方'+(next.kind==='rock'?'礁石':'浮木')+'！左右躲开或跳跃':game.burstExtra()>0?'借浪冲刺 · 船长稳住方向':drive.rowing?(drive.pose.contact?'水獭划水推进 · 船长掌舵':'水獭抬桨回位 · 顺流滑行'):'水流推着木筏走 · 船长掌舵';}var flight=game.flightInfo(),noviceFlip=!lessonKnown('flip')&&!practiceReplay,releaseSoon=flight.turn>=(noviceFlip?.78:.98)||flight.landingIn<(noviceFlip?.65:.35);$('flight').hidden=game.y<=0||!!game.waveRide||!!game.stumble||!!coachGate;$('flight-fill').style.width=flight.turn*100+'%';$('flight-label').textContent=game.held?(releaseSoon?'松手扶正':'按住空翻 · 松手扶正'):(flight.tilt>=.3?'正在扶正 · 等待落稳':'等待落水 · 空中也能换道');$('flight-note').textContent=Math.round(flight.turn*360)+'° / 360° · 松手自动扶正';$('flight').className=game.held&&(releaseSoon)?'release':'';if(game.y>0&&!game.waveRide&&game.held)$('action-label').textContent=releaseSoon?'松手扶正':'按住转一圈';var hazard=game.nextHazard(),eta=hazard?(hazard.x-game.distance)/game.speed:99;var ready=eta<.85&&eta>.24,nearBank=game.nextBank(),bankLead=nearBank&&Math.abs(nearBank.x-game.distance)<game.bankApproachDistance(nearBank);$('approach').hidden=eta>(bankLead?1.2:(River3D.campaign?River3D.campaign.cues[game.stageIndex||0]:River3D.balance.hazardCueSeconds))||game.y>0||!!game.stumble||!!coachGate||!!(hazard&&hazard.projectile);$('approach-title').textContent=hazard&&hazard.projectile?'岸边飞石 · 快速换道或跳起躲避':hazard&&hazard.reef==='ridge'?'双道长礁 · 走空道或轻点跳跃':'前方'+(hazard&&hazard.kind==='rock'?'礁石':'浮木')+' · 提前换道或轻点跳跃';$('approach-fill').style.width=Math.max(0,Math.min(100,((River3D.campaign?River3D.campaign.cues[game.stageIndex||0]:River3D.balance.hazardCueSeconds)-eta)/(River3D.campaign?River3D.campaign.cues[game.stageIndex||0]:River3D.balance.hazardCueSeconds)*100))+'%';$('approach').className=ready?'ready':'';$('hint').hidden=!game.stumble;updateBankUI();updateFlagUI();updateLessonPractice();document.body.classList[game.stumble||!$('flight').hidden||!$('approach').hidden||!$('bank-cue').hidden?'add':'remove']('action-cue');if(!lessonKnown('flip')&&!lessonUnlocked('flip')&&!practiceReplay&&!game.stumble){$('action-note').textContent=game.y>0?'先落稳，不用空翻':'轻点起跳';if(game.y>0){$('action-label').textContent=game.held?'松手扶正':'等待落水';$('flight').hidden=true;}} if(!River3D.campaign&&!practiceReplay&&game.distance>=240&&game.distance<280&&game.flightEvent&&game.y>0){$('action-label').textContent='不用按';$('action-note').textContent='这次先看缓降';$('flight').hidden=true;} $('action').setAttribute('aria-label',$('action-label').textContent+'，'+$('action-note').textContent);updateHonors();}
function frame(ts){if(lost||document.hidden)return;var raw=last?(ts-last)/1000:1/60,dt=Math.min(.05,raw);last=ts;time+=dt;if(mode==='victory'){var endingBefore=mvpElapsed;mvpElapsed+=dt;var endingDuration=River3D.ending.duration;if(mvpElapsed<endingDuration){renderer.endingTime=mvpElapsed;$('ending-line').textContent=River3D.ending.caption(mvpElapsed);$('ending-fade').style.opacity=String(Math.max(0,Math.min(1,(mvpElapsed-River3D.ending.fadeAt)/1.2)));}if(endingBefore<2.25&&mvpElapsed>=2.25)sound('jump');if(endingBefore<2.75&&mvpElapsed>=2.75)sound('land');if(endingBefore<3.05&&mvpElapsed>=3.05)sound('jump');if(endingBefore<3.65&&mvpElapsed>=3.65)sound('land');if(endingBefore<3.85&&mvpElapsed>=3.85)sound('escape');if(mvpElapsed>=4.8&&Math.floor((mvpElapsed-4.8)/.64)>Math.floor((endingBefore-4.8)/.64))sound('paddle');if(endingBefore<endingDuration&&mvpElapsed>=endingDuration)showVictory();if(mvpElapsed>=endingDuration+4)finishVictory();}if(mode==='opening')updateOpening(dt);if(mode==='defeat')updateDefeat(dt);if(mode==='play')maybeFlagIntro();if(mode==='play'){if(raw>.5){pause();}else{if(drag)drag.elapsed+=raw;if(drag&&!drag.moved&&!drag.drifted&&!drag.holding&&!pressed&&coachGate!=='welcome'&&drag.elapsed>=.32){drag.holding=true;inputDown(null,drag.id);}if(!coachGate&&!(practiceReplay&&practiceReplay.completedAt!==null)){if(practiceRetryDelay>0)practiceRetryDelay=Math.max(0,practiceRetryDelay-raw);else game.advance(raw);}}if(mode==='play')events();if(mode==='play')guideCourse();if(mode==='play')maybeFlagIntro();}if(practiceReplay&&practiceReplay.completedAt!==null&&time-practiceReplay.completedAt>=1.8)endReplay(true);syncDialogBackdrop();dangerFeedback();animateFeedback(dt);animateHonors(dt);flushHaptics();if(((mode==='play'||mode==='intro'||mode==='opening'||mode==='defeat'||mode==='victory')&&$('dialog-backdrop').hidden)||renderDirty){try{renderer.reducedMotion=reduced;renderer.render(game,reduced?0:time,mode==='intro',dt);renderDirty=false;}catch(error){pause();fallback('3D 画面暂时中断，游戏已暂停。请重新加载后再试。');return;}}uiTick+=dt;if(uiTick>.08){uiTick=0;if(mode!=='intro')updateUI();}animateNotices(dt);if(mode==='play'&&raw>.042)slow+=dt;else slow=Math.max(0,slow-dt*.5);if(slow>4&&!renderer.low){renderer.low=true;renderer.resize();renderDirty=true;slow=0;updateQualityLabel();$('mode-note').textContent='已降低画质以保持流畅';}if(renderer.low&&raw>.1&&mode==='play')slowLow+=dt;else slowLow=Math.max(0,slowLow-dt);if(slowLow>6){pause();fallback('设备持续运行较慢。已暂停游戏，请关闭其他应用后重新加载。');return;}raf=requestAnimationFrame(frame);}
function resetTeachingRuntime(){
 flagLessonEpoch++;flagLessonsSeen={};flagIntro=null;pendingFlagIntros=[];stats.flagLessons=[];$('flag-intro').hidden=true;stats.tutorial=false;stats.gestureGuide=false;stats.flagGuide=false;stats.goldSwipeGuides=0;stats.lessonGuides=[];stats.buddyGuides=[];
 stats.tutorialCourse=false;stats.tutorialSteps=[];
 passedGuides={};lessonPace=new River3D.LessonPace();coachJump=false;coachFlip=false;coachGate='';
 welcomePending=(mode==='play'||mode==='pause')&&!openingPaused&&!defeatPaused;
 practiceSuccessAt=-99;practiceRetryAt=-99;practiceRetryDelay=0;
 $('coach').hidden=true;$('gesture-steps').hidden=true;$('practice-cue').hidden=true;$('flag-cue').hidden=true;
 document.body.classList.remove('teaching');document.body.classList.remove('lesson-practice');document.body.classList.remove('lesson-success');
 renderDirty=true;
}
var teachingResetBusy=false;
function closeTeachingReset(){
 if(teachingResetBusy)return;
 $('reset-teaching-confirm').hidden=true;$('settings-content').hidden=false;$('settings-close').hidden=false;
 $('settings-panel').setAttribute('aria-labelledby','settings-title');$('reset-teaching').focus();
}
$('reset-teaching').addEventListener('click',function(){
 if(teachingResetBusy)return;
 $('settings-content').hidden=true;$('settings-close').hidden=true;$('reset-teaching-confirm').hidden=false;
 $('settings-panel').setAttribute('aria-labelledby','reset-teaching-title');
 $('reset-teaching-text').textContent='清除已学记录，下次开漂重新提示。金币、船只、徽章和历史成绩保留。'+(mode==='pause'?'当前未结算的冒险会结束。':'');
 $('reset-teaching-status').textContent='';$('reset-teaching-cancel').focus();
});
$('reset-teaching-cancel').addEventListener('click',closeTeachingReset);
$('reset-teaching-yes').addEventListener('click',function(){
 if(teachingResetBusy)return;
 teachingResetBusy=true;$('reset-teaching-yes').disabled=true;$('reset-teaching-cancel').disabled=true;$('reset-teaching-status').textContent='正在重置…';
 Promise.resolve().then(function(){return RiverPlatform.resetTutorial?RiverPlatform.resetTutorial():false;}).then(function(saved){
  if(!saved){$('reset-teaching-status').textContent='未能保存重置，请再试一次。';return;}
  resetTeachingRuntime();$('settings-panel').hidden=true;
  $('reset-teaching-confirm').hidden=true;$('settings-content').hidden=false;$('settings-close').hidden=false;
  $('settings-panel').setAttribute('aria-labelledby','settings-title');goHome();syncDialogBackdrop();
 },function(){
  $('reset-teaching-status').textContent='未能重置，请再试一次。';
 }).then(function(){teachingResetBusy=false;$('reset-teaching-yes').disabled=false;$('reset-teaching-cancel').disabled=false;});
});
function updateQualityLabel(){var value=manualLow?'流畅':renderer&&renderer.low?'自动 · 已降档':'自动';$('quality-value').textContent=value;$('quality').setAttribute('aria-label','画质：'+value+'，点击切换');}
function savePreference(name,value){RiverPlatform.setPreference(name,value).then(function(ok){$('settings-status').textContent=ok?'设置已保存':'本次设置已生效，但暂时未能保存。';});}
var guideSource='guide-open',guideFromSettings=false;
var guideTopics=['actions','buddies','banks','survival','journey','flags'];
function chooseGuideTopic(topic){if(guideTopics.indexOf(topic)===-1)return;guideTopics.forEach(function(key){$('guide-topic-'+key).hidden=key!==topic;$('guide-tab-'+key).setAttribute('aria-pressed',String(key===topic));});$('guide-content').scrollTop=0;}
guideTopics.forEach(function(topic){$('guide-tab-'+topic).addEventListener('click',function(){chooseGuideTopic(topic);});});
function openGuide(source){
 replayPicker=false;$('guide-practice-picker').hidden=true;$('guide-topics').hidden=false;$('guide-content').hidden=false;$('guide-replay').hidden=false;$('guide-close').textContent='知道了';
 guideSource=source;guideFromSettings=!$('settings-panel').hidden;pause();
 $('overlay').hidden=true;$('settings-panel').hidden=true;$('guide-panel').hidden=false;
 chooseGuideTopic('actions');$('guide-close').focus();
}
function closeGuide(){
 if(replayPicker){replayPicker=false;$('guide-practice-picker').hidden=true;$('guide-topics').hidden=false;$('guide-content').hidden=false;$('guide-replay').hidden=false;$('guide-close').textContent='知道了';$('guide-replay').focus();return;}
 $('guide-panel').hidden=true;
 if(guideFromSettings){$('settings-panel').hidden=false;$(guideSource).focus();}
 else if(mode==='pause'||mode==='over'){$('overlay').hidden=false;(mode==='pause'?$('resume'):$('restart')).focus();}
 else $(guideSource).focus();
}
var replayKinds=['steer','jump','flip','wind','fish','delivery','gift','tow','otter','duck','turtle','flag'];
var replayLabels={steer:'左右换道',jump:'轻点跳跃',flip:'借浪空翻',wind:'风后矫正',fish:'靠岸钓鱼',delivery:'靠岸送鱼',gift:'跳起接礼',tow:'码头接绳',otter:'水獭划水',duck:'鸭鸭缓降',turtle:'龟龟护航',flag:'拾取小旗'};
function showReplayPicker(message){
 if(!renderer||lost)return;
 replayPicker=true;$('guide-content').hidden=true;$('guide-topics').hidden=true;$('guide-replay').hidden=true;$('guide-practice-picker').hidden=false;$('guide-close').textContent='返回指南';
 $('guide-practice-note').textContent=message||'选一项单独练。当前冒险会保留，练习里的金币和成绩不计入冒险。';
 replayKinds.forEach(function(id){var key=id==='delivery'||id==='gift'?'camp':id,known=key==='steer'?passedGuides.steer||stats.gestureGuide:key==='flag'?passedGuides.flag||stats.flagGuide:['otter','duck','turtle'].indexOf(key)!==-1?buddySeen(key):lessonKnown(key);$('replay-status-'+id).textContent=known?'已通过 · 再练一次':'开始练习';});
 $('guide-practice-picker').scrollTop=0;$('replay-wind').focus();
}
function replayWorld(id){
 var g=new River3D.Game(31029),distance={steer:10,jump:140,flip:220,wind:378,fish:448,delivery:523,gift:523,tow:578,otter:30,duck:190,turtle:310,flag:36}[id];
 g.practiceReplay=true;g.practiceWind=id==='wind';g.distance=distance;g.time=20;g.lastZone=g.zone().stage;g.skin=stats.skin||0;g.initFlagSkin(stats.flagSkin||0);g.initHonors(stats.badges,stats.honorFloor);g.entities=[];g.flags=[];g.bankSites=[];g.encounters=[];g.next=1e9;g.bankNext=1e6;g.flagNext=1e6;g.goldNext=1e9;g.supplyNext=1e9;g.gap=80;g.events=[];g.start();
 if(id==='jump')g.add('log',distance+40,0,{z:0});
 if(id==='flip')g.add('ramp',distance+40,0,{z:0,power:14.7});
 if(id==='flag')g.flags.push({id:0,x:distance+32,z:-3.7,skin:1,done:false});
 if(['otter','duck','turtle'].indexOf(id)!==-1){g.add('buddy',distance+30,0,{role:id,z:-3.7});if(id==='duck')g.add('ramp',distance+44,0,{z:-3.7,power:11.8});if(id==='turtle')g.add('log',distance+44,0,{z:-3.7});}
 if(['fish','delivery','gift','tow'].indexOf(id)!==-1){g.bankSites.push({id:0,x:distance+32,kind:id==='fish'?0:id==='tow'?2:1,side:id==='fish'?-1:1,status:'ready',progress:0,delivered:false});if(id==='delivery')g.fishCargo={site:'practice'};}
 return g;
}
function beginReplay(id){
 if(practiceReplay||!replayPicker||replayKinds.indexOf(id)===-1||!renderer||lost)return;
 var coachState={hidden:$('coach').hidden,className:$('coach').className,title:$('coach-title').textContent,text:$('coach-text').textContent,button:$('skip-coach').textContent,steps:$('gesture-steps').hidden,src:$('coach-image').getAttribute('src'),alt:$('coach-image').getAttribute('alt'),note:$('coach-visual-note').textContent,role:$('coach').getAttribute('role'),modal:$('coach').getAttribute('aria-modal')};
 var session={flagIntros:pendingFlagIntros.slice(),game:game,pace:lessonPace,welcomePending:welcomePending,mode:mode,coachGate:coachGate,coachJump:coachJump,coachFlip:coachFlip,coach:coachState,openingPaused:openingPaused,openingTime:renderer.openingTime,lastRampAt:lastRampAt,successAt:practiceSuccessAt,successText:practiceSuccessText,retryAt:practiceRetryAt,retryDelay:practiceRetryDelay,id:id,label:replayLabels[id],completedAt:null};
 clearSteering();resetFeedback();practiceReplay=session;game=replayWorld(id);mode='play';coachGate='';coachJump=false;coachFlip=false;openingPaused=false;renderer.openingTime=null;renderer.camera=null;renderer.endingTime=null;document.body.classList.remove('shore-ending');$('shore-ending').hidden=true;renderer.particles=[];renderer.coinPops=[];renderer.impact=0;renderer.impactPop=null;
 $('guide-panel').hidden=true;$('settings-panel').hidden=true;$('overlay').hidden=true;$('intro').hidden=true;$('opening').hidden=true;$('hud').hidden=false;$('controls').hidden=false;$('practice-exit').hidden=false;$('pause').disabled=false;setPausedUI(false);setResultUI(false);document.body.classList.remove('opening');document.body.classList.add('running');document.body.classList.add('practice-replay');document.body.classList.remove('teaching');
 var key=id==='delivery'||id==='gift'?'camp':id;
 if(key==='steer'){welcomeGuide();$('coach-text').textContent='向左滑一次，让木筏稳稳换到旁边。练完后返回指南，继续原来的冒险。';}
 else if(['otter','duck','turtle'].indexOf(key)!==-1){lessonPace.begin(key,game,game.distance+180);openBuddyBook(key,game.entities[0]);}
 else if(key==='flag'){lessonPace.begin('flag',game,game.distance+110);coachGate='flag';$('coach').className='flag-guide';$('coach').setAttribute('role','dialog');$('coach').setAttribute('aria-modal','true');$('coach-title').textContent='换到左边，捡起小旗';$('coach-text').textContent='向左滑一次，靠近小旗就能捡到。疾风旗会加速3秒；练习收获不会带入正式冒险。';$('skip-coach').textContent='开始拾旗练习';$('gesture-steps').hidden=true;$('coach').hidden=false;showLessonDiagram('flag');$('skip-coach').focus();}
 else coach(key);
 $('coach-pause-note').textContent='阅读已暂停 · 实操成功后继续';$('practice-exit').textContent='退出练习，返回指南';
 audio.unlock();last=0;renderDirty=true;updateUI();syncDialogBackdrop();
}
function endReplay(completed){
 var session=practiceReplay;if(!session)return;
 clearSteering();audio.stop();resetFeedback();practiceReplay=null;game=session.game;pendingFlagIntros=session.flagIntros||[];lessonPace=session.pace;welcomePending=session.welcomePending&&!passedGuides.steer&&!stats.gestureGuide;mode=session.mode;coachGate=session.coachGate;coachJump=session.coachJump;coachFlip=session.coachFlip;openingPaused=session.openingPaused;lastRampAt=session.lastRampAt;practiceSuccessAt=session.successAt;practiceSuccessText=session.successText;practiceRetryAt=session.retryAt;practiceRetryDelay=session.retryDelay;
 var c=session.coach;$('coach').hidden=c.hidden;$('coach').className=c.className;$('coach-title').textContent=c.title;$('coach-text').textContent=c.text;$('skip-coach').textContent=c.button;$('gesture-steps').hidden=c.steps;$('coach-image').setAttribute('src',c.src||'./assets/guide/move.svg');$('coach-image').setAttribute('alt',c.alt||'');$('coach-visual-note').textContent=c.note;$('coach').setAttribute('role',c.role||'region');$('coach').setAttribute('aria-modal',c.modal||'false');
 $('buddy-panel').hidden=true;$('practice-exit').hidden=true;$('intro').hidden=mode!=='intro';$('hud').hidden=mode==='intro';$('controls').hidden=mode==='intro';$('opening').hidden=!openingPaused;$('overlay').hidden=true;$('pause').disabled=mode==='intro';setPausedUI(mode==='pause');setResultUI(mode==='over');document.body.classList.remove('practice-replay');document.body.classList[mode==='intro'?'remove':'add']('running');document.body.classList[coachGate==='welcome'?'add':'remove']('teaching');document.body.classList[openingPaused?'add':'remove']('opening');
 renderer.openingTime=session.openingTime;renderer.camera=null;renderer.endingTime=null;document.body.classList.remove('shore-ending');$('shore-ending').hidden=true;renderer.particles=[];renderer.coinPops=[];renderer.impact=0;renderer.impactPop=null;last=0;renderDirty=true;updateUI();
 $('guide-panel').hidden=false;showReplayPicker(completed?'✓ '+session.label+'练习完成。可以再选一项，或返回指南继续冒险。':'已退出练习，原来的冒险进度已保留。');syncDialogBackdrop();
}
replayKinds.forEach(function(id){$('replay-'+id).addEventListener('click',function(){beginReplay(id);});});
$('guide-replay').addEventListener('click',function(){showReplayPicker();});
$('practice-exit').addEventListener('click',function(){endReplay(false);});
$('guide-open').addEventListener('click',function(){openGuide('guide-open');});
$('settings-guide-open').addEventListener('click',function(){openGuide('settings-guide-open');});
$('run-guide-open').addEventListener('click',function(){openGuide('run-guide-open');});
$('guide-close').addEventListener('click',closeGuide);
$('guide-panel').addEventListener('click',function(e){if(e.target===$('guide-panel'))closeGuide();});
function closeSettings(){if(teachingResetBusy)return;if(!$('reset-teaching-confirm').hidden){closeTeachingReset();return;}$('settings-panel').hidden=true;if(settingsReturn==='play'&&mode==='pause'){resume();return;}if(mode==='pause'||mode==='over'){$('overlay').hidden=false;(mode==='pause'?$('resume'):$('restart')).focus();}else $('settings-open').focus();}
$('settings-open').addEventListener('click',function(){if(flagIntro)return;settingsReturn=mode;pause();$('settings-close').textContent=settingsReturn==='play'?'完成并继续':'完成';$('overlay').hidden=true;$('settings-panel').hidden=false;$('settings-status').textContent='';$('settings-content').scrollTop=0;$('settings-title').focus();});$('settings-close').addEventListener('click',closeSettings);$('motion').addEventListener('click',function(){reduced=!reduced;if(reduced){renderer.endingTime=null;document.body.classList.remove('shore-ending');$('shore-ending').hidden=true;renderer.particles=[];renderer.coinPops=[];renderer.flagTransfer=null;renderer.flagGold=null;renderer.flagBlock=null;renderer.impact=0;renderer.impactPop=null;}$('motion').setAttribute('aria-pressed',String(reduced));savePreference('reduced',reduced);});$('haptics').addEventListener('click',function(){haptics=!haptics;$('haptics').setAttribute('aria-pressed',String(haptics));savePreference('haptics',haptics);});$('practice').addEventListener('click',function(){openGuide('practice');showReplayPicker();});
['otter','duck','turtle'].forEach(function(role){$('kick-'+role).addEventListener('click',function(){if(mode!=='play'||coachGate)return;audio.unlock();if(game.kickBuddy(role)){events();updateUI();renderDirty=true;}});});
function syncEndlessEntry(){
 var unlocked=stats.endlessUnlocked===true;
 $('rule-endless').hidden=!unlocked;$('endless-start').hidden=false;$('endless-start').disabled=!renderer||lost;
 $('endless-start').setAttribute('data-locked',unlocked?'false':'true');
 $('endless-start').setAttribute('aria-label',unlocked?'无尽模式，36m/s 弹射起步 · 快来挑战':'无尽模式，未解锁，查看解锁条件');
 $('endless-lock').hidden=unlocked;$('endless-start-note').hidden=!unlocked;
 $('endless-start').setAttribute('aria-haspopup',unlocked?'false':'dialog');$('endless-start').setAttribute('aria-expanded','false');$('endless-lock-panel').hidden=true;
}
function closeEndlessLock(){
 $('endless-lock-panel').hidden=true;$('endless-start').setAttribute('aria-expanded','false');syncDialogBackdrop();renderDirty=true;$('endless-start').focus();
}
$('endless-lock-close').addEventListener('click',closeEndlessLock);
$('endless-lock-panel').addEventListener('click',function(e){if(e.target===$('endless-lock-panel'))closeEndlessLock();});
$('endless-start').addEventListener('click',function(){
 if(mode!=='intro')return;
 if(!stats.endlessUnlocked){$('endless-lock-panel').hidden=false;$('endless-start').setAttribute('aria-expanded','true');syncDialogBackdrop();$('endless-lock-close').focus();return;}
 start(false,true,true);
});
$('endless-challenge').addEventListener('click',function(){if(mode==='over'&&!$('endless-challenge').disabled)start(false,true,true);});
$('start').addEventListener('click',start);$('restart').addEventListener('click',function(){requestDiscard('restart');});function goHome(){$('mvp').hidden=true;clearDefeat();document.body.classList.remove('has-current');document.body.classList.remove('action-cue');openingTime=null;openingPaused=false;renderer.openingTime=null;$('opening').hidden=true;document.body.classList.remove('opening');clearDiscard();setPausedUI(false);setResultUI(false);document.body.classList.remove('teaching');document.body.classList.remove('dark-water');mode='intro';resetFeedback();clearSteering();$('pause').disabled=true;game.release();game=new River3D.Game(31029);game.skin=stats.skin||0;setupHonors();pressed=false;coachGate='';$('coach').hidden=true;document.body.classList.remove('running');document.body.classList.remove('rescuing');$('hud').hidden=true;$('controls').hidden=true;$('overlay').hidden=true;$('intro').hidden=false;$('callout').className='';$('combo').textContent='';$('combo-meter').hidden=true;document.body.classList.remove('boosting');$('danger').hidden=true;skinLabel();updateHonors();syncEndlessEntry();$('record').textContent=stats.best?'最远 '+stats.best+' 米':'接上搭子，闯过四关';$('start').focus();}$('settle').addEventListener('click',function(){if(mode==='pause'&&!openingPaused&&!defeatPaused)requestDiscard('settle');});$('home').addEventListener('click',function(){requestDiscard('home');});$('resume').addEventListener('click',resume);$('pause').addEventListener('click',function(){if(mode==='pause')resume();else pause();});$('sound').addEventListener('click',function(){muted=!muted;audio.setEnabled(!muted);if(!muted)audio.unlock('flip');$('sound').setAttribute('aria-label','音效');$('sound').setAttribute('aria-pressed',String(!muted));savePreference('sound',!muted);});$('quality').addEventListener('click',function(){if(!renderer)return;manualLow=!manualLow;renderer.low=manualLow;renderer.resize();renderDirty=true;updateQualityLabel();slow=0;slowLow=0;savePreference('low',manualLow);});$('action').addEventListener('click',function(e){if(e.detail===0&&mode==='play'){inputDown();inputUp();}});$('reload').addEventListener('click',function(){location.reload();});
$('action').addEventListener('pointerdown',inputDown);
['pointerup','pointercancel','lostpointercapture'].forEach(function(name){$('action').addEventListener(name,inputUp);});
$('scene').addEventListener('pointerdown',function(e){if(mode!=='play'||drag||coachGate==='welcome')return;e.preventDefault();audio.unlock();drag={id:e.pointerId,x:e.clientX,y:e.clientY||0,switched:false,moved:false,drifted:false,holding:false,rescuing:false,elapsed:0};document.body.classList.add('river-touch');try{e.currentTarget.setPointerCapture(e.pointerId);}catch(err){}if(game.stumble&&!pressed){drag.rescuing=true;drag.holding=true;inputDown(null,e.pointerId);}});
function moveDrag(e){if(!drag||drag.id!==e.pointerId||mode!=='play'||!Number.isFinite(e.clientX))return;if(drag.rescuing){e.preventDefault();return;}var dx=e.clientX-drag.x,dy=(e.clientY||0)-drag.y;if(Math.abs(dx)>8||Math.abs(dy)>8)drag.drifted=true;if(Math.abs(dx)>=24||Math.abs(dy)>=24)drag.moved=true;if(drag.moved){document.body.classList.remove('river-touch');if(drag.holding){inputUp({pointerId:drag.id});drag.holding=false;}e.preventDefault();if(!drag.switched&&Math.abs(dx)>=24&&Math.abs(dx)>Math.abs(dy)*1.15){drag.switched=true;shiftRoute(dx>0?1:-1);}}}
$('scene').addEventListener('pointermove',moveDrag);
function endDrag(e,tap){if(!drag||drag.id!==e.pointerId)return;document.body.classList.remove('river-touch');if(tap)moveDrag(e);var moved=drag.moved,held=drag.holding;drag=null;if(held)inputUp(e);if(tap&&!moved&&!held&&!pressed&&mode==='play'){inputDown();inputUp();}}
$('scene').addEventListener('pointerup',function(e){endDrag(e,true);});
['pointercancel','lostpointercapture'].forEach(function(name){$('scene').addEventListener(name,function(e){endDrag(e,false);});});
['steer-left','steer-right'].forEach(function(id,index){var el=$(id),axis=index?1:-1;
 el.addEventListener('pointerdown',function(e){if(mode!=='play'||coachGate==='welcome')return;e.preventDefault();audio.unlock();if(Object.prototype.hasOwnProperty.call(steerPointers,e.pointerId))return;steerPointers[e.pointerId]=axis;shiftRoute(axis);el.classList.add('down');try{el.setPointerCapture(e.pointerId);}catch(err){}});
 function release(e){delete steerPointers[e.pointerId];if(!Object.keys(steerPointers).some(function(k){return steerPointers[k]===axis;}))el.classList.remove('down');}
 ['pointerup','pointercancel','lostpointercapture'].forEach(function(name){el.addEventListener(name,release);});
 el.addEventListener('click',function(e){if(e.detail===0&&mode==='play'&&coachGate!=='welcome'){audio.unlock();shiftRoute(axis);}});
});
window.addEventListener('pointerup',function(e){if(pointerId!==null&&e.pointerId===pointerId)inputUp(e);if(Object.prototype.hasOwnProperty.call(steerPointers,e.pointerId)){delete steerPointers[e.pointerId];}endDrag(e,true);});
window.addEventListener('keydown',function(e){if(flagIntro){if(e.code==='Escape'){e.preventDefault();closeFlagIntro();}else if(e.code==='Tab'){e.preventDefault();var targets=[$('flag-intro-content'),$('flag-intro-next')],ix=targets.indexOf(document.activeElement);targets[ix<0?0:(ix+1)%2].focus();}return;}if(!$('endless-lock-panel').hidden){if(e.code==='Escape'){e.preventDefault();closeEndlessLock();}else if(e.code==='Tab'){e.preventDefault();$('endless-lock-close').focus();}return;}if((mode==='opening'||mode==='defeat'||mode==='victory'&&mvpElapsed<River3D.ending.duration)&&e.code==='Tab'){e.preventDefault();$(mode==='victory'?'ending-skip':mode==='defeat'?'defeat-skip':'opening-skip').focus();return;}if(discardAction&&e.code==='Escape'){e.preventDefault();clearDiscard();$('resume').focus();return;}if(mode==='over'&&!$('result-details').hidden&&e.code==='Escape'){e.preventDefault();closeResultDetail();return;}var modal=!$('result-details').hidden?$('result-details'):!$('mvp').hidden?$('mvp'):!$('leaderboard-panel').hidden?$('leaderboard-panel'):!$('boats-panel').hidden?$('boats-panel'):!$('skin-panel').hidden?$('skin-panel'):!$('buddy-panel').hidden?$('buddy-panel'):!$('guide-panel').hidden?$('guide-panel'):!$('honors-panel').hidden?$('honors-panel'):!$('settings-panel').hidden?$('settings-panel'):!$('overlay').hidden?$('overlay'):!$('coach').hidden&&$('coach').getAttribute('aria-modal')==='true'?$('coach'):null;if(modal&&e.code==='Tab'){var buttons=Array.prototype.filter.call(modal.querySelectorAll('button, summary, [tabindex="0"]'),function(b){return !b.hidden&&!b.disabled&&b.getAttribute('tabindex')!=='-1'&&b.offsetParent!==null;});var ix=buttons.indexOf(document.activeElement);if(buttons.length&&e.shiftKey&&ix<=0){e.preventDefault();buttons[buttons.length-1].focus();}else if(buttons.length&&!e.shiftKey&&(ix<0||ix===buttons.length-1)){e.preventDefault();buttons[0].focus();}}if(!$('leaderboard-panel').hidden){if(e.code==='Escape'){e.preventDefault();leaderboard.close();}return;}if(!$('boats-panel').hidden){if(e.code==='Escape'){e.preventDefault();boatPicker.close();}return;}if(!$('skin-panel').hidden){if(e.code==='Escape'){e.preventDefault();followGift.close();}return;}if(!$('buddy-panel').hidden){if(e.code==='Escape'){e.preventDefault();closeBuddyBook();}return;}if(!$('guide-panel').hidden){if(e.code==='Escape'){e.preventDefault();closeGuide();}return;}if(!$('honors-panel').hidden){if(e.code==='Escape'){e.preventDefault();closeHonorBook();}return;}if(!$('settings-panel').hidden){if(e.code==='Escape'){e.preventDefault();closeSettings();}return;}if(!$('coach').hidden&&$('coach').getAttribute('aria-modal')==='true'&&mode==='play'&&e.code!=='Escape'&&e.code!=='KeyP')return;if(['ArrowLeft','ArrowRight','KeyA','KeyD'].indexOf(e.code)!==-1&&mode==='play'){e.preventDefault();if(!e.repeat&&!Object.prototype.hasOwnProperty.call(steerKeys,e.code)){steerKeys[e.code]=(e.code==='ArrowLeft'||e.code==='KeyA')?-1:1;audio.unlock();shiftRoute(steerKeys[e.code]);}}if(e.code==='Space'||e.code==='ArrowUp'){var target=e.target||document.activeElement,menuTarget=target&&target!==$('action')&&target!==$('scene')&&target!==document.body&&target!==document.documentElement;if(mode==='play'&&!menuTarget){e.preventDefault();if(!e.repeat)inputDown();}}if(e.code==='Escape'||e.code==='KeyP'){e.preventDefault();if(!e.repeat){if(mode==='pause')resume();else pause();}}});window.addEventListener('keyup',function(e){if(Object.prototype.hasOwnProperty.call(steerKeys,e.code)){delete steerKeys[e.code];}if((e.code==='Space'||e.code==='ArrowUp')&&pointerId==='keyboard')inputUp();});window.addEventListener('blur',function(){inputUp();pause();});document.addEventListener('visibilitychange',function(){if(document.hidden){pause();cancelAnimationFrame(raf);audio.suspend();}else if(!lost){last=0;raf=requestAnimationFrame(frame);}});window.addEventListener('resize',function(){if(renderer&&!lost)renderer.resize();renderDirty=true;RiverPlatform.layout();});$('scene').addEventListener('webglcontextlost',function(e){e.preventDefault();pause();fallback('3D 画面暂时中断，进度已暂停。恢复后可继续漂流。');});$('scene').addEventListener('webglcontextrestored',function(){try{renderer.init();renderer.resize();renderDirty=true;lost=false;$('fallback').hidden=true;$('start').disabled=false;last=0;raf=requestAnimationFrame(frame);}catch(e){fallback('3D 画面恢复失败，请重新加载。');}});
RiverPlatform.init().then(function(data){rememberGuides(data);stats=data;setupHonors();$('honors-open').disabled=false;$('start').disabled=!renderer||lost;$('skin').disabled=false;$('practice').disabled=!renderer||lost;$('reset-teaching').disabled=!renderer||lost;var pref=data.settings||{};muted=pref.sound===false;audio.setEnabled(!muted);haptics=pref.haptics!==false;if(typeof pref.reduced==='boolean')reduced=pref.reduced;manualLow=pref.low===true;if(renderer){renderer.low=manualLow;renderer.resize();renderDirty=true;}$('sound').setAttribute('aria-pressed',String(!muted));$('motion').setAttribute('aria-pressed',String(reduced));$('haptics').setAttribute('aria-pressed',String(haptics));updateQualityLabel();$('sound').setAttribute('aria-label','音效');skinLabel();updateHonors();syncEndlessEntry();$('record').textContent=data.best?'最远 '+data.best+' 米':'接上搭子，闯过四关';});if(renderer&&!lost)raf=requestAnimationFrame(frame);
window.River3DApp={get game(){return game;},get renderer(){return renderer;},get mode(){return mode;},get audio(){return audio;},get lessonPace(){return lessonPace;},get followGift(){return followGift;}};
})();
