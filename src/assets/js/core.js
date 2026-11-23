/* ==========================================================================
   RADIO ÉXITO 105.1 — core.js
   Espacio de nombres global (window.RE), configuración y utilidades
   compartidas. Cada módulo (theme, player, navigation, etc.) se registra
   con RE.register() y main.js los arranca en orden.
   ========================================================================== */
(function () {
  "use strict";

  var RE = (window.RE = window.RE || {});
  var SITE = window.SITE_CONFIG || {};

  var pageIsHttps = window.location.protocol === "https:";
  // Si la página es HTTPS y hay una URL segura (streamUrlSSL), se usa esa.
  var streamUrl = SITE.streamUrl || "";
  if (pageIsHttps && SITE.streamUrlSSL) streamUrl = SITE.streamUrlSSL;

  RE.config = {
    STATION_NAME: (SITE.nombre || "Radio Éxito") + " " + (SITE.frecuencia || ""),
    STREAM_URL: streamUrl,
    NOW_PLAYING_URL: SITE.nowPlayingUrl || "",
    GA_ID: SITE.gaId || "",
    TZ: "America/Argentina/Buenos_Aires",
    RECONNECT_MAX_ATTEMPTS: 6,
    // HTTPS pidiendo un recurso HTTP: el navegador lo bloquea. Reintentar no sirve.
    MIXED_CONTENT_BLOCKED: pageIsHttps && streamUrl.indexOf("http://") === 0
  };

  /* --- Registro de módulos ---------------------------------------------- */
  var modules = [];
  RE.register = function (name, mod) {
    mod.name = name;
    modules.push(mod);
  };
  RE.boot = function () {
    modules.forEach(function (m) {
      try { if (m.init) m.init(); } catch (e) { safeLog(m.name, e); }
    });
    RE.runPage();
  };
  // Se ejecuta al cargar y cada vez que el router cambia el contenido de <main>
  RE.runPage = function () {
    modules.forEach(function (m) {
      try { if (m.page) m.page(); } catch (e) { safeLog(m.name, e); }
    });
  };
  function safeLog(name, e) {
    if (window.console && console.warn) console.warn("[RE:" + name + "]", e);
  }

  /* --- Hora de Argentina y programación --------------------------------- */
  var DAYS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
  RE.DAYS = DAYS;

  // Devuelve { dayIndex (0=Lunes), minutes } en horario de Argentina
  RE.arNow = function (date) {
    var d = date || new Date();
    var parts = new Intl.DateTimeFormat("en-US", {
      timeZone: RE.config.TZ, weekday: "long", hour: "2-digit", minute: "2-digit", hourCycle: "h23"
    }).formatToParts(d);
    var map = {};
    parts.forEach(function (p) { map[p.type] = p.value; });
    var idx = { Monday: 0, Tuesday: 1, Wednesday: 2, Thursday: 3, Friday: 4, Saturday: 5, Sunday: 6 }[map.weekday];
    return { dayIndex: idx, minutes: parseInt(map.hour, 10) * 60 + parseInt(map.minute, 10) };
  };

  function toMinutes(hhmm) {
    var m = /^(\d{1,2}):(\d{2})$/.exec(String(hhmm || "").trim());
    return m ? parseInt(m[1], 10) * 60 + parseInt(m[2], 10) : null;
  }

  // Programa al aire ahora y el siguiente, según window.RE_SCHEDULE
  RE.getSchedule = function (date) {
    var list = Array.isArray(window.RE_SCHEDULE) ? window.RE_SCHEDULE : [];
    if (!list.length) return { current: null, next: null };
    var now = RE.arNow(date);
    var prepared = list.map(function (p) {
      return { p: p, start: toMinutes(p.horaInicio), end: toMinutes(p.horaFin) };
    }).filter(function (x) { return x.start !== null && x.end !== null; });

    function onDay(dayName) {
      return prepared.filter(function (x) { return (x.p.dias || []).indexOf(dayName) !== -1; })
        .sort(function (a, b) { return a.start - b.start; });
    }

    var today = DAYS[now.dayIndex];
    var yesterday = DAYS[(now.dayIndex + 6) % 7];
    var current = null;

    onDay(today).forEach(function (x) {
      var overnight = x.end <= x.start;
      if (!current && now.minutes >= x.start && (overnight || now.minutes < x.end)) current = x.p;
    });
    // Programas que empezaron ayer y terminan hoy (cruzan la medianoche)
    if (!current) {
      onDay(yesterday).forEach(function (x) {
        if (!current && x.end <= x.start && now.minutes < x.end) current = x.p;
      });
    }

    var next = null;
    for (var offset = 0; offset < 8 && !next; offset++) {
      var name = DAYS[(now.dayIndex + offset) % 7];
      var found = onDay(name).filter(function (x) {
        return offset > 0 || x.start > now.minutes;
      })[0];
      if (found && found.p !== current) next = found.p;
    }
    return { current: current, next: next };
  };

  /* --- Utilidades ------------------------------------------------------- */
  RE.escapeHtml = function (s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  };

  // fetch + JSON con caché de sesión (evita repetir pedidos al navegar)
  RE.cachedJson = function (key, url, ttlMs) {
    try {
      var raw = sessionStorage.getItem(key);
      if (raw) {
        var hit = JSON.parse(raw);
        if (Date.now() - hit.t < ttlMs) return Promise.resolve(hit.d);
      }
    } catch (e) { /* sin sessionStorage */ }
    return fetch(url).then(function (res) {
      if (!res.ok) throw new Error("HTTP " + res.status);
      return res.json();
    }).then(function (data) {
      try { sessionStorage.setItem(key, JSON.stringify({ t: Date.now(), d: data })); } catch (e) { /* ignorar */ }
      return data;
    });
  };

  // Se reemplaza en analytics.js; acá queda como no-op seguro
  RE.track = function () {};
})();
