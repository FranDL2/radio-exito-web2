/* search.js — buscador de noticias sin dependencias.
   Usa /search-index.json (generado en el build) y busca en título,
   contenido, categoría y etiquetas, ignorando mayúsculas y acentos. */
(function () {
  "use strict";
  var RE = window.RE;
  var indexPromise = null;

  function norm(s) {
    return String(s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  }
  function loadIndex() {
    if (!indexPromise) {
      indexPromise = fetch("/search-index.json").then(function (r) {
        if (!r.ok) throw new Error("HTTP " + r.status);
        return r.json();
      });
    }
    return indexPromise;
  }

  function score(item, tokens) {
    var t = norm(item.title), c = norm(item.categoria), tags = norm((item.etiquetas || []).join(" ")), body = norm(item.text);
    var total = 0;
    for (var i = 0; i < tokens.length; i++) {
      var k = tokens[i], hit = 0;
      if (t.indexOf(k) !== -1) hit += 10;
      if (tags.indexOf(k) !== -1) hit += 6;
      if (c.indexOf(k) !== -1) hit += 4;
      if (body.indexOf(k) !== -1) hit += 2;
      if (!hit) return 0; // todas las palabras deben aparecer en algún campo
      total += hit;
    }
    return total;
  }

  function highlight(text, tokens) {
    var safe = RE.escapeHtml(text);
    tokens.forEach(function (k) {
      if (k.length < 2) return;
      try {
        var re = new RegExp("(" + k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + ")", "gi");
        safe = safe.replace(re, "<mark>$1</mark>");
      } catch (e) { /* ignorar */ }
    });
    return safe;
  }

  function render(box, statusEl, q, results, tokens) {
    if (!q) { statusEl.textContent = ""; box.innerHTML = ""; return; }
    statusEl.textContent = results.length
      ? "Resultados para “" + q + "” — " + results.length + (results.length === 1 ? " resultado" : " resultados")
      : "No encontramos resultados para “" + q + "”.";
    if (!results.length) {
      box.innerHTML = "<p class=\"empty-state\">Probá con otras palabras o revisá las secciones del menú.</p>";
      return;
    }
    box.innerHTML = results.slice(0, 40).map(function (r) {
      return "<li class=\"search-item\"><a href=\"" + RE.escapeHtml(r.url) + "\"><span class=\"card-tag\">" + RE.escapeHtml(r.categoria) + "</span>" +
        "<h3>" + highlight(r.title, tokens) + "</h3>" +
        (r.resumen ? "<p>" + highlight(r.resumen, tokens) + "</p>" : "") +
        "<time datetime=\"" + RE.escapeHtml(r.date) + "\">" + RE.escapeHtml(r.fecha) + "</time></a></li>";
    }).join("");
  }

  function run(input, box, statusEl) {
    var q = input.value.trim();
    var tokens = norm(q).split(/\s+/).filter(Boolean);
    if (!tokens.length) { render(box, statusEl, "", [], []); return; }
    statusEl.textContent = "Buscando…";
    loadIndex().then(function (items) {
      var results = items.map(function (it) { return { it: it, s: score(it, tokens) }; })
        .filter(function (x) { return x.s > 0; })
        .sort(function (a, b) { return b.s - a.s || (b.it.date > a.it.date ? 1 : -1); })
        .map(function (x) { return x.it; });
      render(box, statusEl, q, results, tokens);
    }).catch(function () {
      statusEl.textContent = "No pudimos realizar la búsqueda en este momento. Intentá nuevamente más tarde.";
      box.innerHTML = "";
    });
  }

  RE.register("search", {
    page: function () {
      var form = document.getElementById("search-form");
      if (!form) return;
      var input = document.getElementById("search-input");
      var box = document.getElementById("search-results");
      var statusEl = document.getElementById("search-status");
      var params = new URLSearchParams(window.location.search);
      if (params.get("q")) { input.value = params.get("q"); run(input, box, statusEl); }
      form.addEventListener("submit", function (e) {
        e.preventDefault();
        var q = input.value.trim();
        var url = new URL(window.location.href);
        if (q) url.searchParams.set("q", q); else url.searchParams.delete("q");
        history.replaceState({ reUrl: url.href }, "", url.href);
        run(input, box, statusEl);
      });
    }
  });
})();
