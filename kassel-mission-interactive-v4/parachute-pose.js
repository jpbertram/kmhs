/* Visual rig articulation, not a parachute aerodynamic model. Canopy
 * deformation is isolated from the airman's dimensions and root scale. */
(function(global){'use strict';
 function pose(age,landedSeconds,feetY,openingDelay){
  if(![age,feetY].every(Number.isFinite)||age<0||!Number.isFinite(landedSeconds)||landedSeconds<0)throw Error('Invalid parachute pose inputs');
  openingDelay=openingDelay===undefined?0:openingDelay;
  if(!Number.isFinite(openingDelay)||openingDelay<0)throw Error('Invalid canopy opening delay');
  // Deployment, all about the riser anchor at the harness so nothing
  // grows out of the man's head: the pilot chute and the bagged canopy
  // stream out of the pack and the lines pay out to full length as a
  // narrow streamer (STRETCH), then the canopy blossoms open (INFLATE).
  // Before that he falls face-down; the opening shock swings him upright.
  // Phase lengths are presentation estimates in playback seconds.
  var STRETCH=.3,INFLATE=.5,smooth=function(x){x=Math.max(0,Math.min(1,x));return x*x*(3-2*x);};
  var a=Math.max(0,age-openingDelay),collapse=Math.min(1,landedSeconds/2.5);
  var length=.12+.88*smooth(a/STRETCH),spread=a<STRETCH?.06:.06+.94*smooth((a-STRETCH)/INFLATE);
  // a slight breathing overshoot as the canopy fills, settled by the end
  var fill=a>STRETCH&&a<STRETCH+INFLATE?Math.sin(Math.PI*(a-STRETCH)/INFLATE)*.05:0;
  var y=landedSeconds>0?1-.88*collapse:Math.min(1,length-fill*.6);
  var xz=landedSeconds>0?1:Math.min(1.04,spread+fill);
  var anchor=-3.68,offset=landedSeconds>0?(feetY-anchor*.12+.02)*collapse:anchor*(1-y);
  var shock=smooth((a-STRETCH*.6)/(INFLATE*.9));
  var pitch=landedSeconds>0?0:1.15*(1-shock)+(a>STRETCH?Math.sin((a-STRETCH)*6)*.22*Math.exp(-(a-STRETCH)*1.5):0);
  // Estimated cloth settling beside the figure, not through his legs.
  // This lateral offset is not a historical wind direction or fluid solution.
  return {rigVisible:landedSeconds>0||age>=openingDelay,rigScaleY:Math.max(.12,y),rigScaleXZ:xz,rigOffsetY:offset,rigOffsetX:3.2*collapse,rigOffsetZ:.5*collapse,bodyScale:1,bodyPitch:pitch};
 }
 var api={pose:pose};if(typeof module!=='undefined'&&module.exports)module.exports=api;global.KasselParachutePose=api;
})(typeof window!=='undefined'?window:globalThis);
