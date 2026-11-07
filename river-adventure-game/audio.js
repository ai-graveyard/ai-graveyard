(function(root){
'use strict';
// Short, local synthesis: no downloads, loops or timers. Unlock only from a gesture.
function Audio(){this.context=null;this.master=null;this.voices=[];this.enabled=true;this.lastCoin=-1;this.lastCoinChain=0;this.generation=0;}
Audio.prototype.unlock=function(cue){
 if(!this.enabled)return false;
 try{var AC=root.AudioContext||root.webkitAudioContext;if(!AC)return false;
  if(!this.context){this.context=new AC();this.master=this.context.createGain();this.master.gain.value=.65;this.master.connect(this.context.destination);}
  if(this.context.state!=='running'){var self=this,stamp=this.generation,p=this.context.resume();if(p&&p.then)p.then(function(){if(cue&&stamp===self.generation)self.play(cue);}).catch(function(){});}else if(cue)this.play(cue);return true;
 }catch(e){return false;}
};
Audio.prototype.stop=function(){this.generation++;var all=this.voices.slice();this.voices=[];all.forEach(function(v){try{v.source.stop();v.source.disconnect();v.gain.disconnect();}catch(e){}});this.lastCoin=-1;this.lastCoinChain=0;};
Audio.prototype.setEnabled=function(on){this.enabled=!!on;if(!on)this.stop();};
Audio.prototype.suspend=function(){this.stop();if(this.context&&this.context.state==='running'){try{var p=this.context.suspend();if(p&&p.catch)p.catch(function(){});}catch(e){}}};
Audio.prototype.tone=function(hz,end,duration,volume,shape,delay){
 var c=this.context;if(!c)return;
 while(this.voices.length>=24){var old=this.voices.shift();try{old.source.stop();old.source.disconnect();old.gain.disconnect();}catch(e){}}
 var source=c.createOscillator(),gain=c.createGain(),t=c.currentTime+(delay||0),voice={source:source,gain:gain},self=this;
 source.type=shape||'sine';source.frequency.setValueAtTime(hz,t);source.frequency.exponentialRampToValueAtTime(Math.max(25,end),t+duration);
 gain.gain.setValueAtTime(.0001,t);gain.gain.exponentialRampToValueAtTime(volume,t+.004);gain.gain.exponentialRampToValueAtTime(.0001,t+duration);
 source.connect(gain);gain.connect(this.master);this.voices.push(voice);source.onended=function(){source.disconnect();gain.disconnect();var i=self.voices.indexOf(voice);if(i>=0)self.voices.splice(i,1);};source.start(t);source.stop(t+duration+.02);
};
Audio.prototype.play=function(type,chain){
 var c=this.context;if(!this.enabled||!c||c.state!=='running')return false;
 try{
  if(type==='coin'){
   // A soft contact, a clear rising note and an inharmonic partial suggest struck metal.
   var step=((Math.max(1,chain||1)-1)%5),pitch=[1047,1175,1319,1568,2093][step];
   if(c.currentTime-this.lastCoin<.035){if(step===4&&chain!==this.lastCoinChain){this.lastCoinChain=chain;this.tone(3136,3136,.24,.03,'sine');return true;}return false;}this.lastCoin=c.currentTime;this.lastCoinChain=chain;
   this.tone(420+step*24,220,.055,.085,'sine');this.tone(pitch,pitch*.997,.2,.055,'triangle');this.tone(pitch*2.76,pitch*2.75,.11,.022,'sine',.008);
   if(step===4)this.tone(3136,3136,.24,.03,'sine',.055);
  }else if(type==='jump'){this.tone(190,540,.14,.075,'sine');}
  else if(type==='land'){this.tone(190,65,.16,.12,'sine');this.tone(480,180,.075,.035,'triangle');}
  else if(type==='rock-hit'){this.tone(260,65,.11,.15,'triangle');this.tone(780,240,.055,.045,'sine');this.tone(85,36,.18,.09,'sine');}
  else if(type==='log-hit'){this.tone(180,70,.085,.15,'triangle');this.tone(370,180,.075,.06,'triangle',.012);this.tone(95,40,.16,.085,'sine');}
  else if(type==='crash'){this.tone(140,38,.25,.14,'triangle');this.tone(75,30,.22,.1,'sine');}
  else if(type==='grip'){this.tone(100,65,.28,.07,'triangle');this.tone(170,110,.22,.05,'triangle',.13);}
  else if(type==='boat-break'){this.tone(190,40,.19,.14,'triangle');this.tone(430,70,.1,.09,'triangle',.06);this.tone(250,42,.18,.08,'triangle',.15);}
  else if(type==='help'){this.tone(520,820,.22,.06,'sine');this.tone(720,460,.3,.055,'sine',.25);}
  else if(type==='danger'){this.tone(740,660,.09,.055,'sine');this.tone(740,660,.09,.055,'sine',.14);}
  else if(type==='croc-growl'){this.tone(68,38,.62,.085,'sine');this.tone(126,72,.5,.035,'triangle',.035);this.tone(47,34,.38,.04,'sine',.22);}
  else if(type==='croc-close'){this.tone(105,61,.32,.075,'triangle');this.tone(64,42,.38,.065,'sine',.12);}
  else if(type==='croc-snap'){this.tone(280,48,.085,.14,'triangle');this.tone(88,35,.22,.095,'sine');this.tone(730,115,.05,.035,'triangle',.012);}
  else if(type==='escape'){this.tone(210,40,.07,.12,'triangle');this.tone(1150,380,.045,.025,'sine');this.tone(140,680,.28,.09,'sine',.02);this.tone(784,1047,.24,.04,'triangle',.1);}
  else if(type==='paddle'){this.tone(260,100,.10,.09,'sine');}
  else if(type==='steer'){this.tone(330,250,.055,.025,'sine');}
  else if(type==='boost'){this.tone(140,620,.24,.1,'sine');this.tone(784,784,.24,.05,'triangle',.06);this.tone(1175,1175,.28,.04,'sine',.13);}
  else{var notes=type==='join'?[523,659,880]:type==='flip'?[659,988,1318]:[392,523,784];for(var i=0;i<notes.length;i++)this.tone(notes[i],notes[i],.18,.05,'sine',i*.065);}
  return true;
 }catch(e){this.stop();return false;}
};
root.RiverAudio=Audio;
})(window);
