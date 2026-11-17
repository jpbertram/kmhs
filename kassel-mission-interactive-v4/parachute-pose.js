/* Visual rig articulation, not a parachute aerodynamic model. Canopy
 * deformation is isolated from the airman's dimensions and root scale. */
(function(global){'use strict';
 function pose(age,landedSeconds,feetY,openingDelay){
  if(![age,feetY].every(Number.isFinite)||age<0||!Number.isFinite(landedSeconds)||landedSeconds<0)throw Error('Invalid parachute pose inputs');
  openingDelay=openingDelay===undefined?0:openingDelay;
  if(!Number.isFinite(openingDelay)||openingDelay<0)throw Error('Invalid canopy opening delay');
  var progress=Math.min(1,Math.max(0,age-openingDelay)/.8),opening=.12+.88*progress*progress*(3-2*progress),collapse=Math.min(1,landedSeconds/2.5),y=landedSeconds>0?1-.88*collapse:opening;
  // Inflation about the riser anchor keeps the bottom of the lines at
  // the harness. After landing the fabric settles towards the feet.
  var anchor=-3.68,offset=landedSeconds>0?(feetY-anchor*.12+.02)*collapse:anchor*(1-opening);
  // Estimated cloth settling beside the figure, not through his legs.
  // This lateral offset is not a historical wind direction or fluid solution.
  return {rigVisible:landedSeconds>0||age>=openingDelay,rigScaleY:y,rigScaleXZ:landedSeconds>0?1:opening,rigOffsetY:offset,rigOffsetX:3.2*collapse,rigOffsetZ:.5*collapse,bodyScale:1};
 }
 var api={pose:pose};if(typeof module!=='undefined'&&module.exports)module.exports=api;global.KasselParachutePose=api;
})(typeof window!=='undefined'?window:globalThis);
