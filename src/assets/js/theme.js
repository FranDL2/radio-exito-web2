/* theme.js — selector de tema: claro / oscuro / según el sistema.
   El script anti-parpadeo vive en el <head> de base.njk; acá sólo se
   gestiona el botón y se mantiene todo sincronizado. */
(function () {
  "use strict";
  var KEY = "radioexito-theme";
  var ICONS = { system: "🖥️", light: "☀️", dark: "🌙" };
  var LABELS = {
    system: "Tema: según el sistema. Tocar para cambiar a claro.",
    light: "Tema: claro. Tocar para cambiar a oscuro.",
    dark: "Tema: oscuro. Tocar para cambiar a automático."
  };
  var ORDER = ["system", "light", "dark"];
  var btn, iconEl;

  function getMode() {
    try { return localStorage.getItem(KEY) || "system"; } catch (e) { return "system"; }
  }
  function systemLight() {
    return !!(window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches);
  }
  function apply(mode) {
    var effective = mode === "system" ? (systemLight() ? "light" : "dark") : mode;
    document.documentElement.setAttribute("data-theme", effective);
    document.documentElement.setAttribute("data-theme-mode", mode);
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", effective === "light" ? "#f6f6f6" : "#0b0b0c");
    if (btn) {
      if (iconEl) iconEl.textContent = ICONS[mode];
      btn.setAttribute("aria-label", LABELS[mode]);
      btn.setAttribute("title", LABELS[mode]);
    }
  }
  function cycle() {
    var next = ORDER[(ORDER.indexOf(getMode()) + 1) % ORDER.length];
    try { localStorage.setItem(KEY, next); } catch (e) { /* no persiste */ }
    apply(next);
  }

  window.RE.register("theme", {
    init: function () {
      btn = document.getElementById("theme-toggle");
      if (!btn) return;
      iconEl = btn.querySelector(".theme-toggle-icon");
      apply(getMode());
      btn.addEventListener("click", cycle);
      if (window.matchMedia) {
        var mq = window.matchMedia("(prefers-color-scheme: light)");
        var onChange = function () { if (getMode() === "system") apply("system"); };
        if (mq.addEventListener) mq.addEventListener("change", onChange);
        else if (mq.addListener) mq.addListener(onChange);
      }
    }
  });
})();
