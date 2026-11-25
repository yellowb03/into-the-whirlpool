/*
 * audio.js (v2) — Hybrid sample + generative Web Audio soundtrack for Into the Whirlpool
 *
 * Implements SOUND.md v2 on top of the GEMINI.md v1 synth engine:
 *  - Manifest-driven dual-format loader (.webm Opus / .m4a AAC via canPlayType)
 *  - Staged lazy-loading: UI/core SFX -> cover/amb -> current era -> next era ahead
 *  - 5-bus mix: music (stems), synth (v1), amb, sfx, ui -> master EQ -> limiter -> out
 *  - Stamps & Crossing duck music by ~5 dB for 300 ms while keeping foley crystal clear
 *  - Bar-synced stem crossfades (2 bars) & era crossfades (1 bar)
 *  - Round-robin variations (no immediate repeat), ±3% pitch, ±1.5 dB gain, screen-x pan,
 *    max 3 simultaneous copies per sound, max 32 total voices
 *  - Mute toggle + compact Sound Settings sheet (full / music off / effects only / off)
 *  - iOS Safari touch unlock + silent buffer prime, visibilitychange suspend/resume
 *  - Exposes exactly one global: window.WP_AUDIO
 */
(function () {
  'use strict';

  // =========================================================================
  // 1. MIX & TUNING CONFIGURATION
  // =========================================================================
  var MIX = {
    masterGain: 0.80,
    musicStemsBusGain: 0.88,
    synthBusGain: 0.56,         // V1 synth runs underneath & boosts automatically if stems missing
    synthFallbackGain: 0.86,    // V1 synth level when sample stems aren't loaded
    ambBusGain: 0.65,
    sfxBusGain: 0.92,
    uiBusGain: 0.85,

    reverbWetBase: 0.26,
    reverbWetSlowBoost: 0.34,
    reverbWetFutureBoost: 0.24,
    reverbSeconds: 2.8,
    reverbDecay: 2.6,
    roomReverbSend: 0.14,       // Short room send for dry SFX/UI

    droneGain: 0.22,
    fanNoiseGain: 0.05,
    pulseBassGain: 0.20,
    arpGain: 0.13,
    glassGain: 0.11,
    wordGain: 0.12,
    headlineGain: 0.042,
    yearBoomGain: 0.32,
    focusSwellGain: 0.15,
    spinWhooshMaxGain: 0.19,
    panelToneGain: 0.12,
    panelDuckGain: 0.316,       // -10 dB when case file is open (SOUND.md sec 5)
    stampDuckGain: 0.56,        // -5 dB dip for 300ms on stamps/Crossing

    maxCutoffHz: 7800,
    slowMinCutoffHz: 620,
    panelCutoffHz: 900,

    maxVoices: 32,              // Hard cap across sample + synth voices
    maxCopiesPerSound: 3,       // Max simultaneous copies of the same sound
    scheduleAheadSec: 0.13,
    schedulerTickMs: 40,
    headlineMinGapSec: 0.18,
    wordMinGapSec: 0.14
  };

  var STORAGE_MUTE_KEY = 'wp_audio_muted';
  var STORAGE_MODE_KEY = 'wp_audio_mode';
  var MANIFEST_URL = 'assets/audio/manifest.json';
  var AUDIO_BASE = 'assets/audio/';

  var SOUND_MODES = ['full', 'music-off', 'effects-only', 'off'];
  var SOUND_MODE_LABELS = {
    'full': 'Full',
    'music-off': 'Music off',
    'effects-only': 'Effects only',
    'off': 'Off'
  };

  // =========================================================================
  // 2. HARMONIC ERAS & MATH HELPERS
  // =========================================================================
  function midiToHz(midi) {
    return 440 * Math.pow(2, (midi - 69) / 12);
  }
  function clamp(v, lo, hi) {
    return v < lo ? lo : v > hi ? hi : v;
  }
  function lerp(a, b, t) {
    return a + (b - a) * t;
  }
  function hashString(str) {
    var h = 2166136261;
    if (!str) return 0;
    for (var i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul ? Math.imul(h, 16777619) : (h * 16777619) | 0;
    }
    return h >>> 0;
  }

  var ERAS = [
    { id: 0, name: 'lab',       rootMidi: 38, fifthMidi: 45, scale: [0, 2, 3, 5, 7, 9, 10], baseBpm: 72,  bars: 8, droneWave: 'sine',     filterBase: 1400, drive: 0.0  },
    { id: 1, name: 'attention', rootMidi: 41, fifthMidi: 48, scale: [0, 2, 4, 6, 7, 9, 11], baseBpm: 104, bars: 8, droneWave: 'triangle', filterBase: 2600, drive: 0.08 },
    { id: 2, name: 'boom',      rootMidi: 43, fifthMidi: 50, scale: [0, 2, 4, 5, 7, 9, 10], baseBpm: 122, bars: 8, droneWave: 'sawtooth', filterBase: 4600, drive: 0.35 },
    { id: 3, name: 'future',    rootMidi: 37, fifthMidi: 44, scale: [0, 1, 4, 6, 7, 8, 11], baseBpm: 132, bars: 8, droneWave: 'sawtooth', filterBase: 5400, drive: 0.55 }
  ];

  function getEraIndex(date) {
    if (date < 2017.0) return 0;
    if (date < 2023.0) return 1;
    if (date < 2026.85) return 2;
    return 3;
  }

  // =========================================================================
  // 3. STATE
  // =========================================================================
  var ctx = null;
  var started = false;
  var iosUnlocked = false;
  var isMuted = false;
  var soundMode = 'full'; // 'full' | 'music-off' | 'effects-only' | 'off'
  var isHidden = false;
  var activeVoices = 0;

  // Buses
  var masterGain = null;
  var masterToneFilter = null;
  var limiter = null;

  var musicGroupGain = null;    // Holds musicStemsBus + synthBus + ambBus (for ducking & mode)
  var musicDuckGain = null;     // Short stamp / Crossing ducking
  var musicFilter = null;       // Slow-time + panel low-pass (900 Hz on pause)
  var musicPanner = null;

  var musicStemsBus = null;
  var synthBus = null;
  var sidechainGain = null;
  var ambBus = null;
  var sfxBus = null;
  var uiBus = null;

  var reverbNode = null;
  var reverbSend = null;
  var reverbReturn = null;
  var roomReverbNode = null;
  var roomReverbSend = null;
  var roomReverbReturn = null;

  var driveShaper = null;
  var driveWet = null;
  var driveDry = null;

  // V1 Continuous beds
  var droneOsc1 = null, droneOsc2 = null, droneFilter = null, droneGainNode = null;
  var fanSource = null, fanFilter = null, fanGainNode = null;
  var spinSource = null, spinFilter = null, spinGainNode = null, spinPanner = null;
  var panelOsc1 = null, panelOsc2 = null, panelFilter = null, panelGainNode = null;
  var noiseBuffer = null;

  // Sample Loader & Playback Cache
  var manifest = null;
  var preferredExt = '.webm';
  var bufferCache = Object.create(null);   // key -> AudioBuffer
  var loadingKeys = Object.create(null);   // key -> Promise
  var lastVariation = Object.create(null); // soundKey -> last 1-based index
  var soundCopies = Object.create(null);   // soundKey -> active count

  // Adaptive Stem Playback State
  var musicClockT0 = 0;
  var activeEraStems = Object.create(null); // eraName -> { stemName: { src, gain, target } }
  var activeStemEraName = null;
  var coverLoopHandle = null;
  var vortexAmbHandle = null;

  // Scheduler & Engine State
  var schedulerTimer = null;
  var rafId = null;
  var nextStepTime = 0;
  var stepIndex = 0;
  var polyStepIndex = 0;
  var nextPolyTime = 0;

  var wpState = {
    date: 2012.0,
    prog: 0.0,
    slow: 0.0,
    pause: 0.0,
    spinV: 0.0,
    streak: 0,
    mode: 'play',
    cover: false,
    focus: null,
    open: null,
    started: false
  };

  var prevSlow = 0.0;
  var currentEraIdx = 0;
  var nowCrossingActiveUntil = 0;
  var restartMuteUntil = 0;
  var lastHeadlineTime = 0;
  var lastWordTime = 0;
  var motifMemory = [0, 2, 4, 2];

  // UI elements
  var muteBtn = null;
  var settingsBtn = null;
  var settingsSheet = null;
  var settingsOpen = false;

  // =========================================================================
  // 4. STORAGE & FORMAT DETECTION
  // =========================================================================
  function readStorage(key, fallback) {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        var v = window.localStorage.getItem(key);
        return v !== null ? v : fallback;
      }
    } catch (_) {}
    return fallback;
  }

  function writeStorage(key, val) {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(key, String(val));
      }
    } catch (_) {}
  }

  function detectAudioFormat() {
    try {
      if (typeof document !== 'undefined' && document.createElement) {
        var a = document.createElement('audio');
        if (a && typeof a.canPlayType === 'function') {
          var opus = a.canPlayType('audio/webm; codecs="opus"');
          if (opus === 'probably' || opus === 'maybe') return '.webm';
          var aac = a.canPlayType('audio/mp4; codecs="mp4a.40.2"');
          if (aac === 'probably' || aac === 'maybe') return '.m4a';
        }
      }
    } catch (_) {}
    return '.m4a';
  }

  // =========================================================================
  // 5. BUFFER & IR GENERATORS
  // =========================================================================
  function createNoiseBuffer(audioCtx, durationSec) {
    var length = Math.floor(audioCtx.sampleRate * durationSec);
    var buffer = audioCtx.createBuffer(2, length, audioCtx.sampleRate);
    for (var ch = 0; ch < 2; ch++) {
      var data = buffer.getChannelData(ch);
      var b0 = 0, b1 = 0, b2 = 0;
      for (var i = 0; i < length; i++) {
        var w = Math.random() * 2 - 1;
        b0 = 0.99765 * b0 + w * 0.0990460;
        b1 = 0.96300 * b1 + w * 0.2965164;
        b2 = 0.57000 * b2 + w * 1.0526913;
        data[i] = clamp((b0 + b1 + b2 + w * 0.1848) * 0.16, -1, 1);
      }
    }
    return buffer;
  }

  function createImpulseResponse(audioCtx, durationSec, decay, lpWeight) {
    var rate = audioCtx.sampleRate;
    var length = Math.floor(rate * durationSec);
    var impulse = audioCtx.createBuffer(2, length, rate);
    var w = lpWeight || 0.62;
    for (var ch = 0; ch < 2; ch++) {
      var data = impulse.getChannelData(ch);
      var lp = 0;
      for (var i = 0; i < length; i++) {
        var t = i / length;
        var env = (i < rate * 0.015 ? i / (rate * 0.015) : 1) * Math.pow(1 - t, decay);
        lp = lp * w + (Math.random() * 2 - 1) * (1 - w);
        data[i] = lp * env;
      }
    }
    return impulse;
  }

  function createSoftClipCurve(amount) {
    var samples = 512;
    var curve = new Float32Array(samples);
    var k = amount * 18 + 1;
    for (var i = 0; i < samples; i++) {
      var x = (i * 2) / samples - 1;
      curve[i] = Math.tanh ? Math.tanh(x * k) / Math.tanh(k) : clamp(x * 1.5, -1, 1);
    }
    return curve;
  }

  function createPanner(audioCtx) {
    if (typeof audioCtx.createStereoPanner === 'function') {
      return audioCtx.createStereoPanner();
    }
    var g = audioCtx.createGain();
    g.pan = { value: 0, setTargetAtTime: function () {} };
    return g;
  }

  // =========================================================================
  // 6. AUDIO GRAPH INITIALIZATION (5 BUSES + MASTER EQ + LIMITER)
  // =========================================================================
  function initAudio() {
    if (ctx) return true;
    try {
      var AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return false;
      ctx = new AudioCtx();
      var now = ctx.currentTime;
      musicClockT0 = now;

      // Master EQ (<= 7.8 kHz) -> Limiter -> Master Gain -> Out
      masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(isMuted || soundMode === 'off' ? 0.0001 : MIX.masterGain, now);

      limiter = ctx.createDynamicsCompressor();
      limiter.threshold.setValueAtTime(-6, now);
      limiter.knee.setValueAtTime(8, now);
      limiter.ratio.setValueAtTime(12, now);
      limiter.attack.setValueAtTime(0.003, now);
      limiter.release.setValueAtTime(0.16, now);

      masterToneFilter = ctx.createBiquadFilter();
      masterToneFilter.type = 'lowpass';
      masterToneFilter.frequency.setValueAtTime(MIX.maxCutoffHz, now);
      masterToneFilter.Q.setValueAtTime(0.55, now);

      masterToneFilter.connect(limiter);
      limiter.connect(masterGain);
      masterGain.connect(ctx.destination);

      // Shared Music/Synth/Amb Group -> Duck -> Filter -> Drive -> Pan -> Master EQ
      musicGroupGain = ctx.createGain();
      musicGroupGain.gain.setValueAtTime(1.0, now);

      musicDuckGain = ctx.createGain();
      musicDuckGain.gain.setValueAtTime(1.0, now);

      musicFilter = ctx.createBiquadFilter();
      musicFilter.type = 'lowpass';
      musicFilter.frequency.setValueAtTime(MIX.maxCutoffHz, now);
      musicFilter.Q.setValueAtTime(0.75, now);

      driveDry = ctx.createGain();
      driveDry.gain.setValueAtTime(1.0, now);
      driveWet = ctx.createGain();
      driveWet.gain.setValueAtTime(0.0001, now);
      driveShaper = ctx.createWaveShaper();
      driveShaper.curve = createSoftClipCurve(0.45);
      driveShaper.oversample = '2x';

      musicPanner = createPanner(ctx);

      musicGroupGain.connect(musicDuckGain);
      musicDuckGain.connect(musicFilter);
      musicFilter.connect(driveDry);
      musicFilter.connect(driveShaper);
      driveShaper.connect(driveWet);
      driveDry.connect(musicPanner);
      driveWet.connect(musicPanner);
      musicPanner.connect(masterToneFilter);

      // Bus 1: music (stems)
      musicStemsBus = ctx.createGain();
      musicStemsBus.gain.setValueAtTime(MIX.musicStemsBusGain, now);
      musicStemsBus.connect(musicGroupGain);

      // Bus 2: synth (v1)
      synthBus = ctx.createGain();
      synthBus.gain.setValueAtTime(MIX.synthFallbackGain, now);
      sidechainGain = ctx.createGain();
      sidechainGain.gain.setValueAtTime(1.0, now);
      synthBus.connect(sidechainGain);
      sidechainGain.connect(musicGroupGain);

      // Bus 3: amb
      ambBus = ctx.createGain();
      ambBus.gain.setValueAtTime(MIX.ambBusGain, now);
      ambBus.connect(musicGroupGain);

      // Long shared convolver (music + synth)
      reverbNode = ctx.createConvolver();
      reverbNode.buffer = createImpulseResponse(ctx, MIX.reverbSeconds, MIX.reverbDecay, 0.64);
      reverbSend = ctx.createGain();
      reverbSend.gain.setValueAtTime(MIX.reverbWetBase, now);
      reverbReturn = ctx.createGain();
      reverbReturn.gain.setValueAtTime(0.70, now);
      musicFilter.connect(reverbSend);
      reverbSend.connect(reverbNode);
      reverbNode.connect(reverbReturn);
      reverbReturn.connect(masterToneFilter);

      // Bus 4 & 5: sfx & ui (dry + short room reverb send, bypass music duck & panel filter)
      sfxBus = ctx.createGain();
      sfxBus.gain.setValueAtTime(MIX.sfxBusGain, now);
      uiBus = ctx.createGain();
      uiBus.gain.setValueAtTime(MIX.uiBusGain, now);

      sfxBus.connect(masterToneFilter);
      uiBus.connect(masterToneFilter);

      roomReverbNode = ctx.createConvolver();
      roomReverbNode.buffer = createImpulseResponse(ctx, 0.55, 5.2, 0.45);
      roomReverbSend = ctx.createGain();
      roomReverbSend.gain.setValueAtTime(MIX.roomReverbSend, now);
      roomReverbReturn = ctx.createGain();
      roomReverbReturn.gain.setValueAtTime(0.55, now);

      sfxBus.connect(roomReverbSend);
      uiBus.connect(roomReverbSend);
      roomReverbSend.connect(roomReverbNode);
      roomReverbNode.connect(roomReverbReturn);
      roomReverbReturn.connect(masterToneFilter);

      // Shared noise buffer + v1 continuous beds
      noiseBuffer = createNoiseBuffer(ctx, 2.2);

      // Bed 1: Tonal drone
      droneFilter = ctx.createBiquadFilter();
      droneFilter.type = 'lowpass';
      droneFilter.frequency.setValueAtTime(360, now);
      droneFilter.Q.setValueAtTime(1.1, now);
      droneGainNode = ctx.createGain();
      droneGainNode.gain.setValueAtTime(0.0001, now);

      droneOsc1 = ctx.createOscillator();
      droneOsc1.type = 'sine';
      droneOsc1.frequency.setValueAtTime(midiToHz(ERAS[0].rootMidi), now);
      droneOsc2 = ctx.createOscillator();
      droneOsc2.type = 'triangle';
      droneOsc2.frequency.setValueAtTime(midiToHz(ERAS[0].fifthMidi), now);
      var d2g = ctx.createGain();
      d2g.gain.setValueAtTime(0.42, now);

      droneOsc1.connect(droneFilter);
      droneOsc2.connect(d2g);
      d2g.connect(droneFilter);
      droneFilter.connect(droneGainNode);
      droneGainNode.connect(synthBus);
      droneOsc1.start(now);
      droneOsc2.start(now);

      // Bed 2: Server fan
      fanSource = ctx.createBufferSource();
      fanSource.buffer = noiseBuffer;
      fanSource.loop = true;
      fanFilter = ctx.createBiquadFilter();
      fanFilter.type = 'bandpass';
      fanFilter.frequency.setValueAtTime(420, now);
      fanFilter.Q.setValueAtTime(1.6, now);
      fanGainNode = ctx.createGain();
      fanGainNode.gain.setValueAtTime(0.0001, now);
      fanSource.connect(fanFilter);
      fanFilter.connect(fanGainNode);
      fanGainNode.connect(synthBus);
      fanSource.start(now);

      // Bed 3: Spin whoosh
      spinSource = ctx.createBufferSource();
      spinSource.buffer = noiseBuffer;
      spinSource.loop = true;
      spinFilter = ctx.createBiquadFilter();
      spinFilter.type = 'bandpass';
      spinFilter.frequency.setValueAtTime(500, now);
      spinFilter.Q.setValueAtTime(2.2, now);
      spinGainNode = ctx.createGain();
      spinGainNode.gain.setValueAtTime(0.0001, now);
      spinPanner = createPanner(ctx);
      spinSource.connect(spinFilter);
      spinFilter.connect(spinGainNode);
      spinGainNode.connect(spinPanner);
      spinPanner.connect(sfxBus);
      spinSource.start(now);

      // Bed 4: Panel sustained tone
      panelFilter = ctx.createBiquadFilter();
      panelFilter.type = 'lowpass';
      panelFilter.frequency.setValueAtTime(1200, now);
      panelGainNode = ctx.createGain();
      panelGainNode.gain.setValueAtTime(0.0001, now);
      panelOsc1 = ctx.createOscillator();
      panelOsc1.type = 'sine';
      panelOsc1.frequency.setValueAtTime(midiToHz(50), now);
      panelOsc2 = ctx.createOscillator();
      panelOsc2.type = 'triangle';
      panelOsc2.frequency.setValueAtTime(midiToHz(57), now);
      var p2g = ctx.createGain();
      p2g.gain.setValueAtTime(0.45, now);
      panelOsc1.connect(panelFilter);
      panelOsc2.connect(p2g);
      p2g.connect(panelFilter);
      panelFilter.connect(panelGainNode);
      panelGainNode.connect(masterToneFilter);
      panelGainNode.connect(reverbNode);
      panelOsc1.start(now);
      panelOsc2.start(now);

      droneGainNode.gain.setTargetAtTime(MIX.droneGain, now + 0.05, 0.8);
      fanGainNode.gain.setTargetAtTime(MIX.fanNoiseGain, now + 0.05, 1.0);

      nextStepTime = now + 0.08;
      nextPolyTime = now + 0.25;
      applyBusModes();
      return true;
    } catch (_) {
      return false;
    }
  }

  function unlockIOSAudio() {
    if (!ctx || iosUnlocked) return;
    try {
      if (ctx.state === 'suspended' && typeof ctx.resume === 'function') {
        var p = ctx.resume();
        if (p && typeof p.catch === 'function') p.catch(function () {});
      }
      var silent = ctx.createBuffer(1, 1, ctx.sampleRate || 44100);
      var src = ctx.createBufferSource();
      src.buffer = silent;
      src.connect(ctx.destination);
      src.start(0);
      iosUnlocked = true;
    } catch (_) {}
  }

  // =========================================================================
  // 7. VOICE BUDGET & DUCKING
  // =========================================================================
  function acquireVoice(priority, cost) {
    var c = cost || 1;
    var limit = priority === 0 ? MIX.maxVoices - 6 : priority === 1 ? MIX.maxVoices - 2 : MIX.maxVoices;
    if (activeVoices + c > limit) return false;
    activeVoices += c;
    return true;
  }

  function releaseVoiceOnEnd(node, nodesToDisconnect, cost, soundKey) {
    var c = cost || 1;
    var released = false;
    function cleanup() {
      if (released) return;
      released = true;
      activeVoices = Math.max(0, activeVoices - c);
      if (soundKey && soundCopies[soundKey]) {
        soundCopies[soundKey] = Math.max(0, soundCopies[soundKey] - 1);
      }
      if (nodesToDisconnect) {
        for (var i = 0; i < nodesToDisconnect.length; i++) {
          try { nodesToDisconnect[i].disconnect(); } catch (_) {}
        }
      }
    }
    try {
      node.onended = cleanup;
    } catch (_) {
      setTimeout(cleanup, 1200);
    }
  }

  function duckMusic(dipGain, holdSec) {
    if (!ctx || !musicDuckGain) return;
    try {
      var now = ctx.currentTime;
      var d = dipGain || MIX.stampDuckGain;
      var dur = holdSec || 0.30;
      musicDuckGain.gain.cancelScheduledValues(now);
      musicDuckGain.gain.setTargetAtTime(d, now, 0.015);
      musicDuckGain.gain.setTargetAtTime(1.0, now + dur * 0.45, dur * 0.35);
    } catch (_) {}
  }

  // =========================================================================
  // 8. MANIFEST LOADER & LAZY-LOADING PIPELINE
  // =========================================================================
  function loadBuffer(relPath) {
    if (!ctx) return Promise.resolve(null);
    if (bufferCache[relPath]) return Promise.resolve(bufferCache[relPath]);
    if (loadingKeys[relPath]) return loadingKeys[relPath];
    if (typeof fetch !== 'function') return Promise.resolve(null);

    var url = AUDIO_BASE + relPath + preferredExt;
    var p = fetch(url)
      .then(function (res) {
        if (!res || !res.ok) return null;
        return res.arrayBuffer();
      })
      .then(function (arr) {
        if (!arr || !ctx) return null;
        return ctx.decodeAudioData(arr);
      })
      .then(function (buf) {
        if (buf) bufferCache[relPath] = buf;
        delete loadingKeys[relPath];
        return buf || null;
      })
      .catch(function () {
        delete loadingKeys[relPath];
        return null;
      });

    loadingKeys[relPath] = p;
    return p;
  }

  function loadVariationGroup(folder, name, count) {
    var tasks = [];
    for (var i = 1; i <= count; i++) {
      tasks.push(loadBuffer(folder + '/' + name + '-' + i));
    }
    return Promise.all(tasks);
  }

  function loadEraStems(eraName) {
    if (!manifest || !manifest.music || !manifest.music[eraName]) return Promise.resolve();
    var stems = manifest.music[eraName].stems || [];
    var tasks = [];
    for (var i = 0; i < stems.length; i++) {
      tasks.push(loadBuffer('music/' + eraName + '-' + stems[i]));
    }
    return Promise.all(tasks).then(function () {
      if (activeStemEraName === eraName) {
        syncEraStemsToClock(eraName, false);
      }
    });
  }

  function bootstrapManifestAndLoad() {
    if (typeof fetch !== 'function') return;
    fetch(MANIFEST_URL)
      .then(function (r) { return r && r.ok ? r.json() : null; })
      .then(function (data) {
        if (!data) return;
        manifest = data;

        // Stage 1: UI and core SFX first
        var stage1 = [];
        if (manifest.ui) {
          Object.keys(manifest.ui).forEach(function (k) {
            stage1.push(loadVariationGroup('ui', k, manifest.ui[k]));
          });
        }
        if (manifest.sfx) {
          Object.keys(manifest.sfx).forEach(function (k) {
            stage1.push(loadVariationGroup('sfx', k, manifest.sfx[k]));
          });
        }

        return Promise.all(stage1).then(function () {
          // Stage 2: cover-loop, crossing, and amb/vortex
          var stage2 = [];
          if (Array.isArray(manifest.stingers)) {
            manifest.stingers.forEach(function (s) { stage2.push(loadBuffer('music/' + s)); });
          }
          if (Array.isArray(manifest.amb)) {
            manifest.amb.forEach(function (a) { stage2.push(loadBuffer('amb/' + a)); });
          }
          return Promise.all(stage2);
        }).then(function () {
          startAmbientLoopsIfReady();
          // Stage 3: current era music
          var eraName = ERAS[currentEraIdx].name;
          activeStemEraName = eraName;
          return loadEraStems(eraName);
        }).then(function () {
          // Stage 4: next era in the background
          var nextIdx = (currentEraIdx + 1) % ERAS.length;
          return loadEraStems(ERAS[nextIdx].name);
        });
      })
      .catch(function () {});
  }

  // =========================================================================
  // 9. SAMPLE PLAYBACK ENGINE (Round-robin, ±3% pitch, ±1.5 dB, x-pan, cap 3)
  // =========================================================================
  function isInManifest(folder, name) {
    if (!manifest) return 0;
    if (folder === 'sfx' && manifest.sfx && manifest.sfx[name]) return manifest.sfx[name];
    if (folder === 'ui' && manifest.ui && manifest.ui[name]) return manifest.ui[name];
    if (folder === 'music' && Array.isArray(manifest.stingers) && manifest.stingers.indexOf(name) !== -1) return 1;
    if (folder === 'amb' && Array.isArray(manifest.amb) && manifest.amb.indexOf(name) !== -1) return 1;
    return 0;
  }

  function pickRoundRobin(soundKey, count) {
    if (count <= 1) return 1;
    var prev = lastVariation[soundKey] || 0;
    var idx = (prev % count) + 1;
    // Small random skip when count >= 3 so pattern feels organic while never repeating prev
    if (count >= 3 && Math.random() < 0.45) {
      idx = ((idx) % count) + 1;
      if (idx === prev) idx = (idx % count) + 1;
    }
    lastVariation[soundKey] = idx;
    return idx;
  }

  function computePanFromOpts(opts) {
    if (!opts) return 0;
    if (typeof opts.pan === 'number' && isFinite(opts.pan)) return clamp(opts.pan, -0.6, 0.6);
    if (typeof opts.x === 'number' && isFinite(opts.x)) {
      var norm = opts.x;
      if (norm > 1.0 && typeof window !== 'undefined' && window.innerWidth > 0) {
        norm = norm / window.innerWidth;
      }
      return clamp((norm * 2 - 1) * 0.6, -0.6, 0.6);
    }
    return 0;
  }

  function playSample(folder, name, opts) {
    if (!ctx || !started || isHidden) return false;
    var count = isInManifest(folder, name);
    if (!count) return false;

    var soundKey = folder + '/' + name;
    var activeCount = soundCopies[soundKey] || 0;
    if (activeCount >= MIX.maxCopiesPerSound) return true; // Capped cleanly, don't fallback

    var variation = count > 1 ? pickRoundRobin(soundKey, count) : 0;
    var relPath = variation ? (soundKey + '-' + variation) : soundKey;
    var buf = bufferCache[relPath];
    if (!buf) {
      loadBuffer(relPath); // Lazy fetch for next time
      return false;        // Trigger synth fallback
    }

    if (!acquireVoice(1, 1)) return true;
    try {
      var now = ctx.currentTime;
      var when = (opts && typeof opts.when === 'number') ? Math.max(now, opts.when) : now;

      var src = ctx.createBufferSource();
      src.buffer = buf;

      // ±3% pitch variation unless exact pitch override is supplied (e.g. tonal correct scale)
      var jitterPitch = (opts && opts.noPitchJitter) ? 1.0 : (0.97 + Math.random() * 0.06);
      var baseRate = (opts && typeof opts.rate === 'number') ? opts.rate : 1.0;
      src.playbackRate.setValueAtTime(clamp(baseRate * jitterPitch, 0.25, 4.0), when);

      // ±1.5 dB gain variation
      var dbJitter = (Math.random() * 3.0) - 1.5;
      var gainJitter = Math.pow(10, dbJitter / 20);
      var baseGain = (opts && typeof opts.gain === 'number') ? opts.gain : 1.0;

      var env = ctx.createGain();
      env.gain.setValueAtTime(clamp(baseGain * gainJitter, 0.001, 2.0), when);

      var pan = createPanner(ctx);
      pan.pan.setTargetAtTime(computePanFromOpts(opts), when, 0.005);

      var targetBus = folder === 'ui' ? uiBus : folder === 'music' ? musicStemsBus : sfxBus;
      src.connect(env);
      env.connect(pan);
      pan.connect(targetBus);

      soundCopies[soundKey] = activeCount + 1;
      src.start(when);
      releaseVoiceOnEnd(src, [src, env, pan], 1, soundKey);
      return true;
    } catch (_) {
      activeVoices = Math.max(0, activeVoices - 1);
      return false;
    }
  }

  // =========================================================================
  // 10. BAR-SYNCED ADAPTIVE STEM ENGINE
  // =========================================================================
  function getBarLengthSec(eraName) {
    var meta = manifest && manifest.music && manifest.music[eraName];
    var bpm = (meta && meta.bpm) || 100;
    return (60 / bpm) * 4;
  }

  function getNextBarTime(eraName) {
    var now = ctx.currentTime;
    var barLen = getBarLengthSec(eraName);
    var elapsed = Math.max(0, now - musicClockT0);
    var curBar = Math.floor(elapsed / barLen);
    return musicClockT0 + (curBar + 1) * barLen;
  }

  function getDesiredStemMix() {
    var isExplore = wpState.mode === 'explore';
    return {
      bed: 1.0,
      pulse: (!isExplore && wpState.streak >= 3) ? 1.0 : 0.0,
      melody: (!isExplore && (wpState.streak >= 6 || wpState.prog > 0.6)) ? 1.0 : 0.0,
      texture: (wpState.slow > 0.3 || wpState.prog > 0.85) ? 1.0 : 0.0
    };
  }

  function stopEraStems(eraName, fadeSec) {
    var group = activeEraStems[eraName];
    if (!group || !ctx) return;
    var now = ctx.currentTime;
    Object.keys(group).forEach(function (stem) {
      var h = group[stem];
      try {
        h.gain.gain.cancelScheduledValues(now);
        h.gain.gain.setTargetAtTime(0.0001, now, Math.max(0.05, fadeSec / 3));
        h.src.stop(now + fadeSec + 0.15);
      } catch (_) {}
    });
    delete activeEraStems[eraName];
  }

  function syncEraStemsToClock(eraName, isEraSwitch) {
    if (!ctx || !manifest || !manifest.music || !manifest.music[eraName]) return;
    var meta = manifest.music[eraName];
    var stems = meta.stems || [];
    var barLen = getBarLengthSec(eraName);
    var now = ctx.currentTime;
    var nextBar = getNextBarTime(eraName);
    var desired = getDesiredStemMix();

    // Fade out any other era over 1 bar
    if (isEraSwitch) {
      Object.keys(activeEraStems).forEach(function (other) {
        if (other !== eraName) stopEraStems(other, barLen);
      });
    }

    if (!activeEraStems[eraName]) activeEraStems[eraName] = {};
    var group = activeEraStems[eraName];
    var hasAnyLoadedStem = false;

    for (var i = 0; i < stems.length; i++) {
      var sName = stems[i];
      var key = 'music/' + eraName + '-' + sName;
      var buf = bufferCache[key];
      if (!buf) continue;
      hasAnyLoadedStem = true;

      var targetLevel = desired[sName] || 0;
      if (!group[sName]) {
        try {
          var src = ctx.createBufferSource();
          src.buffer = buf;
          src.loop = true;
          src.loopStart = 0;
          src.loopEnd = Math.min(buf.duration, barLen * (((manifest && manifest.music && manifest.music[eraName]) || {}).bars || 8));
          var g = ctx.createGain();
          g.gain.setValueAtTime(0.0001, now);
          src.connect(g);
          g.connect(musicStemsBus);

          // Align phase to shared bar clock
          var startWhen = isEraSwitch ? nextBar : now;
          var offset = ((startWhen - musicClockT0) % buf.duration + buf.duration) % buf.duration;
          src.start(startWhen, offset);

          var fadeDur = isEraSwitch ? barLen : barLen * 2;
          if (targetLevel > 0) {
            g.gain.setValueAtTime(0.0001, startWhen);
            g.gain.linearRampToValueAtTime(targetLevel, startWhen + fadeDur);
          }
          group[sName] = { src: src, gain: g, target: targetLevel };
        } catch (_) {}
      } else if (group[sName].target !== targetLevel) {
        // Stem enters/exits on next bar boundary over 2 bars
        var h = group[sName];
        h.target = targetLevel;
        try {
          h.gain.gain.cancelScheduledValues(nextBar);
          h.gain.gain.setValueAtTime(Math.max(0.0001, h.gain.gain.value), nextBar);
          h.gain.gain.linearRampToValueAtTime(Math.max(0.0001, targetLevel), nextBar + barLen * 2);
        } catch (_) {}
      }
    }

    // Balance v1 synth bus: softer underneath when stems are active, full fallback when missing
    if (synthBus) {
      var targetSynth = hasAnyLoadedStem ? MIX.synthBusGain : MIX.synthFallbackGain;
      synthBus.gain.setTargetAtTime(targetSynth, now, 0.35);
    }
  }

  function startAmbientLoopsIfReady() {
    if (!ctx || !started) return;
    var now = ctx.currentTime;
    // Start amb/vortex seamlessly if loaded
    if (!vortexAmbHandle && bufferCache['amb/vortex']) {
      try {
        var vs = ctx.createBufferSource();
        vs.buffer = bufferCache['amb/vortex'];
        vs.loop = true;
        var vg = ctx.createGain();
        vg.gain.setValueAtTime(0.0001, now);
        vg.gain.setTargetAtTime(0.85, now + 0.05, 0.8);
        vs.connect(vg);
        vg.connect(ambBus);
        vs.start(now);
        vortexAmbHandle = { src: vs, gain: vg };
      } catch (_) {}
    }
    // Cover loop if cover state is active
    if (wpState.cover && !coverLoopHandle && bufferCache['music/cover-loop']) {
      try {
        var cs = ctx.createBufferSource();
        cs.buffer = bufferCache['music/cover-loop'];
        cs.loop = true;
        var cg = ctx.createGain();
        cg.gain.setValueAtTime(0.0001, now);
        cg.gain.setTargetAtTime(0.9, now + 0.05, 0.6);
        cs.connect(cg);
        cg.connect(musicStemsBus);
        cs.start(now);
        coverLoopHandle = { src: cs, gain: cg };
      } catch (_) {}
    }
  }

  // =========================================================================
  // 11. V1 SYNTHESIS VOICES (Underneath & Fallback)
  // =========================================================================
  function getSlowPitchFactor() {
    return Math.pow(2, (-2.4 * wpState.slow) / 12);
  }

  function getFutureDetuneCents(eraIdx) {
    if (eraIdx < 3) return eraIdx === 2 ? (Math.random() - 0.5) * 6 : 0;
    var madness = clamp((wpState.prog - 0.45) / 0.55, 0, 1);
    return (Math.random() - 0.5) * 2 * lerp(8, 38, madness);
  }

  function playGlassNote(time, midi, gainAmt, durSec) {
    if (!ctx || !acquireVoice(1, 2)) return;
    try {
      var freq = midiToHz(midi) * getSlowPitchFactor();
      var osc = ctx.createOscillator();
      var mod = ctx.createOscillator();
      var modGain = ctx.createGain();
      var env = ctx.createGain();
      var pan = createPanner(ctx);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, time);
      mod.type = 'sine';
      mod.frequency.setValueAtTime(freq * 2.0, time);
      modGain.gain.setValueAtTime(freq * 0.45, time);
      modGain.gain.exponentialRampToValueAtTime(0.01, time + durSec * 0.65);
      env.gain.setValueAtTime(0.0001, time);
      env.gain.linearRampToValueAtTime(gainAmt, time + 0.025);
      env.gain.exponentialRampToValueAtTime(0.0001, time + durSec);
      pan.pan.setTargetAtTime((Math.random() - 0.5) * 0.6, time, 0.01);
      mod.connect(modGain);
      modGain.connect(osc.frequency);
      osc.connect(env);
      env.connect(pan);
      pan.connect(synthBus);
      osc.start(time);
      mod.start(time);
      osc.stop(time + durSec + 0.04);
      mod.stop(time + durSec + 0.04);
      releaseVoiceOnEnd(osc, [osc, mod, modGain, env, pan], 2);
    } catch (_) {
      activeVoices = Math.max(0, activeVoices - 2);
    }
  }

  function playArpNote(time, midi, gainAmt, durSec, brightness, detuneCents, waveType) {
    if (!ctx || !acquireVoice(1, 1)) return;
    try {
      var freq = midiToHz(midi) * getSlowPitchFactor();
      var osc = ctx.createOscillator();
      var filt = ctx.createBiquadFilter();
      var env = ctx.createGain();
      var pan = createPanner(ctx);
      osc.type = waveType || 'triangle';
      osc.frequency.setValueAtTime(freq, time);
      if (detuneCents) osc.detune.setValueAtTime(detuneCents, time);
      var cutoff = clamp(brightness, 350, MIX.maxCutoffHz);
      filt.type = 'lowpass';
      filt.frequency.setValueAtTime(cutoff, time);
      filt.frequency.exponentialRampToValueAtTime(Math.max(240, cutoff * 0.35), time + durSec);
      filt.Q.setValueAtTime(1.4, time);
      env.gain.setValueAtTime(0.0001, time);
      env.gain.linearRampToValueAtTime(gainAmt, time + 0.014);
      env.gain.exponentialRampToValueAtTime(0.0001, time + durSec);
      pan.pan.setTargetAtTime((Math.random() - 0.5) * 0.6, time, 0.01);
      osc.connect(filt);
      filt.connect(env);
      env.connect(pan);
      pan.connect(synthBus);
      osc.start(time);
      osc.stop(time + durSec + 0.03);
      releaseVoiceOnEnd(osc, [osc, filt, env, pan], 1);
    } catch (_) {
      activeVoices = Math.max(0, activeVoices - 1);
    }
  }

  function playBassPulse(time, midi, gainAmt, durSec, eraIdx, isDownbeat) {
    if (!ctx || !acquireVoice(1, 1)) return;
    try {
      var freq = midiToHz(midi) * getSlowPitchFactor();
      var osc = ctx.createOscillator();
      var filt = ctx.createBiquadFilter();
      var env = ctx.createGain();
      osc.type = eraIdx >= 2 ? 'sawtooth' : 'triangle';
      osc.frequency.setValueAtTime(freq, time);
      if (isDownbeat && eraIdx >= 2) {
        osc.frequency.setValueAtTime(freq * 1.35, time);
        osc.frequency.exponentialRampToValueAtTime(freq, time + 0.06);
      }
      filt.type = 'lowpass';
      filt.frequency.setValueAtTime(eraIdx === 1 ? 520 : eraIdx === 2 ? 1200 : 1850, time);
      filt.frequency.exponentialRampToValueAtTime(180, time + durSec);
      env.gain.setValueAtTime(0.0001, time);
      env.gain.linearRampToValueAtTime(gainAmt, time + 0.012);
      env.gain.exponentialRampToValueAtTime(0.0001, time + durSec);
      osc.connect(filt);
      filt.connect(env);
      env.connect(synthBus);
      osc.start(time);
      osc.stop(time + durSec + 0.03);
      if (isDownbeat && eraIdx >= 2 && sidechainGain) {
        sidechainGain.gain.cancelScheduledValues(time);
        sidechainGain.gain.setValueAtTime(eraIdx === 2 ? 0.52 : 0.44, time);
        sidechainGain.gain.exponentialRampToValueAtTime(1.0, time + 0.24);
      }
      releaseVoiceOnEnd(osc, [osc, filt, env], 1);
    } catch (_) {
      activeVoices = Math.max(0, activeVoices - 1);
    }
  }

  function playTickerBlip(time, isFake, eraIdx) {
    if (!ctx || !acquireVoice(0, 1)) return;
    try {
      var era = ERAS[eraIdx];
      var deg = era.scale[(stepIndex + (isFake ? 5 : 2)) % era.scale.length];
      var freq = clamp(midiToHz(era.rootMidi + 36 + deg) * getSlowPitchFactor(), 600, 4200);
      var osc = ctx.createOscillator();
      var env = ctx.createGain();
      osc.type = isFake ? 'triangle' : 'sine';
      osc.frequency.setValueAtTime(freq, time);
      env.gain.setValueAtTime(0.0001, time);
      env.gain.linearRampToValueAtTime(MIX.headlineGain, time + 0.005);
      env.gain.exponentialRampToValueAtTime(0.0001, time + 0.055);
      osc.connect(env);
      env.connect(uiBus);
      osc.start(time);
      osc.stop(time + 0.07);
      releaseVoiceOnEnd(osc, [osc, env], 1);
    } catch (_) {
      activeVoices = Math.max(0, activeVoices - 1);
    }
  }

  function playYearBoomSynth(yearNum) {
    if (!ctx || !acquireVoice(2, 1)) return;
    try {
      var now = ctx.currentTime;
      var era = ERAS[currentEraIdx];
      var baseFreq = midiToHz(era.rootMidi) * getSlowPitchFactor();
      var osc = ctx.createOscillator();
      var env = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(baseFreq * 1.95, now);
      osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.5, now + 0.42);
      env.gain.setValueAtTime(0.0001, now);
      env.gain.linearRampToValueAtTime(MIX.yearBoomGain, now + 0.035);
      env.gain.exponentialRampToValueAtTime(0.0001, now + 2.8);
      osc.connect(env);
      env.connect(synthBus);
      osc.start(now);
      osc.stop(now + 2.9);
      releaseVoiceOnEnd(osc, [osc, env], 1);
      var degree = era.scale[Math.abs(yearNum | 0) % era.scale.length];
      playGlassNote(now + 0.04, era.rootMidi + 24 + degree, 0.07, 2.2);
    } catch (_) {
      activeVoices = Math.max(0, activeVoices - 1);
    }
  }

  function playFocusSwell(item) {
    if (!ctx || !acquireVoice(2, 2)) return;
    try {
      var now = ctx.currentTime;
      var era = ERAS[currentEraIdx];
      var isPred = item && (item.k === 'p' || item.k === 'f');
      var h = hashString(item && (item.slug || item.t));
      var degIdx = h % era.scale.length;
      var f1 = midiToHz(era.rootMidi + 12 + era.scale[degIdx]) * getSlowPitchFactor();
      var f2 = midiToHz(era.rootMidi + 24 + era.scale[(degIdx + (isPred ? 3 : 2)) % era.scale.length]) * getSlowPitchFactor();
      var osc1 = ctx.createOscillator(), osc2 = ctx.createOscillator();
      var filt = ctx.createBiquadFilter(), env = ctx.createGain();
      osc1.type = 'triangle';
      osc2.type = isPred ? 'sawtooth' : 'sine';
      osc1.frequency.setValueAtTime(f1, now);
      osc2.frequency.setValueAtTime(f2, now);
      filt.type = 'lowpass';
      filt.frequency.setValueAtTime(600, now);
      filt.frequency.exponentialRampToValueAtTime(isPred ? 2400 : 1800, now + 0.65);
      env.gain.setValueAtTime(0.0001, now);
      env.gain.linearRampToValueAtTime(MIX.focusSwellGain, now + 0.55);
      env.gain.exponentialRampToValueAtTime(0.0001, now + 2.2);
      osc1.connect(filt);
      osc2.connect(filt);
      filt.connect(env);
      env.connect(synthBus);
      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 2.3);
      osc2.stop(now + 2.3);
      releaseVoiceOnEnd(osc1, [osc1, osc2, filt, env], 2);
    } catch (_) {
      activeVoices = Math.max(0, activeVoices - 2);
    }
  }

  function playReleaseWhoosh() {
    if (!ctx || !noiseBuffer || !acquireVoice(1, 1)) return;
    try {
      var now = ctx.currentTime;
      var src = ctx.createBufferSource();
      src.buffer = noiseBuffer;
      var filt = ctx.createBiquadFilter();
      filt.type = 'bandpass';
      filt.frequency.setValueAtTime(340, now);
      filt.frequency.exponentialRampToValueAtTime(2400, now + 0.22);
      filt.Q.setValueAtTime(2.6, now);
      var env = ctx.createGain();
      env.gain.setValueAtTime(0.0001, now);
      env.gain.linearRampToValueAtTime(0.14, now + 0.04);
      env.gain.exponentialRampToValueAtTime(0.0001, now + 0.28);
      src.connect(filt);
      filt.connect(env);
      env.connect(sfxBus);
      src.start(now);
      src.stop(now + 0.30);
      releaseVoiceOnEnd(src, [src, filt, env], 1);
    } catch (_) {
      activeVoices = Math.max(0, activeVoices - 1);
    }
  }

  // =========================================================================
  // 12. SIGNATURE TRANSITIONS & GAME SFX TRIGGERS
  // =========================================================================
  function triggerNowCrossing() {
    if (!ctx) return;
    try {
      var now = ctx.currentTime;
      nowCrossingActiveUntil = now + 2.2;
      duckMusic(0.18, 2.0);

      // Prefer rendered crossing stinger; fall back to v1 synth riser+drop
      if (!playSample('music', 'crossing', { noPitchJitter: true, gain: 1.0 })) {
        if (noiseBuffer && acquireVoice(2, 1)) {
          var riser = ctx.createBufferSource();
          riser.buffer = noiseBuffer;
          var rFilt = ctx.createBiquadFilter();
          rFilt.type = 'bandpass';
          rFilt.frequency.setValueAtTime(280, now);
          rFilt.frequency.exponentialRampToValueAtTime(4200, now + 1.12);
          var rEnv = ctx.createGain();
          rEnv.gain.setValueAtTime(0.0001, now);
          rEnv.gain.linearRampToValueAtTime(0.22, now + 1.05);
          rEnv.gain.exponentialRampToValueAtTime(0.0001, now + 1.25);
          riser.connect(rFilt);
          rFilt.connect(rEnv);
          rEnv.connect(masterToneFilter);
          riser.start(now);
          riser.stop(now + 1.28);
          releaseVoiceOnEnd(riser, [riser, rFilt, rEnv], 1);
        }
        var fut = ERAS[3];
        var dropTime = now + 1.15;
        playArpNote(dropTime, fut.rootMidi + 12, 0.14, 2.8, 3600, -8, 'sawtooth');
        playArpNote(dropTime + 0.04, fut.rootMidi + 18, 0.12, 2.8, 3600, 8, 'sawtooth');
      }
      motifMemory = [0, 1, 4, 6];
    } catch (_) {}
  }

  function triggerRestartWhiteout() {
    if (!ctx) return;
    try {
      var now = ctx.currentTime;
      restartMuteUntil = now + 2.1;
      if (!playSample('sfx', 'whiteout', { noPitchJitter: true }) && noiseBuffer && acquireVoice(2, 1)) {
        var wash = ctx.createBufferSource();
        wash.buffer = noiseBuffer;
        var wFilt = ctx.createBiquadFilter();
        wFilt.type = 'lowpass';
        wFilt.frequency.setValueAtTime(600, now);
        wFilt.frequency.exponentialRampToValueAtTime(6800, now + 1.15);
        wFilt.frequency.exponentialRampToValueAtTime(320, now + 1.95);
        var wEnv = ctx.createGain();
        wEnv.gain.setValueAtTime(0.0001, now);
        wEnv.gain.linearRampToValueAtTime(0.30, now + 1.1);
        wEnv.gain.exponentialRampToValueAtTime(0.0001, now + 1.95);
        wash.connect(wFilt);
        wFilt.connect(wEnv);
        wEnv.connect(masterToneFilter);
        wash.start(now);
        wash.stop(now + 2.0);
        releaseVoiceOnEnd(wash, [wash, wFilt, wEnv], 1);
      }
      duckMusic(0.05, 1.9);
      currentEraIdx = 0;
      motifMemory = [0, 2, 4, 2];
    } catch (_) {}
  }

  function triggerCorrect(opts) {
    var era = ERAS[currentEraIdx];
    var streak = (opts && typeof opts.streak === 'number') ? opts.streak : wpState.streak;
    var deg = era.scale[Math.max(0, streak) % era.scale.length];
    var octBoost = Math.min(2, Math.floor(Math.max(0, streak) / era.scale.length)) * 12;
    var targetMidi = era.rootMidi + 24 + deg + octBoost;
    // correct-1..5 base sample is tuned to D4 (MIDI 62)
    var rate = Math.pow(2, (targetMidi - 62) / 12);
    var merged = {
      rate: rate,
      noPitchJitter: true,
      x: opts && opts.x,
      pan: opts && opts.pan
    };
    if (!playSample('sfx', 'correct', merged)) {
      playGlassNote(ctx ? ctx.currentTime + 0.005 : 0, targetMidi, 0.14, 0.7);
    }
  }

  function triggerWrong(opts) {
    if (!playSample('sfx', 'wrong', opts)) {
      playArpNote(ctx ? ctx.currentTime + 0.005 : 0, ERAS[currentEraIdx].rootMidi + 11, 0.14, 0.35, 700, -28, 'triangle');
    }
  }

  function triggerStamp(kind, opts) {
    duckMusic(MIX.stampDuckGain, 0.30);
    var name = kind === 'made-up' ? 'stamp-made-up' : kind === 'unproven' ? 'stamp-unproven' : 'stamp-real';
    playSample('sfx', name, opts);
    playSample('sfx', 'thump-low', opts);
    playSample('sfx', 'ink-splat', opts);
  }

  // =========================================================================
  // 13. LOOK-AHEAD SCHEDULER (v1 synth layer)
  // =========================================================================
  function getEffectiveBpm(eraIdx) {
    var era = ERAS[eraIdx];
    var slowScale = 1 - clamp(wpState.slow, 0, 1) * 0.55;
    return Math.max(36, era.baseBpm * slowScale);
  }

  function scheduleMainStep(time, idx) {
    if (time < nowCrossingActiveUntil || time < restartMuteUntil) return;
    var eraIdx = currentEraIdx;
    var era = ERAS[eraIdx];
    var scale = era.scale;
    var detune = getFutureDetuneCents(eraIdx);

    if (eraIdx === 0) {
      if (idx % 8 === 0 || (idx % 12 === 5 && Math.random() < 0.45)) {
        var deg0 = scale[motifMemory[idx % motifMemory.length] % scale.length];
        playGlassNote(time, era.rootMidi + (idx % 16 === 0 ? 24 : 36) + deg0, MIX.glassGain, 2.6);
      }
      return;
    }
    if (eraIdx === 1) {
      if (idx % 4 === 0) {
        var b1 = idx % 16 < 8 ? 0 : (idx % 16 < 12 ? 4 : 3);
        playBassPulse(time, era.rootMidi + scale[b1], MIX.pulseBassGain * 0.75, 0.5, eraIdx, true);
      }
      if (idx % 2 === 0) {
        var d1 = scale[motifMemory[(idx >> 1) % motifMemory.length] % scale.length];
        playArpNote(time, era.rootMidi + ((idx >> 2) % 2 === 0 ? 24 : 12) + d1, MIX.arpGain * 0.85, 0.4, 2400, 0, 'triangle');
      }
      return;
    }
    if (eraIdx === 2) {
      var isQ = idx % 4 === 0;
      if (isQ || idx % 4 === 2) {
        var b2 = [0, 0, 4, 5][(idx >> 2) % 4];
        playBassPulse(time, era.rootMidi + scale[b2], MIX.pulseBassGain * (isQ ? 1.0 : 0.65), isQ ? 0.34 : 0.2, eraIdx, isQ);
      }
      if (idx % 2 === 0 || Math.random() < 0.45) {
        var d2 = scale[motifMemory[idx % motifMemory.length] % scale.length];
        playArpNote(time, era.rootMidi + (idx % 4 === 3 ? 36 : 24) + d2, MIX.arpGain, 0.24, 4400, detune, 'sawtooth');
      }
      return;
    }
    var madness = clamp((wpState.prog - 0.45) / 0.55, 0, 1);
    var isQ3 = idx % 4 === 0;
    if (isQ3 || (madness > 0.3 && idx % 4 === 3)) {
      var fDeg = scale[(idx >> 2) % 3 === 0 ? 0 : (idx >> 2) % 3 === 1 ? 1 : 4];
      playBassPulse(time, era.rootMidi + fDeg, MIX.pulseBassGain * (isQ3 ? 1.05 : 0.7), 0.32, eraIdx, isQ3);
    }
    if (Math.random() < lerp(0.65, 0.95, madness)) {
      var d3 = scale[motifMemory[idx % motifMemory.length] % scale.length];
      playArpNote(time, era.rootMidi + (idx % 3 === 0 ? 24 : 12) + d3, MIX.arpGain, 0.22, lerp(3800, 6800, madness), detune, 'sawtooth');
    }
  }

  function schedulePolyStep(time, pIdx) {
    if (currentEraIdx < 3 || time < nowCrossingActiveUntil || time < restartMuteUntil) return;
    var madness = clamp((wpState.prog - 0.45) / 0.55, 0, 1);
    if (madness < 0.1) return;
    var era = ERAS[3];
    var deg = era.scale[(pIdx * 2 + 1) % era.scale.length];
    playGlassNote(time, era.rootMidi + 24 + deg, MIX.glassGain * lerp(0.55, 1.0, madness), lerp(0.85, 0.45, madness));
  }

  function runScheduler() {
    if (!ctx || !started || isHidden) return;
    try {
      var now = ctx.currentTime;
      if (nextStepTime < now - 0.25) nextStepTime = now + 0.04;
      if (nextPolyTime < now - 0.25) nextPolyTime = now + 0.1;
      var sixteenthSec = (60 / getEffectiveBpm(currentEraIdx)) / 4;
      var s = 0;
      while (nextStepTime < now + MIX.scheduleAheadSec && s < 8) {
        scheduleMainStep(nextStepTime, stepIndex);
        nextStepTime += sixteenthSec;
        stepIndex = (stepIndex + 1) & 0x7fffffff;
        s++;
      }
      var polySec = sixteenthSec * 1.25;
      var ps = 0;
      while (nextPolyTime < now + MIX.scheduleAheadSec && ps < 6) {
        schedulePolyStep(nextPolyTime, polyStepIndex);
        nextPolyTime += polySec;
        polyStepIndex = (polyStepIndex + 1) & 0x7fffffff;
        ps++;
      }
    } catch (_) {}
    schedulerTimer = setTimeout(runScheduler, MIX.schedulerTickMs);
  }

  function startScheduler() {
    if (schedulerTimer) clearTimeout(schedulerTimer);
    schedulerTimer = setTimeout(runScheduler, MIX.schedulerTickMs);
  }

  function stopScheduler() {
    if (schedulerTimer) {
      clearTimeout(schedulerTimer);
      schedulerTimer = null;
    }
  }

  // =========================================================================
  // 14. PER-FRAME STATE SYNC (requestAnimationFrame)
  // =========================================================================
  function readEngineState() {
    var st = window.WP && window.WP.state;
    if (!st) return;
    if (typeof st.date === 'number' && isFinite(st.date)) wpState.date = st.date;
    if (typeof st.prog === 'number' && isFinite(st.prog)) wpState.prog = clamp(st.prog, 0, 1);
    if (typeof st.slow === 'number' && isFinite(st.slow)) wpState.slow = clamp(st.slow, 0, 1);
    if (typeof st.pause === 'number' && isFinite(st.pause)) wpState.pause = clamp(st.pause, 0, 1);
    if (typeof st.spinV === 'number' && isFinite(st.spinV)) wpState.spinV = clamp(st.spinV, -5, 5);
    if (typeof st.streak === 'number' && isFinite(st.streak)) wpState.streak = Math.max(0, st.streak | 0);
    if (typeof st.mode === 'string') wpState.mode = st.mode;
    wpState.cover = !!st.cover;
    wpState.focus = st.focus || null;
    wpState.open = st.open || null;
    wpState.started = !!st.started;
  }

  function updateContinuousParams() {
    if (!ctx || !started || isHidden) return;
    try {
      var now = ctx.currentTime;
      if (!wpState.cover && coverLoopHandle) {
        var cover = coverLoopHandle;
        coverLoopHandle = null;
        cover.gain.gain.cancelScheduledValues(now);
        cover.gain.gain.setTargetAtTime(0.0001, now, 0.12);
        cover.src.onended = function () {
          cover.src.disconnect();
          cover.gain.disconnect();
        };
        cover.src.stop(now + 0.6);
      }
      var eraIdx = getEraIndex(wpState.date);
      var era = ERAS[eraIdx];

      if (eraIdx !== currentEraIdx) {
        currentEraIdx = eraIdx;
        try { droneOsc1.type = era.droneWave; } catch (_) {}
        activeStemEraName = era.name;
        loadEraStems(era.name).then(function () {
          syncEraStemsToClock(era.name, true);
        });
        // Lazy-load one era ahead
        var nextIdx = (eraIdx + 1) % ERAS.length;
        loadEraStems(ERAS[nextIdx].name);
      } else if (activeStemEraName === era.name) {
        syncEraStemsToClock(era.name, false);
      }

      var pitchFactor = getSlowPitchFactor();
      var madness = eraIdx === 3 ? clamp((wpState.prog - 0.45) / 0.55, 0, 1) : 0;

      droneOsc1.frequency.setTargetAtTime(midiToHz(era.rootMidi) * pitchFactor, now, 0.25);
      droneOsc2.frequency.setTargetAtTime(midiToHz(era.fifthMidi) * pitchFactor, now, 0.25);
      droneOsc2.detune.setTargetAtTime(eraIdx === 3 ? lerp(4, 24, madness) : 2, now, 0.2);
      droneFilter.frequency.setTargetAtTime(eraIdx === 0 ? 320 : eraIdx === 1 ? 680 : eraIdx === 2 ? 1250 : lerp(1400, 2900, madness), now, 0.2);

      var fanLevel = eraIdx === 0 ? MIX.fanNoiseGain : eraIdx === 1 ? MIX.fanNoiseGain * 0.55 : eraIdx === 2 ? MIX.fanNoiseGain * 0.35 : MIX.fanNoiseGain * lerp(0.5, 1.1, madness);
      fanGainNode.gain.setTargetAtTime(fanLevel, now, 0.3);

      // Slow-time + pause (900 Hz dreamy filter)
      var eraBright = eraIdx === 3 ? lerp(era.filterBase, MIX.maxCutoffHz, madness) : era.filterBase;
      var slowCut = lerp(eraBright, MIX.slowMinCutoffHz, wpState.slow);
      var finalCut = lerp(slowCut, MIX.panelCutoffHz, wpState.pause);
      musicFilter.frequency.setTargetAtTime(clamp(finalCut, 280, MIX.maxCutoffHz), now, 0.06);

      var wet = MIX.reverbWetBase + wpState.slow * MIX.reverbWetSlowBoost + madness * MIX.reverbWetFutureBoost;
      reverbSend.gain.setTargetAtTime(clamp(wet, 0.1, 0.92), now, 0.1);

      var driveAmt = era.drive + madness * 0.25;
      driveWet.gain.setTargetAtTime(clamp(driveAmt * 0.45, 0.0001, 0.42), now, 0.2);
      driveDry.gain.setTargetAtTime(1.0 - clamp(driveAmt * 0.22, 0, 0.25), now, 0.2);

      // Pause ducks music by -10 dB (foley on sfxBus/uiBus stays clear!)
      var pauseGain = lerp(1.0, MIX.panelDuckGain, wpState.pause);
      var modeMusicMult = (soundMode === 'full') ? 1.0 : 0.0001;
      musicGroupGain.gain.setTargetAtTime(pauseGain * modeMusicMult, now, 0.08);

      if (wpState.pause > 0.02 && soundMode === 'full') {
        var isPredOpen = wpState.open && (wpState.open.k === 'p' || wpState.open.k === 'f');
        var pRoot = era.rootMidi + 12;
        panelOsc1.frequency.setTargetAtTime(midiToHz(pRoot), now, 0.12);
        panelOsc2.frequency.setTargetAtTime(midiToHz(isPredOpen ? pRoot + 6 : pRoot + 7), now, 0.12);
        panelGainNode.gain.setTargetAtTime(MIX.panelToneGain * wpState.pause, now, 0.12);
      } else {
        panelGainNode.gain.setTargetAtTime(0.0001, now, 0.12);
      }

      // Drag spin pan + whoosh
      var spinAbs = Math.abs(wpState.spinV);
      var panVal = clamp(wpState.spinV / 3.0, -0.6, 0.6);
      musicPanner.pan.setTargetAtTime(panVal * 0.55, now, 0.05);
      spinPanner.pan.setTargetAtTime(panVal, now, 0.04);
      if (spinAbs > 0.08) {
        var spinNorm = clamp((spinAbs - 0.08) / 2.92, 0, 1);
        spinGainNode.gain.setTargetAtTime(spinNorm * MIX.spinWhooshMaxGain, now, 0.05);
        spinFilter.frequency.setTargetAtTime(lerp(360, 2800, spinNorm), now, 0.05);
      } else {
        spinGainNode.gain.setTargetAtTime(0.0001, now, 0.08);
      }

      if (prevSlow > 0.35 && wpState.slow < 0.18) playReleaseWhoosh();
      prevSlow = wpState.slow;
    } catch (_) {}
  }

  function rafLoop() {
    try {
      readEngineState();
      updateContinuousParams();
    } catch (_) {}
    if (typeof window.requestAnimationFrame === 'function') {
      rafId = window.requestAnimationFrame(rafLoop);
    }
  }

  // =========================================================================
  // 15. EVENT HANDLERS (GEMINI.md + SOUND.md / GAME.md events)
  // =========================================================================
  function handleStart() {
    try {
      if (!initAudio()) return;
      unlockIOSAudio();
      if (!started) {
        started = true;
        bootstrapManifestAndLoad();
        startScheduler();
        if (rafId === null && typeof window.requestAnimationFrame === 'function') {
          rafId = window.requestAnimationFrame(rafLoop);
        }
      }
    } catch (_) {}
  }

  function handleWord(ev) {
    if (!ctx || !started || isHidden) return;
    try {
      var now = ctx.currentTime;
      if (now - lastWordTime < MIX.wordMinGapSec) return;
      lastWordTime = now;
      var item = ev && ev.detail;
      var era = ERAS[currentEraIdx];
      var degIdx = hashString(item && (item.slug || item.t)) % era.scale.length;
      motifMemory.push(degIdx);
      if (motifMemory.length > 6) motifMemory.shift();
      var noteMidi = era.rootMidi + 24 + era.scale[degIdx];
      if (currentEraIdx === 0) {
        playGlassNote(now + 0.01, noteMidi, MIX.wordGain * 0.75, 1.9);
      } else {
        playArpNote(now + 0.01, noteMidi, MIX.wordGain, 0.45, era.filterBase, getFutureDetuneCents(currentEraIdx), 'triangle');
      }
    } catch (_) {}
  }

  function handleYear(ev) {
    if (!ctx || !started || isHidden) return;
    var y = ev && typeof ev.detail === 'number' ? ev.detail : Math.floor(wpState.date);
    if (!playSample('sfx', 'year-boom')) playYearBoomSynth(y);
  }

  function handleFocus(ev) {
    if (!ctx || !started || isHidden) return;
    playFocusSwell(ev && ev.detail);
  }

  function handleHeadline(ev) {
    if (!ctx || !started || isHidden) return;
    var now = ctx.currentTime;
    if (now - lastHeadlineTime < MIX.headlineMinGapSec) return;
    lastHeadlineTime = now;
    if (!playSample('ui', 'ticker-in')) {
      playTickerBlip(now + 0.005, !!(ev && ev.detail && ev.detail.k === 'f'), currentEraIdx);
    }
  }

  function handleOpen(ev) {
    if (!ctx || !started) return;
    if (ev && ev.detail) wpState.open = ev.detail;
    playSample('sfx', 'folder-open', ev && ev.detail);
  }

  function handleClose() {
    if (!ctx || !started) return;
    wpState.open = null;
    playSample('sfx', 'folder-close');
  }

  function handleVisibilityChange() {
    try {
      isHidden = !!(document && document.hidden);
      if (!ctx || !started) return;
      if (isHidden) {
        stopScheduler();
        if (ctx.state === 'running' && typeof ctx.suspend === 'function') {
          var ps = ctx.suspend();
          if (ps && typeof ps.catch === 'function') ps.catch(function () {});
        }
      } else {
        if (ctx.state === 'suspended' && typeof ctx.resume === 'function') {
          var pr = ctx.resume();
          if (pr && typeof pr.catch === 'function') pr.catch(function () {});
        }
        nextStepTime = ctx.currentTime + 0.08;
        nextPolyTime = ctx.currentTime + 0.2;
        startScheduler();
      }
    } catch (_) {}
  }

  // =========================================================================
  // 16. CONTROLS: MUTE BUTTON + SOUND SETTINGS SHEET (4 MODES)
  // =========================================================================
  function applyBusModes() {
    if (!ctx) return;
    try {
      var now = ctx.currentTime;
      var effectiveOff = isMuted || soundMode === 'off';
      masterGain.gain.cancelScheduledValues(now);
      masterGain.gain.setTargetAtTime(effectiveOff ? 0.0001 : MIX.masterGain, now, 0.03);

      var wantMusic = soundMode === 'full';
      var wantEffects = soundMode === 'full' || soundMode === 'music-off' || soundMode === 'effects-only';
      var wantUi = soundMode === 'full' || soundMode === 'music-off';

      musicGroupGain.gain.setTargetAtTime(wantMusic ? 1.0 : 0.0001, now, 0.06);
      sfxBus.gain.setTargetAtTime(wantEffects ? MIX.sfxBusGain : 0.0001, now, 0.04);
      uiBus.gain.setTargetAtTime(wantUi ? MIX.uiBusGain : 0.0001, now, 0.04);
    } catch (_) {}
  }

  function renderControls() {
    try {
      if (muteBtn) {
        var mutedVisual = isMuted || soundMode === 'off';
        muteBtn.setAttribute('aria-pressed', mutedVisual ? 'true' : 'false');
        muteBtn.setAttribute('aria-label', mutedVisual ? 'Unmute soundtrack' : 'Mute soundtrack');
        muteBtn.innerHTML = mutedVisual
          ? '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><line x1="23" y1="9" x2="17" y2="15"></line><line x1="17" y1="9" x2="23" y2="15"></line></svg>'
          : '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path><path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path></svg>';
      }
      if (settingsSheet) {
        settingsSheet.style.display = settingsOpen ? 'flex' : 'none';
        var btns = settingsSheet.querySelectorAll ? settingsSheet.querySelectorAll('button[data-wp-mode]') : [];
        for (var i = 0; i < btns.length; i++) {
          var m = btns[i].getAttribute('data-wp-mode');
          var active = m === soundMode;
          btns[i].setAttribute('aria-pressed', active ? 'true' : 'false');
          btns[i].style.background = active ? 'rgba(255,255,255,0.20)' : 'transparent';
          btns[i].style.fontWeight = active ? '600' : '400';
        }
      }
    } catch (_) {}
  }

  function setMuted(val) {
    if (!val && soundMode === 'off') {
      setSoundMode('full');
      return;
    }
    isMuted = !!val;
    writeStorage(STORAGE_MUTE_KEY, isMuted ? '1' : '0');
    applyBusModes();
    renderControls();
  }

  function setSoundMode(mode) {
    if (SOUND_MODES.indexOf(mode) === -1) return;
    soundMode = mode;
    if (mode !== 'off' && isMuted) {
      isMuted = false;
      writeStorage(STORAGE_MUTE_KEY, '0');
    }
    writeStorage(STORAGE_MODE_KEY, soundMode);
    applyBusModes();
    renderControls();
  }

  function createControlsUI() {
    try {
      if (typeof document === 'undefined' || !document.body || muteBtn) return;

      function styleCircleBtn(btn, rightPx, bottomPx) {
        btn.type = 'button';
        btn.style.position = 'fixed';
        btn.style.right = rightPx + 'px';
        btn.style.bottom = bottomPx + 'px';
        btn.style.width = '44px';
        btn.style.height = '44px';
        btn.style.padding = '0';
        btn.style.borderRadius = '50%';
        btn.style.border = '1px solid rgba(255, 255, 255, 0.24)';
        btn.style.background = 'rgba(10, 12, 18, 0.65)';
        btn.style.color = '#f4f6fb';
        btn.style.display = 'flex';
        btn.style.alignItems = 'center';
        btn.style.justifyContent = 'center';
        btn.style.cursor = 'pointer';
        btn.style.zIndex = '9999';
        btn.style.backdropFilter = 'blur(8px)';
        btn.style.touchAction = 'manipulation';
      }

      // 1) Primary 44x44 mute button (bottom-right, above ~70px timeline)
      muteBtn = document.createElement('button');
      muteBtn.id = 'wp-audio-toggle';
      styleCircleBtn(muteBtn, 16, 84);
      muteBtn.addEventListener('click', function (ev) {
        if (ev && ev.stopPropagation) ev.stopPropagation();
        if (!started) handleStart();
        playSample('ui', 'switch');
        setMuted(!(isMuted || soundMode === 'off'));
      });
      document.body.appendChild(muteBtn);

      // 2) Compact settings toggle + sheet (Sound: full / music off / effects only / off)
      settingsBtn = document.createElement('button');
      settingsBtn.id = 'wp-audio-settings-toggle';
      styleCircleBtn(settingsBtn, 68, 84);
      settingsBtn.setAttribute('aria-label', 'Sound settings');
      settingsBtn.setAttribute('aria-expanded', 'false');
      settingsBtn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="4" y1="21" x2="4" y2="14"></line><line x1="4" y1="10" x2="4" y2="3"></line><line x1="12" y1="21" x2="12" y2="12"></line><line x1="12" y1="8" x2="12" y2="3"></line><line x1="20" y1="21" x2="20" y2="16"></line><line x1="20" y1="12" x2="20" y2="3"></line><line x1="1" y1="14" x2="7" y2="14"></line><line x1="9" y1="8" x2="15" y2="8"></line><line x1="17" y1="16" x2="23" y2="16"></line></svg>';
      settingsBtn.addEventListener('click', function (ev) {
        if (ev && ev.stopPropagation) ev.stopPropagation();
        if (!started) handleStart();
        playSample('ui', 'press');
        settingsOpen = !settingsOpen;
        settingsBtn.setAttribute('aria-expanded', settingsOpen ? 'true' : 'false');
        renderControls();
      });
      document.body.appendChild(settingsBtn);

      settingsSheet = document.createElement('div');
      settingsSheet.id = 'wp-audio-settings-sheet';
      settingsSheet.setAttribute('role', 'group');
      settingsSheet.setAttribute('aria-label', 'Sound mode');
      settingsSheet.style.position = 'fixed';
      settingsSheet.style.right = '16px';
      settingsSheet.style.bottom = '136px';
      settingsSheet.style.display = 'none';
      settingsSheet.style.flexDirection = 'column';
      settingsSheet.style.gap = '4px';
      settingsSheet.style.padding = '8px';
      settingsSheet.style.borderRadius = '12px';
      settingsSheet.style.border = '1px solid rgba(255, 255, 255, 0.22)';
      settingsSheet.style.background = 'rgba(10, 12, 18, 0.86)';
      settingsSheet.style.color = '#f4f6fb';
      settingsSheet.style.fontFamily = 'system-ui, -apple-system, sans-serif';
      settingsSheet.style.fontSize = '13px';
      settingsSheet.style.zIndex = '10000';
      settingsSheet.style.minWidth = '132px';

      SOUND_MODES.forEach(function (mode) {
        var optBtn = document.createElement('button');
        optBtn.type = 'button';
        optBtn.setAttribute('data-wp-mode', mode);
        optBtn.textContent = SOUND_MODE_LABELS[mode];
        optBtn.style.border = 'none';
        optBtn.style.borderRadius = '8px';
        optBtn.style.padding = '6px 10px';
        optBtn.style.color = '#f4f6fb';
        optBtn.style.textAlign = 'left';
        optBtn.style.cursor = 'pointer';
        optBtn.style.background = 'transparent';
        optBtn.addEventListener('click', function (ev) {
          if (ev && ev.stopPropagation) ev.stopPropagation();
          playSample('ui', 'press');
          setSoundMode(mode);
        });
        settingsSheet.appendChild(optBtn);
      });

      document.body.appendChild(settingsSheet);
      renderControls();
    } catch (_) {}
  }

  // =========================================================================
  // 17. BOOTSTRAP & PUBLIC API (window.WP_AUDIO)
  // =========================================================================
  try {
    preferredExt = detectAudioFormat();
    isMuted = readStorage(STORAGE_MUTE_KEY, '0') === '1';
    var savedMode = readStorage(STORAGE_MODE_KEY, 'full');
    if (SOUND_MODES.indexOf(savedMode) !== -1) soundMode = savedMode;

    // iOS first-touch unlock listener
    window.addEventListener('touchstart', unlockIOSAudio, { passive: true, once: true });

    // Core timeline events (GEMINI.md)
    window.addEventListener('wp:start', handleStart);
    window.addEventListener('wp:word', handleWord);
    window.addEventListener('wp:year', handleYear);
    window.addEventListener('wp:focus', handleFocus);
    window.addEventListener('wp:headline', handleHeadline);
    window.addEventListener('wp:open', handleOpen);
    window.addEventListener('wp:close', handleClose);
    window.addEventListener('wp:now', triggerNowCrossing);
    window.addEventListener('wp:restart', triggerRestartWhiteout);

    // Game & tactile foley events (SOUND.md / GAME.md)
    window.addEventListener('wp:stamp', function (ev) {
      var d = ev && ev.detail;
      triggerStamp(d && d.kind, d);
    });
    window.addEventListener('wp:correct', function (ev) { triggerCorrect(ev && ev.detail); });
    window.addEventListener('wp:wrong', function (ev) { triggerWrong(ev && ev.detail); });
    window.addEventListener('wp:card-rise', function (ev) { playSample('sfx', 'card-rise', ev && ev.detail); });
    window.addEventListener('wp:paper-fling', function (ev) { playSample('sfx', 'paper-fling', ev && ev.detail); });
    window.addEventListener('wp:clip-bite', function (ev) { playSample('sfx', 'clip-bite', ev && ev.detail); });
    window.addEventListener('wp:ui-press', function (ev) { playSample('ui', 'press', ev && ev.detail); });

    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', handleVisibilityChange);
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', createControlsUI);
      } else {
        createControlsUI();
      }
    }

    // Expose exactly one global: window.WP_AUDIO
    window.WP_AUDIO = {
      mute: function () { setMuted(true); },
      unmute: function () { setMuted(false); },
      get muted() { return isMuted || soundMode === 'off'; },
      get soundMode() { return soundMode; },
      setSoundMode: setSoundMode,
      play: function (soundPath, opts) {
        if (!soundPath || typeof soundPath !== 'string') return false;
        var parts = soundPath.split('/');
        var folder = parts.length > 1 ? parts[0] : 'sfx';
        var name = parts.length > 1 ? parts[1] : parts[0];
        if (name === 'correct') { triggerCorrect(opts); return true; }
        if (name === 'wrong') { triggerWrong(opts); return true; }
        if (name.indexOf('stamp-') === 0) {
          triggerStamp(name.replace('stamp-', ''), opts);
          return true;
        }
        return playSample(folder, name, opts);
      }
    };
  } catch (_) {}
})();
