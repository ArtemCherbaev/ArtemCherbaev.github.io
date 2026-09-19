/* Artem Cherbaev, portfolio.
   Progressive enhancement only: every section is readable and every link works
   with this file blocked. Nothing here fetches, stores or tracks anything. */
(function () {
  'use strict';

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- current year in the footer ---------- */
  var year = document.getElementById('year');
  if (year) year.textContent = String(new Date().getFullYear());

  /* ---------- header goes opaque once the page has moved ---------- */
  var header = document.getElementById('siteHeader');
  if (header) {
    var stick = function () {
      header.classList.toggle('is-stuck', window.scrollY > 12);
    };
    stick();
    window.addEventListener('scroll', stick, { passive: true });
  }

  /* ---------- reveal on first sight ----------
     One observer for every .reveal, unobserving as it fires: a section that has
     already appeared has nothing left to animate, and the skills bars read
     their scaleX from the same class. */
  var reveals = document.querySelectorAll('.reveal');
  if (reduced || !('IntersectionObserver' in window)) {
    Array.prototype.forEach.call(reveals, function (el) { el.classList.add('is-revealed'); });
  } else {
    var seen = new IntersectionObserver(function (entries, obs) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-revealed');
        obs.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.12 });
    Array.prototype.forEach.call(reveals, function (el) { seen.observe(el); });
  }

  /* ---------- nav item for the section you are actually in ---------- */
  var links = Array.prototype.slice.call(document.querySelectorAll('.nav a:not(.nav-page)'));
  var sections = links
    .map(function (a) { return document.querySelector(a.getAttribute('href')); })
    .filter(Boolean);

  if (sections.length && 'IntersectionObserver' in window) {
    var mark = function (id) {
      links.forEach(function (a) {
        a.classList.toggle('is-active', a.getAttribute('href') === '#' + id);
      });
    };
    var here = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) mark(entry.target.id);
      });
    }, { rootMargin: '-40% 0px -55% 0px' });
    sections.forEach(function (s) { here.observe(s); });
  }

  /* ---------- show more / show less ----------
     The extra items ship in the HTML with [hidden], so they are in the document
     for search and for print whatever this script does. */
  function expander(buttonId, itemSelector, moreLabel, lessLabel) {
    var button = document.getElementById(buttonId);
    if (!button) return;
    var items = document.querySelectorAll(itemSelector);
    if (!items.length) { button.hidden = true; return; }

    var label = button.firstChild; // the text node before the chevron

    button.addEventListener('click', function () {
      var open = button.getAttribute('aria-expanded') === 'true';
      Array.prototype.forEach.call(items, function (el) {
        el.hidden = open;
        if (!open && !reduced) el.classList.add('is-revealed');
      });
      button.setAttribute('aria-expanded', String(!open));
      if (label) label.nodeValue = (open ? moreLabel : lessLabel) + ' ';
    });
  }

  expander('moreRoles', '.tl-extra', 'Show the full detail', 'Show less detail');
  expander('moreSkills', '.t-extra', 'Show the rest of my skills', 'Show fewer skills');

  /* ---------- contact form, opened on request ---------- */
  var formToggle = document.getElementById('formToggle');
  var form = document.getElementById('contactForm');
  if (formToggle && form) {
    var formLabel = formToggle.firstChild;
    formToggle.addEventListener('click', function () {
      var open = formToggle.getAttribute('aria-expanded') === 'true';
      form.hidden = open;
      formToggle.setAttribute('aria-expanded', String(!open));
      if (formLabel) {
        formLabel.nodeValue = (open ? 'Prefer to write here? Open the contact form' : 'Close the contact form') + ' ';
      }
      if (!open) {
        var first = form.querySelector('input');
        if (first) first.focus();
      }
    });
  }
})();
