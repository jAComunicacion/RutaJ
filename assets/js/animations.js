/**
 * animations.js — Reemplaza AOS (Animate On Scroll)
 * Usa Intersection Observer API nativa + CSS en responsive.css
 * RUTA J — Modernización Web 2026 — jArismendi®
 */
(function () {
  'use strict';

  const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -40px 0px'
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const delay = entry.target.dataset.aosDelay;
        if (delay) {
          setTimeout(() => {
            entry.target.classList.add('aos-animate');
          }, parseInt(delay, 10));
        } else {
          entry.target.classList.add('aos-animate');
        }
        observer.unobserve(entry.target);
      }
    });
  }, observerOptions);

  document.querySelectorAll('[data-aos]').forEach(el => {
    observer.observe(el);
  });
})();
