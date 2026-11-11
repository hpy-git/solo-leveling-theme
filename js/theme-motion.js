/* SOLO LEVELING — SHADOW GATE HOTSPOT · theme-motion.js
   Interaction layer: ripples, tabs, sheets, tilt, copy, password reveal,
   theme toggles, Monarch Mode, toasts and the aria-live system log.

   Everything degrades: with JS off, or on the lite tier, pages still work.
   ========================================================================== */
(function (window, document) {
  'use strict';

  var tier = (window.ShadowGatePerf && window.ShadowGatePerf.name) || 'balanced';
  var reducedMotion = !!(window.ShadowGatePerf && window.ShadowGatePerf.reducedMotion);
  var isLite = tier === 'lite';
  var toastTimer = null;
  var openSheets = 0;

  /* ---------------------------------------------------------------- utils */

  function onReady(fn) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', fn);
    } else {
      fn();
    }
  }

  function raf(fn) {
    if (typeof window.requestAnimationFrame === 'function') {
      return window.requestAnimationFrame(fn);
    }
    return window.setTimeout(fn, 16);
  }

  function each(list, fn) {
    Array.prototype.forEach.call(list, fn);
  }

  function flashLabel(element, temporaryText, restoreAfter) {
    if (!element) return;
    var original = element.getAttribute('data-original-label') || element.textContent;
    element.setAttribute('data-original-label', original);
    element.textContent = temporaryText;
    window.setTimeout(function () {
      element.textContent = original;
      element.removeAttribute('data-original-label');
    }, restoreAfter || 1600);
  }

  function showToast(message, duration) {
    var toast = document.getElementById('toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'toast';
      toast.className = 'toast';
      toast.setAttribute('role', 'status');
      toast.setAttribute('aria-live', 'polite');
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.classList.add('is-visible');
    if (toastTimer) window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(function () {
      toast.classList.remove('is-visible');
    }, duration || 2400);
  }

  function setLog(message) {
    var log = document.getElementById('systemLog');
    if (log) log.textContent = message;
  }

  /* --------------------------------------------------------------- ripple */

  function spawnRipple(button, event) {
    if (isLite || reducedMotion) return;

    var rect = button.getBoundingClientRect();
    var size = Math.max(rect.width, rect.height) * 1.1;
    var x = (event && typeof event.clientX === 'number' ? event.clientX : rect.left + rect.width / 2) - rect.left;
    var y = (event && typeof event.clientY === 'number' ? event.clientY : rect.top + rect.height / 2) - rect.top;

    var ripple = document.createElement('span');
    ripple.className = 'ripple';
    ripple.style.width = size + 'px';
    ripple.style.height = size + 'px';
    ripple.style.left = (x - size / 2) + 'px';
    ripple.style.top = (y - size / 2) + 'px';

    button.appendChild(ripple);
    window.setTimeout(function () {
      if (ripple.parentNode) ripple.parentNode.removeChild(ripple);
    }, 620);
  }

  function bindRipples() {
    each(document.querySelectorAll('.btn, .copy-btn, .icon-btn, .rank-card'), function (button) {
      button.addEventListener('pointerdown', function (event) {
        spawnRipple(button, event);
      });
    });
  }

  /* ----------------------------------------------------------- tab groups */

  function moveIndicator(group, activeButton) {
    var indicator = group.querySelector('.tabs__indicator');
    if (!indicator || !activeButton) return;
    var buttonBox = activeButton.getBoundingClientRect();
    var groupBox = group.getBoundingClientRect();
    if (!buttonBox.width || !groupBox.width) return;
    var shift = buttonBox.left - groupBox.left - 3;
    indicator.style.width = buttonBox.width + 'px';
    indicator.style.setProperty('--tabs-shift', Math.max(0, shift) + 'px');
  }

  function refreshTabIndicators() {
    each(document.querySelectorAll('[data-tabs]'), function (group) {
      var active = group.querySelector('[data-tab][aria-selected="true"]') || group.querySelector('[data-tab]');
      moveIndicator(group, active);
    });
  }

  /* Older WebViews (and some in-app browsers) lack CustomEvent. The page
     scripts listen for tabchange to sync the hidden credentials, so a silent
     failure here would post the wrong username/password. */
  function dispatchTabChange(group, button) {
    var event;
    try {
      event = new CustomEvent('tabchange', { detail: { button: button } });
    } catch (error) {
      event = document.createEvent('CustomEvent');
      event.initCustomEvent('tabchange', false, false, { button: button });
    }
    group.dispatchEvent(event);
  }

  function bindTabGroup(group) {
    var buttons = group.querySelectorAll('[data-tab]');
    if (!buttons.length) return;

    function activate(button, focus) {
      each(buttons, function (other) {
        var selected = other === button;
        other.classList.toggle('is-active', selected);
        other.setAttribute('aria-selected', selected ? 'true' : 'false');
        other.setAttribute('tabindex', selected ? '0' : '-1');
      });

      each(buttons, function (other) {
        var panel = document.getElementById(other.getAttribute('data-tab'));
        if (!panel) return;
        var selected = other === button;
        panel.classList.toggle('is-active', selected);
        panel.hidden = !selected;
      });

      moveIndicator(group, button);
      if (focus) button.focus();
      dispatchTabChange(group, button);
    }

    each(buttons, function (button) {
      button.addEventListener('click', function () { activate(button, false); });
    });

    group.addEventListener('keydown', function (event) {
      var keys = ['ArrowLeft', 'ArrowRight', 'Home', 'End'];
      if (keys.indexOf(event.key) === -1) return;
      event.preventDefault();

      var list = Array.prototype.slice.call(buttons);
      var current = list.indexOf(document.activeElement);
      var next = current;

      if (event.key === 'ArrowLeft') next = current <= 0 ? list.length - 1 : current - 1;
      if (event.key === 'ArrowRight') next = current >= list.length - 1 ? 0 : current + 1;
      if (event.key === 'Home') next = 0;
      if (event.key === 'End') next = list.length - 1;

      activate(list[next], true);
    });

    var initial = group.querySelector('[data-tab][aria-selected="true"]') || buttons[0];
    moveIndicator(group, initial);
  }

  function bindTabGroups() {
    each(document.querySelectorAll('[data-tabs]'), bindTabGroup);
    raf(refreshTabIndicators);
    window.setTimeout(refreshTabIndicators, 220);
  }

  /* ------------------------------------------------------------- sheets */

  function nativeDialog(sheet) {
    return typeof sheet.showModal === 'function';
  }

  function sheetIsOpen(sheet) {
    return sheet.hasAttribute('open') || sheet.classList.contains('is-open');
  }

  /* Sheets can nest (Quest Board → Merchant Guild), so the scroll lock is
     reference-counted. Each sheet remembers whether it owns a lock, which
     keeps the native `close` event and closeSheet() from decrementing twice. */
  function lockScroll(sheet) {
    if (sheet.getAttribute('data-sheet-locked') === 'true') return;
    sheet.setAttribute('data-sheet-locked', 'true');
    openSheets += 1;
    document.body.classList.add('sheet-open');
  }

  function unlockScroll(sheet) {
    if (sheet.getAttribute('data-sheet-locked') !== 'true') return;
    sheet.removeAttribute('data-sheet-locked');
    openSheets = Math.max(0, openSheets - 1);
    if (openSheets === 0) document.body.classList.remove('sheet-open');
  }

  function openSheet(sheet, trigger) {
    if (!sheet) return;
    trigger = trigger || document.activeElement;

    if (!sheetIsOpen(sheet)) {
      sheet.setAttribute('data-return-focus', trigger && trigger.id ? trigger.id : '');
      lockScroll(sheet);
    } else if (trigger && trigger.id && !sheet.getAttribute('data-return-focus')) {
      sheet.setAttribute('data-return-focus', trigger.id);
    }

    if (nativeDialog(sheet)) {
      try {
        if (!sheet.open) sheet.showModal();
      } catch (error) {
        sheet.setAttribute('open', '');
        sheet.classList.add('is-open');
      }
    } else {
      sheet.setAttribute('open', '');
      sheet.classList.add('is-open');
    }

    raf(function () {
      refreshTabIndicators();
      var focusable = sheet.querySelector('input:not([type="hidden"]), button, [href]');
      if (focusable) focusable.focus();
    });
  }

  function closeSheet(sheet) {
    if (!sheet) return;

    if (nativeDialog(sheet) && sheet.open) {
      sheet.close();
    } else {
      sheet.removeAttribute('open');
      sheet.classList.remove('is-open');
    }

    unlockScroll(sheet);

    var returnId = sheet.getAttribute('data-return-focus');
    if (returnId) {
      var trigger = document.getElementById(returnId);
      if (trigger && typeof trigger.focus === 'function') trigger.focus();
      sheet.removeAttribute('data-return-focus');
    }
  }

  function bindSheet(sheet) {
    if (!sheet) return;

    sheet.addEventListener('cancel', function (event) {
      event.preventDefault();
      closeSheet(sheet);
    });

    sheet.addEventListener('click', function (event) {
      if (event.target !== sheet) return;
      var box = sheet.getBoundingClientRect();
      var outside =
        event.clientX < box.left ||
        event.clientX > box.right ||
        event.clientY < box.top ||
        event.clientY > box.bottom;
      if (outside) closeSheet(sheet);
    });

    sheet.addEventListener('close', function () {
      unlockScroll(sheet);
    });

    each(sheet.querySelectorAll('[data-close-sheet]'), function (closer) {
      closer.addEventListener('click', function () { closeSheet(sheet); });
    });
  }

  function bindSheets() {
    each(document.querySelectorAll('dialog'), bindSheet);

    each(document.querySelectorAll('[data-open-sheet]'), function (trigger) {
      trigger.addEventListener('click', function (event) {
        event.preventDefault();
        openSheet(document.getElementById(trigger.getAttribute('data-open-sheet')), trigger);
      });
    });

    /* Fallback path only: native dialogs already emit `cancel` on Escape.
       Close the topmost fallback sheet rather than every open sheet. */
    document.addEventListener('keydown', function (event) {
      if (event.key !== 'Escape') return;
      var open = document.querySelectorAll('.is-open');
      if (!open.length) return;
      closeSheet(open[open.length - 1]);
    });
  }

  function bindSheets() {
    each(document.querySelectorAll('dialog'), bindSheet);

    each(document.querySelectorAll('[data-open-sheet]'), function (trigger) {
      trigger.addEventListener('click', function (event) {
        event.preventDefault();
        openSheet(document.getElementById(trigger.getAttribute('data-open-sheet')), trigger);
      });
    });

    document.addEventListener('keydown', function (event) {
      if (event.key !== 'Escape') return;
      each(document.querySelectorAll('.is-open'), function (sheet) {
        closeSheet(sheet);
      });
    });
  }

  /* -------------------------------------------------------- window tilt */

  function bindTilt() {
    if (tier !== 'rich' || reducedMotion) return;
    if (!window.matchMedia || !window.matchMedia('(pointer: fine)').matches) return;

    each(document.querySelectorAll('.sys-window'), function (panel) {
      var frame = null;

      panel.addEventListener('pointermove', function (event) {
        if (frame) return;
        frame = raf(function () {
          frame = null;
          var box = panel.getBoundingClientRect();
          var relX = (event.clientX - box.left) / box.width - 0.5;
          var relY = (event.clientY - box.top) / box.height - 0.5;
          panel.style.setProperty('--tilt-y', (relX * 3.2).toFixed(2) + 'deg');
          panel.style.setProperty('--tilt-x', (relY * -2.4).toFixed(2) + 'deg');
        });
      });

      panel.addEventListener('pointerleave', function () {
        panel.style.setProperty('--tilt-y', '0deg');
        panel.style.setProperty('--tilt-x', '0deg');
      });
    });
  }

  /* ----------------------------------------------------------- clipboard */

  function legacyCopy(text) {
    var field = document.createElement('textarea');
    field.value = text;
    field.setAttribute('readonly', '');
    field.style.position = 'fixed';
    field.style.top = '-1000px';
    field.style.opacity = '0';
    document.body.appendChild(field);
    field.select();

    var copied = false;
    try {
      copied = document.execCommand('copy');
    } catch (error) {
      copied = false;
    }

    document.body.removeChild(field);
    return copied;
  }

  function bindCopyButtons() {
    each(document.querySelectorAll('[data-copy], [data-copy-target]'), function (button) {
      button.addEventListener('click', function () {
        var target = button.getAttribute('data-copy-target');
        var text = target
          ? (document.getElementById(target) || {}).textContent || ''
          : button.getAttribute('data-copy');
        text = String(text).replace(/^\s+|\s+$/g, '');

        function done() {
          flashLabel(button, 'COPIED');
          showToast('ACCESS CODE COPIED TO CLIPBOARD');
        }

        if (window.navigator.clipboard && window.isSecureContext) {
          window.navigator.clipboard.writeText(text).then(done, function () {
            if (legacyCopy(text)) done();
          });
          return;
        }

        if (legacyCopy(text)) done();
      });
    });
  }

  /* -------------------------------------------------------- submit state */

  function bindSubmitStates() {
    each(document.querySelectorAll('form[data-submit-state]'), function (form) {
      form.addEventListener('submit', function () {
        var button = form.querySelector('button[type="submit"]');
        if (!button || button.disabled) return;
        form.setAttribute('data-state', 'connecting');
        button.disabled = true;
        var label = button.querySelector('[data-label]');
        if (label) label.textContent = form.getAttribute('data-submit-state') || 'CONNECTING…';
        setLog('VERIFYING CREDENTIALS…');
      });
    });
  }

  /* ---------------------------------------------------- password reveal */

  function bindPasswordToggles() {
    each(document.querySelectorAll('[data-toggle-password]'), function (button) {
      var target = document.getElementById(button.getAttribute('data-target'));
      if (!target) return;

      button.addEventListener('click', function () {
        var show = target.getAttribute('type') === 'password';
        target.setAttribute('type', show ? 'text' : 'password');
        button.setAttribute('aria-pressed', show ? 'true' : 'false');
        button.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
        target.focus();
      });
    });
  }

  /* -------------------------------------------------------- theme toggle */

  function bindThemeToggle() {
    each(document.querySelectorAll('[data-toggle-theme]'), function (button) {
      button.addEventListener('click', function () {
        if (!window.ShadowGateTheme) return;
        var next = window.ShadowGateTheme.toggleScheme();
        showToast(next === 'light' ? 'AWAKENED MODE // LIGHT SYSTEM ONLINE' : 'SYSTEM MODE // DARK SYSTEM ONLINE');
      });
    });
  }

  /* ------------------------------------------------------- Monarch Mode */

  function bindMonarchMode() {
    var trigger = document.getElementById('monarchTrigger');
    if (!trigger || !window.ShadowGateTheme) return;

    var clicks = 0;
    var lastClick = 0;

    trigger.addEventListener('click', function () {
      var now = Date.now();
      if (now - lastClick > 2500) clicks = 0;
      lastClick = now;
      clicks += 1;

      if (clicks < 5) {
        if (clicks >= 3) showToast('SYSTEM SIGNAL DETECTED…', 900);
        return;
      }

      clicks = 0;
      var next = window.ShadowGateTheme.toggleMonarch();
      var panel = document.querySelector('.sys-window');
      if (panel) {
        panel.classList.remove('is-glitch');
        void panel.offsetWidth;
        panel.classList.add('is-glitch');
      }
      showToast(next === 'on'
        ? 'MONARCH MODE // SHADOW ARMY UNLOCKED'
        : 'MONARCH MODE // SYSTEM RESTORED', 2800);
      if (window.ShadowGateSounds) window.ShadowGateSounds.play('confirm');
    });

    trigger.addEventListener('keydown', function (event) {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        trigger.click();
      }
    });
  }

  /* ------------------------------------------------------------- leaving */

  function bindLeavingLinks() {
    if (reducedMotion) return;
    each(document.querySelectorAll('[data-leave]'), function (link) {
      link.addEventListener('click', function () {
        document.body.classList.add('leaving');
      });
    });
  }

  /* ---------------------------------------------------------- visibility */

  function bindVisibility() {
    function sync() {
      document.documentElement.classList.toggle('is-hidden', document.hidden);
    }
    document.addEventListener('visibilitychange', sync);
    sync();
  }

  /* -------------------------------------------------------------- resize */

  function bindResize() {
    var timer = null;
    window.addEventListener('resize', function () {
      if (timer) window.clearTimeout(timer);
      timer = window.setTimeout(refreshTabIndicators, 120);
    });
    window.addEventListener('orientationchange', function () {
      window.setTimeout(refreshTabIndicators, 220);
    });
  }

  /* --------------------------------------------------------------- boot */

  onReady(function () {
    bindRipples();
    bindTabGroups();
    bindSheets();
    bindTilt();
    bindCopyButtons();
    bindSubmitStates();
    bindPasswordToggles();
    bindThemeToggle();
    bindMonarchMode();
    bindLeavingLinks();
    bindVisibility();
    bindResize();

    document.documentElement.classList.add('js-ready');
  });

  window.ShadowGateMotion = {
    openSheet: openSheet,
    closeSheet: closeSheet,
    flashLabel: flashLabel,
    showToast: showToast,
    setLog: setLog,
    refreshTabs: refreshTabIndicators
  };
})(window, document);
