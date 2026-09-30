/* content.js — comportamiento de las páginas de contenido: fechas
   inteligentes, compartir, tabs de programación, programa al aire,
   vigencia de sponsors y año del footer. */
(function () {
  "use strict";
  var RE = window.RE;
  var MONTHS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
  var liveTimer = null;

  /* --- Fechas en horario de Argentina ------------------------------------ */
  function arParts(date) {
    var p = {};
    new Intl.DateTimeFormat("en-CA", { timeZone: RE.config.TZ, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" })
      .formatToParts(date).forEach(function (x) { p[x.type] = x.value; });
    return p;
  }
  function dayKey(date) { var p = arParts(date); return p.year + "-" + p.month + "-" + p.day; }

  function initSmartDates() {
    var now = new Date();
    var today = dayKey(now);
    var yesterday = dayKey(new Date(now.getTime() - 86400000));
    document.querySelectorAll(".smart-date[datetime]").forEach(function (el) {
      var d = new Date(el.getAttribute("datetime"));
      if (isNaN(d.getTime())) return;
      var p = arParts(d);
      var hora = p.hour + ":" + p.minute;
      var key = dayKey(d);
      if (key === today) el.textContent = "Hoy · " + hora;
      else if (key === yesterday) el.textContent = "Ayer · " + hora;
      else if (!el.hasAttribute("data-keep-full")) el.textContent = parseInt(p.day, 10) + " " + MONTHS[parseInt(p.month, 10) - 1] + " · " + hora;
      // Si no, queda la fecha completa que ya viene renderizada en el HTML
    });
  }

  /* --- Compartir ---------------------------------------------------------- */
  function initShare() {
    var buttons = document.querySelectorAll("[data-share]");
    if (!buttons.length) return;
    var art = document.querySelector("[data-article]");
    var title = (art && art.getAttribute("data-title")) || document.title;
    var url = window.location.href.split("#")[0];
    var msg = "Mirá esta noticia de " + RE.config.STATION_NAME + ":\n\n" + title + "\n\n" + url;

    buttons.forEach(function (btn) {
      var type = btn.getAttribute("data-share");
      var external = { whatsapp: "https://api.whatsapp.com/send?text=" + encodeURIComponent(msg),
        facebook: "https://www.facebook.com/sharer/sharer.php?u=" + encodeURIComponent(url),
        x: "https://twitter.com/intent/tweet?text=" + encodeURIComponent(title) + "&url=" + encodeURIComponent(url) }[type];
      if (external) {
        btn.href = external; btn.target = "_blank"; btn.rel = "noopener noreferrer"; btn.setAttribute("data-no-router", "");
        btn.addEventListener("click", function () { RE.track("article_share", { method: type }); });
      } else if (type === "copy") {
        var label = btn.querySelector(".share-text");
        btn.addEventListener("click", function () {
          function done(ok) {
            if (!ok) { window.prompt("Copiá el enlace:", url); return; }
            btn.setAttribute("data-copied", "true");
            if (label) label.textContent = "¡Enlace copiado!";
            setTimeout(function () { btn.removeAttribute("data-copied"); if (label) label.textContent = "Copiar enlace"; }, 2500);
            RE.track("article_share", { method: "copy" });
          }
          if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(url).then(function () { done(true); }, function () { done(false); });
          else done(false);
        });
      } else if (type === "native") {
        if (!navigator.share) { btn.hidden = true; return; }
        btn.addEventListener("click", function () {
          navigator.share({ title: title, url: url }).then(function () { RE.track("article_share", { method: "native" }); }, function () { /* cancelado */ });
        });
      }
    });
  }

  /* --- Tabs de días de la programación -------------------------------------- */
  function initDayTabs() {
    var tabs = Array.prototype.slice.call(document.querySelectorAll(".day-tab"));
    if (!tabs.length) return;
    function select(tab, focus) {
      tabs.forEach(function (t) { t.setAttribute("aria-selected", String(t === tab)); t.tabIndex = t === tab ? 0 : -1; });
      var target = tab.getAttribute("data-day");
      document.querySelectorAll(".schedule-list").forEach(function (l) { l.hidden = l.getAttribute("data-day") !== target; });
      if (focus) tab.focus();
    }
    tabs.forEach(function (tab, i) {
      tab.addEventListener("click", function () { select(tab, false); });
      tab.addEventListener("keydown", function (e) {
        if (e.key === "ArrowRight") { e.preventDefault(); select(tabs[(i + 1) % tabs.length], true); }
        if (e.key === "ArrowLeft") { e.preventDefault(); select(tabs[(i + tabs.length - 1) % tabs.length], true); }
      });
    });
    var today = RE.DAYS[RE.arNow().dayIndex];
    select(tabs.filter(function (t) { return t.getAttribute("data-day") === today; })[0] || tabs[0], false);
  }

  /* --- Programa al aire / siguiente / grilla de hoy ---------------------------- */
  function renderLive() {
    var s = RE.getSchedule();
    document.querySelectorAll("[data-live-current]").forEach(function (el) {
      el.innerHTML = s.current
        ? "<strong>" + RE.escapeHtml(s.current.nombre) + "</strong><span>" + RE.escapeHtml(s.current.horaInicio + " a " + s.current.horaFin) +
          (s.current.conductor ? " · " + RE.escapeHtml(s.current.conductor) : "") + "</span>"
        : "<strong>" + RE.escapeHtml(RE.config.STATION_NAME) + "</strong><span>Transmisión en vivo</span>";
    });
    document.querySelectorAll("[data-live-next]").forEach(function (el) {
      var wrap = el.closest("[data-live-next-wrap]") || el;
      if (!s.next) { wrap.hidden = true; return; }
      wrap.hidden = false;
      el.innerHTML = "<strong>" + RE.escapeHtml(s.next.nombre) + "</strong><span>" + RE.escapeHtml(s.next.horaInicio + " a " + s.next.horaFin) + "</span>";
    });
    document.querySelectorAll("[data-today-list]").forEach(function (ul) {
      var today = RE.DAYS[RE.arNow().dayIndex];
      var items = (window.RE_SCHEDULE || []).filter(function (p) { return (p.dias || []).indexOf(today) !== -1; })
        .sort(function (a, b) { return a.horaInicio.localeCompare(b.horaInicio); });
      if (!items.length) { ul.innerHTML = "<li class=\"empty-state\">No hay programas cargados para hoy.</li>"; return; }
      ul.innerHTML = items.map(function (p) {
        var on = s.current && s.current.nombre === p.nombre;
        return "<li class=\"today-item" + (on ? " is-current" : "") + "\"><span class=\"today-time\">" + RE.escapeHtml(p.horaInicio) + "</span><a href=\"" + RE.escapeHtml(p.url) + "\">" + RE.escapeHtml(p.nombre) + "</a>" + (on ? "<span class=\"tag-live\">AL AIRE</span>" : "") + "</li>";
      }).join("");
    });
  }

  /* --- Sponsors: vigencia (fechas de inicio y fin) --------------------------------- */
  function initSponsors() {
    var today = dayKey(new Date());
    document.querySelectorAll("[data-sponsor]").forEach(function (a) {
      var ini = (a.getAttribute("data-inicio") || "").slice(0, 10);
      var fin = (a.getAttribute("data-fin") || "").slice(0, 10);
      if ((ini && today < ini) || (fin && today > fin)) a.hidden = true;
    });
    document.querySelectorAll(".sponsor-slot").forEach(function (slot) {
      if (!slot.querySelector("[data-sponsor]:not([hidden])")) slot.hidden = true;
    });
  }

  RE.register("content", {
    init: function () {
      var y = document.getElementById("year");
      if (y) y.textContent = new Date().getFullYear();
    },
    page: function () {
      initSmartDates(); initShare(); initDayTabs(); initSponsors(); renderLive();
      clearInterval(liveTimer);
      if (document.querySelector("[data-live-current], [data-live-next], [data-today-list]")) liveTimer = setInterval(renderLive, 60000);
    }
  });
})();
