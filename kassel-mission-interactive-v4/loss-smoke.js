(function(root){
 'use strict';
 function jitter(seed,tick,axis){var n=Math.sin(seed*.137+tick*12.9898+axis*78.233)*43758.5453;return (n-Math.floor(n))-.5;}
 function sample(losses,seconds,timeline,trajectory,includeGround){
  if(!Array.isArray(losses)||!Number.isFinite(seconds)||seconds<0)throw new TypeError('Finite playback time and loss-state array required');
  var out=[],step=.35,lifetime=13,endTick=Math.floor(seconds/step);
  for(var i=0;i<losses.length;i++){
   var v=losses[i];if(!v||v.beh!=='fall'||!v.startPos||!v.ctrl||!(v.dur>0))continue;
   for(var tick=Math.max(0,endTick-Math.ceil(lifetime/step));tick<=endTick;tick++){
    var emitted=tick*step,age=seconds-emitted;if(age<0||age>lifetime)continue;
    var cue=timeline.battleCueAtPlayback(emitted),u=(cue-v.ft)/v.dur;
    if(u<0)continue;
    if(u>=1){
     if(!includeGround||!v.sitePos)continue;
     /* Reconstruct the aftermath from impact time, not frame emissions.
        Plume rise/spread remain an illustrative effect, not CFD. */
     var rise=age*1.1,spread=.25+age*.16;
     out.push({x:v.sitePos.x+jitter(v.seed,tick,0)*spread,
      y:v.sitePos.y+1.5+rise,z:v.sitePos.z+jitter(v.seed,tick,2)*spread});
     continue;
    }
    var p=trajectory.sample(v,u).position,width=.12+age*.035;
    out.push({x:p.x+jitter(v.seed,tick,0)*width,y:p.y+.5+age*.10+jitter(v.seed,tick,1)*width,z:p.z+jitter(v.seed,tick,2)*width});
   }
  }
  return out;
 }
 root.KasselLossSmoke={sample:sample};
 if(typeof module!=='undefined')module.exports=root.KasselLossSmoke;
})(typeof window!=='undefined'?window:globalThis);
