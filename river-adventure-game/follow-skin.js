(function(root){
'use strict';
root.RiverFollowSkin={create:function(options){
 var doc=root.document,byId=function(id){return doc.getElementById(id);},data={},loaded=false,busy=false,state=null,serial=0,note='',unsaved=false;
 var panel=byId('skin-panel'),entry=byId('skin'),claim=byId('skin-claim'),close=byId('skin-close');
 function render(){
  var owned=data.followSkinOwned===true,equipped=owned&&data.skin===4;
  var boat=root.RiverBoats.appearance(data.skin),switchBoat=owned&&!unsaved;
  entry.disabled=!loaded;byId('skin-entry-tag').textContent=unsaved?'关注福利 · 待保存':owned?'当前：'+boat.name:'关注作者即送';
  byId('skin-entry-name').textContent=unsaved?'重试保存':owned?'切换船只':'免费领气垫船';
  byId('skin-entry-action').textContent=unsaved?'保存':owned?'切换':'领取';
  byId('skin-entry-preview').setAttribute('src',owned?boat.preview:'./assets/brand/playground-hovercraft-v1.webp');
  entry.setAttribute('aria-label',unsaved?'关注福利尚未保存，重试保存':owned?'当前船只：'+boat.name+'，切换船只':'关注领皮肤：缤纷乐园');
  entry.setAttribute('aria-controls',switchBoat?'boats-panel':'skin-panel');
  entry.setAttribute('aria-expanded',String(switchBoat?!byId('boats-panel').hidden:!panel.hidden));entry.setAttribute('data-owned',String(owned));
  claim.disabled=busy||(!owned&&state&&!state.available)||(equipped&&!unsaved);
  claim.textContent=busy?'正在确认…':unsaved?'重试保存':equipped?'已装备':owned?'装备这艘':state&&!state.available?'请在小红书内领取':state&&state.status>0?'领取并装备':state&&state.status<0?'重新确认':'关注作者，免费领';
  close.textContent=equipped&&!unsaved?'带它开漂':'返回';
  panel.setAttribute('aria-busy',String(busy));
  byId('skin-status').textContent=note;
 }
 function sync(value){data=value||{};loaded=true;render();}
 function hide(){serial++;panel.hidden=true;render();entry.focus();}
 async function open(){
  if(!loaded||(options.canOpen&&!options.canOpen()))return;
  if(data.followSkinOwned&&!unsaved&&options.boats){options.boats();return;}
  panel.hidden=false;note='';state=null;render();close.focus();
  if(busy||data.followSkinOwned)return;
  var token=++serial;busy=true;render();
  try{var queried=await options.platform.getFollowSkinState();if(token!==serial)return;state=queried;
   note=!state.available?'请在小红书 9.51+ 中领取':state.status<0?'暂时无法确认关注状态，请重试':state.status>0?'你已关注，可直接领取':'';
  }catch(e){state={available:true,status:-1};if(token===serial)note='暂时无法确认关注状态，请重试';}
  finally{busy=false;render();}
 }
 async function receive(){
  if(busy||claim.disabled)return;busy=true;note='';render();
  try{var result=await options.platform.claimFollowSkin();
   if(result.ok){data=result.data;unsaved=!result.saved;note=result.saved?'已领取并装备':'本次已换上，保存失败，请重试';if(options.changed)options.changed(data);}
   else{var messages={unsupported:'请在小红书 9.51+ 中领取',cancelled:'已取消，想领取时再来',limited:'今日关注确认次数已达上限，请明天再试',pending:'关注确认仍在进行，请稍候',query_failed:'暂时无法确认关注状态，请重试',unfollowed:'尚未确认关注成功，请重试',failed:'关注暂未成功，请稍后重试'};note=messages[result.reason]||messages.failed;}
  }catch(e){note='暂时未能领取，请稍后重试';}
  finally{busy=false;render();}
 }
 entry.addEventListener('click',open);close.addEventListener('click',function(){var launch=data.followSkinOwned&&data.skin===4&&!unsaved&&!busy;hide();if(launch&&options.start)options.start();});claim.addEventListener('click',receive);
 panel.addEventListener('click',function(e){if(e.target===panel)hide();});
 return {sync:sync,open:open,close:hide,snapshot:function(){return {open:!panel.hidden,busy:busy,owned:data.followSkinOwned===true,equipped:data.skin===4,unsaved:unsaved};}};
}};
})(window);
