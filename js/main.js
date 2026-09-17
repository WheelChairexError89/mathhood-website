/* =====================================================================
   MATHHOOD — main.js
   Gemeinsame Interaktionen: mobiles Ausklappmenü.
   ===================================================================== */
(function () {
  'use strict';

  /* ---- Aktiven Menüpunkt markieren (anhand der aktuellen Seite) ---- */
  var here = location.pathname.split('/').pop() || 'index.html';
  if (here === '') here = 'index.html';
  var nav = document.querySelector('[data-mh-nav]');
  if (nav) {
    // Produkt-Seiten zählen zu "Nachhilfe & Preise"
    var group = /^produkt-/.test(here) ? 'preise.html' : here;
    nav.querySelectorAll('a').forEach(function (a) {
      var target = a.getAttribute('href');
      if (target === here || target === group) a.setAttribute('aria-current', 'page');
    });
  }

  /* ---- Mobiles Navigationsmenü ---- */
  var burger = document.querySelector('.mh-burger');
  var navWrap = document.querySelector('.mh-header__nav-wrap');

  var header = document.querySelector('.mh-header');

  if (burger && navWrap && header) {
    var closeMenu = function () {
      burger.setAttribute('aria-expanded', 'false');
      burger.setAttribute('aria-label', 'Menü öffnen');
      navWrap.classList.remove('is-open');
      document.documentElement.classList.remove('mh-menu-open');
    };
    var openMenu = function () {
      burger.setAttribute('aria-expanded', 'true');
      burger.setAttribute('aria-label', 'Menü schließen');
      navWrap.classList.add('is-open');
      document.documentElement.classList.add('mh-menu-open');
    };
    var isOpen = function () { return burger.getAttribute('aria-expanded') === 'true'; };

    burger.addEventListener('click', function (e) {
      e.stopPropagation();
      isOpen() ? closeMenu() : openMenu();
    });

    /* Beim Klick auf einen Link schließen */
    navWrap.addEventListener('click', function (e) {
      if (e.target.closest('a')) closeMenu();
    });

    /* Klick neben das Menü (auf die Abdunkelung) schließt ebenfalls */
    document.addEventListener('click', function (e) {
      if (isOpen() && !e.target.closest('.mh-header__nav-wrap') && !e.target.closest('.mh-burger')) {
        closeMenu();
      }
    });

    /* Esc schließt das Menü */
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && isOpen()) { closeMenu(); burger.focus(); }
    });

    /* Wechsel auf Desktop-Breite: Menü-Zustand zurücksetzen */
    var mq = window.matchMedia('(min-width: 1025px)');
    var onChange = function () { if (mq.matches) closeMenu(); };
    mq.addEventListener ? mq.addEventListener('change', onChange) : mq.addListener(onChange);
  }
})();
