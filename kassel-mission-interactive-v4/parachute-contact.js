(function(root){
  'use strict';
  /* Contact for the existing illustrative scene trajectory. Scene units,
     NOT SI or validated parachute aerodynamics. No frame-state dependence. */
  function trajectory(launch,speed,sway,age,momentum){
    /* Illustrative drag relaxation in playback seconds. Preserve the
       aircraft's initial horizontal velocity without an abrupt stop.
       This is not a calibrated human/parachute drag coefficient. */
    var carry=momentum?1.5*(1-Math.exp(-age/1.5)):0;
    return {x:launch.x+(momentum?momentum.x*carry:0)+(Math.sin(age*.6+sway)-Math.sin(sway))*.45,
      y:launch.y-Math.min(age,1)*3-Math.max(0,age-1)*speed,
      z:launch.z+age*.12+(momentum?momentum.z*carry:0)};
  }
  function solve(launch,speed,sway,feetOffset,terrain,momentum){
    if(!launch||![launch.x,launch.y,launch.z,speed,sway,feetOffset].every(Number.isFinite)||speed<=0||typeof terrain!=='function')throw new TypeError('Finite trajectory and terrain callback required');
    if(momentum&&![momentum.x,momentum.z].every(Number.isFinite))throw new TypeError('Finite horizontal momentum required');
    function clearance(t){var p=trajectory(launch,speed,sway,t,momentum),h=terrain(p.x,p.z);if(!Number.isFinite(h))throw new TypeError('Finite terrain height required');return p.y+feetOffset-h;}
    /* Runtime terrain has a 1.5-unit minimum. Conservatively scan until
       the trajectory is below zero, bounding cost without a frame loop. */
    var end=Math.max(1,1+(launch.y+Math.abs(feetOffset)+3)/speed),lo=0,hi=0;
    if(clearance(0)>0){
      for(hi=.25;hi<=end+.25;hi+=.25){if(clearance(hi)<=0)break;lo=hi;}
      if(hi>end+.25)throw new RangeError('No terrain intersection within trajectory bound');
      for(var i=0;i<30;i++){var mid=(lo+hi)/2;if(clearance(mid)>0)lo=mid;else hi=mid;}
    }
    var p=trajectory(launch,speed,sway,hi,momentum);p.y=terrain(p.x,p.z)-feetOffset;
    return {time:hi,position:p};
  }
  root.KasselParachuteContact={trajectory:trajectory,solve:solve};
  if(typeof module!=='undefined')module.exports=root.KasselParachuteContact;
})(typeof window!=='undefined'?window:globalThis);
