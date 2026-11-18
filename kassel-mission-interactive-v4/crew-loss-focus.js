(function(root){
 'use strict';
 function select(plane,state,roster,chutes,resolve){
  if(!plane)return null;
  var data=plane.userData.planeData;
  var ship=data&&(data.p||data.name||data.pilot),member=null;
  if(state._crewLossHandoff&&resolve)member=resolve(roster[String(ship)]||[],state.crewPos).member;
  var chute=(chutes||[]).find(function(ch){
   return ch.plane===data&&ch.sp&&ch.sp.visible!==false&&
    (!state._crewLossHandoff||(member&&ch.member&&ch.member.n===member.n));
  });
  if(chute&&(state._crewLossHandoff||!plane.visible))return {position:chute.sp.position,radius:chute.rootScale?chute.rootScale*15:5,kind:'airman',member:member};
  if(!plane.visible&&plane.userData.v2&&plane.userData.v2.sitePos)return {position:plane.userData.v2.sitePos,radius:18,kind:'impact',member:member};
  return {position:plane.position,radius:null,kind:'aircraft',member:member};
 }
 root.KasselCrewLossFocus={select:select};
 if(typeof module!=='undefined')module.exports=root.KasselCrewLossFocus;
})(typeof window!=='undefined'?window:globalThis);
