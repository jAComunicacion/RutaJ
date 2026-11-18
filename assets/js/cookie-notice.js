// Aviso de cookies de medición (Google Analytics).
// - Mide por defecto e informa. Si la persona toca "No, gracias", se apaga la medición.
// - La decisión se recuerda en el navegador (localStorage).
// - Debe cargarse ANTES del código de Google (gtag o Tag Manager).
// Opciones por atributos del <script>: data-ga, data-accent, data-bg, data-font, data-policy
(function () {
  var me = document.currentScript;
  if (!me) return;
  var GA = me.getAttribute('data-ga') || '';
  var KEY = 'cookie_consent_v1';

  function read() { try { return localStorage.getItem(KEY); } catch (e) { return null; } }
  function save(v) { try { localStorage.setItem(KEY, v); } catch (e) {} }

  // Estado global por si otra herramienta (ej. Clarity) necesita consultarlo
  var saved = read();
  window.kpCookieConsent = saved === 'rejected' ? 'rejected' : (saved === 'accepted' ? 'accepted' : 'pending');
  if (saved === 'rejected' && GA) window['ga-disable-' + GA] = true;
  if (saved) return; // ya decidió: no mostrar el aviso

  function clearGaCookies() {
    var host = location.hostname.replace(/^www\./, '');
    document.cookie.split(';').forEach(function (c) {
      var name = c.split('=')[0].trim();
      if (name === '_ga' || name.indexOf('_ga_') === 0 || name === '_gid') {
        ['', '; domain=' + host, '; domain=.' + host].forEach(function (d) {
          document.cookie = name + '=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/' + d;
        });
      }
    });
  }

  function show() {
    // Hoja de estilos hermana: cookie-notice.css (misma carpeta y versión)
    var css = document.createElement('link');
    css.rel = 'stylesheet';
    css.href = me.src.replace(/\.js(\?.*)?$/, function (m, q) { return '.css' + (q || ''); }).replace('/js/', '/css/');
    document.head.appendChild(css);

    var box = document.createElement('div');
    box.className = 'ck-notice';
    box.setAttribute('role', 'dialog');
    box.setAttribute('aria-label', 'Aviso de cookies');
    var accent = me.getAttribute('data-accent'), bg = me.getAttribute('data-bg'), font = me.getAttribute('data-font');
    if (accent) box.style.setProperty('--ck-accent', accent);
    if (bg) box.style.setProperty('--ck-bg', bg);
    if (font) box.style.setProperty('--ck-font', font);

    var policy = me.getAttribute('data-policy');
    var more = policy ? ' <a href="' + policy + '">Más información</a>.' : '';
    box.innerHTML =
      '<p class="ck-text">Usamos cookies de medición (Google Analytics) para saber cuántas personas visitan esta web ' +
      'y qué páginas ven, y así mejorarla. No guardamos datos personales.' + more + '</p>' +
      '<div class="ck-actions">' +
      '<button type="button" class="ck-btn ck-btn--ghost" data-ck="no">No, gracias</button>' +
      '<button type="button" class="ck-btn ck-btn--main" data-ck="ok">Entendido</button>' +
      '</div>';

    box.addEventListener('click', function (e) {
      var t = e.target.closest ? e.target.closest('[data-ck]') : null;
      if (!t) return;
      if (t.getAttribute('data-ck') === 'no') {
        save('rejected');
        window.kpCookieConsent = 'rejected';
        if (GA) window['ga-disable-' + GA] = true;
        clearGaCookies();
      } else {
        save('accepted');
        window.kpCookieConsent = 'accepted';
      }
      box.parentNode && box.parentNode.removeChild(box);
    });
    document.body.appendChild(box);
  }

  if (document.body) show();
  else document.addEventListener('DOMContentLoaded', show);
})();
