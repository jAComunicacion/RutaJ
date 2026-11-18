// Microsoft Clarity (mapas de calor y grabaciones de sesión).
// Respeta el aviso de cookies: si la persona dijo "No, gracias", no se carga.
(function () {
  if (window.kpCookieConsent === 'rejected') return;
  (function (c, l, a, r, i, t, y) {
    c[a] = c[a] || function () { (c[a].q = c[a].q || []).push(arguments); };
    t = l.createElement(r); t.async = 1; t.src = 'https://www.clarity.ms/tag/' + i;
    y = l.getElementsByTagName(r)[0]; y.parentNode.insertBefore(t, y);
  })(window, document, 'clarity', 'script', 'yzsni6a4ye');
  // Si rechaza después de que Clarity ya cargó, se corta en el momento.
  document.addEventListener('click', function (e) {
    var b = e.target.closest ? e.target.closest('[data-ck="no"]') : null;
    if (b && window.clarity) { try { window.clarity('consent', false); } catch (err) {} }
  }, true);
})();
