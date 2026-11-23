/* motion.js — animaciones del sitio (reveal al scroll, título del hero,
   brillo en tarjetas, barra de carga, header compacto, progreso de lectura).
   Sólo se activa si la persona NO pidió "reducir movimiento". Si algo falla,
   el contenido queda visible: los estados ocultos los crea este mismo script. */
(function () {
  "use strict";
  var RE = window.RE;
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var canObserve = "IntersectionObserver" in window;
  var enabled = !reduce && canObserve;
  var observer = null;
  var navBar, readBar, progressTimer = null, scrollTicking = false, spotTicking = false;

  var REVEAL = [
    ".hero-copy > *", ".hero-onair", ".live-hero-inner > *", ".section-head", ".section-title",
    ".card", ".info-card", ".widget", ".schedule-item", ".today-item", ".search-item",
    ".local-strip", ".team-card", ".sponsor-tile", ".sponsor-slot-feed", ".sponsor-slot-noticia",
    ".article-header > *", ".ad-cta", ".check-list li", ".tapa-card", ".form-field"
  ].join(",");

  /* --- Aparición al hacer scroll ----------------------------------------- */
  function initReveal() {
    if (!enabled) return;
    var main = document.getElementById("main-content");
    if (!main) return;
    if (!observer) {
      observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (!en.isIntersecting) return;
          var el = en.target;
          observer.unobserve(el);
          el.classList.add("is-visible");
          // Al terminar, se quita el estado de animación para que el hover funcione normal
          var delay = parseInt((el.style.getPropertyValue("--reveal-delay") || "0"), 10) || 0;
          setTimeout(function () { el.removeAttribute("data-reveal"); el.classList.remove("is-visible"); el.style.removeProperty("--reveal-delay"); }, delay + 750);
        });
      }, { rootMargin: "0px 0px -6% 0px", threshold: 0.06 });
    }
    var groups = new Map();
    main.querySelectorAll(REVEAL).forEach(function (el) {
      if (el.hasAttribute("data-reveal") || el.closest("[hidden]")) return;
      var parent = el.parentElement;
      var i = groups.get(parent) || 0;
      groups.set(parent, i + 1);
      el.style.setProperty("--reveal-delay", Math.min(i, 6) * 70 + "ms");
      el.setAttribute("data-reveal", "");
      observer.observe(el);
    });
  }

  /* --- Título del hero: palabra por palabra ------------------------------- */
  function splitTitles() {
    if (!enabled) return;
    document.querySelectorAll("[data-split]:not([data-split-done])").forEach(function (el) {
      var full = el.textContent.replace(/\s+/g, " ").trim();
      var nodes = Array.prototype.slice.call(el.childNodes);
      var frag = document.createDocumentFragment();
      var n = 0;
      function word(content, isBlock) {
        var w = document.createElement("span");
        w.className = "split-word" + (isBlock ? " is-block" : "");
        w.setAttribute("aria-hidden", "true");
        var inner = document.createElement("span");
        inner.className = "split-in";
        inner.style.setProperty("--i", n++);
        if (typeof content === "string") inner.textContent = content;
        else { inner.className += " " + content.className; inner.innerHTML = content.innerHTML; }
        w.appendChild(inner);
        return w;
      }
      nodes.forEach(function (node) {
        if (node.nodeType === 3) {
          node.textContent.split(/\s+/).filter(Boolean).forEach(function (t) {
            frag.appendChild(word(t, false));
            frag.appendChild(document.createTextNode(" "));
          });
        } else if (node.nodeType === 1) {
          frag.appendChild(word(node, window.getComputedStyle(node).display === "block"));
        }
      });
      el.setAttribute("aria-label", full);
      el.textContent = "";
      el.appendChild(frag);
      el.setAttribute("data-split-done", "");
    });
  }

  /* --- Brillo que sigue al cursor en las tarjetas ---------------------------- */
  function initSpotlight() {
    if (!enabled || !window.matchMedia("(hover: hover)").matches) return;
    document.addEventListener("pointermove", function (e) {
      var card = e.target.closest && e.target.closest(".card");
      if (!card || spotTicking) return;
      spotTicking = true;
      requestAnimationFrame(function () {
        var r = card.getBoundingClientRect();
        card.style.setProperty("--mx", (e.clientX - r.left) + "px");
        card.style.setProperty("--my", (e.clientY - r.top) + "px");
        spotTicking = false;
      });
    }, { passive: true });
  }

  /* --- Barra de carga entre secciones y fundido de contenido ---------------- */
  var motionApi = {
    navStart: function (main) {
      if (reduce || !navBar) return;
      if (main) main.classList.add("is-leaving");
      clearTimeout(progressTimer);
      navBar.className = "nav-progress";
      void navBar.offsetWidth; // reinicia la transición
      navBar.className = "nav-progress is-active";
    },
    navDone: function (main) {
      if (reduce || !navBar) return;
      if (main) {
        main.classList.remove("is-leaving");
        main.classList.add("is-entering");
        setTimeout(function () { main.classList.remove("is-entering"); }, 400);
      }
      navBar.className = "nav-progress is-done";
      progressTimer = setTimeout(function () { navBar.className = "nav-progress"; }, 650);
    },
    navFail: function (main) { if (main) main.classList.remove("is-leaving"); if (navBar) navBar.className = "nav-progress"; }
  };
  RE.motion = motionApi;

  /* --- Scroll: header compacto + progreso de lectura -------------------------- */
  function onScroll() {
    var y = window.pageYOffset || document.documentElement.scrollTop;
    document.documentElement.classList.toggle("is-scrolled", y > 24);
    if (readBar && readBar.dataset.on === "1") {
      var max = document.documentElement.scrollHeight - window.innerHeight;
      readBar.style.transform = "scaleX(" + (max > 0 ? Math.min(1, y / max) : 0) + ")";
    }
  }
  function initReadProgress() {
    if (!readBar) return;
    readBar.dataset.on = document.querySelector("[data-article]") ? "1" : "0";
    readBar.style.display = readBar.dataset.on === "1" ? "" : "none";
    onScroll();
  }

  RE.register("motion", {
    init: function () {
      document.addEventListener("visibilitychange", function () {
        document.documentElement.classList.toggle("tab-hidden", document.hidden);
      });
      // Menú móvil: índice para el escalonado
      document.querySelectorAll("#mobile-nav li").forEach(function (li, i) { li.style.setProperty("--i", Math.min(i, 14)); });

      if (reduce) return;
      navBar = document.createElement("div"); navBar.className = "nav-progress"; navBar.setAttribute("aria-hidden", "true");
      readBar = document.createElement("div"); readBar.className = "read-progress"; readBar.setAttribute("aria-hidden", "true");
      document.body.appendChild(navBar); document.body.appendChild(readBar);
      if (enabled) document.documentElement.classList.add("motion-ready");
      window.addEventListener("scroll", function () { if (!scrollTicking) { scrollTicking = true; requestAnimationFrame(function () { onScroll(); scrollTicking = false; }); } }, { passive: true });
      initSpotlight();
    },
    page: function () {
      splitTitles();
      initReveal();
      initReadProgress();
    }
  });
})();
