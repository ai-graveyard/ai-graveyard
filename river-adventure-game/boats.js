(function(root){
'use strict';
var names=['原木出发','珊瑚假日','薄荷河湾','星夜船长','缤纷乐园'],costs=[0,40,100,220];
var previews=['./assets/game/boat-previews/boat-0.png','./assets/game/boat-previews/boat-1.png','./assets/game/boat-previews/boat-2.png','./assets/game/boat-previews/boat-3.png','./assets/game/boat-previews/boat-4.png'];
function progress(total,before){total=Math.max(0,Math.floor(Number(total)||0));before=Math.max(0,Math.floor(Number(before)||0));var next=null,unlocked=[];for(var id=1;id<costs.length;id++){var boat={id:id,name:names[id],cost:costs[id]};if(!next&&total<costs[id])next=boat;if(before<costs[id]&&total>=costs[id])unlocked.push(boat);}return {total:total,next:next,remaining:next?next.cost-total:0,unlocked:unlocked};}
function appearance(skin){skin=Math.max(0,Math.min(4,Math.floor(Number(skin)||0)));return {name:names[skin],preview:previews[skin]};}
root.RiverBoats={progress:progress,appearance:appearance,create:function(options){
 var doc=root.document,byId=function(id){return doc.getElementById(id);},data={},loaded=false,busy=false,unsaved=false,sourcePage='settings';
 var panel=byId('boats-panel'),entry=byId('boats-open');
 function unlocked(id){return id===4?data.followSkinOwned===true:(Number(data.totalCoins)||0)>=costs[id];}
 function render(){
  entry.disabled=!loaded;var skin=Math.max(0,Math.min(4,Math.floor(Number(data.skin)||0)));byId('boats-preview').setAttribute('src',previews[skin]);byId('boats-current').textContent=names[skin];entry.setAttribute('aria-label','当前船只：'+names[skin]+'，更换船只');
  panel.setAttribute('aria-busy',String(busy));
  names.forEach(function(name,id){
   var current=(data.skin||0)===id,available=unlocked(id),button=byId('boat-'+id);
   button.disabled=busy||!available||(current&&!unsaved);button.setAttribute('aria-pressed',String(current));
   byId('boat-state-'+id).textContent=busy&&current?'保存中…':current?(unsaved?'重试保存':'已装备'):available?'选择':'未解锁';
   byId('boat-note-'+id).textContent=id===4?(available?'关注福利 · 已领取':'关注作者后在首页领取'):id===0?'初始船只':available?'累计 '+costs[id]+' 金币 · 已解锁':'累计 '+(Number(data.totalCoins)||0)+' / '+costs[id]+' 金币解锁';
  });
 }
 function sync(value){data=value||{};loaded=true;render();}
 function open(source){
  if(!loaded||source!=='result'&&source!=='home'&&byId('settings-panel').hidden)return;
  sourcePage=source==='result'?'result':source==='home'?'home':'settings';byId('boats-close').textContent=sourcePage==='home'?'返回首页':sourcePage==='result'?'返回结算':'返回设置';
  if(sourcePage==='home')byId('skin').setAttribute('aria-expanded','true');
  byId('settings-panel').hidden=true;panel.hidden=false;
  byId('boats-status').textContent=unsaved?'本次已换上，暂未保存；点击当前船只重试保存。':'';
  render();byId('boats-list').scrollTop=0;byId('boats-close').focus();
 }
 function close(){panel.hidden=true;if(sourcePage==='home'){byId('skin').setAttribute('aria-expanded','false');byId('skin').focus();return;}if(sourcePage==='result'&&options.returned){options.returned();return;}byId('settings-panel').hidden=false;entry.focus();}
 async function select(id){
  if(busy||!unlocked(id)||((data.skin||0)===id&&!unsaved))return;
  busy=true;byId('boats-status').textContent='正在换上'+names[id]+'…';render();
  try{
   var result=await options.platform.selectSkin(id);
   if(result.ok){data=result.data;unsaved=!result.saved;if(options.changed)options.changed(data);byId('boats-status').textContent=result.saved?'已换上'+names[id]:'本次已换上，暂未保存；点击当前船只重试保存。';}
   else byId('boats-status').textContent='这艘船尚未解锁。';
  }catch(e){byId('boats-status').textContent='暂时无法更换，请重试。';}
  finally{busy=false;render();if(!panel.hidden&&byId('boat-'+id).disabled)byId('boats-close').focus();}
 }
 names.forEach(function(name,id){byId('boat-'+id).addEventListener('click',function(){select(id);});});
 entry.addEventListener('click',open);byId('boats-close').addEventListener('click',close);
 panel.addEventListener('click',function(e){if(e.target===panel)close();});
 return {sync:sync,open:open,close:close};
}};
})(window);
