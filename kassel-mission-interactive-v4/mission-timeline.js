/* Documentary playback seconds, route fraction, approximate mission minutes.
   Times follow the supplied build spec. Intermediate historical times remain
   estimates; the six-minute attack is not stretched into the return clock. */
(function(root){
  'use strict';
  var marks=[
    [0,0,480],[40,0.10,495],[80,0.22,570],[120,0.56,630],
    [145,0.65,645],[210,0.84,660],[240,0.92,666],
    [270,0.975,750],[300,1,750]
  ];
  function interpolate(value,input,output){
    value=Math.max(marks[0][input],Math.min(marks[marks.length-1][input],value));
    for(var i=1;i<marks.length;i++){
      if(value<=marks[i][input]){
        var lo=marks[i-1],hi=marks[i],u=(value-lo[input])/(hi[input]-lo[input]);
        return lo[output]+u*(hi[output]-lo[output]);
      }
    }
    return marks[marks.length-1][output];
  }
  /* Monotone Hermite route motion keeps forward speed continuous at the
     phase boundaries while retaining every fixed documentary cue. */
  var slopes=marks.map(function(m,i){
    var left=i?(m[1]-marks[i-1][1])/(m[0]-marks[i-1][0]):null;
    var right=i<marks.length-1?(marks[i+1][1]-m[1])/(marks[i+1][0]-m[0]):null;
    if(left===null)return right;
    if(right===null)return 0;
    return left*right>0?2*left*right/(left+right):0;
  });
  function routeAt(seconds){
    seconds=Math.max(0,Math.min(300,seconds));
    for(var i=1;i<marks.length;i++)if(seconds<=marks[i][0]){
      var a=marks[i-1],b=marks[i],h=b[0]-a[0],u=(seconds-a[0])/h;
      var u2=u*u,u3=u2*u;
      return (2*u3-3*u2+1)*a[1]+(u3-2*u2+u)*h*slopes[i-1]+
        (-2*u3+3*u2)*b[1]+(u3-u2)*h*slopes[i];
    }
    return 1;
  }
  function secondsAt(route){
    if(route<=0)return 0;if(route>=1)return 300;
    route=Math.max(0,Math.min(1,route));var lo=0,hi=300;
    for(var i=0;i<40;i++){var mid=(lo+hi)/2;if(routeAt(mid)<route)lo=mid;else hi=mid;}
    return (lo+hi)/2;
  }
  function playbackAtBattleCue(cue){
    if(!Number.isFinite(cue)||cue<0)throw new TypeError('Nonnegative battle cue required');
    // 0..420 are legacy choreography coordinates, NOT physical seconds.
    return cue<=420?secondsAt(.84+cue/420*.08):240+(cue-420)/5.6;
  }
  // Leave most of the control available for the five-minute documentary
  // sequence. The final fifth becomes seekable when loss playback extends it.
  var documentaryEnd=300,documentaryShare=.8;
  function seekSeconds(fraction,end){
    var f=Math.max(0,Math.min(1,fraction));
    if(end<=documentaryEnd)return f*documentaryEnd;
    if(f<=documentaryShare)return f/documentaryShare*documentaryEnd;
    return documentaryEnd+(f-documentaryShare)/(1-documentaryShare)*(end-documentaryEnd);
  }
  function seekFraction(seconds,end){
    var t=Math.max(0,Math.min(end,seconds));
    if(end<=documentaryEnd)return t/documentaryEnd;
    if(t<=documentaryEnd)return t/documentaryEnd*documentaryShare;
    return documentaryShare+(t-documentaryEnd)/(end-documentaryEnd)*(1-documentaryShare);
  }
  // Presentation time after the return blends from normal speed into
  // a 90-second time-lapse. Trajectory sampling still uses source seconds.
  function advancePlayback(seconds,delta,end){
    var next=seconds+delta;
    var remaining=end-documentaryEnd,display=90;
    if(next<=documentaryEnd||remaining<=display)return Math.min(end,next);
    var acceleration=(remaining-display)/(display*display);
    var elapsed=Math.max(0,seconds-documentaryEnd);
    var displayElapsed=seconds<documentaryEnd?seconds-documentaryEnd:
      2*elapsed/(1+Math.sqrt(1+4*acceleration*elapsed));
    var t=Math.min(display,displayElapsed+delta);
    return Math.min(end,documentaryEnd+t+acceleration*t*t);
  }
  var api={duration:300,marks:marks,
    routeAt:routeAt,advancePlayback:advancePlayback,seekSeconds:seekSeconds,seekFraction:seekFraction,
    secondsAt:secondsAt,
    playbackAtBattleCue:playbackAtBattleCue,
    battleCueAtPlayback:function(seconds){return seconds>240?420+(seconds-240)*5.6:Math.max(0,Math.min(420,(routeAt(seconds)-.84)/.08*420));},
    ageSinceBattleCue:function(route,cue){return Math.max(0,secondsAt(route)-playbackAtBattleCue(cue));},
    missionSecondsAt:function(route){return (interpolate(route,1,2)-480)*60;},
    clockAt:function(route){
      var minutes=Math.floor(interpolate(route,1,2)+1e-7);
      return String(Math.floor(minutes/60)).padStart(2,'0')+':'+String(minutes%60).padStart(2,'0');
    },
    battleAt:function(route){return Math.max(0,Math.min(420,(route-0.84)/0.08*420));}
  };
  root.KMMissionTimeline=api;
  if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
