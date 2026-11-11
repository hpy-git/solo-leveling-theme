/* SOLO LEVELING — SHADOW GATE HOTSPOT · theme-sounds.js
   System SFX and the optional "Mana Flow" ambient audio.

   · Navigation taps use the local System blip sample (audio/tap.mp3).
     The sample is decoded once, trimmed to its first transient, and
     pitch-shifted per interaction so the menu feels alive.
   · Confirm / level-up / error / gate cues layer original Web Audio
     synthesis on top, so the theme still has a voice if the sample
     is missing or cannot be decoded.
   · All audio is served locally from the router; no external requests.
   ========================================================================== */
(function (window, document) {
  'use strict';

  var SFX_KEY = 'sl-sfx';
  var AMBIENT_KEY = 'sl-ambient';
  var SAMPLE_URL = 'audio/tap.mp3';
  var SAMPLE_WINDOW = 0.24;

  var audioContext = null;
  var masterBus = null;
  var noiseBuffer = null;
  var sampleBuffer = null;
  var sampleShape = null;
  var sampleState = 0; /* 0 idle · 1 loading · 2 ready · 3 unavailable */
  var fallbackTap = null;
  var musicAudio = null;
  var sfxEnabled = true;
  var ambientEnabled = true;
  var lastPlayAt = 0;
  var lastGestureAt = 0;
  var gesturesBound = false;
  var contextPrimed = false;
  var pendingKind = null;
  var pendingTimer = 0;

  function readPreference(key, fallback) {
    try {
      var stored = window.localStorage.getItem(key);
      return stored === null ? fallback : stored !== 'false';
    } catch (error) {
      return fallback;
    }
  }

  function writePreference(key, value) {
    try {
      window.localStorage.setItem(key, value ? 'true' : 'false');
    } catch (error) {
      /* private mode — keep the in-memory value only */
    }
  }

  sfxEnabled = readPreference(SFX_KEY, true);
  ambientEnabled = readPreference(AMBIENT_KEY, true);

  function isLite() {
    return document.documentElement.getAttribute('data-perf') === 'lite';
  }

  function each(list, fn) {
    Array.prototype.forEach.call(list, fn);
  }

  /* --------------------------------------------------------------- audio graph */

  function getContext() {
    if (audioContext) return audioContext;
    var Ctor = window.AudioContext || window.webkitAudioContext;
    if (!Ctor) return null;
    try {
      audioContext = new Ctor();
    } catch (error) {
      return null;
    }
    return audioContext;
  }

  function getMaster(context) {
    if (masterBus) return masterBus;

    var gain = context.createGain();
    gain.gain.value = 0.5;

    if (typeof context.createDynamicsCompressor === 'function') {
      var compressor = context.createDynamicsCompressor();
      compressor.threshold.value = -8;
      compressor.knee.value = 8;
      compressor.ratio.value = 10;
      compressor.attack.value = 0.003;
      compressor.release.value = 0.12;
      gain.connect(compressor);
      compressor.connect(context.destination);
    } else {
      gain.connect(context.destination);
    }

    masterBus = gain;
    return masterBus;
  }

  /* --------------------------------------------------------------- system sample */

  function shapeSample(buffer) {
    var data = buffer.getChannelData(0);
    var limit = Math.min(data.length, Math.floor(buffer.sampleRate * 1.6));
    var peak = 0;
    var i;

    for (i = 0; i < limit; i++) {
      var value = data[i] < 0 ? -data[i] : data[i];
      if (value > peak) peak = value;
    }

    if (!peak) return null;

    var gate = peak * 0.08;
    var onset = 0;
    for (i = 0; i < limit; i++) {
      var sample = data[i] < 0 ? -data[i] : data[i];
      if (sample > gate) {
        onset = i;
        break;
      }
    }

    var start = Math.max(0, onset / buffer.sampleRate - 0.004);
    var length = Math.min(SAMPLE_WINDOW, buffer.duration - start);

    if (length < 0.05) return null;

    return {
      start: start,
      length: length,
      level: Math.min(6, 0.9 / peak)
    };
  }

  function loadSample(context) {
    if (sampleState !== 0) return;
    sampleState = 1;

    if (typeof window.fetch !== 'function' || typeof context.decodeAudioData !== 'function') {
      sampleState = 3;
      return;
    }

    window.fetch(SAMPLE_URL, { cache: 'force-cache' })
      .then(function (response) {
        if (!response.ok) throw new Error('sample request failed');
        return response.arrayBuffer();
      })
      .then(function (bytes) {
        return new Promise(function (resolve, reject) {
          var task = context.decodeAudioData(bytes, resolve, reject);
          if (task && typeof task.then === 'function') task.then(resolve, reject);
        });
      })
      .then(function (buffer) {
        var shape = shapeSample(buffer);
        if (!shape) throw new Error('sample too short');
        sampleBuffer = buffer;
        sampleShape = shape;
        sampleState = 2;

        /* A tap arrived while the sample was decoding — play it now with the
           real System blip instead of the synth placeholder. */
        if (pendingKind !== null) {
          var queued = pendingKind;
          pendingKind = null;
          if (pendingTimer) {
            window.clearTimeout(pendingTimer);
            pendingTimer = 0;
          }
          var context = getContext();
          if (context) renderCue(context, queued);
        }
      })
      .catch(function () {
        sampleState = 3;
      });
  }

  function warmSample() {
    if (!sfxEnabled) return;
    var context = getContext();
    if (!context) return;
    if (sampleState === 0) loadSample(context);
  }

  function playSample(context, options) {
    if (!sampleBuffer || !sampleShape) return false;

    var rate = options.rate || 1;
    var start = context.currentTime + (options.delay || 0);
    var outputLength = sampleShape.length / rate;
    var fade = Math.min(0.07, outputLength * 0.4);
    var level = (options.gain || 0.3) * sampleShape.level;

    var source = context.createBufferSource();
    var gain = context.createGain();

    source.buffer = sampleBuffer;
    source.playbackRate.value = rate;

    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(level, start + 0.004);
    gain.gain.setValueAtTime(level, start + Math.max(0.006, outputLength - fade));
    gain.gain.exponentialRampToValueAtTime(0.0001, start + outputLength);

    source.connect(gain);
    gain.connect(getMaster(context));
    source.start(start, sampleShape.start, sampleShape.length);

    return true;
  }

  /* --------------------------------------------------------------- synthesis */

  function bell(context, spec) {
    var start = context.currentTime + (spec.delay || 0);
    var duration = spec.duration || 0.5;
    var base = spec.freq;
    var peak = spec.gain || 0.05;

    var partials = spec.partials || [
      { ratio: 1, gain: 1, decay: 1 },
      { ratio: 2.01, gain: 0.32, decay: 0.6 },
      { ratio: 3.02, gain: 0.14, decay: 0.42 },
      { ratio: 4.96, gain: 0.06, decay: 0.28 }
    ];

    for (var i = 0; i < partials.length; i++) {
      var partial = partials[i];
      var oscillator = context.createOscillator();
      var gain = context.createGain();
      var voicePeak = peak * partial.gain;

      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(base * partial.ratio, start);

      if (spec.bend) {
        oscillator.frequency.exponentialRampToValueAtTime(
          base * partial.ratio * spec.bend,
          start + duration * 0.8
        );
      }

      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(voicePeak, start + 0.003);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + duration * (partial.decay || 1));

      oscillator.connect(gain);
      gain.connect(getMaster(context));
      oscillator.start(start);
      oscillator.stop(start + duration + 0.02);
    }
  }

  function blip(context, spec) {
    var start = context.currentTime + (spec.delay || 0);
    var duration = spec.duration || 0.06;
    var oscillator = context.createOscillator();
    var gain = context.createGain();

    oscillator.type = spec.type || 'sine';
    oscillator.frequency.setValueAtTime(spec.freq, start);
    oscillator.frequency.exponentialRampToValueAtTime(
      Math.max(40, spec.freq * (spec.bend || 0.8)),
      start + duration
    );

    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(spec.gain || 0.06, start + 0.002);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);

    oscillator.connect(gain);
    gain.connect(getMaster(context));
    oscillator.start(start);
    oscillator.stop(start + duration + 0.01);
  }

  function getNoise(context) {
    if (noiseBuffer) return noiseBuffer;

    var length = Math.floor(context.sampleRate * 0.12);
    noiseBuffer = context.createBuffer(1, length, context.sampleRate);
    var data = noiseBuffer.getChannelData(0);

    for (var i = 0; i < length; i++) {
      var falloff = 1 - i / length;
      data[i] = (Math.random() * 2 - 1) * falloff * falloff;
    }

    return noiseBuffer;
  }

  function air(context, spec) {
    var start = context.currentTime + (spec.delay || 0);
    var duration = spec.duration || 0.2;
    var source = context.createBufferSource();
    var filter = context.createBiquadFilter();
    var gain = context.createGain();

    source.buffer = getNoise(context);

    filter.type = 'bandpass';
    filter.Q.value = spec.q || 1.4;
    filter.frequency.setValueAtTime(spec.from || 1800, start);
    filter.frequency.exponentialRampToValueAtTime(spec.to || 4200, start + duration);

    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(spec.gain || 0.04, start + duration * 0.25);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(getMaster(context));
    source.start(start);
    source.stop(start + duration + 0.02);
  }

  /* --------------------------------------------------------------- playback */

  function playFallbackTap() {
    if (!fallbackTap && typeof window.Audio === 'function') {
      fallbackTap = new window.Audio(SAMPLE_URL);
      fallbackTap.preload = 'auto';
      fallbackTap.volume = 0.2;
    }
    if (!fallbackTap) return;

    var element = fallbackTap;

    function seekToBlip() {
      try { element.currentTime = 0.4; } catch (error) { /* not seekable yet */ }
    }

    try {
      if (element.readyState >= 1) {
        seekToBlip();
      } else if (typeof element.addEventListener === 'function') {
        element.addEventListener('loadedmetadata', seekToBlip, { once: true });
      }

      var promise = element.play();
      if (promise && promise.catch) promise.catch(function () {});
      window.setTimeout(function () {
        try { element.pause(); } catch (error) { /* ignore */ }
      }, 900);
    } catch (error) {
      /* autoplay policy — ignore */
    }
  }

  /* iOS and Android only unlock Web Audio inside a real gesture. Playing one
     silent frame the first time keeps later cues (which may be scheduled a
     few milliseconds later) audible. */
  function primeContext(context) {
    if (!context || contextPrimed) return;
    contextPrimed = true;
    try {
      var source = context.createBufferSource();
      source.buffer = context.createBuffer(1, 1, context.sampleRate);
      source.connect(context.destination);
      source.start(0);
    } catch (error) {
      /* ignore — the real cue still runs */
    }
  }

  function usesSample(kind) {
    return kind !== 'error' && kind !== 'levelup' && kind !== 'gate';
  }

  function scheduleCue(context, kind) {
    if (sampleState === 0) loadSample(context);

    /* Hold the cue while tap.mp3 decodes so the first interaction already
       uses the System blip. Falls back to the synth if decoding is slow. */
    if (sampleState === 1 && pendingKind === null && usesSample(kind)) {
      pendingKind = kind;
      pendingTimer = window.setTimeout(function () {
        pendingTimer = 0;
        if (pendingKind === null) return;
        var queued = pendingKind;
        pendingKind = null;
        renderCue(context, queued);
      }, 320);
      return;
    }

    renderCue(context, kind);
  }

  function play(kind, force) {
    if (!sfxEnabled) return;

    var now = Date.now();
    if (!force && now - lastPlayAt < 45) return;
    lastPlayAt = now;

    var context = getContext();
    if (!context) {
      playFallbackTap();
      return;
    }

    primeContext(context);

    /* Schedule only after resume settles: Safari and Chrome can silently drop
       buffer sources queued while the context is still suspended. */
    if (context.state === 'suspended' && typeof context.resume === 'function') {
      context.resume().then(function () {
        scheduleCue(context, kind);
      }, function () {
        scheduleCue(context, kind);
      });
      return;
    }

    scheduleCue(context, kind);
  }

  function renderCue(context, kind) {
    var jitter = 0.98 + Math.random() * 0.04;
    var lean = isLite();

    switch (kind) {
      case 'tab':
        if (!playSample(context, { rate: 1.06 * jitter, gain: 0.26 })) {
          blip(context, { freq: 1320 * jitter, duration: 0.055, gain: 0.05, bend: 0.86 });
        }
        if (!lean) bell(context, { freq: 2093, duration: 0.16, gain: 0.016 });
        break;

      case 'open':
        if (!playSample(context, { rate: 0.94 * jitter, gain: 0.32 })) {
          blip(context, { freq: 880, duration: 0.09, gain: 0.06, bend: 1.3 });
        }
        if (!lean) air(context, { from: 900, to: 3200, duration: 0.26, gain: 0.028, q: 1.1 });
        break;

      case 'close':
        if (!playSample(context, { rate: 0.86 * jitter, gain: 0.24 })) {
          blip(context, { freq: 760, duration: 0.09, gain: 0.05, bend: 0.62 });
        }
        if (!lean) air(context, { from: 2600, to: 700, duration: 0.2, gain: 0.022, q: 1.1 });
        break;

      case 'primary':
        if (!playSample(context, { rate: 0.98 * jitter, gain: 0.4 })) {
          blip(context, { freq: 660, duration: 0.12, gain: 0.07, bend: 1.4 });
        }
        if (!lean) {
          bell(context, { freq: 523.25, duration: 0.4, gain: 0.05, delay: 0.02 });
          bell(context, { freq: 783.99, duration: 0.5, gain: 0.04, delay: 0.09 });
        }
        break;

      case 'confirm':
        if (!playSample(context, { rate: 1.1 * jitter, gain: 0.34 })) {
          blip(context, { freq: 1046.5, duration: 0.07, gain: 0.06 });
        }
        if (!lean) {
          bell(context, { freq: 1046.5, duration: 0.5, gain: 0.05 });
          bell(context, { freq: 1567.98, duration: 0.6, gain: 0.038, delay: 0.07 });
          bell(context, { freq: 3135.96, duration: 0.35, gain: 0.012, delay: 0.05 });
        }
        break;

      case 'error':
        blip(context, { freq: 196, type: 'square', duration: 0.12, gain: 0.05, bend: 0.86 });
        blip(context, { freq: 146.83, type: 'square', duration: 0.16, gain: 0.05, bend: 0.8, delay: 0.12 });
        if (!lean) air(context, { from: 400, to: 180, duration: 0.18, gain: 0.03, q: 0.8 });
        break;

      case 'levelup':
        [523.25, 659.25, 783.99, 1046.5].forEach(function (freq, index) {
          bell(context, { freq: freq, duration: 0.7 - index * 0.08, gain: 0.045, delay: index * 0.085 });
        });
        if (!lean) bell(context, { freq: 2093, duration: 0.6, gain: 0.014, delay: 0.26 });
        break;

      case 'gate':
        blip(context, { freq: 55, duration: 0.5, gain: 0.09, bend: 1.5 });
        if (!lean) {
          bell(context, { freq: 220, duration: 0.6, gain: 0.03 });
          air(context, { from: 300, to: 1800, duration: 0.5, gain: 0.025, q: 1 });
        }
        break;

      default:
        if (!playSample(context, { rate: jitter, gain: 0.3 })) {
          blip(context, { freq: 1180 * jitter, duration: 0.055, gain: 0.055, bend: 0.8 });
        }
        break;
    }
  }

  function kindFor(target) {
    if (!target || typeof target.closest !== 'function') return 'tap';
    /* The sound toggles voice their own feedback (and must stay silent when
       muted), so the generic gesture cue would double-trigger. */
    if (target.closest('[data-toggle-sfx], [data-toggle-ambient]')) return null;
    if (target.closest('[data-close-sheet]')) return 'close';
    if (target.closest('[data-open-sheet]')) return 'open';
    if (target.closest('[data-tab], [role="tab"]')) return 'tab';
    if (target.closest('[data-sound="confirm"], .copy-btn, .rank-card')) return 'confirm';
    if (target.closest('.btn--danger')) return 'error';
    if (target.closest('.btn--arise, .btn--primary')) return 'primary';
    return 'tap';
  }

  /* ------------------------------------------------------------- ambient (audio element) */

  function tryPlay(audio) {
    if (!audio) return;
    try {
      var result = audio.play();
      if (result && typeof result.catch === 'function') {
        result.catch(function () {
          /* autoplay blocked — retried on the next gesture */
        });
      }
    } catch (error) {
      /* play() unavailable or blocked — retried on the next gesture */
    }
  }

  function initMusic() {
    musicAudio = document.getElementById('backgroundMusic');
    if (!musicAudio && typeof window.Audio === 'function') {
      musicAudio = document.createElement('audio');
      musicAudio.id = 'backgroundMusic';
      musicAudio.loop = true;
      musicAudio.preload = 'none';
      musicAudio.style.display = 'none';

      var sourceMp3 = document.createElement('source');
      sourceMp3.src = 'audio/theme.mp3';
      sourceMp3.type = 'audio/mpeg';
      musicAudio.appendChild(sourceMp3);

      document.body.appendChild(musicAudio);
    }
    if (!musicAudio) return;

    musicAudio.loop = true;
    musicAudio.volume = 0.3;

    /* Lite tier never streams the ambient track. */
    if (isLite()) ambientEnabled = false;

    musicAudio.muted = !ambientEnabled;

    musicAudio.addEventListener('play', syncAmbientButton);
    musicAudio.addEventListener('pause', syncAmbientButton);

    if (ambientEnabled) {
      tryPlay(musicAudio);
    }

    syncAmbientButton();
  }

  function startAmbient() {
    if (!musicAudio) return;
    ambientEnabled = true;
    writePreference(AMBIENT_KEY, true);
    musicAudio.muted = false;
    tryPlay(musicAudio);
    syncAmbientButton();
    if (window.ShadowGateMotion) window.ShadowGateMotion.showToast('MANA FLOW // AMBIENT CHANNEL OPEN');
    play('tab', true);
  }

  function stopAmbient() {
    if (!musicAudio) return;
    ambientEnabled = false;
    writePreference(AMBIENT_KEY, false);
    musicAudio.pause();
    syncAmbientButton();
    if (window.ShadowGateMotion) window.ShadowGateMotion.showToast('MANA FLOW // AMBIENT CHANNEL CLOSED');
  }

  function unlockAmbient() {
    if (!ambientEnabled) return;
    if (!musicAudio) return;
    musicAudio.muted = false;
    if (!musicAudio.paused) return;
    tryPlay(musicAudio);
  }

  /* ------------------------------------------------------------- gestures */

  function handleGesture(event) {
    unlockAmbient();

    if (audioContext && audioContext.state === 'suspended') {
      audioContext.resume().catch(function () {});
    }

    if (event.type === 'keydown') {
      if (event.repeat) return;
      var key = event.key;
      if (key !== 'Enter' && key !== ' ' && key !== 'Spacebar') return;
    }

    /* Some WebViews and assistive tech only emit click. Skip that click when a
       pointerdown/keydown already voiced the same interaction. */
    if (event.type === 'click' && Date.now() - lastGestureAt < 600) return;

    var target = event.target;
    if (target && target.nodeType !== 1) target = target.parentElement;
    if (!target || typeof target.closest !== 'function') return;
    if (!target.closest('button, a, [role="tab"], .toggle, .rank-card, .copy-btn')) return;

    lastGestureAt = Date.now();
    var kind = kindFor(target);
    if (kind) play(kind);
  }

  function bindGestures() {
    if (gesturesBound) return;
    gesturesBound = true;

    /* Pointer events cover mouse, pen, and touch — listening to click as well
       would fire the same tap twice. Fall back only where PointerEvent is absent. */
    if (window.PointerEvent) {
      document.addEventListener('pointerdown', handleGesture, true);
    } else {
      document.addEventListener('touchstart', handleGesture, true);
    }
    /* click also covers keyboard/assistive activation and WebViews that do not
       dispatch pointerdown; handleGesture de-duplicates the pair. */
    document.addEventListener('click', handleGesture, true);
    document.addEventListener('keydown', handleGesture, true);
  }

  /* -------------------------------------------------------------- toggles */

  function syncSfxButton() {
    each(document.querySelectorAll('[data-toggle-sfx]'), function (button) {
      button.setAttribute('aria-pressed', sfxEnabled ? 'true' : 'false');
      var label = button.querySelector('[data-label]');
      if (label) label.textContent = sfxEnabled ? 'SFX ON' : 'SFX OFF';
      var hint = sfxEnabled ? 'Mute sound effects' : 'Enable sound effects';
      button.setAttribute('aria-label', hint);
      button.setAttribute('title', hint);
      button.classList.toggle('is-on', sfxEnabled);
    });
  }

  function syncAmbientButton() {
    /* Show the user's intent, not live playback: browsers block autoplay until
       the first gesture, and the track starts on that gesture. */
    var isOn = ambientEnabled && !isLite();
    each(document.querySelectorAll('[data-toggle-ambient]'), function (button) {
      button.setAttribute('aria-pressed', isOn ? 'true' : 'false');
      var label = button.querySelector('[data-label]');
      if (label) label.textContent = isOn ? 'MANA ON' : 'MANA OFF';
      var hint = isOn ? 'Mute ambient music' : 'Enable ambient music';
      button.setAttribute('aria-label', hint);
      button.setAttribute('title', hint);
      button.classList.toggle('is-on', isOn);
    });
  }

  function onReady(fn) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', fn);
    } else {
      window.setTimeout(fn, 0);
    }
  }

  onReady(function () {
    /* Decode the System blip before the first tap so navigation is instant.
       The context starts suspended and is resumed by the first gesture. */
    warmSample();
    bindGestures();
    initMusic();
    syncSfxButton();

    each(document.querySelectorAll('[data-toggle-sfx]'), function (button) {
      button.addEventListener('click', function () {
        sfxEnabled = !sfxEnabled;
        writePreference(SFX_KEY, sfxEnabled);
        syncSfxButton();
        if (sfxEnabled) play('confirm', true);
      });
    });

    each(document.querySelectorAll('[data-toggle-ambient]'), function (button) {
      button.addEventListener('click', function () {
        if (window.ShadowGatePerf && window.ShadowGatePerf.isLite) {
          if (window.ShadowGateMotion) window.ShadowGateMotion.showToast('MANA FLOW UNAVAILABLE IN LITE MODE');
          return;
        }
        if (ambientEnabled) {
          stopAmbient();
        } else {
          startAmbient();
        }
      });
    });
  });

  window.ShadowGateSounds = {
    play: play,
    startAmbient: startAmbient,
    stopAmbient: stopAmbient,
    isSfxEnabled: function () { return sfxEnabled; },
    isAmbientEnabled: function () { return ambientEnabled; }
  };
})(window, document);
