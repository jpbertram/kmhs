/* Keyboard navigation never consumes keys from native controls or the timeline.
 * Aircraft order comes from the actual picker, not array indexes or visibility:
 * a lost aircraft and its crew must remain inspectable. */
(function (global) {
  'use strict';
  var stations=['pilot','copilot','nav','bomb','nose','ttop','ball','waistL','waistR','radio','tail'];
  function next(items,current,delta) {
    if(!items.length)return null;
    var i=items.indexOf(current);
    return items[((i<0?0:i)+delta+items.length)%items.length];
  }
  function protectedTarget(target) {
    return !!(target&&target.closest&&target.closest('input,select,textarea,button,a,[contenteditable="true"],[role="slider"],[role="spinbutton"],[role="combobox"]'));
  }
  function action(event,state,ships) {
    if(!state||event.defaultPrevented||event.altKey||event.ctrlKey||event.metaKey||event.shiftKey||protectedTarget(event.target))return null;
    if(event.key==='Escape'&&(state.mode==='crew'||state.mode==='chase'))return {kind:'view',value:'orbit'};
    if(state.mode!=='crew'&&state.mode!=='chase')return null;
    if(event.key==='ArrowUp'||event.key==='ArrowDown')return {kind:'ship',value:next(ships,String(state.selectedId),event.key==='ArrowUp'?-1:1)};
    if(state.mode==='crew'&&(event.key==='ArrowLeft'||event.key==='ArrowRight'))return {kind:'station',value:next(stations,state.crewPos,event.key==='ArrowLeft'?-1:1)};
    return null;
  }
  var api={stations:stations,next:next,action:action};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  if(!global.document)return;
  global.KasselCrewNavigation=api;
  function addHint(){
    var wrap=global.document.getElementById('cp-crew-wrap');
    if(!wrap||global.document.getElementById('km-crew-keyboard-hint'))return;
    var hint=global.document.createElement('p');hint.id='km-crew-keyboard-hint';
    hint.textContent='Click the view, then ← / → stations · ↑ / ↓ aircraft · Esc overview';
    hint.style.cssText='margin:7px 0 0;color:#c6c6bb;font:11px/1.5 sans-serif;letter-spacing:.02em';
    wrap.appendChild(hint);
  }
  if(global.document.readyState==='loading')global.document.addEventListener('DOMContentLoaded',addHint);else addHint();
  function focusCanvas(){
    var canvas=global.document.querySelector('#terrain-wrap canvas');
    if(!canvas)return false;
    canvas.tabIndex=0;
    canvas.setAttribute('aria-label','3D mission view. In crew view, left and right change stations; up and down change aircraft; Escape returns to overview.');
    return true;
  }
  if(!focusCanvas()&&global.MutationObserver){
    var observer=new global.MutationObserver(function(){if(focusCanvas())observer.disconnect();});
    observer.observe(global.document.documentElement,{childList:true,subtree:true});
  }
  global.document.addEventListener('keydown',function(event){
    var km=global.KM,picker=global.document.getElementById('cp-plane');
    if(!km||!picker)return;
    var ships=Array.from(picker.options).filter(function(o){return !o.disabled&&o.value!=='';}).map(function(o){return String(o.value);});
    var result=action(event,km._camState,ships);
    if(!result||result.value===null)return;
    event.preventDefault();
    if(result.kind==='station')km.setCrewPos(result.value);
    else if(result.kind==='ship'){picker.value=result.value;km.selectPlane(result.value);}
    else km.setView(result.value);
  });
})(typeof window!=='undefined'?window:globalThis);
