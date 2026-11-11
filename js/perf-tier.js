/* SOLO LEVELING — SHADOW GATE HOTSPOT · perf-tier.js
   Runs synchronously in <head>, before first paint, so the correct visual
   tier is applied without a flash of heavy effects.

   data-perf="lite"      weakest devices / data saver / reduced motion
   data-perf="balanced"  default for phones and mid-range hardware
   data-perf="rich"      capable desktops: parallax, runes, sparkles
   ========================================================================== */
(function (window, document) {
  'use strict';

  var root = document.documentElement;

  function match(query) {
    try {
      return !!(window.matchMedia && window.matchMedia(query).matches);
    } catch (error) {
      return false;
    }
  }

  function supportsBackdropFilter() {
    try {
      if (!window.CSS || typeof window.CSS.supports !== 'function') return false;
      return window.CSS.supports('backdrop-filter', 'blur(2px)') ||
        window.CSS.supports('-webkit-backdrop-filter', 'blur(2px)');
    } catch (error) {
      return false;
    }
  }

  function readConnection() {
    var nav = window.navigator || {};
    return nav.connection || nav.mozConnection || nav.webkitConnection || null;
  }

  var nav = window.navigator || {};
  var connection = readConnection();
  var reducedMotion = match('(prefers-reduced-motion: reduce)');
  var reducedData = !!(connection && connection.saveData);
  var slowNetwork = !!(connection && /(^|-)2g$/.test(String(connection.effectiveType || '')));
  var memory = typeof nav.deviceMemory === 'number' ? nav.deviceMemory : 0;
  var cores = typeof nav.hardwareConcurrency === 'number' ? nav.hardwareConcurrency : 0;
  var noDataset = typeof root.dataset === 'undefined';

  var isLite =
    reducedMotion ||
    reducedData ||
    slowNetwork ||
    noDataset ||
    (memory > 0 && memory <= 2) ||
    (cores > 0 && cores <= 2);

  var isRich =
    !isLite &&
    supportsBackdropFilter() &&
    match('(min-width: 768px)') &&
    match('(pointer: fine)') &&
    !(memory > 0 && memory < 6) &&
    !(cores > 0 && cores < 6);

  var tier = isLite ? 'lite' : (isRich ? 'rich' : 'balanced');

  root.setAttribute('data-perf', tier);

  window.ShadowGatePerf = {
    name: tier,
    reducedMotion: reducedMotion,
    saveData: reducedData,
    isLite: tier === 'lite',
    isRich: tier === 'rich'
  };
})(window, document);
