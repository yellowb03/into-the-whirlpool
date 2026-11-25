// audio-bridge.js: bridges game wp:* events to audio.js (WP_AUDIO) and layers a zero-asset
// Web Audio casino-arcade JuiceSynth that strictly respects WP_AUDIO mute / soundMode state.
(function () {
  'use strict';

  try {
    var fire = function (name, detail) {
      window.dispatchEvent(new CustomEvent('wp:' + name, { detail: detail }));
    };

    var clamp = function (v, lo, hi) {
      return v < lo ? lo : v > hi ? hi : v;
    };

    var nowMs = function () {
      return (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
    };

    // =========================================================================
    // 1. MUTE / SOUND-MODE GATE (Synced with WP_AUDIO & localStorage)
    // =========================================================================
    function isSilenced() {
      if (typeof document !== 'undefined' && document.hidden) return true;
      try {
        var api = window.WP_AUDIO;
        if (api) {
          if (api.muted || api.soundMode === 'off') return true;
        } else if (typeof window !== 'undefined' && window.localStorage) {
          if (window.localStorage.getItem('wp_audio_muted') === '1') return true;
          if (window.localStorage.getItem('wp_audio_mode') === 'off') return true;
        }
        if (typeof document !== 'undefined') {
          var btn = document.getElementById('wp-audio-toggle');
          if (btn && btn.getAttribute('aria-pressed') === 'true') return true;
        }
      } catch (_) {}
      return false;
    }

    // =========================================================================
    // 2. ZERO-ASSET WEB AUDIO CASINO-ARCADE SYNTH (JuiceSynth)
    // =========================================================================
    var MASTER_LEVEL = 0.45;
    var PENTATONIC_HZ = [
      523.25,  // C5  (streak 1)
      587.33,  // D5  (streak 2)
      659.25,  // E5  (streak 3)
      783.99,  // G5  (streak 4)
      880.00,  // A5  (streak 5)
      1046.50, // C6  (streak 6)
      1174.66, // D6  (streak 7)
      1318.51, // E6  (streak 8)
      1567.98, // G6  (streak 9)
      2093.00  // C7  (streak 10)
    ];

    var ctx = null;
    var compressor = null;
    var masterGain = null;
    var noiseBuffer = null;
    var activeVoices = 0;
    var MAX_VOICES = 28;

    function buildNoiseBuffer(audioCtx) {
      var len = Math.floor(audioCtx.sampleRate * 1.0);
      var buf = audioCtx.createBuffer(1, len, audioCtx.sampleRate);
      var data = buf.getChannelData(0);
      for (var i = 0; i < len; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      return buf;
    }

    function initCtx() {
      if (ctx) return ctx;
      try {
        var AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) return null;
        ctx = new AudioCtx();
        var t = ctx.currentTime;

        compressor = ctx.createDynamicsCompressor();
        compressor.threshold.setValueAtTime(-12, t);
        compressor.knee.setValueAtTime(10, t);
        compressor.ratio.setValueAtTime(8, t);
        compressor.attack.setValueAtTime(0.003, t);
        compressor.release.setValueAtTime(0.14, t);

        masterGain = ctx.createGain();
        masterGain.gain.setValueAtTime(isSilenced() ? 0.0001 : MASTER_LEVEL, t);

        compressor.connect(masterGain);
        masterGain.connect(ctx.destination);
        noiseBuffer = buildNoiseBuffer(ctx);
        return ctx;
      } catch (_) {
        return null;
      }
    }

    function syncMasterGain() {
      if (!ctx || !masterGain) return;
      try {
        var t = ctx.currentTime;
        var muted = isSilenced();
        masterGain.gain.cancelScheduledValues(t);
        masterGain.gain.setTargetAtTime(muted ? 0.0001 : MASTER_LEVEL, t, 0.015);
      } catch (_) {}
    }

    function ensureReady() {
      if (isSilenced()) {
        syncMasterGain();
        return null;
      }
      var c = initCtx();
      if (!c) return null;
      syncMasterGain();
      if (c.state === 'suspended' && typeof c.resume === 'function') {
        try {
          var p = c.resume();
          if (p && typeof p.catch === 'function') p.catch(function () {});
        } catch (_) {}
      }
      return c;
    }

    function makePanner(c, panVal) {
      if (typeof c.createStereoPanner === 'function') {
        var p = c.createStereoPanner();
        p.pan.setValueAtTime(clamp(panVal || 0, -0.75, 0.75), c.currentTime);
        return p;
      }
      return c.createGain();
    }

    function panFromX(x) {
      if (typeof x !== 'number' || !isFinite(x)) return 0;
      var norm = x;
      if (norm > 1 && typeof window !== 'undefined' && window.innerWidth > 0) {
        norm = norm / window.innerWidth;
      }
      return clamp((norm * 2 - 1) * 0.5, -0.5, 0.5);
    }

    function trackVoice(src, nodes) {
      if (activeVoices >= MAX_VOICES) return false;
      activeVoices++;
      var cleaned = false;
      var done = function () {
        if (cleaned) return;
        cleaned = true;
        activeVoices = Math.max(0, activeVoices - 1);
        for (var i = 0; i < nodes.length; i++) {
          try { nodes[i].disconnect(); } catch (_) {}
        }
      };
      try {
        src.onended = done;
      } catch (_) {
        setTimeout(done, 1200);
      }
      return true;
    }

    // Unlock AudioContext silently on first gesture & keep mute toggle synced
    function unlockOnGesture() {
      if (isSilenced()) return;
      var c = initCtx();
      if (!c) return;
      if (c.state === 'suspended' && typeof c.resume === 'function') {
        try {
          var p = c.resume();
          if (p && typeof p.catch === 'function') p.catch(function () {});
        } catch (_) {}
      }
    }

    window.addEventListener('pointerdown', unlockOnGesture, { passive: true, once: true });
    window.addEventListener('touchstart', unlockOnGesture, { passive: true, once: true });
    window.addEventListener('keydown', unlockOnGesture, { passive: true, once: true });

    if (typeof document !== 'undefined') {
      document.addEventListener('click', function (ev) {
        var el = ev && ev.target;
        if (el && el.closest && (el.closest('#wp-audio-toggle') || el.closest('#wp-audio-settings-sheet'))) {
          setTimeout(syncMasterGain, 0);
        }
      }, true);

      document.addEventListener('visibilitychange', function () {
        if (!ctx) return;
        try {
          if (document.hidden) {
            if (ctx.state === 'running' && typeof ctx.suspend === 'function') {
              ctx.suspend().catch(function () {});
            }
          } else {
            syncMasterGain();
            if (!isSilenced() && ctx.state === 'suspended' && typeof ctx.resume === 'function') {
              ctx.resume().catch(function () {});
            }
          }
        } catch (_) {}
      });
    }

    // --- Synth Voice Builders ---

    // 1. Odometer score-tick (Balatro / slot mechanical rollup)
    var lastTickAt = 0;
    function playScoreTick(detail) {
      var tMs = nowMs();
      if (tMs - lastTickAt < 32) return;
      lastTickAt = tMs;

      var c = ensureReady();
      if (!c) return;
      var d = detail || {};
      var prog = clamp(typeof d.progress === 'number' ? d.progress : 0.5, 0, 1);
      var dir = typeof d.direction === 'number' ? d.direction : 1;
      var freq = dir < 0
        ? (640 - prog * 320)
        : (760 + prog * 760);

      var t = c.currentTime;
      var osc = c.createOscillator();
      var env = c.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t);
      osc.frequency.exponentialRampToValueAtTime(freq * (dir < 0 ? 0.92 : 1.06), t + 0.02);

      env.gain.setValueAtTime(0.0001, t);
      env.gain.linearRampToValueAtTime(0.11, t + 0.002);
      env.gain.exponentialRampToValueAtTime(0.0001, t + 0.022);

      osc.connect(env);
      env.connect(compressor);
      if (!trackVoice(osc, [osc, env])) return;
      osc.start(t);
      osc.stop(t + 0.026);
    }

    // 2. Rising Pentatonic Combo Chime (streak 1..10 -> C5..C7)
    function playComboChime(streak, x) {
      var c = ensureReady();
      if (!c) return;
      var idx = clamp((Math.max(1, streak | 0)) - 1, 0, PENTATONIC_HZ.length - 1);
      var freq = PENTATONIC_HZ[idx];
      var t = c.currentTime;
      var pan = makePanner(c, panFromX(x));

      var osc1 = c.createOscillator();
      var osc2 = c.createOscillator();
      var g1 = c.createGain();
      var g2 = c.createGain();
      var out = c.createGain();

      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(freq, t);
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(freq * 2, t);

      g1.gain.setValueAtTime(1.0, t);
      g2.gain.setValueAtTime(0.25, t);

      out.gain.setValueAtTime(0.0001, t);
      out.gain.linearRampToValueAtTime(0.28, t + 0.006);
      out.gain.exponentialRampToValueAtTime(0.0001, t + 0.286);

      osc1.connect(g1);
      osc2.connect(g2);
      g1.connect(out);
      g2.connect(out);
      out.connect(pan);
      pan.connect(compressor);

      if (!trackVoice(osc1, [osc1, osc2, g1, g2, out, pan])) return;
      osc1.start(t);
      osc2.start(t);
      osc1.stop(t + 0.30);
      osc2.stop(t + 0.30);

      // Extra sparkle ping at high streaks (5+)
      if (streak >= 5) {
        var spark = c.createOscillator();
        var sg = c.createGain();
        spark.type = 'sine';
        spark.frequency.setValueAtTime(freq * 1.5, t + 0.035);
        sg.gain.setValueAtTime(0.0001, t + 0.035);
        sg.gain.linearRampToValueAtTime(0.09, t + 0.042);
        sg.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
        spark.connect(sg);
        sg.connect(compressor);
        if (trackVoice(spark, [spark, sg])) {
          spark.start(t + 0.035);
          spark.stop(t + 0.24);
        }
      }
    }

    // 3. Fast-Read Speed Bonus Electric Zip
    function playSpeedBonus() {
      var c = ensureReady();
      if (!c) return;
      var t = c.currentTime + 0.06;
      var osc = c.createOscillator();
      var env = c.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(1320, t);
      osc.frequency.exponentialRampToValueAtTime(2640, t + 0.055);

      env.gain.setValueAtTime(0.0001, t);
      env.gain.linearRampToValueAtTime(0.14, t + 0.006);
      env.gain.exponentialRampToValueAtTime(0.0001, t + 0.068);

      osc.connect(env);
      env.connect(compressor);
      if (!trackVoice(osc, [osc, env])) return;
      osc.start(t);
      osc.stop(t + 0.075);
    }

    // 4. Jackpot Card Arrive — Slot-Reel Shimmer Arpeggio + Noise Sweep
    function playJackpotArrive() {
      var c = ensureReady();
      if (!c) return;
      var t0 = c.currentTime;
      var notes = [392.00, 493.88, 587.33, 783.99]; // G4, B4, D5, G5

      for (var i = 0; i < notes.length; i++) {
        var when = t0 + i * 0.045;
        var osc = c.createOscillator();
        var env = c.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(notes[i], when);

        env.gain.setValueAtTime(0.0001, when);
        env.gain.linearRampToValueAtTime(0.17, when + 0.005);
        env.gain.exponentialRampToValueAtTime(0.0001, when + 0.19);

        osc.connect(env);
        env.connect(compressor);
        if (trackVoice(osc, [osc, env])) {
          osc.start(when);
          osc.stop(when + 0.21);
        }
      }

      // Metallic bandpass shimmer sweep
      if (noiseBuffer) {
        var src = c.createBufferSource();
        src.buffer = noiseBuffer;
        var filt = c.createBiquadFilter();
        filt.type = 'bandpass';
        filt.Q.setValueAtTime(3.0, t0);
        filt.frequency.setValueAtTime(2200, t0);
        filt.frequency.exponentialRampToValueAtTime(6800, t0 + 0.22);

        var nEnv = c.createGain();
        nEnv.gain.setValueAtTime(0.0001, t0);
        nEnv.gain.linearRampToValueAtTime(0.11, t0 + 0.03);
        nEnv.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.23);

        src.connect(filt);
        filt.connect(nEnv);
        nEnv.connect(compressor);
        if (trackVoice(src, [src, filt, nEnv])) {
          src.start(t0);
          src.stop(t0 + 0.25);
        }
      }
    }

    // 5. Casino Coin Cascade (shared by Jackpot Hit & New Record)
    function playCoinCascade(count, startDelay) {
      var c = ensureReady();
      if (!c) return;
      var t0 = c.currentTime + (startDelay || 0);
      var n = count || 8;

      for (var i = 0; i < n; i++) {
        var when = t0 + i * 0.045;
        var jitter = 0.96 + Math.random() * 0.08;
        var pan = makePanner(c, (i % 2 === 0 ? -0.52 : 0.52));

        var o1 = c.createOscillator();
        var o2 = c.createOscillator();
        var env = c.createGain();
        o1.type = 'sine';
        o2.type = 'sine';
        o1.frequency.setValueAtTime(2480 * jitter, when);
        o2.frequency.setValueAtTime(3740 * jitter, when);

        env.gain.setValueAtTime(0.0001, when);
        env.gain.linearRampToValueAtTime(0.10, when + 0.004);
        env.gain.exponentialRampToValueAtTime(0.0001, when + 0.115);

        o1.connect(env);
        o2.connect(env);
        env.connect(pan);
        pan.connect(compressor);
        if (trackVoice(o1, [o1, o2, env, pan])) {
          o1.start(when);
          o2.start(when);
          o1.stop(when + 0.13);
          o2.stop(when + 0.13);
        }
      }
    }

    function playJackpotHit() {
      var c = ensureReady();
      if (!c) return;
      playCoinCascade(8, 0);

      // Warm Cmaj9 triad pad (C5, E5, G5, D6)
      var t0 = c.currentTime;
      var chord = [523.25, 659.25, 783.99, 1174.66];
      var filt = c.createBiquadFilter();
      filt.type = 'lowpass';
      filt.frequency.setValueAtTime(3600, t0);
      filt.connect(compressor);

      for (var i = 0; i < chord.length; i++) {
        var osc = c.createOscillator();
        var env = c.createGain();
        osc.type = i % 2 === 0 ? 'triangle' : 'sine';
        osc.frequency.setValueAtTime(chord[i], t0);

        env.gain.setValueAtTime(0.0001, t0);
        env.gain.linearRampToValueAtTime(0.085, t0 + 0.02);
        env.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.40);

        osc.connect(env);
        env.connect(filt);
        if (trackVoice(osc, [osc, env])) {
          osc.start(t0);
          osc.stop(t0 + 0.43);
        }
      }
    }

    // 6. All-In Casino Poker-Chip Clack ON / Soft Thud OFF
    function playAllInToggle(detail) {
      var c = ensureReady();
      if (!c) return;
      var d = detail || {};
      var armed = d.armed !== undefined ? !!d.armed : true;
      var t = c.currentTime;

      if (armed) {
        // Highpass noise click (20ms)
        if (noiseBuffer) {
          var click = c.createBufferSource();
          click.buffer = noiseBuffer;
          var hp = c.createBiquadFilter();
          hp.type = 'highpass';
          hp.frequency.setValueAtTime(2600, t);
          var cg = c.createGain();
          cg.gain.setValueAtTime(0.24, t);
          cg.gain.exponentialRampToValueAtTime(0.0001, t + 0.022);
          click.connect(hp);
          hp.connect(cg);
          cg.connect(compressor);
          if (trackVoice(click, [click, hp, cg])) {
            click.start(t);
            click.stop(t + 0.026);
          }
        }
        // Crisp sine snap 240Hz -> 520Hz
        var snap = c.createOscillator();
        var sg = c.createGain();
        snap.type = 'sine';
        snap.frequency.setValueAtTime(240, t);
        snap.frequency.exponentialRampToValueAtTime(520, t + 0.045);
        sg.gain.setValueAtTime(0.0001, t);
        sg.gain.linearRampToValueAtTime(0.26, t + 0.004);
        sg.gain.exponentialRampToValueAtTime(0.0001, t + 0.06);
        snap.connect(sg);
        sg.connect(compressor);
        if (trackVoice(snap, [snap, sg])) {
          snap.start(t);
          snap.stop(t + 0.068);
        }
        // Extra metallic ping when arming 4X MEGA on a Jackpot card
        if (d.isJackpot) {
          var mega = c.createOscillator();
          var mg = c.createGain();
          mega.type = 'triangle';
          mega.frequency.setValueAtTime(1046.5, t + 0.025);
          mg.gain.setValueAtTime(0.0001, t + 0.025);
          mg.gain.linearRampToValueAtTime(0.14, t + 0.032);
          mg.gain.exponentialRampToValueAtTime(0.0001, t + 0.14);
          mega.connect(mg);
          mg.connect(compressor);
          if (trackVoice(mega, [mega, mg])) {
            mega.start(t + 0.025);
            mega.stop(t + 0.16);
          }
        }
      } else {
        // Disarm soft thud 360Hz -> 190Hz
        var thud = c.createOscillator();
        var tg = c.createGain();
        thud.type = 'sine';
        thud.frequency.setValueAtTime(360, t);
        thud.frequency.exponentialRampToValueAtTime(190, t + 0.04);
        tg.gain.setValueAtTime(0.0001, t);
        tg.gain.linearRampToValueAtTime(0.18, t + 0.004);
        tg.gain.exponentialRampToValueAtTime(0.0001, t + 0.055);
        thud.connect(tg);
        tg.connect(compressor);
        if (trackVoice(thud, [thud, tg])) {
          thud.start(t);
          thud.stop(t + 0.062);
        }
      }
    }

    // 7. 3-Tier Fever Power Chord Sting
    function playFeverUp(detail) {
      var c = ensureReady();
      if (!c) return;
      var d = detail || {};
      var tier = clamp(typeof d.tier === 'number' ? d.tier : 1, 1, 3);
      var roots = [293.66, 349.23, 440.00]; // D4, F4, A4
      var root = roots[tier - 1];
      var ratios = [1.0, 1.498, 2.0]; // root, fifth, octave
      var detunes = [-7, 4, 9];
      var t = c.currentTime;

      var filt = c.createBiquadFilter();
      filt.type = 'lowpass';
      filt.Q.setValueAtTime(2.4, t);
      filt.frequency.setValueAtTime(600, t);
      filt.frequency.exponentialRampToValueAtTime(4800, t + 0.32);
      filt.connect(compressor);

      for (var i = 0; i < ratios.length; i++) {
        var osc = c.createOscillator();
        var env = c.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(root * ratios[i], t);
        osc.detune.setValueAtTime(detunes[i], t);

        env.gain.setValueAtTime(0.0001, t);
        env.gain.linearRampToValueAtTime(0.12, t + 0.014);
        env.gain.exponentialRampToValueAtTime(0.0001, t + 0.42);

        osc.connect(env);
        env.connect(filt);
        if (trackVoice(osc, [osc, env])) {
          osc.start(t);
          osc.stop(t + 0.45);
        }
      }

      if (tier === 3) {
        var hi = c.createOscillator();
        var hg = c.createGain();
        hi.type = 'sine';
        hi.frequency.setValueAtTime(root * 4, t + 0.06);
        hg.gain.setValueAtTime(0.0001, t + 0.06);
        hg.gain.linearRampToValueAtTime(0.12, t + 0.075);
        hg.gain.exponentialRampToValueAtTime(0.0001, t + 0.44);
        hi.connect(hg);
        hg.connect(compressor);
        if (trackVoice(hi, [hi, hg])) {
          hi.start(t + 0.06);
          hi.stop(t + 0.46);
        }
      }
    }

    // 8a. Normal Miss — Game-Show Buzzer (beating sawtooth pair)
    function playMissBuzzer() {
      var c = ensureReady();
      if (!c) return;
      var t = c.currentTime;
      var filt = c.createBiquadFilter();
      filt.type = 'lowpass';
      filt.frequency.setValueAtTime(850, t);
      filt.connect(compressor);

      var freqs = [150, 158];
      for (var i = 0; i < freqs.length; i++) {
        var osc = c.createOscillator();
        var env = c.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freqs[i], t);
        env.gain.setValueAtTime(0.0001, t);
        env.gain.linearRampToValueAtTime(0.15, t + 0.008);
        env.gain.setValueAtTime(0.14, t + 0.15);
        env.gain.exponentialRampToValueAtTime(0.0001, t + 0.23);

        osc.connect(env);
        env.connect(filt);
        if (trackVoice(osc, [osc, env])) {
          osc.start(t);
          osc.stop(t + 0.25);
        }
      }
    }

    // 8b. All-In Bust / 3+ Streak Shatter — Record Scratch + Comedic Sad Trombone
    function playBustSadTrombone(isBust) {
      var c = ensureReady();
      if (!c) return;
      var t0 = c.currentTime;

      // Record Scratch (0..90ms)
      if (noiseBuffer) {
        var src = c.createBufferSource();
        src.buffer = noiseBuffer;
        var bp = c.createBiquadFilter();
        bp.type = 'bandpass';
        bp.Q.setValueAtTime(2.6, t0);
        bp.frequency.setValueAtTime(3200, t0);
        bp.frequency.exponentialRampToValueAtTime(500, t0 + 0.045);
        bp.frequency.exponentialRampToValueAtTime(2400, t0 + 0.09);

        var sg = c.createGain();
        sg.gain.setValueAtTime(0.0001, t0);
        sg.gain.linearRampToValueAtTime(0.26, t0 + 0.008);
        sg.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.095);

        src.connect(bp);
        bp.connect(sg);
        sg.connect(compressor);
        if (trackVoice(src, [src, bp, sg])) {
          src.start(t0);
          src.stop(t0 + 0.11);
        }
      }

      // Vinyl needle chirp
      var chirp = c.createOscillator();
      var cg = c.createGain();
      chirp.type = 'triangle';
      chirp.frequency.setValueAtTime(1400, t0);
      chirp.frequency.exponentialRampToValueAtTime(220, t0 + 0.07);
      cg.gain.setValueAtTime(0.13, t0);
      cg.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.08);
      chirp.connect(cg);
      cg.connect(compressor);
      if (trackVoice(chirp, [chirp, cg])) {
        chirp.start(t0);
        chirp.stop(t0 + 0.09);
      }

      // Extra sub-bass impact on All-In Bust
      if (isBust) {
        var sub = c.createOscillator();
        var subG = c.createGain();
        sub.type = 'sine';
        sub.frequency.setValueAtTime(115, t0);
        sub.frequency.exponentialRampToValueAtTime(42, t0 + 0.14);
        subG.gain.setValueAtTime(0.28, t0);
        subG.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.16);
        sub.connect(subG);
        subG.connect(compressor);
        if (trackVoice(sub, [sub, subG])) {
          sub.start(t0);
          sub.stop(t0 + 0.18);
        }
      }

      // Comedic 4-Note Sad Trombone: Bb3 -> A3 -> Ab3 -> G3 (drooping -25Hz)
      var notes = [
        { hz: 233.08, at: 0.105, dur: 0.17, droop: false },
        { hz: 220.00, at: 0.295, dur: 0.17, droop: false },
        { hz: 207.65, at: 0.485, dur: 0.17, droop: false },
        { hz: 196.00, at: 0.675, dur: 0.44, droop: true }
      ];

      for (var i = 0; i < notes.length; i++) {
        var n = notes[i];
        var when = t0 + n.at;
        var osc = c.createOscillator();
        var formant = c.createBiquadFilter();
        var env = c.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(n.hz, when);
        if (n.droop) {
          osc.frequency.setValueAtTime(n.hz, when + 0.08);
          osc.frequency.linearRampToValueAtTime(n.hz - 25, when + 0.42);
        }

        formant.type = 'lowpass';
        formant.frequency.setValueAtTime(720, when);
        formant.Q.setValueAtTime(3.0, when);
        if (n.droop) {
          formant.frequency.linearRampToValueAtTime(420, when + 0.42);
        }

        env.gain.setValueAtTime(0.0001, when);
        env.gain.linearRampToValueAtTime(0.20, when + 0.02);
        env.gain.setValueAtTime(0.18, when + n.dur - 0.04);
        env.gain.exponentialRampToValueAtTime(0.0001, when + n.dur);

        osc.connect(formant);
        formant.connect(env);
        env.connect(compressor);
        if (trackVoice(osc, [osc, formant, env])) {
          osc.start(when);
          osc.stop(when + n.dur + 0.03);
        }
      }
    }

    // 9. New Record / High-Score Arcade Fanfare
    function playNewRecordFanfare() {
      var c = ensureReady();
      if (!c) return;
      var t0 = c.currentTime;
      var steps = [
        { hz: 523.25, at: 0.00, dur: 0.14 }, // C5
        { hz: 659.25, at: 0.09, dur: 0.14 }, // E5
        { hz: 783.99, at: 0.18, dur: 0.14 }, // G5
        { hz: 1046.50, at: 0.27, dur: 0.18 }, // C6
        { hz: 783.99, toHz: 1046.50, at: 0.40, dur: 0.36 } // G5 -> C6 climax
      ];

      var filt = c.createBiquadFilter();
      filt.type = 'lowpass';
      filt.frequency.setValueAtTime(3600, t0);
      filt.connect(compressor);

      for (var i = 0; i < steps.length; i++) {
        var s = steps[i];
        var when = t0 + s.at;
        var o1 = c.createOscillator();
        var o2 = c.createOscillator();
        var env = c.createGain();
        o1.type = 'triangle';
        o2.type = 'square';
        o1.frequency.setValueAtTime(s.hz, when);
        o2.frequency.setValueAtTime(s.hz, when);
        if (s.toHz) {
          o1.frequency.exponentialRampToValueAtTime(s.toHz, when + 0.09);
          o2.frequency.exponentialRampToValueAtTime(s.toHz, when + 0.09);
        }

        var sqGain = c.createGain();
        sqGain.gain.setValueAtTime(0.22, when);

        env.gain.setValueAtTime(0.0001, when);
        env.gain.linearRampToValueAtTime(0.19, when + 0.008);
        env.gain.exponentialRampToValueAtTime(0.0001, when + s.dur);

        o1.connect(env);
        o2.connect(sqGain);
        sqGain.connect(env);
        env.connect(filt);
        if (trackVoice(o1, [o1, o2, sqGain, env])) {
          o1.start(when);
          o2.start(when);
          o1.stop(when + s.dur + 0.02);
          o2.stop(when + s.dur + 0.02);
        }
      }

      playCoinCascade(5, 0.28);
    }

    // 10. Result Climax Fanfares (Triumph / Neutral / Goofy Low-Score Sad Horn)
    function playResultTriumph() {
      var c = ensureReady();
      if (!c) return;
      var t0 = c.currentTime;
      var notes = [523.25, 659.25, 783.99, 1046.50]; // C5 E5 G5 C6
      for (var i = 0; i < notes.length; i++) {
        var when = t0 + i * 0.075;
        var dur = i === notes.length - 1 ? 0.42 : 0.16;
        var osc = c.createOscillator();
        var env = c.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(notes[i], when);
        env.gain.setValueAtTime(0.0001, when);
        env.gain.linearRampToValueAtTime(0.18, when + 0.008);
        env.gain.exponentialRampToValueAtTime(0.0001, when + dur);
        osc.connect(env);
        env.connect(compressor);
        if (trackVoice(osc, [osc, env])) {
          osc.start(when);
          osc.stop(when + dur + 0.02);
        }
      }
    }

    function playResultNeutral() {
      var c = ensureReady();
      if (!c) return;
      var t0 = c.currentTime;
      var notes = [440.00, 554.37, 659.25]; // A4 C#5 E5
      for (var i = 0; i < notes.length; i++) {
        var when = t0 + i * 0.08;
        var osc = c.createOscillator();
        var env = c.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(notes[i], when);
        env.gain.setValueAtTime(0.0001, when);
        env.gain.linearRampToValueAtTime(0.14, when + 0.008);
        env.gain.exponentialRampToValueAtTime(0.0001, when + 0.24);
        osc.connect(env);
        env.connect(compressor);
        if (trackVoice(osc, [osc, env])) {
          osc.start(when);
          osc.stop(when + 0.26);
        }
      }
    }

    function playResultSadHorn() {
      var c = ensureReady();
      if (!c) return;
      var t0 = c.currentTime;
      var notes = [
        { hz: 293.66, at: 0.00, dur: 0.22, droop: false }, // D4
        { hz: 261.63, at: 0.24, dur: 0.22, droop: false }, // C4
        { hz: 220.00, at: 0.48, dur: 0.52, droop: true }   // A3 -> goofy droop
      ];
      for (var i = 0; i < notes.length; i++) {
        var n = notes[i];
        var when = t0 + n.at;
        var osc = c.createOscillator();
        var filt = c.createBiquadFilter();
        var env = c.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(n.hz, when);
        if (n.droop) {
          osc.frequency.linearRampToValueAtTime(n.hz - 38, when + 0.48);
        }
        filt.type = 'lowpass';
        filt.frequency.setValueAtTime(680, when);
        filt.Q.setValueAtTime(3.2, when);
        env.gain.setValueAtTime(0.0001, when);
        env.gain.linearRampToValueAtTime(0.18, when + 0.02);
        env.gain.exponentialRampToValueAtTime(0.0001, when + n.dur);
        osc.connect(filt);
        filt.connect(env);
        env.connect(compressor);
        if (trackVoice(osc, [osc, filt, env])) {
          osc.start(when);
          osc.stop(when + n.dur + 0.03);
        }
      }
    }

    // =========================================================================
    // 3. EVENT WIRING (Preserved WP_AUDIO Bridges + Deduped JuiceSynth Hooks)
    // =========================================================================
    var lastComboAt = 0;
    var lastMissAt = 0;
    var lastJackpotArriveAt = 0;
    var lastAllInAt = 0;
    var lastFeverAt = 0;
    var lastNewRecordAt = 0;

    // Preserved base foley bridges
    window.addEventListener('wp:card', function (e) {
      fire('card-rise', e.detail);
    });

    window.addEventListener('wp:fling', function (e) {
      fire('paper-fling', e.detail);
    });

    window.addEventListener('wp:answer', function (e) {
      var d = e.detail || {};
      fire('stamp', {
        kind: d.verdict === 'real-unproven' ? 'unproven' : d.verdict === 'made-up' ? 'made-up' : 'real',
        x: d.x
      });
      fire(d.correct ? 'correct' : 'wrong', d);

      var tMs = nowMs();
      if (d.correct) {
        lastComboAt = tMs;
        playComboChime(d.streak || 1, d.x);
      } else {
        lastMissAt = tMs;
        var heavyFail = !!(d.busted || d.streakBroken || (typeof d.prevStreak === 'number' && d.prevStreak >= 3));
        if (heavyFail) {
          playBustSadTrombone(!!d.busted);
        } else {
          playMissBuzzer();
        }
      }
    });

    // Deduped streak hook (only triggers if fired independently of wp:answer)
    window.addEventListener('wp:streak', function (e) {
      var tMs = nowMs();
      if (tMs - lastComboAt < 120) return;
      lastComboAt = tMs;
      var d = e.detail || {};
      playComboChime(d.streak || 1, d.x);
    });

    // Deduped miss / bust hooks
    var onMissAlias = function (isBust) {
      return function (e) {
        var tMs = nowMs();
        if (tMs - lastMissAt < 120) return;
        lastMissAt = tMs;
        var d = e.detail || {};
        if (isBust || d.busted || d.streakBroken) {
          playBustSadTrombone(isBust || !!d.busted);
        } else {
          playMissBuzzer();
        }
      };
    };
    window.addEventListener('wp:miss', onMissAlias(false));
    window.addEventListener('wp:bust', onMissAlias(true));

    // Odometer rollup tick
    window.addEventListener('wp:score-tick', function (e) {
      playScoreTick(e.detail);
    });

    // Speed bonus electric zip
    window.addEventListener('wp:speed-bonus', function () {
      playSpeedBonus();
    });

    // Jackpot card enter (spec: wp:jackpot-arrive, alias: wp:jackpot-card)
    var onJackpotArrive = function () {
      var tMs = nowMs();
      if (tMs - lastJackpotArriveAt < 120) return;
      lastJackpotArriveAt = tMs;
      playJackpotArrive();
    };
    window.addEventListener('wp:jackpot-arrive', onJackpotArrive);
    window.addEventListener('wp:jackpot-card', onJackpotArrive);

    // Jackpot win coin cascade
    window.addEventListener('wp:jackpot-hit', function () {
      playJackpotHit();
    });

    // All-In toggle (spec: wp:allin-toggle, alias: wp:all-in)
    var onAllIn = function (e) {
      var tMs = nowMs();
      if (tMs - lastAllInAt < 80) return;
      lastAllInAt = tMs;
      playAllInToggle(e.detail);
    };
    window.addEventListener('wp:allin-toggle', onAllIn);
    window.addEventListener('wp:all-in', onAllIn);

    // Fever tier climb (spec: wp:fever-up, alias: wp:fever)
    var onFever = function (e) {
      var tMs = nowMs();
      if (tMs - lastFeverAt < 120) return;
      lastFeverAt = tMs;
      playFeverUp(e.detail);
    };
    window.addEventListener('wp:fever-up', onFever);
    window.addEventListener('wp:fever', onFever);

    // New Hall of Fame record fanfare (deduped with wp:result when isNewRecord is set)
    window.addEventListener('wp:new-record', function () {
      var tMs = nowMs();
      if (tMs - lastNewRecordAt < 450) return;
      lastNewRecordAt = tMs;
      playNewRecordFanfare();
    });

    // Result screen climax
    window.addEventListener('wp:result', function (e) {
      if (window.WP_AUDIO && typeof window.WP_AUDIO.play === 'function') {
        window.WP_AUDIO.play('sfx/paper-fling', { rate: 0.72, gain: 0.65 });
        window.WP_AUDIO.play('sfx/thump-low', { rate: 1.1, gain: 0.4 });
      }
      var tMs = nowMs();
      if (tMs - lastNewRecordAt < 450) return;

      var d = e.detail || {};
      if (d.isNewRecord || d.newRecord) {
        lastNewRecordAt = tMs;
        playNewRecordFanfare();
      } else if ((typeof d.points === 'number' && d.points >= 2000) || (typeof d.accuracy === 'number' && d.accuracy >= 7)) {
        playResultTriumph();
      } else if ((typeof d.accuracy === 'number' && d.accuracy <= 3) || (typeof d.points === 'number' && d.points < 600)) {
        playResultSadHorn();
      } else {
        playResultNeutral();
      }
    });
  } catch (_) {}
})();
