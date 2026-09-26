/* ==========================================================================
   RADIO ÉXITO 105.1 — main.js
   - Reproductor persistente (no se corta al navegar)
   - Router liviano de navegación parcial (progressive enhancement)
   - Banner de consentimiento de cookies
   - Widget de cotización del dólar (API pública, sin key)
   - Menú móvil y validación de formulario de contacto
   ========================================================================== */

(function () {
  "use strict";

  /* ------------------------------------------------------------------ *
   * 1. CONFIGURACIÓN
   * Los valores reales vienen inyectados desde las plantillas (ver
   * src/_includes/layouts/base.njk), que a su vez leen de
   * src/_data/site.json — así el stream se puede cambiar sin tocar JS.
   * ------------------------------------------------------------------ */
  var SITE = window.SITE_CONFIG || {};
  var CONFIG = {
    STREAM_URL: SITE.streamUrl || "",
    STATION_NAME: (SITE.nombre || "Radio Éxito") + " " + (SITE.frecuencia || ""),
    RECONNECT_ATTEMPTS: 6,
    RECONNECT_BASE_DELAY_MS: 2000,
    GA_MEASUREMENT_ID: SITE.gaId || "",
    DOLAR_API: "https://api.argentinadatos.com/v1/cotizaciones/dolares"
  };

  /* ------------------------------------------------------------------ *
   * 2. REPRODUCTOR PERSISTENTE
   * ------------------------------------------------------------------ */
  var Player = (function () {
    var audio, toggleBtn, statusText, errorText, volumeInput;
    var reconnectAttempts = 0;
    var reconnectTimer = null;
    var userPaused = true;

    function init() {
      audio = document.getElementById("radio-audio");
      toggleBtn = document.getElementById("player-toggle");
      statusText = document.getElementById("player-status-text");
      errorText = document.getElementById("player-error");
      volumeInput = document.getElementById("player-volume");
      if (!audio || !toggleBtn) return;

      audio.preload = "none";

      // Aviso de contenido mixto: si la página es HTTPS y el stream es HTTP,
      // la mayoría de los navegadores bloquea la reproducción por seguridad.
      var mixedContent =
        window.location.protocol === "https:" &&
        CONFIG.STREAM_URL.indexOf("http://") === 0;
      if (mixedContent) {
        setStatus("El servidor de streaming necesita HTTPS");
        document.body.classList.add("player-has-error");
        if (errorText) {
          errorText.textContent =
            "El stream usa HTTP y esta página HTTPS; el navegador puede bloquearlo. Pedile a tu proveedor de streaming una URL con HTTPS.";
        }
      }

      var savedVolume = parseFloat(localStorage.getItem("re_volume"));
      audio.volume = isNaN(savedVolume) ? 0.85 : savedVolume;
      if (volumeInput) volumeInput.value = audio.volume;

      toggleBtn.addEventListener("click", togglePlay);
      if (volumeInput) {
        volumeInput.addEventListener("input", function () {
          audio.volume = parseFloat(volumeInput.value);
          localStorage.setItem("re_volume", String(audio.volume));
        });
      }

      audio.addEventListener("playing", function () {
        reconnectAttempts = 0;
        clearError();
        setPlayingUI(true);
      });
      audio.addEventListener("pause", function () { setPlayingUI(false); });
      audio.addEventListener("waiting", function () { setStatus("Conectando…"); });
      audio.addEventListener("error", handleStreamError);
      audio.addEventListener("stalled", handleStreamError);

      document.querySelectorAll("[data-play-stream]").forEach(function (btn) {
        btn.addEventListener("click", function (e) {
          e.preventDefault();
          play();
        });
      });
    }

    function setPlayingUI(isPlaying) {
      document.body.classList.toggle("is-playing", isPlaying);
      toggleBtn.setAttribute("aria-pressed", String(isPlaying));
      toggleBtn.setAttribute("aria-label", isPlaying ? "Pausar transmisión en vivo" : "Reproducir transmisión en vivo");
      toggleBtn.innerHTML = isPlaying ? iconPause() : iconPlay();
      setStatus(isPlaying ? "En vivo ahora" : "En pausa");
    }

    function setStatus(text) { if (statusText) statusText.textContent = text; }
    function clearError() {
      document.body.classList.remove("player-has-error");
      if (errorText) errorText.textContent = "";
    }

    function handleStreamError() {
      if (userPaused) return;
      document.body.classList.add("player-has-error");
      if (errorText) {
        errorText.textContent =
          reconnectAttempts < CONFIG.RECONNECT_ATTEMPTS
            ? "Señal interrumpida. Reconectando…"
            : "No pudimos reconectar. Probá reproducir de nuevo.";
      }
      setPlayingUI(false);
      attemptReconnect();
    }

    function attemptReconnect() {
      if (reconnectAttempts >= CONFIG.RECONNECT_ATTEMPTS) return;
      reconnectAttempts += 1;
      var delay = CONFIG.RECONNECT_BASE_DELAY_MS * reconnectAttempts;
      clearTimeout(reconnectTimer);
      reconnectTimer = setTimeout(function () {
        if (!userPaused) { audio.load(); play(true); }
      }, delay);
    }

    function play(isReconnect) {
      if (!CONFIG.STREAM_URL) {
        setStatus("Stream no configurado");
        return;
      }
      if (!isReconnect) reconnectAttempts = 0;
      userPaused = false;
      if (!isReconnect && audio.getAttribute("data-loaded") !== "1") {
        audio.src = CONFIG.STREAM_URL;
        audio.setAttribute("data-loaded", "1");
      }
      var p = audio.play();
      if (p && p.catch) {
        p.catch(function () {
          setStatus("Tocá para escuchar");
          setPlayingUI(false);
        });
      }
    }

    function pause() {
      userPaused = true;
      clearTimeout(reconnectTimer);
      audio.pause();
    }

    function togglePlay() {
      if (audio.paused) play(); else pause();
    }

    function iconPlay() {
      return '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>';
    }
    function iconPause() {
      return '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M6 5h4v14H6zM14 5h4v14h-4z"/></svg>';
    }

    return { init: init };
  })();

  /* ------------------------------------------------------------------ *
   * 3. ROUTER DE NAVEGACIÓN PARCIAL
   * ------------------------------------------------------------------ */
  var Router = (function () {
    var main;

    function init() {
      main = document.getElementById("main-content");
      if (!main) return;
      document.addEventListener("click", onClick);
      window.addEventListener("popstate", function (e) {
        if (e.state && e.state.reUrl) navigate(e.state.reUrl, false);
      });
    }

    function onClick(e) {
      var link = e.target.closest("a");
      if (!link) return;
      if (
        e.defaultPrevented || e.button !== 0 ||
        e.metaKey || e.ctrlKey || e.shiftKey || e.altKey ||
        link.target === "_blank" || link.hasAttribute("download") ||
        link.origin !== window.location.origin || link.hasAttribute("data-no-router")
      ) return;
      e.preventDefault();
      navigate(link.href, true);
    }

    function navigate(url, pushState) {
      fetch(url, { credentials: "same-origin" })
        .then(function (res) {
          if (!res.ok) throw new Error("Respuesta no válida");
          return res.text();
        })
        .then(function (html) {
          var doc = new DOMParser().parseFromString(html, "text/html");
          var newMain = doc.getElementById("main-content");
          if (!newMain) { window.location.href = url; return; }
          main.innerHTML = newMain.innerHTML;
          document.title = doc.title;
          updateMeta(doc);
          updateActiveNav(url);
          if (pushState) history.pushState({ reUrl: url }, doc.title, url);
          window.scrollTo({ top: 0, behavior: "instant" in window ? "instant" : "auto" });
          main.setAttribute("tabindex", "-1");
          main.focus({ preventScroll: true });
          document.dispatchEvent(new CustomEvent("re:pagechange"));
        })
        .catch(function () { window.location.href = url; });
    }

    function updateMeta(doc) {
      var newDesc = doc.querySelector('meta[name="description"]');
      var curDesc = document.querySelector('meta[name="description"]');
      if (newDesc && curDesc) curDesc.setAttribute("content", newDesc.getAttribute("content"));
    }

    function updateActiveNav(url) {
      var path = new URL(url, window.location.origin).pathname;
      document.querySelectorAll(".subnav-list a, .mobile-nav a").forEach(function (a) {
        var isCurrent = new URL(a.href, window.location.origin).pathname === path;
        if (isCurrent) a.setAttribute("aria-current", "page");
        else a.removeAttribute("aria-current");
      });
      var nav = document.getElementById("mobile-nav");
      if (nav) nav.classList.remove("is-open");
    }

    return { init: init };
  })();

  /* ------------------------------------------------------------------ *
   * 4. CONSENTIMIENTO DE COOKIES
   * ------------------------------------------------------------------ */
  var CookieConsent = (function () {
    var STORAGE_KEY = "re_cookie_consent";
    var banner, acceptBtn, rejectBtn;

    function init() {
      banner = document.getElementById("cookie-banner");
      acceptBtn = document.getElementById("cookie-accept");
      rejectBtn = document.getElementById("cookie-reject");
      if (!banner) return;

      var saved = getConsent();
      if (!saved) banner.classList.add("is-visible");
      else if (saved.analytics) loadAnalytics();

      if (acceptBtn) acceptBtn.addEventListener("click", function () {
        setConsent(true); hideBanner(); loadAnalytics();
      });
      if (rejectBtn) rejectBtn.addEventListener("click", function () {
        setConsent(false); hideBanner();
      });
    }

    function getConsent() {
      try {
        var raw = localStorage.getItem(STORAGE_KEY);
        return raw ? JSON.parse(raw) : null;
      } catch (e) { return null; }
    }
    function setConsent(analytics) {
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ analytics: analytics, ts: Date.now() })); }
      catch (e) { /* localStorage no disponible */ }
    }
    function hideBanner() { banner.classList.remove("is-visible"); }

    function loadAnalytics() {
      if (!CONFIG.GA_MEASUREMENT_ID || window.__gaLoaded) return;
      window.__gaLoaded = true;
      var s = document.createElement("script");
      s.async = true;
      s.src = "https://www.googletagmanager.com/gtag/js?id=" + CONFIG.GA_MEASUREMENT_ID;
      document.head.appendChild(s);
      window.dataLayer = window.dataLayer || [];
      function gtag() { window.dataLayer.push(arguments); }
      window.gtag = gtag;
      gtag("js", new Date());
      gtag("config", CONFIG.GA_MEASUREMENT_ID, { anonymize_ip: true });
    }

    return { init: init };
  })();

  /* ------------------------------------------------------------------ *
   * 5. MENÚ MÓVIL
   * ------------------------------------------------------------------ */
  function initMobileNav() {
    var toggle = document.getElementById("nav-toggle");
    var nav = document.getElementById("mobile-nav");
    if (!toggle || !nav) return;
    toggle.addEventListener("click", function () {
      var isOpen = nav.classList.toggle("is-open");
      toggle.setAttribute("aria-expanded", String(isOpen));
    });
  }

  /* ------------------------------------------------------------------ *
   * 6. WIDGET DE COTIZACIÓN DEL DÓLAR
   * Consume una API pública argentina, sin necesidad de API key ni de
   * que nadie actualice el valor a mano. Si falla, degrada con gracia.
   * ------------------------------------------------------------------ */
  function initDollarWidget() {
    var widget = document.getElementById("dolar-widget");
    if (!widget) return;
    var body = widget.querySelector("[data-dolar-body]");
    if (!body) return;

    fetch(CONFIG.DOLAR_API)
      .then(function (res) {
        if (!res.ok) throw new Error("No disponible");
        return res.json();
      })
      .then(function (data) {
        var oficial = data.find(function (d) { return d.casa === "oficial"; });
        var blue = data.find(function (d) { return d.casa === "blue"; });
        if (!oficial && !blue) throw new Error("Sin datos");

        var rows = "";
        if (oficial) rows += fila("Oficial", oficial.compra, oficial.venta);
        if (blue) rows += fila("Blue", blue.compra, blue.venta);

        body.innerHTML =
          '<table class="dollar-table"><thead><tr><th>Tipo</th><th>Compra</th><th>Venta</th></tr></thead><tbody>' +
          rows + "</tbody></table>" +
          '<p class="dollar-updated">Fuente: ArgentinaDatos · actualizado al cargar la página</p>';
      })
      .catch(function () {
        body.innerHTML =
          '<p class="dollar-fallback">No pudimos cargar la cotización en este momento. ' +
          '<a href="https://www.ambito.com/contenidos/dolar.html" target="_blank" rel="noopener noreferrer" data-no-router>Consultar el valor del dólar</a>.</p>';
      });

    function fila(nombre, compra, venta) {
      return "<tr><td>" + nombre + "</td><td>$" + formatear(compra) + "</td><td>$" + formatear(venta) + "</td></tr>";
    }
    function formatear(n) {
      if (typeof n !== "number") return "—";
      return n.toLocaleString("es-AR", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
    }
  }

  /* ------------------------------------------------------------------ *
   * 7. FORMULARIO DE CONTACTO
   * Si el sitio está desplegado en Netlify y el <form> tiene el atributo
   * data-netlify="true" (ver contacto.njk), el envío se hace de verdad
   * mediante el endpoint de Netlify Forms — sin backend propio. Si se
   * despliega en otro hosting, ver el TODO más abajo.
   * ------------------------------------------------------------------ */
  function initContactForm() {
    var form = document.getElementById("contact-form");
    if (!form) return;
    var status = document.getElementById("form-status");

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var consent = form.querySelector("#contact-consent");
      if (!form.checkValidity()) { form.reportValidity(); return; }
      if (consent && !consent.checked) {
        setStatus("Debés aceptar la Política de Privacidad para enviar el mensaje.", "error");
        consent.focus();
        return;
      }

      if (form.hasAttribute("data-netlify")) {
        var body = new URLSearchParams(new FormData(form)).toString();
        fetch("/", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: body
        })
          .then(function () {
            setStatus("¡Gracias! Recibimos tu mensaje y te vamos a responder a la brevedad.", "success");
            form.reset();
          })
          .catch(function () {
            setStatus("No pudimos enviar el mensaje. Probá de nuevo o escribinos por WhatsApp.", "error");
          });
        return;
      }

      // TODO(desarrollador): si NO se despliega en Netlify, conectar acá un
      // backend propio o un servicio de formularios (Formspree, Web3Forms).
      // Ver README.md, sección "Formulario de contacto".
      setStatus("¡Gracias! Recibimos tu mensaje y te vamos a responder a la brevedad.", "success");
      form.reset();
    });

    function setStatus(text, state) {
      if (!status) return;
      status.textContent = text;
      status.setAttribute("data-state", state);
    }
  }

  /* ------------------------------------------------------------------ *
   * Arranque
   * ------------------------------------------------------------------ */
  function boot() {
    Player.init();
    Router.init();
    CookieConsent.init();
    initMobileNav();
    initDollarWidget();
    initContactForm();
  }

  document.addEventListener("re:pagechange", function () {
    initDollarWidget();
    initContactForm();
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
