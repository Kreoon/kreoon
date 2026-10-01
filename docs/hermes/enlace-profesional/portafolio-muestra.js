/*
 * Motor compartido de los prototipos de portafolio (estudio-ugc.html y cine.html).
 *
 * SOLO PROTOTIPO: genera contenido de muestra (pósters SVG y clips sintéticos)
 * para probar organización, filtros, carga progresiva y visor con 6, 30 y 100
 * piezas. No representa rendimiento multimedia real ni permisos del backend.
 */
(function () {
  'use strict';

  // ---------- Utilidades ----------
  function rng(seed) {
    return function () {
      seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
      var t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function pick(r, list) { return list[Math.floor(r() * list.length)]; }
  function el(tag, attrs, children) {
    var n = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      var v = attrs[k];
      if (v === null || v === undefined || v === false) return;
      if (k === 'text') n.textContent = v;
      else if (k === 'class') n.className = v;
      else if (k.slice(0, 2) === 'on') n.addEventListener(k.slice(2), v);
      else n.setAttribute(k, v === true ? '' : v);
    });
    (children || []).forEach(function (c) { if (c) n.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
    return n;
  }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function mmss(s) { return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); }
  function params() { return new URLSearchParams(location.search); }

  // ---------- Formatos ----------
  var RATIOS = {
    '9:16': [1080, 1920], '4:5': [1080, 1350], '1:1': [1080, 1080], '2:3': [1080, 1620],
    '3:2': [1620, 1080], '16:9': [1920, 1080]
  };
  function orientacion(item) { return item.w > item.h ? 'horizontal' : item.w === item.h ? 'cuadrado' : 'vertical'; }

  // ---------- Póster SVG de muestra ----------
  // El "sujeto" (persona o producto) se dibuja en (fx, fy). Si el creador eligió
  // punto de enfoque, item.foco coincide con el sujeto; si no, la tarjeta NO recorta.
  var PALETAS = {
    'UGC': ['#F6D5C4', '#E7A989', '#7A3A1F'],
    'Producto': ['#DCE7F2', '#9DB8D6', '#23415F'],
    'Lifestyle': ['#E4EBD6', '#B4C795', '#3D5226'],
    'Fotografía': ['#ECE3F5', '#C3AEE0', '#45306B'],
    'Detrás de cámaras': ['#F1E6CF', '#D7BD86', '#5A4519'],
    'Campañas': ['#F3D9DE', '#DFA0AD', '#6B2433'],
    'Videoclip': ['#D8E8E6', '#94C2BC', '#1F4A45'],
    'Moda': ['#EEE0D7', '#CFA98F', '#58361F'],
    'Editorial': ['#E3ECE7', '#A9C6B7', '#1F5C45'],
    'Retrato': ['#F0E4DA', '#D2B29A', '#5C3B26'],
    'Lugares': ['#DDE6EE', '#A7BBCD', '#2C4459']
  };
  function poster(item) {
    var w = item.w, h = item.h, p = PALETAS[item.coleccion] || PALETAS['UGC'];
    var cx = item.sujeto.x * w, cy = item.sujeto.y * h, u = Math.min(w, h);
    var sujeto;
    if (item.sujeto.tipo === 'persona') {
      var r = u * 0.13;
      sujeto = '<circle cx="' + cx + '" cy="' + (cy - r * 0.5) + '" r="' + r + '" fill="' + p[2] + '"/>' +
        '<path d="M' + (cx - r * 1.9) + ' ' + (cy + r * 2.4) + ' Q' + cx + ' ' + (cy - r * 0.5) + ' ' + (cx + r * 1.9) + ' ' + (cy + r * 2.4) + ' Z" fill="' + p[2] + '"/>';
    } else {
      var bw = u * 0.16, bh = u * 0.34;
      sujeto = '<rect x="' + (cx - bw / 2) + '" y="' + (cy - bh / 2) + '" width="' + bw + '" height="' + bh + '" rx="' + bw * 0.25 + '" fill="' + p[2] + '"/>' +
        '<rect x="' + (cx - bw * 0.22) + '" y="' + (cy - bh / 2 - bw * 0.35) + '" width="' + bw * 0.44 + '" height="' + bw * 0.4 + '" rx="6" fill="' + p[2] + '"/>';
    }
    var fs = Math.round(u * 0.05);
    var svg = '<svg xmlns="http://www.w3.org/2000/svg" width="' + w + '" height="' + h + '" viewBox="0 0 ' + w + ' ' + h + '">' +
      '<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + p[0] + '"/><stop offset="1" stop-color="' + p[1] + '"/></linearGradient></defs>' +
      '<rect width="100%" height="100%" fill="url(#g)"/>' +
      '<rect x="0" y="' + h * 0.72 + '" width="' + w + '" height="' + h * 0.28 + '" fill="' + p[1] + '" opacity=".55"/>' +
      sujeto +
      '<rect x="' + fs * 0.8 + '" y="' + (h - fs * 2.5) + '" width="' + fs * 6.4 + '" height="' + fs * 1.7 + '" rx="' + fs * 0.85 + '" fill="#242135"/>' +
      '<text x="' + fs * 4 + '" y="' + (h - fs * 1.28) + '" font-family="Arial,sans-serif" font-size="' + fs + '" font-weight="700" fill="#FFFFFF" text-anchor="middle">MUESTRA</text>' +
      '<text x="' + (w - fs * 0.8) + '" y="' + (h - fs * 0.9) + '" font-family="Arial,sans-serif" font-size="' + fs * 0.9 + '" font-weight="700" fill="#242135" text-anchor="end">' + esc(item.formato) + '</text>' +
      '</svg>';
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  }

  // ---------- Generador de piezas de muestra ----------
  var TITULOS = ['Rutina de mañana', 'Primeras impresiones', 'Lo que llevo en el bolso', 'Antes y después', 'Tres usos en un minuto',
    'Mi opinión honesta', 'Abriendo el paquete', 'Un día conmigo', 'Cómo lo uso', 'Comparativa rápida', 'Receta en 30 segundos',
    'Detalle de textura', 'Sobremesa', 'Escritorio ordenado', 'Luz de tarde', 'Viaje de fin de semana', 'Paso a paso',
    'Pregunta frecuente', 'Prueba de resistencia', 'Rincón favorito', 'Guardarropa cápsula', 'Café de especialidad'];
  var TIPOS_VIDEO = ['Demostración', 'Testimonial', 'Unboxing', 'Tutorial', 'Reseña'];
  var TIPOS_FOTO = ['Fotografía de producto', 'Lifestyle', 'Retrato'];

  function piezasUGC(n) {
    var r = rng(20261001), out = [];
    var colecciones = ['UGC', 'Producto', 'Lifestyle', 'Fotografía', 'Detrás de cámaras'];
    for (var i = 0; i < 100; i++) {
      var esVideo = r() < 0.64;
      var formato = esVideo ? (r() < 0.9 ? '9:16' : pick(r, ['1:1', '16:9'])) : pick(r, ['4:5', '9:16', '1:1', '3:2', '2:3', '16:9']);
      var col = esVideo ? pick(r, ['UGC', 'UGC', 'UGC', 'Producto', 'Detrás de cámaras', 'Lifestyle']) : pick(r, ['Fotografía', 'Producto', 'Lifestyle', 'Fotografía']);
      var d = RATIOS[formato];
      var sx = 0.18 + r() * 0.64, sy = 0.25 + r() * 0.45;
      out.push({
        id: 'p' + (i + 1), tipo: esVideo ? 'video' : 'foto', formato: formato, w: d[0], h: d[1],
        titulo: TITULOS[i % TITULOS.length], clase: esVideo ? pick(r, TIPOS_VIDEO) : pick(r, TIPOS_FOTO),
        duracion: esVideo ? 12 + Math.floor(r() * 54) : null, coleccion: colecciones.indexOf(col) >= 0 ? col : 'UGC',
        sujeto: { tipo: r() < 0.55 ? 'persona' : 'producto', x: sx, y: sy },
        // ~40 % de las piezas tienen encuadre elegido por el creador; el resto se muestran completas.
        foco: r() < 0.4 ? { x: sx, y: sy } : null,
        destacado: false
      });
    }
    // Primeros 6 variados y deterministas (muestra pequeña).
    out[0] = Object.assign(out[0], { tipo: 'video', formato: '9:16', w: 1080, h: 1920, clase: 'Demostración', duracion: 34, coleccion: 'UGC' });
    out[1] = Object.assign(out[1], { tipo: 'foto', formato: '4:5', w: 1080, h: 1350, clase: 'Fotografía de producto', duracion: null, coleccion: 'Producto', foco: null });
    out[2] = Object.assign(out[2], { tipo: 'video', formato: '9:16', w: 1080, h: 1920, clase: 'Testimonial', duracion: 41, coleccion: 'UGC' });
    out[3] = Object.assign(out[3], { tipo: 'foto', formato: '3:2', w: 1620, h: 1080, clase: 'Lifestyle', duracion: null, coleccion: 'Lifestyle', foco: null });
    out[4] = Object.assign(out[4], { tipo: 'video', formato: '9:16', w: 1080, h: 1920, clase: 'Unboxing', duracion: 27, coleccion: 'Producto' });
    out[5] = Object.assign(out[5], { tipo: 'foto', formato: '1:1', w: 1080, h: 1080, clase: 'Fotografía de producto', duracion: null, coleccion: 'Fotografía', foco: { x: out[5].sujeto.x, y: out[5].sujeto.y } });
    out = out.slice(0, n);
    // Destacados: 5 piezas elegidas por el creador (no un límite del portafolio).
    [0, 2, 4, 7, 9, 1].slice(0, Math.min(5, n)).forEach(function (k) { if (out[k]) out[k].destacado = true; });
    out.forEach(function (it) { it.src = poster(it); });
    // Una miniatura dañada a propósito para probar el estado de error.
    if (out[11]) { out[11].src = MINIATURA_ROTA; out[11].titulo = 'Miniatura dañada (prueba)'; }
    return out;
  }
  var MINIATURA_ROTA = 'data:image/png;base64,AAAA';

  // Plantilla editorial: mismas piezas de muestra con colecciones de revista.
  function piezasEditorial(n) {
    var mapa = { 'UGC': 'Editorial', 'Producto': 'Producto', 'Lifestyle': 'Lugares', 'Fotografía': 'Retrato', 'Detrás de cámaras': 'Detrás de cámaras' };
    return piezasUGC(n).map(function (it) {
      var c = Object.assign({}, it, { coleccion: mapa[it.coleccion] });
      if (it.src !== MINIATURA_ROTA) c.src = poster(c);
      return c;
    });
  }

  var PROY = ['Lanzamiento de temporada', 'Mañanas lentas', 'Ciudad de noche', 'Hecho a mano', 'Ritual de cuidado', 'Mesa compartida',
    'Movimiento', 'Colección cápsula', 'Taller abierto', 'Ruta costera', 'Primer café', 'Casa de campo', 'Estudio blanco', 'Ensayo general'];
  var ROLES = ['Dirección y fotografía', 'Dirección de fotografía', 'Cámara y edición', 'Dirección, cámara y color', 'Fotografía fija'];

  function proyectosCine(nPiezas) {
    var r = rng(19371), proyectos = [], total = 0, i = 0;
    var cols = ['Campañas', 'Videoclip', 'Moda', 'Producto', 'Detrás de cámaras'];
    while (total < nPiezas) {
      var resto = nPiezas - total;
      var tam = Math.min(resto, 1 + Math.floor(r() * 5));
      var col = pick(r, cols), piezas = [];
      var soloFoto = r() < 0.18;
      for (var k = 0; k < tam; k++) {
        var esVideo = !soloFoto && k === 0;
        var formato = esVideo ? (r() < 0.78 ? '9:16' : '16:9') : pick(r, ['4:5', '2:3', '9:16', '3:2', '1:1', '16:9']);
        var d = RATIOS[formato], sx = 0.2 + r() * 0.6, sy = 0.25 + r() * 0.45;
        var it = {
          id: 'c' + (total + k + 1), tipo: esVideo ? 'video' : 'foto', formato: formato, w: d[0], h: d[1],
          titulo: esVideo ? 'Pieza principal' : 'Fotografía ' + k, clase: esVideo ? 'Video principal' : 'Fotografía',
          duracion: esVideo ? 20 + Math.floor(r() * 70) : null, coleccion: col,
          sujeto: { tipo: r() < 0.6 ? 'persona' : 'producto', x: sx, y: sy },
          foco: r() < 0.45 ? { x: sx, y: sy } : null
        };
        it.src = (i === 4 && k === 0) ? MINIATURA_ROTA : poster(it);
        piezas.push(it);
      }
      proyectos.push({
        id: 'pr' + (i + 1), titulo: PROY[i % PROY.length] + (i >= PROY.length ? ' ' + (Math.floor(i / PROY.length) + 1) : ''),
        coleccion: col, rol: pick(r, ROLES), anio: 2022 + Math.floor(r() * 4),
        resumen: 'Descripción breve de muestra: objetivo del encargo, cómo se grabó y qué se entregó.',
        piezas: piezas
      });
      total += tam; i++;
    }
    return proyectos;
  }

  // ---------- Clip de video sintético (bajo demanda) ----------
  // Solo se crea al abrir una pieza de video en el visor. Se graba una vez por
  // orientación desde un <canvas> y se reutiliza. Si el navegador no puede
  // grabar, el visor lo indica en vez de fingir reproducción.
  var clips = {};
  function clipSintetico(w, h) {
    var key = w > h ? 'h' : 'v';
    if (clips[key]) return clips[key];
    clips[key] = new Promise(function (resolve, reject) {
      var cw = w > h ? 640 : 360, ch = w > h ? 360 : 640;
      var c = document.createElement('canvas'); c.width = cw; c.height = ch;
      var ctx = c.getContext('2d');
      if (!c.captureStream || !window.MediaRecorder) return reject(new Error('sin-soporte'));
      var tipo = ['video/webm;codecs=vp9', 'video/webm', 'video/mp4'].find(function (t) { return MediaRecorder.isTypeSupported(t); });
      if (!tipo) return reject(new Error('sin-soporte'));
      var flujo = c.captureStream(0), pista = flujo.getVideoTracks()[0];
      var rec = new MediaRecorder(flujo, { mimeType: tipo }), partes = [];
      rec.ondataavailable = function (e) { if (e.data.size) partes.push(e.data); };
      rec.onstop = function () {
        var b = new Blob(partes, { type: tipo });
        // Si la pestaña estaba oculta, el navegador no captura fotogramas: no fingir un video.
        if (b.size < 2048) return reject(new Error('clip-vacio'));
        resolve(URL.createObjectURL(b));
      };
      var t0 = performance.now(), dur = 2400;
      function dibujar() {
        var t = Math.min(1, (performance.now() - t0) / dur);
        ctx.fillStyle = '#242135'; ctx.fillRect(0, 0, cw, ch);
        ctx.fillStyle = '#6D4AFF'; ctx.fillRect(0, ch - 10, cw * t, 10);
        ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 2; ctx.strokeRect(8, 8, cw - 16, ch - 16);
        ctx.fillStyle = '#FFFFFF'; ctx.textAlign = 'center';
        ctx.font = '700 22px Arial'; ctx.fillText('Clip sintético de muestra', cw / 2, ch / 2 - 16);
        ctx.font = '16px Arial'; ctx.fillText((w > h ? '16:9' : '9:16') + ' · ' + (t * dur / 1000).toFixed(1) + ' s', cw / 2, ch / 2 + 14);
        ctx.beginPath(); ctx.arc(cw / 2 + Math.cos(t * 6.28) * 60, ch / 2 + 70 + Math.sin(t * 6.28) * 20, 10, 0, 6.29); ctx.fill();
        if (pista.requestFrame) pista.requestFrame();
      }
      rec.start(250); dibujar();
      var iv = setInterval(function () { dibujar(); if (performance.now() - t0 >= dur) { clearInterval(iv); rec.stop(); } }, 33);
    }).catch(function (e) { delete clips[key]; throw e; });
    return clips[key];
  }

  // ---------- Medio en tarjeta (sin recorte automático) ----------
  // foco != null  -> cover con object-position elegido por el creador.
  // foco == null  -> contain sobre un fondo suave: la pieza se ve completa.
  function medio(item, opts) {
    opts = opts || {};
    var img = el('img', {
      src: item.src, alt: opts.alt || '', width: item.w, height: item.h,
      loading: opts.eager ? 'eager' : 'lazy', decoding: 'async', fetchpriority: opts.eager ? 'high' : null,
      class: 'medio ' + (item.foco ? 'medio-encuadre' : 'medio-completo')
    });
    if (item.foco) img.style.objectPosition = Math.round(item.foco.x * 100) + '% ' + Math.round(item.foco.y * 100) + '%';
    return img;
  }
  function insignia(item) {
    var txt = item.tipo === 'video' ? 'Video' + (item.duracion ? ' · ' + mmss(item.duracion) : '') : 'Foto';
    return el('span', { class: 'insignia insignia-' + item.tipo }, [
      el('span', { class: 'insignia-ico', 'aria-hidden': 'true', text: item.tipo === 'video' ? '▶' : '◻' }), txt
    ]);
  }

  // ---------- Visor ----------
  // secuencia: array de { item, titulo, detalle, contexto? }. Un solo <video> vive
  // a la vez (dentro del visor) y se pausa y descarga al cambiar o cerrar.
  function Visor(opts) {
    var self = this;
    this.opts = opts || {};
    this.dlg = el('dialog', { class: 'visor', 'aria-labelledby': 'visor-titulo' });
    this.cont = el('p', { class: 'visor-cont', 'aria-live': 'polite' });
    this.btnCerrar = el('button', { type: 'button', class: 'visor-btn visor-cerrar', 'aria-label': 'Cerrar visor', onclick: function () { self.cerrar(); } }, ['✕']);
    this.btnAnt = el('button', { type: 'button', class: 'visor-btn visor-nav', 'aria-label': 'Pieza anterior', onclick: function () { self.mover(-1); } }, ['‹']);
    this.btnSig = el('button', { type: 'button', class: 'visor-btn visor-nav', 'aria-label': 'Pieza siguiente', onclick: function () { self.mover(1); } }, ['›']);
    this.escena = el('div', { class: 'visor-escena' });
    this.info = el('div', { class: 'visor-info' });
    this.dlg.append(
      el('div', { class: 'visor-barra' }, [this.cont, this.btnCerrar]),
      el('div', { class: 'visor-cuerpo' }, [this.btnAnt, this.escena, this.btnSig]),
      this.info
    );
    document.body.appendChild(this.dlg);
    // Limpieza síncrona al cerrar (botón o Esc); 'close' queda como red de seguridad.
    this.dlg.addEventListener('cancel', function (e) { e.preventDefault(); self.cerrar(); });
    this.dlg.addEventListener('close', function () { self._alCerrar(); });
    this.dlg.addEventListener('keydown', function (e) {
      if (e.target.tagName === 'VIDEO' && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) return; // el video usa las flechas para buscar
      if (e.key === 'ArrowLeft') { e.preventDefault(); self.mover(-1); }
      if (e.key === 'ArrowRight') { e.preventDefault(); self.mover(1); }
    });
    // Gesto táctil: deslizar a los lados (no cuando la foto está ampliada).
    var x0 = null;
    this.escena.addEventListener('pointerdown', function (e) { if (e.pointerType !== 'mouse') x0 = e.clientX; });
    this.escena.addEventListener('pointerup', function (e) {
      if (x0 === null || self.escena.classList.contains('ampliada')) { x0 = null; return; }
      var dx = e.clientX - x0; x0 = null;
      if (Math.abs(dx) > 50) self.mover(dx < 0 ? 1 : -1);
    });
    document.addEventListener('visibilitychange', function () { if (document.hidden) self._pausar(); });
  }
  Visor.prototype.abrir = function (secuencia, indice, origen) {
    this.seq = secuencia; this.i = indice; this.origen = origen || document.activeElement;
    this.scrollY = window.scrollY;
    document.documentElement.classList.add('visor-abierto');
    this._abierto = true;
    if (!this.dlg.open) this.dlg.showModal();
    this._pintar();
    this.btnCerrar.focus();
  };
  // Cerrar primero (el navegador restaura su foco) y luego limpiar y devolver el foco a la pieza.
  Visor.prototype.cerrar = function () { if (this.dlg.open) this.dlg.close(); this._alCerrar(); };
  Visor.prototype._alCerrar = function () {
    if (!this._abierto) return;
    this._abierto = false;
    this._descargarVideo();
    this.escena.textContent = '';
    document.documentElement.classList.remove('visor-abierto');
    window.scrollTo(0, this.scrollY);
    var entrada = this.seq && this.seq[this.i];
    if (this.opts.alCerrar) this.opts.alCerrar(entrada, this.origen);
    else if (this.origen && this.origen.isConnected) this.origen.focus({ preventScroll: true });
  };
  Visor.prototype.mover = function (d) {
    if (!this.seq) return;
    var n = this.i + d;
    if (n < 0 || n >= this.seq.length) return;
    this.i = n; this._pintar();
  };
  Visor.prototype.ir = function (i) {
    if (!this.seq || i < 0 || i >= this.seq.length) return;
    this.i = i; this._pintar();
  };
  Visor.prototype._pausar = function () { var v = this.escena.querySelector('video'); if (v) v.pause(); };
  Visor.prototype._descargarVideo = function () {
    var v = this.escena.querySelector('video');
    if (v) { v.pause(); v.removeAttribute('src'); v.load(); }
  };
  Visor.prototype._pintar = function () {
    var self = this, e = this.seq[this.i], it = e.item;
    this._descargarVideo();
    this.escena.textContent = '';
    this.escena.classList.remove('ampliada');
    this.escena.className = 'visor-escena visor-' + orientacion(it);
    this.cont.textContent = (e.contador || ((this.i + 1) + ' de ' + this.seq.length));
    this.btnAnt.disabled = this.i === 0;
    this.btnSig.disabled = this.i === this.seq.length - 1;

    if (it.tipo === 'video') {
      var marco = el('div', { class: 'visor-video', style: 'aspect-ratio:' + it.w + '/' + it.h });
      var estado = el('p', { class: 'visor-estado', role: 'status', text: 'Preparando clip de muestra…' });
      var v = el('video', { controls: true, playsinline: true, preload: 'none', poster: it.src, width: it.w, height: it.h, 'aria-label': 'Video: ' + e.titulo });
      marco.append(v, estado);
      this.escena.appendChild(marco);
      // El archivo se pide solo ahora, al abrir esta pieza. Nunca autoplay.
      clipSintetico(it.w, it.h).then(function (url) {
        if (!v.isConnected) return;
        v.src = url; v.loop = true; estado.remove();
      }, function () {
        estado.textContent = 'No se pudo generar el clip de muestra en este navegador o pestaña. En la plataforma aquí se reproduce el video real; el póster conserva su proporción.';
      });
    } else {
      var img = el('img', { src: it.src, alt: e.titulo + ' (' + it.formato + ')', width: it.w, height: it.h, class: 'visor-foto', decoding: 'async' });
      var amp = el('button', {
        type: 'button', class: 'visor-btn visor-ampliar', 'aria-pressed': 'false',
        onclick: function () {
          var on = !self.escena.classList.contains('ampliada');
          self.escena.classList.toggle('ampliada', on);
          amp.setAttribute('aria-pressed', on ? 'true' : 'false');
          amp.textContent = on ? 'Ajustar a pantalla' : 'Ampliar';
          self.escena.tabIndex = on ? 0 : -1;
        }
      }, ['Ampliar']);
      img.addEventListener('error', function () {
        self.escena.textContent = '';
        self.escena.appendChild(el('p', { class: 'visor-estado visor-error', role: 'status', text: 'No se pudo cargar esta pieza. Prueba con la siguiente.' }));
      });
      this.escena.append(img, amp);
    }
    this.info.textContent = '';
    var t = el('h2', { id: 'visor-titulo', class: 'visor-titulo', text: e.titulo });
    this.info.append(t, el('p', { class: 'visor-detalle', text: e.detalle }));
    if (e.extra) this.info.appendChild(e.extra(this));
  };

  // ---------- Compartir el enlace interno del portafolio ----------
  function toast(msg, valor) {
    var t = document.querySelector('.toast');
    if (!t) { t = el('div', { class: 'toast', role: 'status', 'aria-live': 'polite' }); document.body.appendChild(t); }
    t.textContent = '';
    t.appendChild(document.createTextNode(msg));
    if (valor) {
      var inp = el('input', { type: 'text', readonly: true, value: valor, 'aria-label': 'Enlace del portafolio' });
      t.appendChild(inp); setTimeout(function () { inp.select(); }, 30);
    }
    t.classList.add('on');
    clearTimeout(toast._t); toast._t = setTimeout(function () { t.classList.remove('on'); }, valor ? 8000 : 3500);
  }
  function compartir(url, titulo) {
    if (navigator.share) {
      navigator.share({ title: titulo, url: url }).catch(function (e) { if (e && e.name !== 'AbortError') copiar(url); });
    } else copiar(url);
  }
  function copiar(url) {
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(url).then(function () { toast('Enlace copiado: ' + url); }, function () { toast('Copia este enlace:', url); });
    } else toast('Copia este enlace:', url);
  }

  // ---------- Panel del editor (fuera de la vista pública) ----------
  function panelEditor(cont, cfg) {
    cont.textContent = '';
    // Punto de enfoque
    var foco = cfg.retrato.foco || { x: 0.5, y: 0.5 };
    var marca = el('span', { class: 'ed-marca', 'aria-hidden': 'true' });
    var img = el('img', { src: cfg.retrato.src, alt: '', width: cfg.retrato.w, height: cfg.retrato.h });
    var lienzo = el('div', { class: 'ed-lienzo' }, [img, marca]);
    var lectura = el('p', { class: 'ed-lectura', 'aria-live': 'polite' });
    function fijar(x, y) {
      foco = { x: Math.max(0, Math.min(1, x)), y: Math.max(0, Math.min(1, y)) };
      marca.style.left = foco.x * 100 + '%'; marca.style.top = foco.y * 100 + '%';
      lectura.textContent = 'Enfoque: ' + Math.round(foco.x * 100) + ' % horizontal, ' + Math.round(foco.y * 100) + ' % vertical.';
      cfg.alFoco(foco);
    }
    lienzo.addEventListener('click', function (e) { var r = img.getBoundingClientRect(); fijar((e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height); });
    function flecha(sim, etq, dx, dy) { return el('button', { type: 'button', class: 'ed-btn', 'aria-label': etq, onclick: function () { fijar(foco.x + dx, foco.y + dy); } }, [sim]); }
    fijar(foco.x, foco.y);

    // Orden de destacados
    var lista = el('ol', { class: 'ed-lista' });
    function pintarLista() {
      lista.textContent = '';
      cfg.destacados().forEach(function (it, i, arr) {
        lista.appendChild(el('li', null, [
          el('span', { text: (i + 1) + '. ' + it.titulo + ' · ' + (it.tipo === 'video' ? 'Video' : 'Foto') }),
          el('span', { class: 'ed-mov' }, [
            el('button', { type: 'button', class: 'ed-btn', 'aria-label': 'Subir ' + it.titulo, disabled: i === 0, onclick: function () { cfg.mover(i, -1); pintarLista(); } }, ['↑']),
            el('button', { type: 'button', class: 'ed-btn', 'aria-label': 'Bajar ' + it.titulo, disabled: i === arr.length - 1, onclick: function () { cfg.mover(i, 1); pintarLista(); } }, ['↓'])
          ])
        ]));
      });
      if (!lista.children.length) lista.appendChild(el('li', { text: 'Con pocas piezas no hay sección de destacados: el visitante ve todo el archivo.' }));
    }
    pintarLista();

    cont.append(
      el('div', { class: 'ed-col' }, [
        el('h3', { text: 'Punto de enfoque de ' + cfg.retrato.nombre }),
        el('p', { class: 'ed-ayuda', text: 'Toca la imagen donde está la cara o el producto. Solo se recorta según este punto.' }),
        lienzo, lectura,
        el('div', { class: 'ed-flechas' }, [flecha('←', 'Mover enfoque a la izquierda', -0.05, 0), flecha('↑', 'Mover enfoque arriba', 0, -0.05), flecha('↓', 'Mover enfoque abajo', 0, 0.05), flecha('→', 'Mover enfoque a la derecha', 0.05, 0)])
      ]),
      el('div', { class: 'ed-col' }, [
        el('h3', { text: 'Orden de trabajos destacados' }),
        el('p', { class: 'ed-ayuda', text: 'Estas flechas solo existen en el editor; el visitante no las ve.' }),
        lista,
        el('p', { class: 'ed-ayuda', text: 'Redes sociales, teléfono, correo, WhatsApp y enlaces externos no están disponibles en esta fase.' })
      ])
    );
  }

  // ---------- Galería compartida (carruseles + vista "Ver todo") ----------
  // Mismas reglas de interacción para todas las plantillas; cada una solo cambia
  // tipografía, color y composición. Una "unidad" es lo que muestra una tarjeta:
  // una pieza (UGC, Editorial) o un proyecto con varias piezas (Cine).
  //   { id, portada, titulo, linea, aria, coleccion, entradas(lista, i) -> [entradas del visor] }
  function slug(s) { return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); }
  function enPantalla(n) {
    if (!n || !n.isConnected) return false;
    var r = n.getBoundingClientRect();
    return r.width > 0 && r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth;
  }
  function tarjeta(u, opts) {
    opts = opts || {};
    var img = medio(u.portada, { eager: opts.eager });
    var marco = el('div', { class: 'marco' }, [img, insignia(u.portada)]);
    img.addEventListener('error', function () {
      marco.classList.add('marco-fallo');
      img.remove();
      marco.appendChild(el('span', { class: 'fallo-txt', text: 'Miniatura no disponible. La pieza se puede abrir igualmente.' }));
    });
    var b = el('button', { type: 'button', class: 'pieza', 'data-id': u.id, 'aria-label': u.aria }, [
      marco, el('div', { class: 'pie', 'aria-hidden': 'true' }, [el('b', { text: u.titulo }), el('span', { text: u.linea })])
    ]);
    if (opts.alAbrir) b.addEventListener('click', function () { opts.alAbrir(b); });
    return b;
  }

  function Galeria(cfg) {
    var g = this;
    this.cfg = cfg; this.lote = cfg.lote || 12; this.estado = {}; this.actual = null;
    this.visor = new Visor({ alCerrar: function (e, origen) { g._alCerrarVisor(e, origen); } });
    window.addEventListener('hashchange', function () { g.ruta(); });
    window.addEventListener('popstate', function () { g.ruta(); });
  }
  Galeria.prototype.cantidad = function (n) { var w = this.cfg.nombre || ['pieza', 'piezas']; return n + ' ' + (n === 1 ? w[0] : w[1]); };
  Galeria.prototype.datos = function (d) {
    this.d = d; this.estado = {};
    this.pintarInicio();
    this.ruta();
  };
  Galeria.prototype.colecciones = function () {
    var d = this.d, out = [];
    d.colecciones.forEach(function (t) {
      var us = d.unidades.filter(function (u) { return u.coleccion === t; });
      if (us.length) out.push({ slug: slug(t), titulo: t, unidades: us }); // nunca secciones vacías
    });
    return out;
  };
  Galeria.prototype.coleccion = function (s) {
    if (s === 'archivo') return { slug: 'archivo', titulo: this.cfg.tituloArchivo || 'Todo el archivo', unidades: this.d.unidades };
    return this.colecciones().filter(function (c) { return c.slug === s; })[0] || null;
  };

  // --- Portada: destacados + hasta 3 colecciones ---
  Galeria.prototype.pintarInicio = function () {
    var g = this, c = this.cfg.carruseles, d = this.d, U = d.unidades.length, filas = [], maxCol = this.cfg.maxColecciones || 3;
    c.textContent = '';
    if (!U) return;
    var cols0 = this.colecciones();
    if (U <= (this.cfg.umbralFila || 4)) {
      // Muy pocas piezas: una fila estática, sin controles.
      filas.push(this.fila({ id: 'todo', titulo: this.cfg.tituloFila || 'Mis trabajos', unidades: d.unidades }));
    } else if (U <= (this.cfg.umbralColecciones || 8)) {
      // Pocas piezas: un solo carrusel con todo; repetirlas por colección solo añadiría ruido.
      filas.push(this.fila({ id: 'todo', titulo: this.cfg.tituloFila || 'Mis trabajos', unidades: d.unidades }));
      if (cols0.length > 1) filas.push(el('div', { class: 'gf-acciones' }, [el('button', { type: 'button', class: 'btn btn-s', 'data-ver': 'colecciones', onclick: function () { g.ir('colecciones'); } }, ['Ver por colecciones (' + cols0.length + ')'])]));
    } else {
      if (d.destacadas.length) filas.push(this.fila({ id: 'destacados', titulo: this.cfg.tituloDestacados || 'Trabajos destacados', unidades: d.destacadas }));
      var cols = this.colecciones();
      if (cols.length > 1) cols.slice(0, maxCol).forEach(function (col) {
        filas.push(g.fila({ id: col.slug, titulo: col.titulo, unidades: col.unidades, verTodo: col.slug }));
      });
      var acts = el('div', { class: 'gf-acciones' });
      if (cols.length > maxCol) {
        acts.appendChild(el('button', { type: 'button', class: 'btn btn-s', 'data-ver': 'colecciones', onclick: function () { g.ir('colecciones'); } }, ['Ver todas las colecciones (' + cols.length + ')']));
      }
      acts.appendChild(el('button', { type: 'button', class: 'btn btn-s', 'data-ver': 'archivo', onclick: function () { g.ir('archivo'); } }, ['Ver todo el archivo (' + this.cantidad(U) + ')']));
      filas.push(acts);
    }
    filas.forEach(function (f) { c.appendChild(f); });
    filas.forEach(function (f) { if (f._act) f._act(); });
  };

  // --- Carrusel (o fila estática si todo cabe) ---
  Galeria.prototype.fila = function (f) {
    var g = this, max = this.cfg.maxCarrusel || 10, idT = 'gf-t-' + f.id, idP = 'gf-p-' + f.id;
    var pista = el('ul', { class: 'gf-pista', id: idP, 'aria-labelledby': idT });
    f.unidades.slice(0, max).forEach(function (u) {
      pista.appendChild(el('li', null, [tarjeta(u, { alAbrir: function (b) { g.abrir(f.unidades, u, b, { fila: f.id }); } })]));
    });
    if (f.verTodo && f.unidades.length > max) {
      pista.appendChild(el('li', null, [el('button', { type: 'button', class: 'gf-mas', 'data-ver': f.verTodo + '-final', onclick: function () { g.ir(f.verTodo, f.verTodo + '-final'); } }, ['Ver las ' + g.cantidad(f.unidades.length)])]));
    }
    var ant = el('button', { type: 'button', class: 'gf-flecha', 'aria-label': 'Ver anteriores de ' + f.titulo, 'aria-controls': idP, hidden: true }, ['‹']);
    var sig = el('button', { type: 'button', class: 'gf-flecha', 'aria-label': 'Ver siguientes de ' + f.titulo, 'aria-controls': idP, hidden: true }, ['›']);
    var ctrl = el('div', { class: 'gf-ctrl' }, [ant, sig]);
    if (f.verTodo) ctrl.appendChild(el('button', { type: 'button', class: 'gf-ver', 'data-ver': f.verTodo, 'aria-label': 'Ver todo: ' + f.titulo, onclick: function () { g.ir(f.verTodo); } }, ['Ver todo']));
    var sec = el('section', { class: 'gf', 'aria-labelledby': idT }, [
      el('div', { class: 'gf-cab' }, [el('div', null, [el('h2', { id: idT, class: 'gf-titulo', text: f.titulo }), el('p', { class: 'gf-cuenta', text: g.cantidad(f.unidades.length) })]), ctrl]),
      pista
    ]);
    function paso(d) {
      var suave = !matchMedia('(prefers-reduced-motion: reduce)').matches;
      pista.scrollBy({ left: d * pista.clientWidth * 0.85, behavior: suave ? 'smooth' : 'auto' });
    }
    ant.addEventListener('click', function () { paso(-1); });
    sig.addEventListener('click', function () { paso(1); });
    function act() {
      var hay = pista.scrollWidth > pista.clientWidth + 2;
      sec.classList.toggle('gf-estatica', !hay); // pocas piezas: sin controles innecesarios
      ant.hidden = sig.hidden = !hay;
      ant.disabled = pista.scrollLeft <= 2;
      sig.disabled = pista.scrollLeft + pista.clientWidth >= pista.scrollWidth - 2;
    }
    pista.addEventListener('scroll', act, { passive: true });
    if (window.ResizeObserver) new ResizeObserver(act).observe(pista);
    sec._act = act;
    return sec;
  };

  // --- Navegación interna (sin recargar el portafolio) ---
  Galeria.prototype.ir = function (dest, retorno) {
    if (!this.actual) { this.inicioScroll = window.scrollY; this.retorno = retorno || dest; }
    location.hash = '#/' + (dest === 'colecciones' || dest === 'archivo' ? dest : 'c/' + dest);
  };
  Galeria.prototype.volver = function () {
    history.pushState(null, '', location.pathname + location.search);
    this.ruta();
  };
  Galeria.prototype.ruta = function () {
    var h = location.hash, v = this.cfg.vista, ini = this.cfg.inicio;
    if (this.actual && this.estado[this.actual]) this.estado[this.actual].scrollY = window.scrollY;
    if (this.visor.dlg.open) this.visor.cerrar();
    if (h.indexOf('#/') !== 0) {
      var venia = !!this.actual;
      this.actual = null;
      v.hidden = true; v.textContent = ''; ini.hidden = false;
      if (!venia) return;
      var ancla = h.length > 1 && document.getElementById(decodeURIComponent(h.slice(1)));
      if (ancla) { ancla.scrollIntoView(); return; }
      // Volver exactamente a donde estaba: posición y control de origen.
      window.scrollTo(0, this.inicioScroll || 0);
      var b = ini.querySelector('[data-ver="' + this.retorno + '"]');
      if (b) b.focus({ preventScroll: true });
      return;
    }
    var p = h.slice(2).split('/'), dest = p[0] === 'c' ? p[1] : p[0];
    if (dest !== 'colecciones' && !this.coleccion(dest)) { this.volver(); return; }
    this.actual = dest;
    ini.hidden = true; v.hidden = false;
    if (dest === 'colecciones') this.pintarIndice(); else this.pintarColeccion(this.coleccion(dest));
    var st = this.estado[dest];
    window.scrollTo(0, (st && st.scrollY) || 0);
    var t = v.querySelector('h1'); if (t) t.focus({ preventScroll: true });
  };
  Galeria.prototype._cabecera = function (titulo, resumen) {
    var g = this;
    return [
      el('button', { type: 'button', class: 'btn btn-s vc-volver', onclick: function () { g.volver(); } }, ['← Volver al portafolio']),
      el('h1', { class: 'vc-titulo', tabindex: '-1', text: titulo }),
      el('p', { class: 'vc-res', text: resumen })
    ];
  };
  Galeria.prototype.pintarIndice = function () {
    var g = this, v = this.cfg.vista, cols = this.colecciones();
    this.estado.colecciones = this.estado.colecciones || { scrollY: 0 };
    v.textContent = '';
    var rej = el('div', { class: 'ci-rejilla' });
    cols.concat([{ slug: 'archivo', titulo: this.cfg.tituloArchivo || 'Todo el archivo', unidades: this.d.unidades }]).forEach(function (c) {
      var u = c.unidades[0];
      var b = el('button', { type: 'button', class: 'pieza ci', 'data-ver': c.slug, 'aria-label': c.titulo + ', ' + g.cantidad(c.unidades.length) + '. Abrir colección.' }, [
        el('div', { class: 'marco marco-ci' }, [medio(u.portada)]),
        el('div', { class: 'pie', 'aria-hidden': 'true' }, [el('b', { text: c.titulo }), el('span', { text: g.cantidad(c.unidades.length) })])
      ]);
      b.addEventListener('click', function () { g.ir(c.slug); });
      rej.appendChild(b);
    });
    var cont = el('div', { class: 'in vc' }, this._cabecera('Colecciones', cols.length + (cols.length === 1 ? ' colección' : ' colecciones') + ' y el archivo completo.'));
    cont.appendChild(rej);
    v.appendChild(cont);
  };
  Galeria.prototype.pintarColeccion = function (col) {
    var g = this, v = this.cfg.vista, lote = this.lote;
    var st = this.estado[col.slug] || (this.estado[col.slug] = { filtro: 'todo', visibles: lote, scrollY: 0 });
    var defs = (this.cfg.filtros || []).map(function (f) { return { f: f, n: col.unidades.filter(f.fn).length }; }).filter(function (x) { return x.n > 0; });
    var conFiltros = defs.length >= 2; // solo cuando aportan valor
    if (!conFiltros) st.filtro = 'todo';
    function lista() {
      if (st.filtro === 'todo') return col.unidades;
      var f = defs.filter(function (x) { return x.f.clave === st.filtro; })[0];
      return f ? col.unidades.filter(f.f.fn) : col.unidades;
    }
    v.textContent = '';
    var cont = el('div', { class: 'in vc' }, this._cabecera(col.titulo, this.cfg.resumen ? this.cfg.resumen(col.unidades) : g.cantidad(col.unidades.length)));
    var seg = el('div', { class: 'gf-seg', role: 'group', 'aria-label': 'Filtrar ' + col.titulo });
    var cuenta = el('p', { class: 'vc-cuenta', 'aria-live': 'polite' });
    var rej = el('div', { class: 'vc-rejilla' });
    var mas = el('button', { type: 'button', class: 'btn btn-s' });
    function pintarSeg() {
      seg.textContent = '';
      [{ clave: 'todo', etiqueta: 'Todo', n: col.unidades.length }].concat(defs.map(function (x) { return { clave: x.f.clave, etiqueta: x.f.etiqueta, n: x.n }; })).forEach(function (o) {
        seg.appendChild(el('button', { type: 'button', 'aria-pressed': String(st.filtro === o.clave), onclick: function () { st.filtro = o.clave; st.visibles = lote; pintarSeg(); pintar(); } }, [o.etiqueta + ' (' + o.n + ')']));
      });
    }
    function pintar(desde) {
      var l = lista(), vis = Math.min(st.visibles, l.length);
      if (desde === undefined) { rej.textContent = ''; desde = 0; }
      for (var k = desde; k < vis; k++) (function (u, eager) {
        rej.appendChild(tarjeta(u, { eager: eager, alAbrir: function (b) { g.abrir(lista(), u, b, { rejilla: true }); } }));
      })(l[k], k < 4);
      cuenta.textContent = 'Mostrando ' + vis + ' de ' + g.cantidad(l.length) + '.';
      mas.hidden = vis >= l.length;
      mas.textContent = 'Ver más (' + (l.length - vis) + ' restantes)';
    }
    this._repintarRejilla = function () { pintar(); };
    mas.addEventListener('click', function () {
      var antes = Math.min(st.visibles, lista().length);
      st.visibles += lote; pintar(antes);
      var nueva = rej.children[antes]; if (nueva) nueva.focus({ preventScroll: true });
    });
    if (conFiltros) { pintarSeg(); cont.appendChild(seg); }
    cont.append(cuenta, rej, el('div', { class: 'vc-mas' }, [mas]));
    var otras = this.colecciones().filter(function (c) { return c.slug !== col.slug; });
    if (otras.length > 1 || (otras.length === 1 && col.slug !== 'archivo')) {
      var ul = el('ul');
      otras.forEach(function (c) { ul.appendChild(el('li', null, [el('button', { type: 'button', class: 'gf-ver', onclick: function () { g.ir(c.slug); } }, [c.titulo + ' (' + c.unidades.length + ')'])])); });
      if (col.slug !== 'archivo') ul.appendChild(el('li', null, [el('button', { type: 'button', class: 'gf-ver', onclick: function () { g.ir('archivo'); } }, ['Todo el archivo (' + g.d.unidades.length + ')'])]));
      cont.appendChild(el('nav', { class: 'vc-otras', 'aria-label': 'Otras colecciones' }, [el('h2', { text: 'Otras colecciones' }), ul]));
    }
    v.appendChild(cont);
    pintar();
  };

  // --- Visor: anterior/siguiente dentro de la colección, retorno exacto ---
  Galeria.prototype.abrir = function (lista, u, origen, ctx) {
    var seq = [], inicio = 0;
    lista.forEach(function (x, i) {
      if (x === u) inicio = seq.length;
      x.entradas(lista, i).forEach(function (e) { e.unidad = x; seq.push(e); });
    });
    this._ctx = Object.assign({ lista: lista }, ctx || {});
    this.visor.abrir(seq, inicio, origen);
  };
  Galeria.prototype._alCerrarVisor = function (e, origen) {
    if (!e) return;
    var ctx = this._ctx || {}, u = e.unidad, destino = null;
    if (ctx.rejilla) {
      var st = this.estado[this.actual], k = ctx.lista.indexOf(u);
      if (st && k >= st.visibles) { st.visibles = Math.ceil((k + 1) / this.lote) * this.lote; this._repintarRejilla(); }
      destino = this.cfg.vista.querySelector('[data-id="' + u.id + '"]');
    } else if (origen && origen.closest) {
      var pista = origen.closest('.gf-pista');
      destino = pista && pista.querySelector('[data-id="' + u.id + '"]');
    }
    if (!enPantalla(destino)) destino = origen; // sin saltos: se conserva la posición
    if (destino && destino.isConnected) destino.focus({ preventScroll: true });
  };

  window.PortafolioMuestra = {
    rng: rng, el: el, mmss: mmss, params: params, orientacion: orientacion,
    piezasUGC: piezasUGC, piezasEditorial: piezasEditorial, proyectosCine: proyectosCine, poster: poster,
    tarjeta: tarjeta, Galeria: Galeria, slug: slug,
    medio: medio, insignia: insignia, Visor: Visor, compartir: compartir, toast: toast, panelEditor: panelEditor
  };
})();
