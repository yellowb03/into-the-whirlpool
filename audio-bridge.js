// audio-bridge.js: maps the game events planned in GAME.md onto the sound events audio.js (v2) listens for,
// so game.js and audio.js can evolve separately. Owned by Claude; safe to delete if audio.js adopts the GAME.md names.
(function(){try{
  var fire=function(n,d){window.dispatchEvent(new CustomEvent('wp:'+n,{detail:d}));};
  window.addEventListener('wp:card',function(e){fire('card-rise',e.detail);});
  window.addEventListener('wp:answer',function(e){var d=e.detail||{};
    fire('stamp',{kind:d.verdict==='real-unproven'?'unproven':d.verdict==='made-up'?'made-up':'real',x:d.x});
    fire(d.correct?'correct':'wrong',d);});
  window.addEventListener('wp:fling',function(e){fire('paper-fling',e.detail);});
  window.addEventListener('wp:crossing',function(){fire('now');});
}catch(_){}})();
