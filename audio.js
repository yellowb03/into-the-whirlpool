/*
 * audio.js — Generative, reactive Web Audio soundtrack for Into the Whirlpool
 *
 * Plain JavaScript, zero dependencies, Web Audio API synthesis only.
 * Exposes exactly one global: window.WP_AUDIO = { mute(), unmute(), get muted() }
 */
(function () {
  'use strict';

  // =========================================================================
  // 1. MIX & TUNING CONFIGURATION (edit here to rebalance the score)
  // =========================================================================
  var MIX = {
    masterGain: 0.78,            // Overall output level before limiter
    musicBusGain: 0.85,          // Main musical elements bus
    reverbWetBase: 0.28,         // Baseline reverb send
    reverbWetSlowBoost: 0.36,    // Extra reverb when holding to slow time
    reverbWetFutureBoost: 0.24,  // Extra reverb as madness (prog) climbs to 1
    reverbSeconds: 2.8,          // Generated stereo impulse response length
    reverbDecay: 2.6,            // Impulse exponential decay curve

    droneGain: 0.24,             // Continuous tonal bed
    fanNoiseGain: 0.055,         // Quiet lab server-fan bed
    pulseBassGain: 0.22,         // Era 2-4 rhythmic bass pulse
    arpGain: 0.14,               // Attention / future arpeggio notes
    glassGain: 0.12,             // Era 1 glassy lab chimes
    wordGain: 0.13,              // wp:word motif echoes
    headlineGain: 0.045,         // Subtle news ticker blips (Era 3-4)
    yearBoomGain: 0.34,          // wp:year sub-boom
    focusSwellGain: 0.16,        // wp:focus harmonic swell
    spinWhooshMaxGain: 0.20,     // Drag spin filtered noise whoosh
    panelToneGain: 0.13,         // Sustained tone when detail panel is open
    panelDuckGain: 0.25,         // ~-12 dB ducking when pause -> 1

    maxCutoffHz: 7800,           // Ceiling to prevent harshness above ~8 kHz
    slowMinCutoffHz: 620,        // Low-pass floor when holding (slow -> 1)
    panelCutoffHz: 880,          // Dreamy filter cutoff when panel is open

    maxVoices: 16,               // Dynamic oscillator budget (<= 22 total with 4 bed oscs)
    scheduleAheadSec: 0.13,      // Look-ahead window in seconds
    schedulerTickMs: 40,         // setTimeout cadence for look-ahead loop
    headlineMinGapSec: 0.18,     // Rate-limit ticker blips so they stay subtle
    wordMinGapSec: 0.14          // Rate-limit rapid word spawns
  };

  var STORAGE_KEY = 'wp_audio_muted';

  // =========================================================================
  // 2. HARMONIC ERAS & MUSICAL SCALES
  // =========================================================================
  // MIDI note helpers
  function midiToHz(midi) {
    return 440 * Math.pow(2, (midi - 69) / 12);
  }

  function clamp(v, lo, hi) {
    return v < lo ? lo : v > hi ? hi : v;
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  // Four musical eras across the 2012-2031 timeline
  var ERAS = [
    {
      id: 0,
      name: 'lab',          // 2012-2016: The Quiet Lab (D Dorian, sparse, patient)
      rootMidi: 38,         // D2 (73.42 Hz)
      fifthMidi: 45,        // A2
      scale: [0, 2, 3, 5, 7, 9, 10],
      baseBpm: 72,
      droneWave: 'sine',
      filterBase: 1400,
      drive: 0.0
    },
    {
      id: 1,
      name: 'attention',    // 2017-2022: Attention (F Lydian, warm, golden)
      rootMidi: 41,         // F2 (87.31 Hz)
      fifthMidi: 48,        // C3
      scale: [0, 2, 4, 6, 7, 9, 11],
      baseBpm: 98,
      droneWave: 'triangle',
      filterBase: 2600,
      drive: 0.08
    },
    {
      id: 2,
      name: 'boom',         // 2023-Nov 2026: The Boom (G Mixolydian, bright, pumping)
      rootMidi: 43,         // G2 (98.00 Hz)
      fifthMidi: 50,        // D3
      scale: [0, 2, 4, 5, 7, 9, 10],
      baseBpm: 122,
      droneWave: 'sawtooth',
      filterBase: 4600,
      drive: 0.35
    },
    {
      id: 3,
      name: 'future',       // Nov 2026-2031: The Future (C# Phrygian Dom / Altered)
      rootMidi: 37,         // C#2 (69.30 Hz)
      fifthMidi: 44,        // G#2
      scale: [0, 1, 4, 6, 7, 8, 11],
      baseBpm: 128,
      droneWave: 'sawtooth',
      filterBase: 5400,
      drive: 0.55
    }
  ];

  function getEraIndex(date) {
    if (date < 2017.0) return 0;
    if (date < 2023.0) return 1;
    if (date < 2026.85) return 2;
    return 3;
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

  // =========================================================================
  // 3. STATE
  // =========================================================================
  var ctx = null;
  var started = false;
  var isMuted = false;
  var isHidden = false;
  var activeVoices = 0;

  // Audio graph nodes
  var masterGain = null;
  var masterToneFilter = null;
  var limiter = null;
  var musicBus = null;
  var sidechainGain = null;
  var interactFilter = null;
  var musicPanner = null;
  var reverbNode = null;
  var reverbSend = null;
  var reverbReturn = null;
  var driveShaper = null;
  var driveWet = null;
  var driveDry = null;

  // Continuous beds
  var droneOsc1 = null;
  var droneOsc2 = null;
  var droneFilter = null;
  var droneGainNode = null;

  var fanSource = null;
  var fanFilter = null;
  var fanGainNode = null;

  var spinSource = null;
  var spinFilter = null;
  var spinGainNode = null;
  var spinPanner = null;

  var panelOsc1 = null;
  var panelOsc2 = null;
  var panelFilter = null;
  var panelGainNode = null;

  // Shared synthesized buffers
  var noiseBuffer = null;

  // Scheduler & musical state
  var schedulerTimer = null;
  var rafId = null;
  var nextStepTime = 0;
  var stepIndex = 0;
  var polyStepIndex = 0;
  var nextPolyTime = 0;

  // Engine state snapshot (smoothed)
  var wpState = {
    date: 2012.0,
    prog: 0.0,
    slow: 0.0,
    pause: 0.0,
    spinV: 0.0,
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

  // "Attention" motif memory: stores recent scale degrees to echo back
  var motifMemory = [0, 2, 4, 2];

  // Mute button reference
  var muteBtn = null;

  // =========================================================================
  // 4. STORAGE HELPERS (safe try/catch)
  // =========================================================================
  function readSavedMute() {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage.getItem(STORAGE_KEY) === '1';
      }
    } catch (_) {
      // Storage unavailable
    }
    return false;
  }

  function writeSavedMute(val) {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(STORAGE_KEY, val ? '1' : '0');
      }
    } catch (_) {
      // Storage unavailable
    }
  }

  // =========================================================================
  // 5. BUFFER & CURVE GENERATORS (Web Audio synthesis only)
  // =========================================================================
  function createNoiseBuffer(audioCtx, durationSec) {
    var length = Math.floor(audioCtx.sampleRate * durationSec);
    var buffer = audioCtx.createBuffer(2, length, audioCtx.sampleRate);
    for (var ch = 0; ch < 2; ch++) {
      var data = buffer.getChannelData(ch);
      // Soft pink-tinted white noise (Paul Kellet's 3-pole approximation)
      var b0 = 0, b1 = 0, b2 = 0;
      for (var i = 0; i < length; i++) {
        var white = Math.random() * 2 - 1;
        b0 = 0.99765 * b0 + white * 0.0990460;
        b1 = 0.96300 * b1 + white * 0.2965164;
        b2 = 0.57000 * b2 + white * 1.0526913;
        data[i] = clamp((b0 + b1 + b2 + white * 0.1848) * 0.16, -1, 1);
      }
    }
    return buffer;
  }

  function createImpulseResponse(audioCtx, durationSec, decay) {
    var rate = audioCtx.sampleRate;
    var length = Math.floor(rate * durationSec);
    var impulse = audioCtx.createBuffer(2, length, rate);
    for (var ch = 0; ch < 2; ch++) {
      var data = impulse.getChannelData(ch);
      var lp = 0;
      for (var i = 0; i < length; i++) {
        var t = i / length;
        // Smooth early reflections fade-in over first 18ms, then exponential tail
        var env = (i < rate * 0.018 ? i / (rate * 0.018) : 1) * Math.pow(1 - t, decay);
        var white = Math.random() * 2 - 1;
        // Darken the reverb tail gently so highs never sizzle
        lp = lp * 0.62 + white * 0.38;
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
      curve[i] = Math.tanh ? Math.tanh(x * k) / Math.tanh(k) : (3 + k) * x * 20 * (Math.PI / 180) / (Math.PI + k * Math.abs(x));
    }
    return curve;
  }

  function createPanner(audioCtx) {
    if (typeof audioCtx.createStereoPanner === 'function') {
      return audioCtx.createStereoPanner();
    }
    // Graceful fallback if StereoPannerNode is unavailable
    var gain = audioCtx.createGain();
    gain.pan = {
      value: 0,
      setTargetAtTime: function () {}
    };
    return gain;
  }

  // =========================================================================
  // 6. AUDIO GRAPH INITIALIZATION
  // =========================================================================
  function initAudio() {
    if (ctx) return true;
    try {
      var AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return false;
      ctx = new AudioCtx();

      var now = ctx.currentTime;

      // Master chain:
      // [musicBus -> sidechainGain -> interactFilter -> drive -> musicPanner]
      //   + [reverbReturn] + [panelGainNode] + [spinPanner]
      // -> masterToneFilter (<= 7.8 kHz) -> limiter -> masterGain -> destination
      masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(isMuted ? 0.0001 : MIX.masterGain, now);

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

      // Music bus
      musicBus = ctx.createGain();
      musicBus.gain.setValueAtTime(MIX.musicBusGain, now);

      sidechainGain = ctx.createGain();
      sidechainGain.gain.setValueAtTime(1.0, now);

      interactFilter = ctx.createBiquadFilter();
      interactFilter.type = 'lowpass';
      interactFilter.frequency.setValueAtTime(MIX.maxCutoffHz, now);
      interactFilter.Q.setValueAtTime(0.8, now);

      // Parallel subtle saturation for Era 3-4
      driveDry = ctx.createGain();
      driveDry.gain.setValueAtTime(1.0, now);
      driveWet = ctx.createGain();
      driveWet.gain.setValueAtTime(0.0001, now);
      driveShaper = ctx.createWaveShaper();
      driveShaper.curve = createSoftClipCurve(0.45);
      driveShaper.oversample = '2x';

      musicPanner = createPanner(ctx);

      musicBus.connect(sidechainGain);
      sidechainGain.connect(interactFilter);

      interactFilter.connect(driveDry);
      interactFilter.connect(driveShaper);
      driveShaper.connect(driveWet);

      driveDry.connect(musicPanner);
      driveWet.connect(musicPanner);
      musicPanner.connect(masterToneFilter);

      // Shared generated stereo reverb
      reverbNode = ctx.createConvolver();
      reverbNode.buffer = createImpulseResponse(ctx, MIX.reverbSeconds, MIX.reverbDecay);

      reverbSend = ctx.createGain();
      reverbSend.gain.setValueAtTime(MIX.reverbWetBase, now);

      reverbReturn = ctx.createGain();
      reverbReturn.gain.setValueAtTime(0.72, now);

      interactFilter.connect(reverbSend);
      reverbSend.connect(reverbNode);
      reverbNode.connect(reverbReturn);
      reverbReturn.connect(masterToneFilter);

      // Shared noise buffer
      noiseBuffer = createNoiseBuffer(ctx, 2.2);

      // --- Continuous Bed 1: Tonal Drone (2 detuned oscillators) ---
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

      var droneOsc2Gain = ctx.createGain();
      droneOsc2Gain.gain.setValueAtTime(0.42, now);

      droneOsc1.connect(droneFilter);
      droneOsc2.connect(droneOsc2Gain);
      droneOsc2Gain.connect(droneFilter);
      droneFilter.connect(droneGainNode);
      droneGainNode.connect(musicBus);

      droneOsc1.start(now);
      droneOsc2.start(now);

      // --- Continuous Bed 2: Server-Fan Filtered Noise ---
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
      fanGainNode.connect(musicBus);
      fanSource.start(now);

      // --- Continuous Bed 3: Drag Spin Filtered Noise Whoosh ---
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
      spinPanner.connect(masterToneFilter);
      spinSource.start(now);

      // --- Continuous Bed 4: Detail Panel Sustained Tone (bypasses music duck) ---
      panelFilter = ctx.createBiquadFilter();
      panelFilter.type = 'lowpass';
      panelFilter.frequency.setValueAtTime(1200, now);
      panelFilter.Q.setValueAtTime(0.7, now);

      panelGainNode = ctx.createGain();
      panelGainNode.gain.setValueAtTime(0.0001, now);

      panelOsc1 = ctx.createOscillator();
      panelOsc1.type = 'sine';
      panelOsc1.frequency.setValueAtTime(midiToHz(50), now);

      panelOsc2 = ctx.createOscillator();
      panelOsc2.type = 'triangle';
      panelOsc2.frequency.setValueAtTime(midiToHz(57), now);

      var panelOsc2Gain = ctx.createGain();
      panelOsc2Gain.gain.setValueAtTime(0.45, now);

      panelOsc1.connect(panelFilter);
      panelOsc2.connect(panelOsc2Gain);
      panelOsc2Gain.connect(panelFilter);
      panelFilter.connect(panelGainNode);
      panelGainNode.connect(masterToneFilter);
      panelGainNode.connect(reverbNode);

      panelOsc1.start(now);
      panelOsc2.start(now);

      // Fade beds in gently
      droneGainNode.gain.setTargetAtTime(MIX.droneGain, now + 0.05, 0.8);
      fanGainNode.gain.setTargetAtTime(MIX.fanNoiseGain, now + 0.05, 1.0);

      // Initialize scheduler clocks
      nextStepTime = now + 0.08;
      nextPolyTime = now + 0.25;

      return true;
    } catch (_) {
      return false;
    }
  }

  // =========================================================================
  // 7. VOICE BUDGET HELPER
  // =========================================================================
  function acquireVoice(priority, oscCost) {
    // priority: 0 = ornamental (ticker, extra echo), 1 = musical, 2 = signature event
    var cost = oscCost || 1;
    var limit = priority === 0 ? MIX.maxVoices - 4 : priority === 1 ? MIX.maxVoices : MIX.maxVoices + 2;
    if (activeVoices + cost > limit) return false;
    activeVoices += cost;
    return true;
  }

  function releaseVoiceOnEnd(node, nodesToDisconnect, oscCost) {
    var cost = oscCost || 1;
    var released = false;
    function cleanup() {
      if (released) return;
      released = true;
      activeVoices = Math.max(0, activeVoices - cost);
      if (nodesToDisconnect) {
        for (var i = 0; i < nodesToDisconnect.length; i++) {
          try {
            nodesToDisconnect[i].disconnect();
          } catch (_) {}
        }
      }
    }
    try {
      node.onended = cleanup;
    } catch (_) {
      setTimeout(cleanup, 1500);
    }
  }

  // =========================================================================
  // 8. SYNTHESIS VOICES
  // =========================================================================
  function getSlowPitchFactor() {
    // Tape-slowdown pitch sag: up to ~2.4 semitones down when slow == 1
    return Math.pow(2, (-2.4 * wpState.slow) / 12);
  }

  function getFutureDetuneCents(eraIdx) {
    if (eraIdx < 3) return eraIdx === 2 ? (Math.random() - 0.5) * 6 : 0;
    var madness = clamp((wpState.prog - 0.45) / 0.55, 0, 1);
    var spread = lerp(8, 38, madness);
    return (Math.random() - 0.5) * 2 * spread;
  }

  // Glassy sine/FM chime (Era 1 Lab & sparse accents)
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

      pan.pan.setTargetAtTime((Math.random() - 0.5) * 0.7, time, 0.01);

      mod.connect(modGain);
      modGain.connect(osc.frequency);
      osc.connect(env);
      env.connect(pan);
      pan.connect(musicBus);

      osc.start(time);
      mod.start(time);
      osc.stop(time + durSec + 0.04);
      mod.stop(time + durSec + 0.04);

      releaseVoiceOnEnd(osc, [osc, mod, modGain, env, pan], 2);
    } catch (_) {
      activeVoices = Math.max(0, activeVoices - 2);
    }
  }

  // Warm filtered synth note for Attention arpeggios & Future polyrhythms
  function playArpNote(time, midi, gainAmt, durSec, brightness, detuneCents, waveType) {
    if (!ctx || !acquireVoice(1)) return;
    try {
      var freq = midiToHz(midi) * getSlowPitchFactor();
      var osc = ctx.createOscillator();
      var filt = ctx.createBiquadFilter();
      var env = ctx.createGain();
      var pan = createPanner(ctx);

      osc.type = waveType || 'triangle';
      osc.frequency.setValueAtTime(freq, time);
      if (detuneCents) {
        osc.detune.setValueAtTime(detuneCents, time);
      }

      var cutoff = clamp(brightness, 350, MIX.maxCutoffHz);
      filt.type = 'lowpass';
      filt.frequency.setValueAtTime(cutoff, time);
      filt.frequency.exponentialRampToValueAtTime(Math.max(240, cutoff * 0.35), time + durSec);
      filt.Q.setValueAtTime(1.4, time);

      env.gain.setValueAtTime(0.0001, time);
      env.gain.linearRampToValueAtTime(gainAmt, time + 0.014);
      env.gain.exponentialRampToValueAtTime(0.0001, time + durSec);

      pan.pan.setTargetAtTime((Math.random() - 0.5) * 0.65, time, 0.01);

      osc.connect(filt);
      filt.connect(env);
      env.connect(pan);
      pan.connect(musicBus);

      osc.start(time);
      osc.stop(time + durSec + 0.03);

      releaseVoiceOnEnd(osc, [osc, filt, env, pan]);
    } catch (_) {
      activeVoices = Math.max(0, activeVoices - 1);
    }
  }

  // Rhythmic bass / kick-pulse (Era 2-4) with sidechain ducking in Era 3-4
  function playBassPulse(time, midi, gainAmt, durSec, eraIdx, isDownbeat) {
    if (!ctx || !acquireVoice(1)) return;
    try {
      var freq = midiToHz(midi) * getSlowPitchFactor();
      var osc = ctx.createOscillator();
      var filt = ctx.createBiquadFilter();
      var env = ctx.createGain();

      osc.type = eraIdx >= 2 ? 'sawtooth' : 'triangle';
      osc.frequency.setValueAtTime(freq, time);

      // Subtle sub-punch on downbeats in Boom / Future
      if (isDownbeat && eraIdx >= 2) {
        osc.frequency.setValueAtTime(freq * 1.35, time);
        osc.frequency.exponentialRampToValueAtTime(freq, time + 0.06);
      }

      filt.type = 'lowpass';
      var cut = eraIdx === 1 ? 520 : eraIdx === 2 ? 1200 : 1850;
      filt.frequency.setValueAtTime(cut, time);
      filt.frequency.exponentialRampToValueAtTime(180, time + durSec);
      filt.Q.setValueAtTime(eraIdx >= 2 ? 2.0 : 0.9, time);

      env.gain.setValueAtTime(0.0001, time);
      env.gain.linearRampToValueAtTime(gainAmt, time + 0.012);
      env.gain.exponentialRampToValueAtTime(0.0001, time + durSec);

      osc.connect(filt);
      filt.connect(env);
      env.connect(musicBus);

      osc.start(time);
      osc.stop(time + durSec + 0.03);

      // Sidechain-style pumping on Era 3 & 4 quarter beats
      if (isDownbeat && eraIdx >= 2 && sidechainGain) {
        var pumpDepth = eraIdx === 2 ? 0.52 : 0.44;
        sidechainGain.gain.cancelScheduledValues(time);
        sidechainGain.gain.setValueAtTime(pumpDepth, time);
        sidechainGain.gain.exponentialRampToValueAtTime(1.0, time + 0.24);
      }

      releaseVoiceOnEnd(osc, [osc, filt, env]);
    } catch (_) {
      activeVoices = Math.max(0, activeVoices - 1);
    }
  }

  // Subtle percussive news-ticker blip (wp:headline)
  function playTickerBlip(time, isFake, eraIdx) {
    if (!ctx || !acquireVoice(0)) return;
    try {
      var era = ERAS[eraIdx];
      var deg = era.scale[(stepIndex + (isFake ? 5 : 2)) % era.scale.length];
      var freq = midiToHz(era.rootMidi + 36 + deg) * getSlowPitchFactor();
      freq = clamp(freq, 600, 4200);

      var osc = ctx.createOscillator();
      var filt = ctx.createBiquadFilter();
      var env = ctx.createGain();
      var pan = createPanner(ctx);

      osc.type = isFake ? 'triangle' : 'sine';
      osc.frequency.setValueAtTime(freq, time);
      osc.frequency.exponentialRampToValueAtTime(freq * (isFake ? 0.88 : 1.04), time + 0.045);

      filt.type = 'bandpass';
      filt.frequency.setValueAtTime(freq, time);
      filt.Q.setValueAtTime(3.0, time);

      var lvl = MIX.headlineGain * (eraIdx < 2 ? 0.55 : 1.0);
      env.gain.setValueAtTime(0.0001, time);
      env.gain.linearRampToValueAtTime(lvl, time + 0.005);
      env.gain.exponentialRampToValueAtTime(0.0001, time + 0.055);

      pan.pan.setTargetAtTime((Math.random() - 0.5) * 0.8, time, 0.01);

      osc.connect(filt);
      filt.connect(env);
      env.connect(pan);
      pan.connect(musicBus);

      osc.start(time);
      osc.stop(time + 0.07);

      releaseVoiceOnEnd(osc, [osc, filt, env, pan]);
    } catch (_) {
      activeVoices = Math.max(0, activeVoices - 1);
    }
  }

  // Deep tuned boom with long tail (wp:year)
  function playYearBoom(yearNum) {
    if (!ctx || !acquireVoice(2)) return;
    try {
      var now = ctx.currentTime;
      var era = ERAS[currentEraIdx];
      var baseFreq = midiToHz(era.rootMidi) * getSlowPitchFactor();

      var osc = ctx.createOscillator();
      var subEnv = ctx.createGain();
      var filt = ctx.createBiquadFilter();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(baseFreq * 1.95, now);
      osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.5, now + 0.42);

      filt.type = 'lowpass';
      filt.frequency.setValueAtTime(320, now);
      filt.frequency.exponentialRampToValueAtTime(95, now + 2.4);

      subEnv.gain.setValueAtTime(0.0001, now);
      subEnv.gain.linearRampToValueAtTime(MIX.yearBoomGain, now + 0.035);
      subEnv.gain.exponentialRampToValueAtTime(0.0001, now + 2.8);

      osc.connect(filt);
      filt.connect(subEnv);
      subEnv.connect(musicBus);

      osc.start(now);
      osc.stop(now + 2.9);

      releaseVoiceOnEnd(osc, [osc, filt, subEnv]);

      // Soft upper octave harmonic shimmer keyed to year
      var degree = era.scale[Math.abs(yearNum | 0) % era.scale.length];
      playGlassNote(now + 0.04, era.rootMidi + 24 + degree, 0.075, 2.2);
    } catch (_) {
      activeVoices = Math.max(0, activeVoices - 1);
    }
  }

  // Gentle harmonic swell / chord touch (wp:focus)
  function playFocusSwell(item) {
    if (!ctx || !acquireVoice(2, 2)) return;
    try {
      var now = ctx.currentTime;
      var era = ERAS[currentEraIdx];
      var isPred = item && (item.k === 'p' || item.k === 'f');
      var h = hashString(item && (item.slug || item.t));
      var degIdx = h % era.scale.length;
      var deg1 = era.scale[degIdx];
      var deg2 = era.scale[(degIdx + (isPred ? 3 : 2)) % era.scale.length];

      var f1 = midiToHz(era.rootMidi + 12 + deg1) * getSlowPitchFactor();
      var f2 = midiToHz(era.rootMidi + 24 + deg2) * getSlowPitchFactor();

      var osc1 = ctx.createOscillator();
      var osc2 = ctx.createOscillator();
      var filt = ctx.createBiquadFilter();
      var env = ctx.createGain();

      osc1.type = 'triangle';
      osc2.type = isPred ? 'sawtooth' : 'sine';
      osc1.frequency.setValueAtTime(f1, now);
      osc2.frequency.setValueAtTime(f2, now);
      if (isPred) {
        osc2.detune.setValueAtTime(11, now);
      }

      filt.type = 'lowpass';
      filt.frequency.setValueAtTime(600, now);
      filt.frequency.exponentialRampToValueAtTime(isPred ? 2400 : 1800, now + 0.65);
      filt.frequency.exponentialRampToValueAtTime(480, now + 2.1);

      env.gain.setValueAtTime(0.0001, now);
      env.gain.linearRampToValueAtTime(MIX.focusSwellGain, now + 0.55);
      env.gain.exponentialRampToValueAtTime(0.0001, now + 2.2);

      osc1.connect(filt);
      osc2.connect(filt);
      filt.connect(env);
      env.connect(musicBus);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 2.3);
      osc2.stop(now + 2.3);

      releaseVoiceOnEnd(osc1, [osc1, osc2, filt, env], 2);
    } catch (_) {
      activeVoices = Math.max(0, activeVoices - 2);
    }
  }

  // Release snap-back whoosh when user lets go of hold (slow -> 0)
  function playReleaseWhoosh() {
    if (!ctx || !noiseBuffer || !acquireVoice(1)) return;
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
      env.connect(masterToneFilter);

      src.start(now);
      src.stop(now + 0.30);

      releaseVoiceOnEnd(src, [src, filt, env]);
    } catch (_) {
      activeVoices = Math.max(0, activeVoices - 1);
    }
  }

  // =========================================================================
  // 9. SIGNATURE TRANSITION EVENTS: wp:now & wp:restart
  // =========================================================================
  function triggerNowCrossing() {
    if (!ctx) return;
    try {
      var now = ctx.currentTime;
      nowCrossingActiveUntil = now + 1.35;

      // 1) Held breath: duck music bus smoothly for 1.15s
      musicBus.gain.cancelScheduledValues(now);
      musicBus.gain.setTargetAtTime(0.08, now, 0.12);
      musicBus.gain.setTargetAtTime(MIX.musicBusGain, now + 1.15, 0.14);

      // 2) Rising filtered shimmer / held breath swell
      if (noiseBuffer && acquireVoice(2)) {
        var riser = ctx.createBufferSource();
        riser.buffer = noiseBuffer;
        var rFilt = ctx.createBiquadFilter();
        rFilt.type = 'bandpass';
        rFilt.frequency.setValueAtTime(280, now);
        rFilt.frequency.exponentialRampToValueAtTime(4200, now + 1.12);
        rFilt.Q.setValueAtTime(3.2, now);

        var rEnv = ctx.createGain();
        rEnv.gain.setValueAtTime(0.0001, now);
        rEnv.gain.linearRampToValueAtTime(0.22, now + 1.05);
        rEnv.gain.exponentialRampToValueAtTime(0.0001, now + 1.25);

        riser.connect(rFilt);
        rFilt.connect(rEnv);
        rEnv.connect(masterToneFilter);
        rEnv.connect(reverbNode);

        riser.start(now);
        riser.stop(now + 1.28);
        releaseVoiceOnEnd(riser, [riser, rFilt, rEnv]);
      }

      // 3) The Drop into Era 4 (C# Phrygian Dominant / Future world) at +1.15s
      var dropTime = now + 1.15;
      var fut = ERAS[3];

      if (acquireVoice(2)) {
        var sub = ctx.createOscillator();
        var subEnv = ctx.createGain();
        sub.type = 'sine';
        sub.frequency.setValueAtTime(midiToHz(fut.rootMidi + 12), dropTime);
        sub.frequency.exponentialRampToValueAtTime(midiToHz(fut.rootMidi), dropTime + 0.35);

        subEnv.gain.setValueAtTime(0.0001, dropTime);
        subEnv.gain.linearRampToValueAtTime(0.42, dropTime + 0.02);
        subEnv.gain.exponentialRampToValueAtTime(0.0001, dropTime + 3.0);

        sub.connect(subEnv);
        subEnv.connect(masterToneFilter);
        sub.start(dropTime);
        sub.stop(dropTime + 3.1);
        releaseVoiceOnEnd(sub, [sub, subEnv]);
      }

      // Strange future chord bloom (C#, F, G, B -> Phrygian-dominant + tritone shimmer)
      var chordNotes = [fut.rootMidi + 12, fut.rootMidi + 16, fut.rootMidi + 18, fut.rootMidi + 23];
      for (var i = 0; i < chordNotes.length; i++) {
        playArpNote(dropTime + i * 0.03, chordNotes[i], 0.11, 2.8, 3600, (i - 1.5) * 9, 'sawtooth');
      }

      // Reset motif memory to strange future intervals
      motifMemory = [0, 1, 4, 6];
    } catch (_) {}
  }

  function triggerRestartWhiteout() {
    if (!ctx) return;
    try {
      var now = ctx.currentTime;
      restartMuteUntil = now + 2.1;

      // White-out swell into near silence, then return to Quiet Lab
      if (noiseBuffer && acquireVoice(2)) {
        var wash = ctx.createBufferSource();
        wash.buffer = noiseBuffer;

        var wFilt = ctx.createBiquadFilter();
        wFilt.type = 'lowpass';
        wFilt.frequency.setValueAtTime(600, now);
        wFilt.frequency.exponentialRampToValueAtTime(6800, now + 1.15);
        wFilt.frequency.exponentialRampToValueAtTime(320, now + 1.95);

        var wEnv = ctx.createGain();
        wEnv.gain.setValueAtTime(0.0001, now);
        wEnv.gain.linearRampToValueAtTime(0.32, now + 1.1);
        wEnv.gain.exponentialRampToValueAtTime(0.0001, now + 1.95);

        wash.connect(wFilt);
        wFilt.connect(wEnv);
        wEnv.connect(masterToneFilter);
        wEnv.connect(reverbNode);

        wash.start(now);
        wash.stop(now + 2.0);
        releaseVoiceOnEnd(wash, [wash, wFilt, wEnv]);
      }

      // Fade music bus to near silence, then return softly
      musicBus.gain.cancelScheduledValues(now);
      musicBus.gain.setTargetAtTime(0.015, now + 0.65, 0.22);
      musicBus.gain.setTargetAtTime(MIX.musicBusGain, now + 2.25, 0.65);

      // Reset musical state for 2012 Quiet Lab
      currentEraIdx = 0;
      motifMemory = [0, 2, 4, 2];
    } catch (_) {}
  }

  // =========================================================================
  // 10. LOOK-AHEAD SCHEDULER (AudioContext.currentTime + setTimeout)
  // =========================================================================
  function getEffectiveBpm(eraIdx) {
    var era = ERAS[eraIdx];
    var bpm = era.baseBpm;
    if (eraIdx === 1) {
      // 2017-2022 gradually accelerates 98 -> 112
      var t1 = clamp((wpState.date - 2017) / 6, 0, 1);
      bpm = lerp(96, 112, t1);
    } else if (eraIdx === 2) {
      // 2023-2026 climbs 116 -> 128
      var t2 = clamp((wpState.date - 2023) / 3.85, 0, 1);
      bpm = lerp(116, 128, t2);
    } else if (eraIdx === 3) {
      // 2027-2031 pushes 128 -> 142 with prog
      var t3 = clamp((wpState.prog - 0.45) / 0.55, 0, 1);
      bpm = lerp(128, 142, t3);
    }
    // Hold-to-slow stretches tempo smoothly
    var slowScale = 1 - clamp(wpState.slow, 0, 1) * 0.55;
    return Math.max(36, bpm * slowScale);
  }

  function scheduleMainStep(time, idx) {
    if (time < nowCrossingActiveUntil || time < restartMuteUntil) return;

    var eraIdx = currentEraIdx;
    var era = ERAS[eraIdx];
    var scale = era.scale;
    var detune = getFutureDetuneCents(eraIdx);

    if (eraIdx === 0) {
      // 2012-2016: The Quiet Lab — sparse, cold, patient glassy notes
      if (idx % 8 === 0 || (idx % 12 === 5 && Math.random() < 0.45)) {
        var deg0 = scale[motifMemory[idx % motifMemory.length] % scale.length];
        var oct0 = idx % 16 === 0 ? 24 : 36;
        playGlassNote(time, era.rootMidi + oct0 + deg0, MIX.glassGain, 2.6);
      }
      return;
    }

    if (eraIdx === 1) {
      // 2017-2022: Attention — warm pulse + sentence-echo arpeggios
      if (idx % 4 === 0) {
        var bassDeg1 = idx % 16 < 8 ? 0 : (idx % 16 < 12 ? 4 : 3);
        playBassPulse(time, era.rootMidi + scale[bassDeg1], MIX.pulseBassGain * 0.78, 0.52, eraIdx, true);
      }
      if (idx % 2 === 0) {
        var memIdx = (idx >> 1) % motifMemory.length;
        var deg1 = scale[motifMemory[memIdx] % scale.length];
        var oct1 = ((idx >> 2) % 2 === 0) ? 24 : 12;
        playArpNote(time, era.rootMidi + oct1 + deg1, MIX.arpGain * 0.85, 0.42, 2400, 0, 'triangle');
      }
      return;
    }

    if (eraIdx === 2) {
      // 2023-2026: The Boom — denser, brighter, pumping quarter-note bass + 16th shimmer
      var isQuarter = idx % 4 === 0;
      if (isQuarter || idx % 4 === 2) {
        var bStep = (idx >> 2) % 4;
        var bDeg = bStep === 0 ? 0 : bStep === 1 ? 0 : bStep === 2 ? 4 : 5;
        playBassPulse(time, era.rootMidi + scale[bDeg], MIX.pulseBassGain * (isQuarter ? 1.0 : 0.65), isQuarter ? 0.34 : 0.2, eraIdx, isQuarter);
      }
      // Dense driving arpeggio
      if (idx % 2 === 0 || Math.random() < 0.45) {
        var deg2 = scale[motifMemory[idx % motifMemory.length] % scale.length];
        var oct2 = idx % 4 === 3 ? 36 : 24;
        playArpNote(time, era.rootMidi + oct2 + deg2, MIX.arpGain, 0.24, 4400, detune, 'sawtooth');
      }
      return;
    }

    // 2027-2031: The Future — dense, detuned, bright, overwhelming yet musical
    var madness = clamp((wpState.prog - 0.45) / 0.55, 0, 1);
    var isQ3 = idx % 4 === 0;
    if (isQ3 || (madness > 0.3 && idx % 4 === 3)) {
      var fDeg = scale[(idx >> 2) % 3 === 0 ? 0 : (idx >> 2) % 3 === 1 ? 1 : 4];
      playBassPulse(time, era.rootMidi + fDeg, MIX.pulseBassGain * (isQ3 ? 1.08 : 0.7), 0.32, eraIdx, isQ3);
    }
    var arpChance = lerp(0.65, 0.96, madness);
    if (Math.random() < arpChance) {
      var deg3 = scale[motifMemory[idx % motifMemory.length] % scale.length];
      var oct3 = (idx % 3 === 0) ? 24 : (idx % 5 === 0 ? 36 : 12);
      var bright3 = lerp(3800, 6800, madness);
      playArpNote(time, era.rootMidi + oct3 + deg3, MIX.arpGain * lerp(0.95, 1.15, madness), 0.22, bright3, detune, 'sawtooth');
    }
  }

  // Secondary polyrhythmic voice (5-against-4 / 3-against-4 shimmer in Era 4)
  function schedulePolyStep(time, pIdx) {
    if (currentEraIdx < 3) return;
    if (time < nowCrossingActiveUntil || time < restartMuteUntil) return;
    var madness = clamp((wpState.prog - 0.45) / 0.55, 0, 1);
    if (madness < 0.1) return;

    var era = ERAS[3];
    var deg = era.scale[(pIdx * 2 + 1) % era.scale.length];
    var detune = getFutureDetuneCents(3);
    playGlassNote(time, era.rootMidi + 24 + deg, MIX.glassGain * lerp(0.55, 1.1, madness), lerp(0.9, 0.45, madness));
    if (madness > 0.55 && pIdx % 3 === 0) {
      playArpNote(time, era.rootMidi + 36 + deg, MIX.arpGain * 0.65, 0.32, 6200, detune, 'triangle');
    }
  }

  function runScheduler() {
    if (!ctx || !started || isHidden) return;
    try {
      var now = ctx.currentTime;
      // Guard against huge time jumps after tab suspension
      if (nextStepTime < now - 0.25) nextStepTime = now + 0.04;
      if (nextPolyTime < now - 0.25) nextPolyTime = now + 0.1;

      var bpm = getEffectiveBpm(currentEraIdx);
      var sixteenthSec = (60 / bpm) / 4;

      var safety = 0;
      while (nextStepTime < now + MIX.scheduleAheadSec && safety < 8) {
        scheduleMainStep(nextStepTime, stepIndex);
        nextStepTime += sixteenthSec;
        stepIndex = (stepIndex + 1) & 0x7fffffff;
        safety++;
      }

      // Polyrhythmic 5:4 layer in the Future era
      var polyStepSec = sixteenthSec * 1.25; // 5 against 4 feel
      var polySafety = 0;
      while (nextPolyTime < now + MIX.scheduleAheadSec && polySafety < 6) {
        schedulePolyStep(nextPolyTime, polyStepIndex);
        nextPolyTime += polyStepSec;
        polyStepIndex = (polyStepIndex + 1) & 0x7fffffff;
        polySafety++;
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
  // 11. PER-FRAME STATE SYNC (requestAnimationFrame)
  // =========================================================================
  function readEngineState() {
    var st = window.WP && window.WP.state;
    if (!st) return;
    if (typeof st.date === 'number' && isFinite(st.date)) wpState.date = st.date;
    if (typeof st.prog === 'number' && isFinite(st.prog)) wpState.prog = clamp(st.prog, 0, 1);
    if (typeof st.slow === 'number' && isFinite(st.slow)) wpState.slow = clamp(st.slow, 0, 1);
    if (typeof st.pause === 'number' && isFinite(st.pause)) wpState.pause = clamp(st.pause, 0, 1);
    if (typeof st.spinV === 'number' && isFinite(st.spinV)) wpState.spinV = clamp(st.spinV, -5, 5);
    wpState.focus = st.focus || null;
    wpState.open = st.open || null;
    wpState.started = !!st.started;
  }

  function updateContinuousParams() {
    if (!ctx || !started || isHidden) return;
    try {
      var now = ctx.currentTime;
      var eraIdx = getEraIndex(wpState.date);
      var era = ERAS[eraIdx];

      // Era change updates drone waveform gently
      if (eraIdx !== currentEraIdx) {
        currentEraIdx = eraIdx;
        try {
          droneOsc1.type = era.droneWave;
        } catch (_) {}
      }

      var pitchFactor = getSlowPitchFactor();
      var madness = eraIdx === 3 ? clamp((wpState.prog - 0.45) / 0.55, 0, 1) : 0;

      // 1) Drone pitch & timbre
      var rootHz = midiToHz(era.rootMidi) * pitchFactor;
      var fifthHz = midiToHz(era.fifthMidi) * pitchFactor;
      droneOsc1.frequency.setTargetAtTime(rootHz, now, 0.25);
      droneOsc2.frequency.setTargetAtTime(fifthHz, now, 0.25);
      droneOsc2.detune.setTargetAtTime(eraIdx === 3 ? lerp(4, 24, madness) : 2, now, 0.2);

      var droneCut = eraIdx === 0 ? 320 : eraIdx === 1 ? 680 : eraIdx === 2 ? 1250 : lerp(1400, 2900, madness);
      droneFilter.frequency.setTargetAtTime(droneCut, now, 0.2);

      // 2) Server-fan noise (prominent in quiet lab, recedes in boom, eerie shimmer in future)
      var fanLevel = eraIdx === 0 ? MIX.fanNoiseGain : eraIdx === 1 ? MIX.fanNoiseGain * 0.55 : eraIdx === 2 ? MIX.fanNoiseGain * 0.35 : MIX.fanNoiseGain * lerp(0.5, 1.15, madness);
      fanGainNode.gain.setTargetAtTime(fanLevel, now, 0.3);
      var fanFreq = eraIdx === 0 ? 420 + Math.sin(now * 0.27) * 90 : eraIdx === 3 ? lerp(650, 2200, madness) : 580;
      fanFilter.frequency.setTargetAtTime(fanFreq, now, 0.25);

      // 3) Interactive filter: combine era brightness, slow sweep, and panel dreamy filter
      var eraBright = eraIdx === 3 ? lerp(era.filterBase, MIX.maxCutoffHz, madness) : era.filterBase;
      var slowCutoff = lerp(eraBright, MIX.slowMinCutoffHz, wpState.slow);
      var finalCutoff = lerp(slowCutoff, MIX.panelCutoffHz, wpState.pause);
      interactFilter.frequency.setTargetAtTime(clamp(finalCutoff, 280, MIX.maxCutoffHz), now, 0.06);

      // 4) Reverb bloom from slow + future madness
      var wet = MIX.reverbWetBase + wpState.slow * MIX.reverbWetSlowBoost + madness * MIX.reverbWetFutureBoost;
      reverbSend.gain.setTargetAtTime(clamp(wet, 0.1, 0.92), now, 0.1);

      // 5) Subtle drive saturation in Boom & Future
      var driveAmt = era.drive + madness * 0.25;
      driveWet.gain.setTargetAtTime(clamp(driveAmt * 0.45, 0.0001, 0.42), now, 0.2);
      driveDry.gain.setTargetAtTime(1.0 - clamp(driveAmt * 0.22, 0, 0.25), now, 0.2);

      // 6) Detail panel ducking (~-12 dB) & sustained tone (when not in now/restart transition)
      if (now >= nowCrossingActiveUntil && now >= restartMuteUntil) {
        var targetMusicGain = lerp(MIX.musicBusGain, MIX.musicBusGain * MIX.panelDuckGain, wpState.pause);
        musicBus.gain.setTargetAtTime(targetMusicGain, now, 0.08);
      }

      if (wpState.pause > 0.02) {
        var openItem = wpState.open;
        var isPredOpen = openItem && (openItem.k === 'p' || openItem.k === 'f');
        // Milestones: grounded warm fifth (root+12, root+19). Predictions: eerie suspended tritone/minor-9th.
        var pRoot = era.rootMidi + 12;
        var pSecond = isPredOpen ? pRoot + 6 : pRoot + 7;
        panelOsc1.frequency.setTargetAtTime(midiToHz(pRoot), now, 0.12);
        panelOsc2.frequency.setTargetAtTime(midiToHz(pSecond), now, 0.12);
        panelOsc2.detune.setTargetAtTime(isPredOpen ? 14 : 2, now, 0.12);
        panelFilter.frequency.setTargetAtTime(isPredOpen ? 1550 : 980, now, 0.12);
        panelGainNode.gain.setTargetAtTime(MIX.panelToneGain * wpState.pause, now, 0.12);
      } else {
        panelGainNode.gain.setTargetAtTime(0.0001, now, 0.12);
      }

      // 7) Drag spin: stereo pan + filtered noise whoosh
      var spinAbs = Math.abs(wpState.spinV);
      var panVal = clamp(wpState.spinV / 3.0, -0.85, 0.85);
      musicPanner.pan.setTargetAtTime(panVal * 0.55, now, 0.05);
      spinPanner.pan.setTargetAtTime(panVal, now, 0.04);

      if (spinAbs > 0.08) {
        var spinNorm = clamp((spinAbs - 0.08) / 2.92, 0, 1);
        spinGainNode.gain.setTargetAtTime(spinNorm * MIX.spinWhooshMaxGain, now, 0.05);
        spinFilter.frequency.setTargetAtTime(lerp(360, 2800, spinNorm), now, 0.05);
      } else {
        spinGainNode.gain.setTargetAtTime(0.0001, now, 0.08);
      }

      // 8) Detect release from hold (slow snaps back -> whoosh)
      if (prevSlow > 0.35 && wpState.slow < 0.18) {
        playReleaseWhoosh();
      }
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

  function startRafLoop() {
    if (rafId !== null) return;
    if (typeof window.requestAnimationFrame === 'function') {
      rafId = window.requestAnimationFrame(rafLoop);
    }
  }

  // =========================================================================
  // 12. EVENT HANDLERS (Engine Contract)
  // =========================================================================
  function handleStart() {
    try {
      if (!initAudio()) return;
      started = true;
      if (ctx.state === 'suspended' && !isHidden) {
        var p = ctx.resume();
        if (p && typeof p.catch === 'function') p.catch(function () {});
      }
      startScheduler();
      startRafLoop();
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
      var h = hashString(item && (item.slug || item.t));
      var degIdx = h % era.scale.length;

      // Push into "attention" motif ring buffer so future arps look back over recent words
      motifMemory.push(degIdx);
      if (motifMemory.length > 6) motifMemory.shift();

      var noteMidi = era.rootMidi + 24 + era.scale[degIdx];
      var detune = getFutureDetuneCents(currentEraIdx);

      if (currentEraIdx === 0) {
        playGlassNote(now + 0.01, noteMidi, MIX.wordGain * 0.75, 1.9);
      } else {
        // Primary word note + soft "attention" echo of an earlier motif note
        playArpNote(now + 0.01, noteMidi, MIX.wordGain, 0.45, era.filterBase, detune, 'triangle');
        var echoDegIdx = motifMemory[0] % era.scale.length;
        var echoMidi = era.rootMidi + 24 + era.scale[echoDegIdx];
        playArpNote(now + 0.19, echoMidi, MIX.wordGain * 0.52, 0.38, era.filterBase * 0.8, detune, 'sine');
      }
    } catch (_) {}
  }

  function handleYear(ev) {
    if (!ctx || !started || isHidden) return;
    try {
      var yearNum = ev && typeof ev.detail === 'number' ? ev.detail : Math.floor(wpState.date);
      playYearBoom(yearNum);
    } catch (_) {}
  }

  function handleFocus(ev) {
    if (!ctx || !started || isHidden) return;
    try {
      playFocusSwell(ev && ev.detail);
    } catch (_) {}
  }

  function handleHeadline(ev) {
    if (!ctx || !started || isHidden) return;
    try {
      var now = ctx.currentTime;
      if (now - lastHeadlineTime < MIX.headlineMinGapSec) return;
      lastHeadlineTime = now;
      var item = ev && ev.detail;
      var isFake = !!(item && item.k === 'f');
      playTickerBlip(now + 0.005, isFake, currentEraIdx);
    } catch (_) {}
  }

  function handleOpen(ev) {
    if (!ctx || !started) return;
    try {
      if (ev && ev.detail) {
        wpState.open = ev.detail;
      }
    } catch (_) {}
  }

  function handleClose() {
    if (!ctx || !started) return;
    try {
      wpState.open = null;
    } catch (_) {}
  }

  function handleNow() {
    if (!ctx || !started || isHidden) return;
    triggerNowCrossing();
  }

  function handleRestart() {
    if (!ctx || !started || isHidden) return;
    triggerRestartWhiteout();
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
  // 13. MUTE CONTROL & DOM BUTTON (44x44, bottom-right above timeline, inline SVG)
  // =========================================================================
  function applyMuteGain() {
    if (!ctx || !masterGain) return;
    try {
      var now = ctx.currentTime;
      masterGain.gain.cancelScheduledValues(now);
      masterGain.gain.setTargetAtTime(isMuted ? 0.0001 : MIX.masterGain, now, 0.03);
    } catch (_) {}
  }

  function renderMuteButtonState() {
    if (!muteBtn) return;
    try {
      muteBtn.setAttribute('aria-pressed', isMuted ? 'true' : 'false');
      muteBtn.setAttribute('aria-label', isMuted ? 'Unmute soundtrack' : 'Mute soundtrack');
      muteBtn.setAttribute('title', isMuted ? 'Unmute soundtrack' : 'Mute soundtrack');
      muteBtn.innerHTML = isMuted
        ? '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
            '<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>' +
            '<line x1="23" y1="9" x2="17" y2="15"></line>' +
            '<line x1="17" y1="9" x2="23" y2="15"></line>' +
          '</svg>'
        : '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
            '<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>' +
            '<path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path>' +
            '<path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path>' +
          '</svg>';
    } catch (_) {}
  }

  function setMuted(val) {
    isMuted = !!val;
    writeSavedMute(isMuted);
    applyMuteGain();
    renderMuteButtonState();
  }

  function createMuteButton() {
    try {
      if (typeof document === 'undefined' || !document.body) return;
      if (muteBtn) return;

      var btn = document.createElement('button');
      btn.type = 'button';
      btn.id = 'wp-audio-toggle';
      btn.style.position = 'fixed';
      btn.style.right = '16px';
      btn.style.bottom = '84px'; // Sits cleanly above the ~70px timeline
      btn.style.width = '44px';
      btn.style.height = '44px';
      btn.style.padding = '0';
      btn.style.margin = '0';
      btn.style.borderRadius = '50%';
      btn.style.border = '1px solid rgba(255, 255, 255, 0.24)';
      btn.style.background = 'rgba(10, 12, 18, 0.62)';
      btn.style.color = '#f4f6fb';
      btn.style.display = 'flex';
      btn.style.alignItems = 'center';
      btn.style.justifyContent = 'center';
      btn.style.cursor = 'pointer';
      btn.style.zIndex = '9999';
      btn.style.backdropFilter = 'blur(8px)';
      btn.style.webkitBackdropFilter = 'blur(8px)';
      btn.style.transition = 'background 150ms ease, border-color 150ms ease, transform 120ms ease';
      btn.style.touchAction = 'manipulation';

      btn.addEventListener('click', function (ev) {
        if (ev && typeof ev.stopPropagation === 'function') ev.stopPropagation();
        if (!started) {
          handleStart();
        }
        setMuted(!isMuted);
      });

      muteBtn = btn;
      renderMuteButtonState();
      document.body.appendChild(btn);
    } catch (_) {}
  }

  // =========================================================================
  // 14. BOOTSTRAP & PUBLIC GLOBAL API
  // =========================================================================
  try {
    isMuted = readSavedMute();

    window.addEventListener('wp:start', handleStart);
    window.addEventListener('wp:word', handleWord);
    window.addEventListener('wp:year', handleYear);
    window.addEventListener('wp:focus', handleFocus);
    window.addEventListener('wp:headline', handleHeadline);
    window.addEventListener('wp:open', handleOpen);
    window.addEventListener('wp:close', handleClose);
    window.addEventListener('wp:now', handleNow);
    window.addEventListener('wp:restart', handleRestart);

    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', handleVisibilityChange);
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', createMuteButton);
      } else {
        createMuteButton();
      }
    }

    // Expose exactly one global: window.WP_AUDIO = { mute(), unmute(), get muted() }
    window.WP_AUDIO = {
      mute: function () {
        setMuted(true);
      },
      unmute: function () {
        setMuted(false);
      },
      get muted() {
        return isMuted;
      }
    };
  } catch (_) {}
})();