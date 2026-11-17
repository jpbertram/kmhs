(function(root){
  'use strict';
  var roles={pilot:/^pilot$/i,copilot:/co.?pilot/i,nav:/navigator/i,
    bomb:/bombardier/i,nose:/nose/i,ttop:/top\s*turret|engineer/i,
    ball:/ball/i,tail:/tail|rail\s*gunner/i,radio:/radio/i};
  function resolve(list,station){
    list=list||[];
    if(station==='waistL'||station==='waistR'){
      var waist=list.filter(function(m){return /waist/i.test(m.r||'');});
      var side=station==='waistL'?/left|port/i:/right|starboard/i;
      var other=station==='waistL'?/right|starboard/i:/left|port/i;
      var explicit=waist.find(function(m){return side.test(m.r||'');});
      if(explicit)return {member:explicit,uncertain:false};
      var unspecified=waist.filter(function(m){return !other.test(m.r||'')&&!side.test(m.r||'');});
      return {member:unspecified[station==='waistR'?1:0]||null,uncertain:unspecified.length>0};
    }
    var role=roles[station];
    var matches=role?list.filter(function(m){return role.test(m.r||'');}):[];
    if(station==='ttop')matches.sort(function(a,b){return (/top\s*turret/i.test(b.r)?1:0)-(/top\s*turret/i.test(a.r)?1:0);});
    return {member:matches[0]||null,uncertain:matches.length>1};
  }
  root.KMCrewStations={resolve:resolve};
  if(typeof module!=='undefined')module.exports=root.KMCrewStations;
})(typeof window!=='undefined'?window:globalThis);
