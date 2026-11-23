/* analytics.js — consentimiento de cookies + Google Analytics 4 (opcional).
   Nada de analítica se carga hasta que la persona acepta. Eventos:
   radio_play, radio_pause, radio_mute, article_view, article_share,
   whatsapp_click, sponsor_click, contact_submit. */
(function () {
  "use strict";
  var KEY = "re_cookie_consent";
  var banner;
  var gaReady = false;

  function getConsent() {
    try { var r = localStorage.getItem(KEY); return r ? JSON.parse(r) : null; } catch (e) { return null; }
  }
  function setConsent(analytics) {
    try { localStorage.setItem(KEY, JSON.stringify({ analytics: analytics, ts: Date.now() })); } catch (e) { /* ignorar */ }
  }
  function show() { if (banner) banner.classList.add("is-visible"); }
  function hide() { if (banner) banner.classList.remove("is-visible"); }

  function loadGA() {
    var id = window.RE.config.GA_ID;
    if (!id || gaReady) return;
    gaReady = true;
    var s = document.createElement("script");
    s.async = true;
    s.src = "https://www.googletagmanager.com/gtag/js?id=" + encodeURIComponent(id);
    document.head.appendChild(s);
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag("js", new Date());
    // page_view manual: también se envía en cada navegación interna del router
    window.gtag("config", id, { anonymize_ip: true, send_page_view: false });
    pageView();
  }

  function pageView() {
    if (!gaReady || !window.gtag) return;
    window.gtag("event", "page_view", {
      page_location: window.location.href,
      page_title: document.title
    });
  }

  // Registro de eventos: no hace nada si no hay consentimiento o GA no está activo
  window.RE.track = function (name, params) {
    if (!gaReady || !window.gtag) return;
    window.gtag("event", name, params || {});
  };

  window.RE.register("analytics", {
    init: function () {
      banner = document.getElementById("cookie-banner");
      var accept = document.getElementById("cookie-accept");
      var reject = document.getElementById("cookie-reject");
      var saved = getConsent();
      if (!saved) show();
      else if (saved.analytics) loadGA();

      if (accept) accept.addEventListener("click", function () { setConsent(true); hide(); loadGA(); });
      if (reject) reject.addEventListener("click", function () { setConsent(false); hide(); });

      // Enlace "Preferencias de cookies" del footer: vuelve a mostrar el aviso
      document.addEventListener("click", function (e) {
        if (e.target.closest("[data-cookie-settings]")) { e.preventDefault(); show(); }
        var wa = e.target.closest('a[href*="wa.me"], a[href*="api.whatsapp.com"]');
        if (wa && !wa.hasAttribute("data-share")) window.RE.track("whatsapp_click", { link_url: wa.href });
        var sp = e.target.closest("a[data-sponsor]");
        if (sp) window.RE.track("sponsor_click", { sponsor: sp.getAttribute("data-sponsor") });
      });
    },
    page: function () {
      // Primera carga: pageView ya se envió en loadGA(). En navegaciones internas, se envía acá.
      if (this._first === undefined) { this._first = true; }
      else pageView();
      var art = document.querySelector("[data-article]");
      if (art) {
        window.RE.track("article_view", {
          article_title: art.getAttribute("data-title") || document.title,
          article_category: art.getAttribute("data-category") || ""
        });
      }
    }
  });
})();
