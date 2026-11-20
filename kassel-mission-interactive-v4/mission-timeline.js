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
    if(end<=documentaryEnd)return documentarySeconds(f);
    if(f<=documentaryShare)return documentarySeconds(f/documentaryShare);
    return documentaryEnd+(f-documentaryShare)/(1-documentaryShare)*(end-documentaryEnd);
  }
  function seekFraction(seconds,end){
    var t=Math.max(0,Math.min(end,seconds));
    if(end<=documentaryEnd)return documentaryFraction(t);
    if(t<=documentaryEnd)return documentaryFraction(t)*documentaryShare;
    return documentaryShare+(t-documentaryEnd)/(end-documentaryEnd)*(1-documentaryShare);
  }
  // The attack (playback 210..240 s, battle cues 0..420) plays at a quarter
  // of the pace of the rest of the documentary, eased in and out over four
  // seconds either side. Playback seconds, the route and the clock are
  // unchanged; only how fast playback advances, and how wide the attack is
  // on the bar, change.
  var BATTLE_FROM=210,BATTLE_TO=240,BATTLE_PACE=.25,RAMP=4;
  // Bombs away (route .65, playback 145 s) slows the same way so the
  // salvo can be watched leaving the bays and falling: about 0.9 s of
  // release ripple plus a 1.3 s fall on the formation's compressed clock
  // (a real fall of about 45 s), shown at a seventh of normal pace.
  var BOMBS_FROM=144.7,BOMBS_TO=147.4,BOMBS_PACE=.15,BOMBS_RAMP=1.2;
  function smooth(u){u=Math.max(0,Math.min(1,u));return u*u*(3-2*u);}
  function windowPace(s,from,to,slow,ramp){
    if(s<=from-ramp||s>=to+ramp)return 1;
    if(s<from)return 1+(slow-1)*smooth((s-(from-ramp))/ramp);
    if(s<=to)return slow;
    return slow+(1-slow)*smooth((s-to)/ramp);
  }
  function pace(s){
    return Math.min(windowPace(s,BATTLE_FROM,BATTLE_TO,BATTLE_PACE,RAMP),
      windowPace(s,BOMBS_FROM,BOMBS_TO,BOMBS_PACE,BOMBS_RAMP));
  }
  // presentation seconds: wall seconds at 1x to reach playback second s
  var STEP=.05,shown=[0];
  for(var k=1;k*STEP<=documentaryEnd+1e-9;k++)shown.push(shown[k-1]+STEP/pace((k-.5)*STEP));
  var shownEnd=shown[shown.length-1];
  function presentationAt(s){
    s=Math.max(0,Math.min(documentaryEnd,s));var i=Math.min(shown.length-2,Math.floor(s/STEP)),u=s/STEP-i;
    return shown[i]+u*(shown[i+1]-shown[i]);
  }
  function secondsAtPresentation(p){
    p=Math.max(0,Math.min(shownEnd,p));var lo=0,hi=shown.length-1;
    while(hi-lo>1){var mid=(lo+hi)>>1;if(shown[mid]<p)lo=mid;else hi=mid;}
    return (lo+(p-shown[lo])/((shown[hi]-shown[lo])||1))*STEP;
  }
  function documentaryFraction(s){return presentationAt(s)/shownEnd;}
  function documentarySeconds(f){return secondsAtPresentation(f*shownEnd);}
  // Presentation time after the return blends from normal speed into
  // a 90-second time-lapse. Trajectory sampling still uses source seconds.
  // fullPace: the caller is following a ship that is going down, so the
  // attack's quarter pace is skipped and playback runs at normal speed.
  function advancePlayback(seconds,delta,end,fullPace){
    var s=seconds,d=delta,pc=fullPace?function(){return 1;}:pace;
    while(d>1e-9&&s<documentaryEnd){
      var c=Math.min(d,.1),ns=s+c*pc(s);
      if(ns>=documentaryEnd){d-=(documentaryEnd-s)/pc(s);s=documentaryEnd;break;}
      s=ns;d-=c;
    }
    if(d<=1e-9||s<documentaryEnd)return Math.min(end,s);
    return timeLapse(s,d,end);
  }
  function timeLapse(seconds,delta,end){
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
    routeAt:routeAt,advancePlayback:advancePlayback,pace:pace,battlePace:BATTLE_PACE,seekSeconds:seekSeconds,seekFraction:seekFraction,
    secondsAt:secondsAt,
    playbackAtBattleCue:playbackAtBattleCue,
    // the attack: cues 0..420 span 11:00 to 11:06, so one cue is 6/7 of a sim second
    battleSecondsPerCue:360/420,
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
