/**
 * historia.js — página historia.html
 * Tres piezas, todo nativo, sin librerías:
 *   1. El tendido eléctrico en SVG, dibujado según el scroll
 *   2. El encendido: la página pasa de penumbra a luz en el hito 07
 *   3. La foto que se abre en video (View Transitions + <dialog> + ::backdrop)
 *
 * La entrada de bloques al scroll NO se implementa acá: la resuelve
 * animations.min.js con la convención data-aos -> .aos-animate.
 *
 * RUTA J — Modernización Web 2026 — jArismendi®
 */
(function () {
  'use strict';

  var SVG_NS = 'http://www.w3.org/2000/svg';
  var suave = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ==========================================================
     1. EL TENDIDO — postes, conductor en catenaria y trazado
     ========================================================== */
  (function tendido() {
    var eje = document.querySelector('.hst-eje');
    var svg = document.getElementById('hst-tendido');
    var tl = document.getElementById('hst-timeline');
    if (!eje || !svg || !tl) return;

    var PANZA_BASE = 26;   // cuánto cuelga el conductor hacia el costado
    var cable = null;
    var largo = 0;
    var postesY = [];
    var elementos = [];

    function crear(tag, attrs) {
      var el = document.createElementNS(SVG_NS, tag);
      for (var k in attrs) el.setAttribute(k, attrs[k]);
      return el;
    }

    function construir() {
      var alto = tl.offsetHeight;
      var ancho = eje.offsetWidth || 90;
      var cx = ancho / 2;

      // escala de los postes: la define el CSS por breakpoint
      var esc = parseFloat(
        getComputedStyle(eje).getPropertyValue('--hst-poste-esc')
      ) || 1;

      var panza = PANZA_BASE * esc;
      var brazo = 19 * esc;   // media cruceta
      var mastil = 19 * esc;  // medio mástil
      var rNodo = 7 * esc;
      var rAisl = 3.2 * esc;

      // posición vertical de cada poste = centro de cada hito
      var tlTop = tl.getBoundingClientRect().top + window.scrollY;
      postesY = [].map.call(
        document.querySelectorAll('[data-poste]'),
        function (h) {
          var r = h.getBoundingClientRect();
          return Math.round(r.top + window.scrollY - tlTop + r.height / 2);
        }
      );

      svg.setAttribute('width', ancho);
      svg.setAttribute('height', alto);
      svg.setAttribute('viewBox', '0 0 ' + ancho + ' ' + alto);
      svg.textContent = '';
      elementos = [];

      // --- conductor: baja ondulando, con la panza alternada entre postes
      var d = 'M ' + cx + ' 0';
      var prev = 0;
      var lado = 1;
      postesY.forEach(function (y) {
        d += ' Q ' + (cx + panza * lado) + ' ' + ((prev + y) / 2) + ' ' + cx + ' ' + y;
        prev = y;
        lado *= -1;
      });
      d += ' Q ' + (cx + panza * lado) + ' ' + ((prev + alto) / 2) + ' ' + cx + ' ' + alto;

      cable = crear('path', { d: d, 'class': 'hst-cable-path' });
      svg.appendChild(cable);

      // --- postes: mástil + cruceta, aisladores y nodo
      postesY.forEach(function (y, i) {
        var g = crear('g', { 'class': 'hst-poste' });
        g.appendChild(crear('line', {
          x1: cx - brazo, y1: y - mastil * 0.47,
          x2: cx + brazo, y2: y - mastil * 0.47
        }));
        g.appendChild(crear('line', {
          x1: cx, y1: y - mastil, x2: cx, y2: y + mastil
        }));
        svg.appendChild(g);

        var a1 = crear('circle', {
          cx: cx - brazo, cy: y - mastil * 0.47, r: rAisl, 'class': 'hst-aislador'
        });
        var a2 = crear('circle', {
          cx: cx + brazo, cy: y - mastil * 0.47, r: rAisl, 'class': 'hst-aislador'
        });
        var n = crear('circle', { cx: cx, cy: y, r: rNodo, 'class': 'hst-nodo' });
        svg.appendChild(a1);
        svg.appendChild(a2);
        svg.appendChild(n);

        elementos.push({ y: y, nodos: [g, a1, a2, n] });
      });

      // sin dibujado progresivo: el SVG se muestra completo y estático
      if (!suave) {
        elementos.forEach(function (p) {
          p.nodos.forEach(function (el) { el.classList.add('on'); });
        });
        return;
      }

      largo = cable.getTotalLength();
      cable.style.strokeDasharray = largo;
      cable.style.strokeDashoffset = largo;
      pintar();
    }

    function pintar() {
      if (!cable || !suave) return;
      var tlTop = tl.getBoundingClientRect().top + window.scrollY;
      var alto = tl.offsetHeight;
      // el trazo llega hasta el 72% de la altura de la ventana
      var frente = window.scrollY + window.innerHeight * 0.72 - tlTop;
      var p = Math.max(0, Math.min(1, frente / alto));

      cable.style.strokeDashoffset = largo * (1 - p);

      var yFrente = alto * p;
      elementos.forEach(function (poste) {
        var encendido = poste.y <= yFrente + 40;
        poste.nodos.forEach(function (el) {
          el.classList.toggle('on', encendido);
        });
      });
    }

    var tick = false;
    window.addEventListener('scroll', function () {
      if (tick) return;
      tick = true;
      requestAnimationFrame(function () { pintar(); tick = false; });
    }, { passive: true });

    var t;
    function reconstruir() {
      clearTimeout(t);
      t = setTimeout(construir, 180);
    }
    window.addEventListener('resize', reconstruir);
    window.addEventListener('load', construir);

    // las fotos cambian la altura de la página al terminar de cargar
    if ('ResizeObserver' in window) {
      new ResizeObserver(reconstruir).observe(tl);
    }

    construir();
  })();

  /* ==========================================================
     2. EL ENCENDIDO — de penumbra a luz plena en el hito 07
     ========================================================== */
  (function encendido() {
    var luz = document.getElementById('hst-hito-luz');
    var flash = document.getElementById('hst-flash');
    var body = document.body;
    if (!luz) return;

    // prefers-contrast: more sirve la página entera en luz; no hay giro que animar
    if (window.matchMedia('(prefers-contrast: more)').matches) {
      body.classList.add('hst-on');
      return;
    }

    var yaDestello = false;

    var io = new IntersectionObserver(function (entradas) {
      entradas.forEach(function (e) {
        if (e.isIntersecting && e.intersectionRatio > 0.38) {
          if (!body.classList.contains('hst-on')) {
            body.classList.add('hst-on');
            // el destello se dispara una sola vez en toda la visita
            if (suave && flash && !yaDestello) {
              yaDestello = true;
              flash.classList.add('go');
              setTimeout(function () { flash.classList.remove('go'); }, 1200);
            }
          }
        } else if (e.boundingClientRect.top > 0) {
          // el visitante volvió hacia arriba: la página se apaga de nuevo
          body.classList.remove('hst-on');
        }
      });
    }, { threshold: [0, 0.38, 0.6] });

    io.observe(luz);
  })();

  /* ==========================================================
     3. LA FOTO QUE SE ABRE EN VIDEO
     View Transitions API + <dialog> nativo + ::backdrop
     ========================================================== */
  (function visor() {
    var dlg = document.getElementById('hst-visor');
    var caja = document.getElementById('hst-visor-caja');
    var video = document.getElementById('hst-visor-video');
    var titulo = document.getElementById('hst-visor-titulo');
    var epigrafe = document.getElementById('hst-visor-epigrafe');
    var cerrar = document.getElementById('hst-cerrar');
    var disparadores = document.querySelectorAll('.hst-disparador');
    if (!dlg || !caja || !video || !disparadores.length) return;

    var NOMBRE = 'hst-vt-visor';
    // el morph es una mejora: si no está, el modal abre igual
    var conMorph = !!document.startViewTransition && suave;
    var activo = null;

    function abrir(btn) {
      activo = btn;
      var img = btn.querySelector('img');

      var hacer = function () {
        if (img) img.style.viewTransitionName = '';
        caja.style.viewTransitionName = NOMBRE;
        titulo.textContent = btn.dataset.titulo || 'Video';
        epigrafe.textContent = btn.dataset.epigrafe || '';
        video.src = btn.dataset.video;
        dlg.showModal();
        video.play().catch(function () { /* el usuario le dará play */ });
      };

      if (!conMorph) return hacer();
      if (img) img.style.viewTransitionName = NOMBRE;  // snapshot: la miniatura
      document.startViewTransition(hacer);
    }

    function limpiar() {
      if (activo) {
        var img = activo.querySelector('img');
        if (img) img.style.viewTransitionName = '';
      }
      caja.style.viewTransitionName = '';
      video.currentTime = 0;
      video.removeAttribute('src');
      video.load();
      if (activo) activo.focus();
      activo = null;
    }

    function cerrarVisor() {
      if (!dlg.open) return;
      video.pause();

      var img = activo ? activo.querySelector('img') : null;
      var hacer = function () {
        caja.style.viewTransitionName = '';
        if (img) img.style.viewTransitionName = NOMBRE;
        dlg.close();
      };

      if (!conMorph) {
        hacer();
        limpiar();
        return;
      }
      document.startViewTransition(hacer).finished.finally(limpiar);
    }

    [].forEach.call(disparadores, function (btn) {
      btn.addEventListener('click', function () { abrir(btn); });
    });

    cerrar.addEventListener('click', cerrarVisor);
    // Escape: <dialog> cierra solo, pero hay que pausar y limpiar el video
    dlg.addEventListener('cancel', function (e) { e.preventDefault(); cerrarVisor(); });
    // click sobre el backdrop
    dlg.addEventListener('click', function (e) { if (e.target === dlg) cerrarVisor(); });
  })();

  /* ==========================================================
     4. FONDO DE VIDEO DEL HITO DE REPOSTACIÓN
     Ancho real de pantalla, centrado en la PANTALLA (no en la foto: la
     foto vive en la columna izquierda de la grilla, no en el centro).
     El borde superior queda pegado al final del rótulo ("Repostación...").
     Ninguna de las dos cosas sale de un % en CSS porque dependen de dónde
     cae cada elemento en la grilla real — de ahí el getBoundingClientRect.
     En celular no corre: el fondo se saca entero por CSS (Julio,
     27/08/2026).
     ========================================================== */
  (function fondoVideoCentrado() {
    var fondo = document.querySelector('.hst-video-fondo');
    var figura = fondo && fondo.closest('.hst-media');
    var hito = figura && figura.closest('.hst-hito');
    var rotulo = hito && hito.querySelector('.hst-rotulo');
    if (!fondo || !figura || !rotulo) return;

    var mqCelular = window.matchMedia('(max-width: 767px)');

    function ubicar() {
      if (mqCelular.matches) return;
      var rFigura = figura.getBoundingClientRect();
      var rRotulo = rotulo.getBoundingClientRect();
      var centroPantalla = window.innerWidth / 2;
      fondo.style.left = (centroPantalla - rFigura.left) + 'px';
      fondo.style.top = (rRotulo.bottom - rFigura.top) + 'px';
    }

    var t;
    window.addEventListener('resize', function () {
      clearTimeout(t);
      t = setTimeout(ubicar, 150);
    });
    window.addEventListener('load', ubicar);
    ubicar();
  })();

  /* ==========================================================
     5. FONDOS DE FOTO DE ARCHIVO — mismo criterio que el fondo de
     video del hito 12 (sección 4): ancho real de pantalla, calculado
     por JS porque el contenedor no vive centrado en la pantalla.
     Acá no hay que anclar el borde superior a ningún rótulo: el
     fondo dura lo que dura su propio contenedor (top:0, height:100%
     ya resuelto por CSS), así que solo hace falta el centrado
     horizontal. No corre en celular (Julio, 28/08/2026).
     ========================================================== */
  (function fondosArchivoAncho() {
    var fondos = document.querySelectorAll('.hst-fondo-ancho');
    if (!fondos.length) return;

    var mqCelular = window.matchMedia('(max-width: 767px)');

    function ubicar() {
      if (mqCelular.matches) return;
      var centroPantalla = window.innerWidth / 2;
      [].forEach.call(fondos, function (fondo) {
        var r = fondo.parentElement.getBoundingClientRect();
        fondo.style.left = (centroPantalla - r.left) + 'px';
      });
    }

    var t;
    window.addEventListener('resize', function () {
      clearTimeout(t);
      t = setTimeout(ubicar, 150);
    });
    window.addEventListener('load', ubicar);
    ubicar();
  })();

})();
