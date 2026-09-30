/* navigation.js — navegación parcial (el audio nunca se corta), menú móvil
   y marcado de la sección activa. Mejora progresiva: sin JavaScript cada
   enlace es una página completa y funciona igual. */
(function () {
  "use strict";
  var RE = window.RE;
  var main;

  function shouldBypass(link, e) {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return true;
    if (link.target === "_blank" || link.hasAttribute("download") || link.hasAttribute("data-no-router")) return true;
    if (link.origin !== window.location.origin) return true;
    var path = link.pathname;
    // Archivos y áreas que no son páginas del sitio
    if (/^\/admin(\/|$)/.test(path) || /\.(xml|json|webmanifest|pdf|zip|jpg|jpeg|png|webp|svg)$/i.test(path)) return true;
    // Ancla dentro de la misma página
    if (link.hash && path === window.location.pathname && link.search === window.location.search) return true;
    return false;
  }

  function onClick(e) {
    var link = e.target.closest("a[href]");
    if (!link || shouldBypass(link, e)) return;
    e.preventDefault();
    navigate(link.href, true);
  }

  function navigate(url, push) {
    fetch(url, { credentials: "same-origin" })
      .then(function (res) {
        var type = res.headers.get("content-type") || "";
        if (!res.ok || type.indexOf("text/html") === -1) throw new Error("no-html");
        return res.text();
      })
      .then(function (html) {
        var doc = new DOMParser().parseFromString(html, "text/html");
        var next = doc.getElementById("main-content");
        if (!next) throw new Error("sin-main");
        main.innerHTML = next.innerHTML;
        document.title = doc.title;
        syncHead(doc);
        markActive(url);
        if (push) history.pushState({ reUrl: url }, doc.title, url);
        window.scrollTo(0, 0);
        main.setAttribute("tabindex", "-1");
        main.focus({ preventScroll: true });
        document.body.classList.remove("nav-open");
        RE.runPage();
      })
      .catch(function () { window.location.href = url; }); // cualquier problema: navegación normal
  }
  RE.navigate = navigate;

  // Mantiene sincronizados description y canonical con la página actual
  function syncHead(doc) {
    [['meta[name="description"]', "content"], ['link[rel="canonical"]', "href"]].forEach(function (pair) {
      var a = doc.querySelector(pair[0]), b = document.querySelector(pair[0]);
      if (a && b) b.setAttribute(pair[1], a.getAttribute(pair[1]));
    });
  }

  function markActive(url) {
    var path = new URL(url, window.location.origin).pathname;
    document.querySelectorAll(".main-nav a, .subnav-list a, .mobile-nav a").forEach(function (a) {
      if (new URL(a.href, window.location.origin).pathname === path) a.setAttribute("aria-current", "page");
      else a.removeAttribute("aria-current");
    });
    var nav = document.getElementById("mobile-nav");
    var toggle = document.getElementById("nav-toggle");
    if (nav) nav.classList.remove("is-open");
    if (toggle) toggle.setAttribute("aria-expanded", "false");
  }

  RE.register("navigation", {
    init: function () {
      main = document.getElementById("main-content");
      if (!main) return;
      // La primera entrada del historial también necesita su estado para el botón "atrás"
      history.replaceState({ reUrl: window.location.href }, document.title, window.location.href);
      document.addEventListener("click", onClick);
      window.addEventListener("popstate", function (e) {
        if (e.state && e.state.reUrl) navigate(e.state.reUrl, false);
      });

      var toggle = document.getElementById("nav-toggle");
      var nav = document.getElementById("mobile-nav");
      if (toggle && nav) {
        toggle.addEventListener("click", function () {
          var open = nav.classList.toggle("is-open");
          toggle.setAttribute("aria-expanded", String(open));
        });
        document.addEventListener("keydown", function (e) {
          if (e.key === "Escape" && nav.classList.contains("is-open")) {
            nav.classList.remove("is-open");
            toggle.setAttribute("aria-expanded", "false");
            toggle.focus();
          }
        });
      }
    }
  });
})();
