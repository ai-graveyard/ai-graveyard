(function(root){
'use strict';
var R=root.River3D;
function gateNoise(n){var k=Math.sin(n*127.1+31.7)*43758.5453;return k-Math.floor(k);}
function ease(a,b,t){var u=R.clamp((t-a)/(b-a),0,1);return u*u*(3-2*u);}
// All positions are local to the final landing. The game model stays frozen.
var ROAD=.72,BIKE_LIFT=ROAD+.135,BIKE_Z=11.15;
function pose(t){
 t=Math.max(0,t);var dock=ease(0,2.2,t),step=ease(2.25,2.75,t),walk=ease(2.75,3.05,t),jump=R.clamp((t-3.05)/.6,0,1),ride=Math.max(0,t-3.85),look=ease(4.15,4.5,t)*(1-ease(5.05,5.45,t));
 var boatX=18*(1-Math.pow(1-Math.min(1,t/2.2),4.4)),x=boatX+.747+(20.3-18.747)*step+.8*walk,feet=.55+.075*step,z=4.785+(7.1-4.785)*step+2*walk;
 if(t>=3.05){x=21.1+.09*jump;z=9.1+(BIKE_Z-9.1)*jump;feet=.625+(BIKE_LIFT+1.34-.625)*jump+Math.sin(jump*Math.PI)*.8;}
 else if(t>=2.25&&t<2.75)feet+=Math.sin(step*Math.PI)*.65;
 var mount=ease(.68,1,jump),stand=ease(2.05,2.25,t)*(1-mount),land=t>=3.65&&t<3.95?Math.sin((t-3.65)/.3*Math.PI):0,climb=ease(5,6.3,t),stride=ease(6.3,6.9,t)+ease(7.1,7.7,t)+ease(7.9,8.5,t);
 var jaw=t>=4.8?(.5-.5*Math.cos((t-4.8)*Math.PI*2/.64)):0;
 return {time:t,boatX:boatX,boatZ:4.2*dock,jump:jump,captainX:x,captainZ:z,captainY:feet,stand:stand,crouch:0,walk:t>=2.75&&t<3.05?Math.sin(walk*Math.PI*2):0,mount:mount,landing:land,look:look,wave:ease(4.4,4.6,t)*(1-ease(4.85,5.1,t)),snap:jaw,bikeX:21.5+ride*ride*3.8,riding:t>=3.65,departed:t>=10.6,climb:climb,stride:stride,crocX:23.1+6.9*climb+3.1*stride,crocZ:.3+(BIKE_Z-.3)*climb,crocY:(ROAD-.12)*climb,crocYaw:ease(4.8,5.45,t)*Math.PI*.42*(1-ease(5.65,6.3,t)),phase:t<2.2?'靠岸':t<2.75?'跳上岸':t<3.65?'跃上摩托':t<4.8?'骑车离开':t<6.3?'鳄鱼追上岸':t<8.5?'鳄鱼追车':t<10.6?'张嘴挑衅':'冒险完成'};
}
function caption(t){return t<2.2?'前面就是岸边':t<3.65?'上岸，换车！':t<4.8?'先走一步！':t<6.3?'鳄鱼：别跑！':t<8.5?'还要追？再加把劲！':t<10.6?'咔哒！咔哒！还不服气呢':'冒险完成';}
R.ending={duration:12,fadeAt:10.6,departAt:3.85,roadHeight:ROAD,wheelClearance:.025,pose:pose,caption:caption};
if(!root.RiverRenderer)return;
var P=root.RiverRenderer.prototype;
P.endingMotorcycle=function(x,z,t,rider){
 var worldX=x,worldZ=z,oldGroup=this.group,q=pose(t),base=.63,spin=Math.pow(Math.max(0,t-3.85),2)*5.2;
 this.group={x:x,y:BIKE_LIFT,z:z,scale:1,cos:1,sin:0};x=0;z=0;
 // Two rubber tyres, silver hubs and rotating spokes, aligned with the road.
 for(var side=-1;side<=1;side+=2){var wx=x+side*1.13;this.loop(wx,base,z,.57,.57,.17,'#263b43',2);this.loop(wx,base,z,.36,.36,.055,'#c3cbd0',2);this.round(wx,base,z,.19,.19,.38,'#667e87');for(var k=0;k<4;k++){var a=spin+k*Math.PI/2;this.tube(wx,base,z+.19,wx+Math.cos(a)*.34,base+Math.sin(a)*.34,z+.19,.021,.021,'#bdcacc');}}
 this.tube(x-1.13,base,z,x+.12,1.27,z,.085,.085,'#e5b762');this.tube(x+.12,1.27,z,x+1.13,base,z,.08,.08,'#d1d8cf');this.tube(x-.95,base,z,x+.7,.82,z,.08,.08,'#788f91');
 this.round(x+.18,1.3,z,1.24,.62,.68,'#d87545');this.round(x-.64,1.42,z,.96,.22,.67,'#31494d');this.round(x-.15,.76,z,.67,.54,.64,'#93a5a5');
 this.tube(x+.84,.72,z,x+.64,1.68,z,.065,.065,'#d2ded8');this.tube(x+.64,1.68,z-.49,x+.64,1.68,z+.49,.055,.055,'#334d51');this.round(x+.92,1.34,z,.25,.37,.39,'#ffe6a2');this.round(x-1.2,1.1,z,.13,.2,.3,'#ec8264');
 this.tube(x-.9,.53,z+.46,x+.08,.6,z+.46,.12,.15,'#b0bcbb');this.round(x-.99,.54,z+.47,.1,.17,.17,'#354b4f');
 for(var peg=-1;peg<=1;peg+=2)this.tube(.05,.74,peg*.3,.05,.74,peg*.65,.055,.055,'#a8b6b7');
 this.group=oldGroup;
 if(rider){this.endingPerson=true;this.ridingCaptain=1;this.endingLook=q.look;this.endingWave=q.wave;this.endingGestureTime=t;this.group={x:worldX-.31,y:BIKE_LIFT+1.34-q.landing*.16,z:worldZ,scale:.95,cos:1,sin:0};this.person(0,0,0,'captain',0);this.group=oldGroup;this.endingPerson=false;this.ridingCaptain=0;this.endingLook=0;this.endingWave=0;}
};
// A small unlit sky layer is painted before the depth-tested scenery using the same buffer.
P.sunnySky=function(g,eye,forward,right,up){
 if(g.stageIndex!==3||g.practiceReplay)return;
 var renderer=this,dist=238,scale=dist/1.92,skyLayer=0;
 function ellipse(nx,ny,rx,ry,color){var depth=dist-skyLayer++*.3,n=renderer.low?12:20,c=parseInt(color.slice(1),16),red=((c>>16)&255)/255,green=((c>>8)&255)/255,blue=(c&255)/255;
  function emit(dx,dy){var px=nx*scale*renderer.aspect+dx*scale,py=ny*scale+dy*scale,b=renderer.buffer,k=renderer.count;b[k]=eye[0]+forward[0]*depth+right[0]*px+up[0]*py;b[k+1]=eye[1]+forward[1]*depth+right[1]*px+up[1]*py;b[k+2]=eye[2]+forward[2]*depth+right[2]*px+up[2]*py;b[k+3]=red;b[k+4]=green;b[k+5]=blue;b[k+6]=0;b[k+7]=0;b[k+8]=0;b[k+9]=-2;renderer.count+=10;}
  for(var k=0;k<n;k++){var a=k*Math.PI*2/n,b=(k+1)*Math.PI*2/n;emit(0,0);emit(Math.cos(a)*rx,Math.sin(a)*ry);emit(Math.cos(b)*rx,Math.sin(b)*ry);}
 }
 // Keep the restored sun size, raised above the distant ridge.
 ellipse(.15,.69,.125,.125,'#d9edf0');ellipse(.15,.69,.092,.092,'#fff0c5');ellipse(.15,.69,.073,.073,'#ffe3a0');
 for(var side=-1;side<=1;side+=2){var cx=side<0?-.68:.08,cy=side<0?.81:.87;ellipse(cx,cy,.105,.017,'#e4eef3');ellipse(cx-.07,cy+.012,.05,.026,'#f3f7f7');ellipse(cx+.01,cy+.025,.055,.037,'#f3f7f7');ellipse(cx+.075,cy+.005,.045,.024,'#f3f7f7');}
 this.skyVertexCount=this.count/this.stride;
};
// Low-detail distant hills break up the clear horizon without a fog veil.
P.clearHorizon=function(g){
 if(g.stageIndex!==3||g.practiceReplay)return;
 for(var i=-5;i<=5;i++){var z=i*24;if(Math.abs(z)<55)continue;this.cone(247+(i%3)*7,-.2,z,29,12+gateNoise(i+71)*9,i%2?'#9baa91':'#8fa38e',6);}
};
P.finaleCelebration=function(x,age){
 if(age<0||age>2.7||this.reducedMotion)return;
 var colors=['#f28c87','#f5bd48','#67b9d8','#83c29b','#fff3c4'],bursts=this.low?2:4,sparks=this.low?10:18;
 for(var b=0;b<bursts;b++){var start=.035+b*.19,u=(age-start)/1.25;if(u<0||u>1)continue;var side=b%2?1:-1,cy=b<2?9.4:11.2,cz=side*(b<2?7.1:3.6),radius=(b<2?2.8:2.2)*(1-Math.pow(1-u,2)),drop=u*u*1.8;
  for(var j=0;j<sparks;j++){var a=j*Math.PI*2/sparks+b*.7,yy=cy+Math.sin(a)*radius-drop,zz=cz+Math.cos(a)*radius,size=(.17+.08*(j%2))*(1-u*.5);this.coinSpark(x-.8+u*1.5,yy,zz,size,colors[(j+b)%colors.length]);}
  if(u<.35)this.coinSpark(x-1,cy,cz,.38*(1-u/.35),'#fff4cf');
 }
 var count=this.low?22:46;
 for(var i=0;i<count;i++){var agePiece=age-(i%5)*.055;if(agePiece<0)continue;var yy=9+gateNoise(i)*3.6-2.5*agePiece-1.3*agePiece*agePiece;if(yy<.15)continue;var zz=(gateNoise(i+91)-.5)*13+Math.sin(agePiece*2+i)*.4,xx=x+2+gateNoise(i+45)*4+agePiece*1.4,flutter=Math.cos(agePiece*8+i),w=.13+gateNoise(i+17)*.10,h=.13+gateNoise(i+73)*.13;this.quad([xx,yy-h,zz-w],[xx+flutter*.12,yy+h,zz-w],[xx+flutter*.12,yy+h,zz+w],[xx,yy-h,zz+w],colors[i%colors.length]);}
};
// The final gate uses the existing scene buffer: no extra textures or render passes.
P.finaleStar=function(x,y,z,r,color){
 for(var i=0;i<10;i++){var a=Math.PI/2+i*Math.PI/5,b=a+Math.PI/5,ra=i%2?r*.46:r,rb=i%2?r:r*.46;this.tri([x,y,z],[x,y+Math.sin(a)*ra,z+Math.cos(a)*ra],[x,y+Math.sin(b)*rb,z+Math.cos(b)*rb],color,i%2?.93:1.08);}
};
P.finaleGate=function(x,g,t){
 var previousActor=this.actor;this.actor={x:0,y:0,z:0,cos:1,sin:0,squash:.62};
 var gold='#f3cb75',light='#ffebba',ivory='#fff3d5',teal='#88b7a3',dark='#964b49',coral='#df8269',stone='#e9cba0',quiet=this.reducedMotion,clock=quiet?0:t,segments=this.low?12:20;
 // Broad, stepped towers keep the river itself open for every steering lane.
 for(var side=-1;side<=1;side+=2){var z=side*10.2;
  this.box(x,.95,z,5.1,1.9,3.9,stone);this.box(x,1.88,z,5.3,.24,4.1,gold);
  this.box(x,6.6,z,3.3,9.2,2.55,coral);this.box(x+1,6.6,z,.5,9.2,2.7,'#edab86');
  for(var rib=-1;rib<=1;rib++)this.box(x-1.7,6.6,z+rib*.87,.16,8.8,.13,gold);
  [3.1,6.3,10.7].forEach(function(h){this.box(x,h,z,3.7,.3,2.95,gold);},this);
  this.box(x,11.4,z,4.5,.9,3.9,stone);this.box(x,11.92,z,4.7,.18,4.1,light);
  this.cone(x,12.05,z,1.65,4.3,ivory,6);this.cone(x,15.25,z,.75,2.1,gold,6);this.tube(x,16.9,z,x,18.1,z,.065,.025,light);
  this.finaleStar(x-.13,18.1,z,.72,light);
  // Long heraldic flags on the outside of both towers.
  var bz=side*12.8,flutter=quiet?0:Math.sin(clock*2+side)*.18;
  this.tube(x-1.9,12.45,z,x-1.9,12.45,bz+side*.8,.06,.06,gold);
  this.quad([x-1.9,12.35,bz-side*.8],[x-1.9,12.35,bz+side*.8],[x-1.9+flutter,6.5,bz+side*.8],[x-1.9+flutter,6.5,bz-side*.8],side<0?coral:teal);
  this.tri([x-1.9+flutter,6.5,bz-side*.8],[x-1.9+flutter,6.5,bz+side*.8],[x-1.9+flutter,5.7,bz],gold);
  this.finaleStar(x-1.94,10,bz,.57,ivory);
 }
 // Three nested vaults read as a deep triumphal arch when the camera sails under it.
 for(var layer=0;layer<3;layer++){
  var ax=x+(layer-1)*1.65,width=10.5-layer*.7,height=8.6-layer*.65;
  for(var k=0;k<segments;k++){var a=k*Math.PI/segments,b=(k+1)*Math.PI/segments;this.tube(ax,8.3+Math.sin(a)*height,Math.cos(a)*width,ax,8.3+Math.sin(b)*height,Math.cos(b)*width,layer===0?.31:.23,layer===0?.31:.23,layer===0?gold:layer===1?coral:ivory,null,layer===0?5:1);}
  if(layer===0)for(var lamp=1;lamp<segments;lamp+=2){var a=lamp*Math.PI/segments;this.round(ax-.36,8.3+Math.sin(a)*height,Math.cos(a)*width,.2,.26,.26,ivory,3);}
 }
 // A large crest, laurel leaves and a hanging MVP plaque crown the centre.
 this.round(x-2,16.7,0,.55,3.5,3.5,dark);this.loop(x-2.34,16.7,0,1.8,1.8,.13,gold,0);
 this.finaleStar(x-2.48,16.7,0,1.2,light);
 for(var side=-1;side<=1;side+=2)for(var leaf=0;leaf<5;leaf++){var a=leaf*.28;this.round(x-2.2,15.1+leaf*.48,side*(1.5+Math.sin(a)*.9),.22,.38,.8,leaf%2?light:gold);}
 this.tube(x-1.9,15.3,-2.7,x-1.9,13.8,-2.7,.035,.035,gold);this.tube(x-1.9,15.3,2.7,x-1.9,13.8,2.7,.035,.035,gold);
 this.box(x-1.9,12.75,0,.5,2.0,6.9,gold);this.box(x-2.19,12.75,0,.14,1.64,6.5,dark);
 var letters=[[[0,0],[0,1.15],[.5,.52],[1,1.15],[1,0]],[[0,1.15],[.5,0],[1,1.15]],[[0,0],[0,1.15],[.85,1.15],[1,.85],[.85,.62],[0,.62]]];
 for(var l=0;l<3;l++)for(var v=1;v<letters[l].length;v++){var a=letters[l][v-1],b=letters[l][v],z=-2.45+l*1.75;this.tube(x-2.3,12.18+a[1],z+a[0],x-2.3,12.18+b[1],z+b[0],.075,.075,ivory);}
 // Jewel pennants sit high above the player's view and flutter gently.
 for(var pennant=0;pennant<6;pennant++){var z=(pennant<3?-1:1)*(4.2+(pennant%3)*1.55),y=8.3+Math.sqrt(Math.max(0,1-z*z/(10.5*10.5)))*8.6,flutter=quiet?0:Math.sin(clock*2+pennant)*.12;
  this.tube(x-1.68,y,z,x-1.68,y-1.8,z,.025,.025,gold);this.tri([x-1.72,y-1.5,z-.4],[x-1.72,y-1.5,z+.4],[x-1.72+flutter,y-3.1,z],pennant%3===0?teal:pennant%3===1?coral:light);
 }
 this.box(x,.048,0,2.4,.03,13.3,gold);for(var tile=0;tile<11;tile++)this.box(x-.03,.073,-6+tile*1.2,2.18,.025,.64,tile%2?ivory:coral);
 this.actor=previousActor;
 var age=typeof this.endingTime==='number'?this.endingTime:-1;this.finaleCelebration(x,age);
};
// The landing is part of the fourth-stage river, visible before the last gate.
P.endingLandingOffset=function(g){if(g.stageIndex!==3||g.practiceReplay||g.endless)return null;return Math.max(0,R.campaign.durations[3]-R.campaign.elapsed(g))*g.flowSpeed()+18;};
// World-anchored six-metre strips follow the river bend without a visible road cap.
P.endingRoad=function(g){
 var start=Math.floor((g.distance-180)/6)*6;
 for(var wx=start;wx<g.distance+360;wx+=6){var x=wx-g.distance,end=x+6;
  this.quad([x,ROAD,9.6],[end,ROAD,9.6],[end,ROAD,15.4],[x,ROAD,15.4],'#58646b');
  this.quad([x,-.14,8.5],[end,-.14,8.5],[end,ROAD,9.6],[x,ROAD,9.6],'#a5ad90');
  this.quad([x,ROAD,15.4],[end,ROAD,15.4],[end,-.14,16.5],[x,-.14,16.5],'#a5ad90');
  for(var edge=0;edge<2;edge++){var z=edge?15.05:9.95;this.quad([x,ROAD+.012,z-.048],[end,ROAD+.012,z-.048],[end,ROAD+.012,z+.048],[x,ROAD+.012,z+.048],'#e7e4cf');}
  this.quad([x,ROAD+.014,12.45],[x+2.8,ROAD+.014,12.45],[x+2.8,ROAD+.014,12.55],[x,ROAD+.014,12.55],'#d8c888');
  this.quad([x,ROAD+.03,15.4],[end,ROAD+.03,15.4],[end,ROAD+.03,15.8],[x,ROAD+.03,15.8],'#a8aea4');
  this.quad([x,ROAD+.03,15.8],[end,ROAD+.03,15.8],[end,ROAD-.18,15.8],[x,ROAD-.18,15.8],'#929d8f');
 }
};
P.endingLanding=function(g,t){
 var land=this.endingLandingOffset(g);if(land===null||land>140)return;
 // Extend both directions beyond the camera's view; retain the existing road height.
 this.endingRoad(g);
 this.quad([land-.4,.625,9.2],[land+4.6,.625,9.2],[land+4.6,ROAD,9.7],[land-.4,ROAD,9.7],'#b4af99');
 for(var board=0;board<13;board++)this.box(land+2.1,.5,5.8+board*.29,4.8,.25,.25,board%2?'#b48a5e':'#c39b6d');
 for(var dx=-1;dx<=1;dx+=2)for(var dz=0;dz<2;dz++){this.tube(land+2.1+dx*2.15,-.8,5.5+dz*3.9,land+2.1+dx*2.15,1.05,5.5+dz*3.9,.11,.11,'#795e48');this.round(land+2.1+dx*2.15,1.1,5.5+dz*3.9,.29,.17,.29,'#d6b689');}
 for(var lamp=0;lamp<3;lamp++){var lx=land-8+lamp*17;this.tube(lx,.5,8.8,lx,4.2,8.8,.075,.075,'#596b67');this.box(lx,4.2,8.8,.55,.72,.55,'#f5d38c');this.box(lx,4.63,8.8,.74,.14,.74,'#746f5d');}
 if(typeof this.endingTime!=='number')this.endingMotorcycle(land+3.5,BIKE_Z,0,false);
};
P.endingCamera=function(g,q,target){
 if(this.endingCameraRun!==g||q.time<(this.endingCameraTime||0)){this.endingCameraRun=g;this.endingCameraStart=(this.camera||target).slice();}this.endingCameraTime=q.time;
 var frame=ease(3.5,4.8,q.time),wide=Math.max(1,.59/this.aspect),follow=ease(4.8,8.5,q.time)*16,mix=ease(0,2.2,q.time),destination=[q.boatX-13+follow-frame*2,(15+frame*1.5)*wide,(24+frame*2)*wide,q.boatX+3+follow-frame*2,1.4,6.9-frame*.6+ease(5,7,q.time)*1.7],out=[];
 for(var i=0;i<6;i++)out[i]=this.endingCameraStart[i]+(destination[i]-this.endingCameraStart[i])*mix;return out;
};
P.endingActors=function(g,t){
 var q=pose(t),dock=ease(0,2.2,t);if(!this.endingView||this.endingRun!==g){this.endingView=Object.create(g);this.endingRun=g;this.endingCrocStart=this.crocViewX===undefined?-6.1-g.gap:this.crocViewX;}
 var view=this.endingView;view.z=g.z+(4.2-g.z)*dock;view.y=g.y*(1-ease(0,.6,t));view.angle=g.angle*(1-dock);view.stumble=0;view.lateralVelocity=(g.lateralVelocity||0)*(1-dock);view.endingCaptainAway=t>=2.05;view.currentSpeed=g.currentSpeed*(1-dock);view.speed=g.speed*(1-dock);view.time=g.time;view.lapFinishAt=-100;view.goldBoost=0;view.boost=0;view.escape=0;
 this.endingRaftX=q.boatX;this.endingPerson=t>=2.2;this.raft(view,g.time+Math.min(t,2.2),false);this.endingRaftX=0;this.endingPerson=false;
 if(t>=2.2)this.tube(19.5,.35,5.1,20.1,.85,5.5,.035,.035,'#e2c891');
 this.endingMotorcycle(q.bikeX,BIKE_Z,t,q.riding);
 if(t>=2.05&&t<3.65){this.endingPerson=true;this.endingStand=q.stand;this.endingCrouch=q.crouch;this.endingWalk=q.walk;this.ridingCaptain=q.mount;this.endingHeading=Math.PI/2*(1-ease(2.05,2.25,t)+q.mount);this.group={x:q.captainX,y:q.captainY,z:q.captainZ,scale:.95,cos:1,sin:0};this.person(0,0,0,'captain',0);this.group=null;this.endingPerson=false;this.endingStand=0;this.endingCrouch=0;this.endingWalk=0;this.ridingCaptain=0;this.endingHeading=null;}
 // It reaches the landing after the motorcycle departs, scrambles ashore and takes three strides.
 var swim=ease(0,4.8,t),cx=this.endingCrocStart+(20-this.endingCrocStart)*swim,cz=g.z*(1-swim);
 if(t>=4.8){this.endingCrocPose={x:q.crocX,z:q.crocZ,y:q.crocY,yaw:q.crocYaw,pitch:Math.sin(q.climb*Math.PI)*.10,walk:t>=6.3&&t<8.5};if(t>=6.3)this.disc(q.crocX-7.5,ROAD+.012,BIKE_Z,6.5,1.6,'#46535a');}
 var gait=g.time+Math.min(t,6.3)+Math.max(0,Math.min(t-6.3,2.2))*1.3;
 this.croc(cx,gait,cz,.12+q.snap*.7,0,null);this.endingCrocPose=null;
 if(t>=4.8&&t<5.45&&q.snap>.3){this.loop(q.crocX,.075,q.crocZ,1+q.snap,1+q.snap*.5,.045,'#d5e7d7',1);if(!this.reducedMotion)for(var splash=0;splash<6;splash++){var a=splash*Math.PI/3;this.paddleDrop(q.crocX+Math.cos(a)*q.snap*1.2,.1+q.snap*(splash%2?.7:1.2),q.crocZ+Math.sin(a)*q.snap,.07);}}
 if(t>3.85&&t<7.8&&!this.reducedMotion)for(var dust=0;dust<6;dust++){var age=(t*1.6+dust*.17)%1;this.blob(q.bikeX-1.6-age*3,ROAD+.15+age*.5,BIKE_Z+(dust%2?1:-1)*age*.5,.25+age*.6,.2+age*.5,.3+age*.5,'#b7b59e');}

};
})(window);
