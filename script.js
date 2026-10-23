/* =========================================================
   Valdés & Moncayo Abogados · script de la web
   Lo editable está al principio: CONFIG (contacto, horario)
   y CAPITULOS (vídeo interactivo). La escena 3D está en
   escena.js y se carga aparte: si falla, la web sigue
   funcionando con la ilustración.
   ========================================================= */
(function () {
  'use strict';

  /* ---------- Datos editables ---------- */
  var CONFIG = {
    telefono: '+34924000000',
    whatsapp: '34600000000',               // para wa.me, sin + ni espacios
    correo: 'consultas@ejemplo.com',
    zonaHoraria: 'Europe/Madrid',
    // 0 = domingo … 6 = sábado
    horario: {
      0: [], 6: [],
      1: [['09:00', '14:00'], ['16:30', '19:30']], 2: [['09:00', '14:00'], ['16:30', '19:30']],
      3: [['09:00', '14:00'], ['16:30', '19:30']], 4: [['09:00', '14:00'], ['16:30', '19:30']],
      5: [['09:00', '14:00']]
    },
    contrapeso: 5,                          // lo que pesa «la otra parte» en la balanza
    mapa: 'https://www.openstreetmap.org/export/embed.html?bbox=-6.3537%2C38.9110%2C-6.3337%2C38.9210&layer=mapnik&marker=38.9160%2C-6.3437',
    claveConsentimiento: 'vm-consent'
  };

  // Capítulos del vídeo media/consulta.mp4 (segundos). Tras la intro se pregunta el caso.
  var CAPITULOS = [
    { id: 'intro', titulo: 'Tu consulta', inicio: 0, fin: 8, pregunta: true },
    { id: 'familia', titulo: 'Familia', inicio: 8, fin: 17 },
    { id: 'laboral', titulo: 'Despido', inicio: 17, fin: 26 },
    { id: 'penal', titulo: 'Denuncia', inicio: 26, fin: 35 },
    { id: 'empresa', titulo: 'Empresa', inicio: 35, fin: 44 },
    { id: 'cierre', titulo: 'Tu cita', inicio: 44, fin: 50, cita: true }
  ];

  /* ---------- Utilidades ---------- */
  var html = document.documentElement;
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function $(sel, ctx) { return (ctx || document).querySelector(sel); }
  function $$(sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); }
  function clamp(v, a, b) { return Math.min(b, Math.max(a, v)); }
  function miles(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.'); }
  function store() {
    return {
      get: function (k) { try { return window.localStorage.getItem(k); } catch (e) { return null; } },
      set: function (k, v) { try { window.localStorage.setItem(k, v); } catch (e) { /* sin almacenamiento */ } }
    };
  }
  var local = store();
  function toMin(hhmm) { var p = hhmm.split(':'); return parseInt(p[0], 10) * 60 + parseInt(p[1], 10); }
  function fmt(s) { s = Math.max(0, Math.floor(s)); return Math.floor(s / 60) + ':' + (s % 60 < 10 ? '0' : '') + (s % 60); }

  /* ---------- Cabecera y menú ---------- */
  var header = $('[data-header]');
  var nav = $('[data-nav]');
  var toggle = $('[data-nav-toggle]');
  function onScroll() { header.classList.toggle('is-scrolled', window.scrollY > 20); }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
  function cerrarMenu() { nav.classList.remove('is-open'); toggle.setAttribute('aria-expanded', 'false'); }
  toggle.addEventListener('click', function () {
    var abierto = nav.classList.toggle('is-open');
    toggle.setAttribute('aria-expanded', String(abierto));
  });
  $$('a', nav).forEach(function (a) { a.addEventListener('click', cerrarMenu); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') cerrarMenu(); });

  /* ---------- Hero: título por palabras (revelado AKOR) ---------- */
  var i = 0;
  function partir(nodo) {
    Array.prototype.slice.call(nodo.childNodes).forEach(function (n) {
      if (n.nodeType === 3) {
        var frag = document.createDocumentFragment();
        n.textContent.split(/(\s+)/).forEach(function (t) {
          if (!t) return;
          if (/^\s+$/.test(t)) { frag.appendChild(document.createTextNode(' ')); return; }
          var w = document.createElement('span'); w.className = 'w';
          var s = document.createElement('span'); s.textContent = t; s.style.setProperty('--i', i++);
          w.appendChild(s); frag.appendChild(w);
        });
        nodo.replaceChild(frag, n);
      } else if (n.nodeType === 1) { partir(n); }
    });
  }
  var titulo = $('[data-split]');
  if (titulo) { titulo.setAttribute('aria-label', titulo.textContent); partir(titulo); $$('.w', titulo).forEach(function (w) { w.setAttribute('aria-hidden', 'true'); }); }
  requestAnimationFrame(function () { requestAnimationFrame(function () { html.classList.add('is-ready'); }); });

  // Rejilla que sigue al cursor
  var spot = $('[data-spot]');
  var hero = $('.hero');
  if (spot && hero && !reduceMotion) {
    hero.addEventListener('pointermove', function (e) {
      var r = hero.getBoundingClientRect();
      spot.style.setProperty('--mx', ((e.clientX - r.left) / r.width * 100) + '%');
      spot.style.setProperty('--my', ((e.clientY - r.top) / r.height * 100) + '%');
    });
  }

  // Contadores
  function contar(el) {
    var fin = parseInt(el.getAttribute('data-count'), 10);
    var sep = el.hasAttribute('data-sep');
    if (reduceMotion) { el.textContent = sep ? miles(fin) : fin; return; }
    var t0 = performance.now(), dur = 1600;
    (function paso(t) {
      var k = clamp((t - t0) / dur, 0, 1); k = 1 - Math.pow(1 - k, 4);
      var v = Math.round(fin * k);
      el.textContent = sep ? miles(v) : v;
      if (k < 1) requestAnimationFrame(paso);
    })(t0);
  }
  setTimeout(function () { $$('[data-count]').forEach(contar); }, reduceMotion ? 0 : 1400);

  // Aparición al hacer scroll
  var revelar = $$('.section-head, .area, .pasos li, .socio, .tarifa, .faq__list details, .form, .player');
  revelar.forEach(function (el, k) { el.setAttribute('data-reveal', ''); el.style.setProperty('--d', k % 4); });
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); } });
    }, { rootMargin: '0px 0px -8% 0px' });
    revelar.forEach(function (el) { io.observe(el); });
  } else { revelar.forEach(function (el) { el.classList.add('is-in'); }); }

  /* ---------- Balanza del caso ---------- */
  var VEREDICTOS = [
    [0, '<b>La balanza está en contra.</b> Sin pruebas, la otra parte lleva ventaja. Marca lo que tengas.'],
    [1, '<b>Aún pesa más la otra parte.</b> Es un comienzo: en la consulta vemos qué más puedes conseguir.'],
    [5, '<b>Equilibrio.</b> Tu caso se puede defender. Lo que decida el juez dependerá de cómo se presente.'],
    [7, '<b>La balanza se inclina a tu favor.</b> Con esto ya podemos plantear una negociación seria.'],
    [10, '<b>Caso sólido.</b> Tienes lo que miramos primero. Pide cita y no dejes pasar los plazos.']
  ];
  var pesos = $$('[data-pesos] input');
  var meter = $('[data-meter]');
  var veredicto = $('[data-veredicto]');
  var maxPeso = pesos.reduce(function (s, p) { return s + Number(p.getAttribute('data-w')); }, 0);
  function actualizarBalanza() {
    var items = [], total = 0;
    pesos.forEach(function (p) { if (p.checked) { items.push(p.value); total += Number(p.getAttribute('data-w')); } });
    var texto = VEREDICTOS[0][1];
    VEREDICTOS.forEach(function (v) { if (total >= v[0]) texto = v[1]; });
    veredicto.innerHTML = texto;
    meter.style.width = (total / maxPeso * 100) + '%';
    meter.style.backgroundPosition = (total / maxPeso * 100) + '% 0';
    window.dispatchEvent(new CustomEvent('vm:pesos', { detail: { items: items, total: total, contrapeso: CONFIG.contrapeso, max: maxPeso } }));
  }
  pesos.forEach(function (p) { p.addEventListener('change', actualizarBalanza); });
  window.VM = window.VM || {};
  window.VM.pesos = function () { actualizarBalanza(); };

  /* ---------- Vídeo interactivo ---------- */
  var player = $('[data-player]');
  if (player) {
    var video = $('[data-video]', player);
    var big = $('[data-play-big]', player);
    var choice = $('[data-choice]', player);
    var timerEl = $('[data-choice-timer]', player);
    var hotspot = $('[data-hotspot]', player);
    var btnToggle = $('[data-toggle]', player);
    var btnMute = $('[data-mute]', player);
    var timeEl = $('[data-time]', player);
    var chaptersEl = $('[data-chapters]', player);
    var elegido = null, preguntado = false, cuenta = null;

    CAPITULOS.forEach(function (c) {
      var b = document.createElement('button');
      b.type = 'button'; b.className = 'chapter'; b.style.setProperty('--len', c.fin - c.inicio);
      b.innerHTML = '<span>' + c.titulo + '</span><i></i>';
      b.setAttribute('aria-label', 'Ir al capítulo ' + c.titulo);
      b.addEventListener('click', function () { irA(c.id, true); });
      chaptersEl.appendChild(b); c.btn = b;
    });
    function cap(id) { return CAPITULOS.filter(function (c) { return c.id === id; })[0]; }
    function capEn(t) { var r = CAPITULOS[0]; CAPITULOS.forEach(function (c) { if (t >= c.inicio - 0.01) r = c; }); return r; }
    function play() { var p = video.play(); if (p && p.catch) p.catch(function () {}); }
    function setIcon() {
      var playing = !video.paused && !video.ended;
      $('use', btnToggle).setAttribute('href', playing ? '#i-pause' : '#i-play');
      btnToggle.setAttribute('aria-label', playing ? 'Pausar' : 'Reproducir');
    }
    function cerrarPregunta() { choice.hidden = true; clearInterval(cuenta); }
    function irA(id, manual) {
      var c = cap(id); if (!c) return;
      if (id !== 'intro' && id !== 'cierre') elegido = id;
      if (id === 'intro') { preguntado = false; elegido = null; }
      else preguntado = true;
      cerrarPregunta(); big.hidden = true;
      video.currentTime = c.inicio + 0.01; play();
      if (manual) video.focus && video.focus();
    }
    function preguntar() {
      preguntado = true; video.pause(); choice.hidden = false;
      var resto = 10; timerEl.textContent = 'Si no eliges, seguimos con Familia en ' + resto + ' s';
      clearInterval(cuenta);
      cuenta = setInterval(function () {
        resto--; timerEl.textContent = 'Si no eliges, seguimos con Familia en ' + resto + ' s';
        if (resto <= 0) irA('familia');
      }, 1000);
      var primero = $('button', choice); if (primero) primero.focus({ preventScroll: true });
    }
    $$('[data-goto]', choice).forEach(function (b) { b.addEventListener('click', function () { irA(b.getAttribute('data-goto')); }); });
    big.addEventListener('click', function () { big.hidden = true; play(); });
    btnToggle.addEventListener('click', function () { if (video.paused) { big.hidden = true; cerrarPregunta(); play(); } else video.pause(); });
    btnMute.addEventListener('click', function () {
      video.muted = !video.muted;
      btnMute.setAttribute('aria-pressed', String(!video.muted));
      btnMute.setAttribute('aria-label', video.muted ? 'Activar sonido' : 'Silenciar');
    });
    video.addEventListener('click', function () { if (choice.hidden) { if (video.paused) play(); else video.pause(); } });
    video.addEventListener('play', setIcon);
    video.addEventListener('pause', setIcon);
    video.addEventListener('ended', setIcon);
    video.addEventListener('timeupdate', function () {
      var t = video.currentTime, c = capEn(t);
      timeEl.textContent = fmt(t);
      CAPITULOS.forEach(function (k) {
        k.btn.style.setProperty('--p', clamp((t - k.inicio) / (k.fin - k.inicio), 0, 1));
        k.btn.classList.toggle('is-active', k === c);
      });
      hotspot.hidden = !c.cita;
      // Al acabar la intro, pregunta. Al acabar el área elegida, salta al cierre.
      if (c.id === 'intro' && !preguntado && t >= c.fin - 0.25) preguntar();
      if (elegido && c.id !== 'cierre' && c.id !== elegido && t > cap(elegido).fin - 0.3) irA('cierre');
      if (elegido && c.id === elegido && t >= c.fin - 0.25) irA('cierre');
    });
    window.VM.video = { irA: irA, capitulos: CAPITULOS };
  }

  /* ---------- Horario: abierto / cerrado ---------- */
  function ahora() {
    try {
      var parts = new Intl.DateTimeFormat('en-GB', { timeZone: CONFIG.zonaHoraria, weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date());
      var o = {}; parts.forEach(function (p) { o[p.type] = p.value; });
      var dias = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
      return { dia: dias[o.weekday], min: parseInt(o.hour, 10) * 60 + parseInt(o.minute, 10) };
    } catch (e) { var d = new Date(); return { dia: d.getDay(), min: d.getHours() * 60 + d.getMinutes() }; }
  }
  var estado = $('[data-estado]');
  if (estado) {
    var n = ahora();
    var abierto = (CONFIG.horario[n.dia] || []).some(function (r) { return n.min >= toMin(r[0]) && n.min < toMin(r[1]); });
    estado.textContent = abierto ? 'Abierto ahora' : 'Cerrado ahora';
    estado.className = 'estado ' + (abierto ? 'estado--abierto' : 'estado--cerrado');
  }

  /* ---------- Formulario de cita ---------- */
  var form = $('[data-form]');
  if (form) {
    var errorEl = $('[data-form-error]', form);
    var via = 'wa';
    $$('[data-send]', form).forEach(function (b) { b.addEventListener('click', function () { via = b.getAttribute('data-send'); }); });
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var faltan = [];
      $$('[required]', form).forEach(function (el) {
        var ok = el.type === 'checkbox' ? el.checked : el.value.trim().length > 1;
        if (el.name === 'telefono') ok = /^[+\d][\d\s]{8,}$/.test(el.value.trim());
        el.setAttribute('aria-invalid', ok ? 'false' : 'true');
        if (!ok) faltan.push(el);
      });
      if (faltan.length) {
        errorEl.hidden = false;
        errorEl.textContent = faltan[0].type === 'checkbox' ? 'Acepta la política de privacidad para que podamos llamarte.' : 'Revisa los campos marcados: nombre, un teléfono válido y tu caso.';
        faltan[0].focus(); return;
      }
      errorEl.hidden = true;
      var d = new FormData(form);
      var msg = 'Hola, quiero pedir una primera consulta en Valdés & Moncayo.\n' +
        'Nombre: ' + d.get('nombre') + '\nTeléfono: ' + d.get('telefono') +
        '\nÁrea: ' + d.get('area') + '\nModalidad: ' + d.get('modo') + '\nMi caso: ' + d.get('caso');
      if (via === 'mail') window.location.href = 'mailto:' + CONFIG.correo + '?subject=' + encodeURIComponent('Primera consulta · ' + d.get('area')) + '&body=' + encodeURIComponent(msg);
      else window.open('https://wa.me/' + CONFIG.whatsapp + '?text=' + encodeURIComponent(msg), '_blank', 'noopener');
    });
  }

  /* ---------- Cookies y mapa ---------- */
  var banner = $('[data-cookie-banner]');
  function cargarMapa() {
    var cont = $('[data-mapa]'); if (!cont || $('iframe', cont)) return;
    var f = document.createElement('iframe');
    f.src = CONFIG.mapa; f.title = 'Mapa: Calle Sagasta, Mérida'; f.loading = 'lazy'; f.referrerPolicy = 'no-referrer';
    var ph = $('[data-mapa-ph]', cont); if (ph) ph.remove();
    cont.appendChild(f);
  }
  function aplicar(v) { if (v === 'accepted') cargarMapa(); }
  var guardado = local.get(CONFIG.claveConsentimiento);
  if (guardado) aplicar(guardado); else banner.hidden = false;
  $$('[data-consent]').forEach(function (b) {
    b.addEventListener('click', function () {
      var v = b.getAttribute('data-consent'); local.set(CONFIG.claveConsentimiento, v); banner.hidden = true; aplicar(v);
    });
  });
  $$('[data-open-cookies]').forEach(function (b) { b.addEventListener('click', function () { banner.hidden = false; }); });
  var btnMapa = $('[data-load-map]'); if (btnMapa) btnMapa.addEventListener('click', cargarMapa);

  $$('[data-year]').forEach(function (el) { el.textContent = new Date().getFullYear(); });
})();
