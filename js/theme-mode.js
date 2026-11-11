/* SOLO LEVELING — SHADOW GATE HOTSPOT · theme-mode.js
   Runs early in <head> so the saved scheme and Monarch state are applied
   before first paint. Also exposes the small toggle API used by theme-motion.
   ========================================================================== */
(function (window, document) {
  'use strict';

  var root = document.documentElement;
  var SCHEME_KEY = 'sl-scheme';
  var MONARCH_KEY = 'sl-monarch';

  function read(key, fallback) {
    try {
      var value = window.localStorage.getItem(key);
      return value === null ? fallback : value;
    } catch (error) {
      return fallback;
    }
  }

  function write(key, value) {
    try {
      window.localStorage.setItem(key, value);
    } catch (error) {
      /* private mode — keep the in-memory value only */
    }
  }

  function each(list, fn) {
    Array.prototype.forEach.call(list, fn);
  }

  function isLight() {
    return root.getAttribute('data-scheme') === 'light';
  }

  function isMonarch() {
    return root.getAttribute('data-monarch') === 'on';
  }

  function syncMeta() {
    var meta = document.querySelector('meta[name="theme-color"]');
    if (!meta) return;
    var color = '#04060c';
    if (isLight()) color = '#eaf3f8';
    if (isMonarch()) color = isLight() ? '#ede9fe' : '#12081f';
    meta.setAttribute('content', color);
  }

  function syncButtons() {
    var light = isLight();
    var monarch = isMonarch();

    each(document.querySelectorAll('[data-toggle-theme]'), function (button) {
      button.setAttribute('aria-pressed', light ? 'true' : 'false');
      button.setAttribute('aria-label', light ? 'Switch to System dark mode' : 'Switch to Awakened light mode');
      var label = button.querySelector('[data-label]');
      if (label) label.textContent = light ? 'Awakened' : 'System';
    });

    each(document.querySelectorAll('[data-monarch-badge]'), function (badge) {
      badge.hidden = !monarch;
    });
  }

  function applyScheme(value) {
    if (value === 'light') root.setAttribute('data-scheme', 'light');
    else root.removeAttribute('data-scheme');
    syncMeta();
    syncButtons();
  }

  function applyMonarch(value) {
    if (value === 'on') root.setAttribute('data-monarch', 'on');
    else root.removeAttribute('data-monarch');
    syncMeta();
    syncButtons();
  }

  function toggleScheme() {
    var next = isLight() ? 'dark' : 'light';
    write(SCHEME_KEY, next);
    applyScheme(next);
    return next;
  }

  function toggleMonarch(force) {
    var next = typeof force === 'boolean'
      ? (force ? 'on' : 'off')
      : (isMonarch() ? 'off' : 'on');
    write(MONARCH_KEY, next);
    applyMonarch(next);
    return next;
  }

  /* Apply saved state immediately (before CSS paints). */
  var savedScheme = read(SCHEME_KEY, 'dark');
  var savedMonarch = read(MONARCH_KEY, 'off');
  applyScheme(savedScheme);
  applyMonarch(savedMonarch);

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      syncMeta();
      syncButtons();
    });
  } else {
    syncMeta();
    syncButtons();
  }

  window.ShadowGateTheme = {
    isLight: isLight,
    isMonarch: isMonarch,
    toggleScheme: toggleScheme,
    toggleMonarch: toggleMonarch,
    setScheme: applyScheme,
    setMonarch: applyMonarch
  };
})(window, document);
