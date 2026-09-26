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

  // Si la página es HTTPS y hay una URL segura configurada (streamUrlSSL),
  // se usa esa. Si no hay ninguna configurada, se usa la URL original tal
  // cual venga (HTTP incluido), y el reproductor detecta más abajo si el
  // navegador la va a bloquear por contenido mixto.
  var pageIsHttps = window.location.protocol === "https:";
  var effectiveStreamUrl = SITE.streamUrl || "";
  if (pageIsHttps && SITE.streamUrlSSL) {
    effectiveStreamUrl = SITE.streamUrlSSL;
  }

  var CONFIG = {
    STREAM_URL: effectiveStreamUrl,
    STATION_NAME: (SITE.nombre || "Radio Éxito") + " " + (SITE.frecuencia || ""),
    RECONNECT_ATTEMPTS: 6,
    RECONNECT_BASE_DELAY_MS: 2000,
    GA_MEASUREMENT_ID: SITE.gaId || "",
    DOLAR_API: "https://dolarapi.com/v1/ambito/dolares",
    // true cuando el navegador va a bloquear el audio por "contenido mixto"
    // (página HTTPS pidiendo un recurso HTTP): en ese caso reintentar no
    // sirve de nada, es una política de seguridad del navegador, no un corte
    // de señal real.
    MIXED_CONTENT_BLOCKED: pageIsHttps && effectiveStreamUrl.indexOf("http://") === 0
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
      // el navegador bloquea la reproducción por política de seguridad y
      // NINGÚN reintento la va a destrabar — hay que avisarlo tal cual es,
      // en vez de fingir una reconexión que nunca va a funcionar.
      if (CONFIG.MIXED_CONTENT_BLOCKED) {
        setStatus("El navegador bloquea este stream (HTTP en sitio HTTPS)");
        document.body.classList.add("player-has-error");
        if (errorText) {
          errorText.textContent =
            "Tu proveedor de streaming entrega el audio por HTTP y este sitio es HTTPS: el navegador lo bloquea por seguridad, no es un corte de señal. Hace falta una URL de streaming con HTTPS (pedirla al proveedor, o usar el proxy de streaming-proxy/) y cargarla en \"URL segura del stream\" desde /admin.";
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

      if (CONFIG.MIXED_CONTENT_BLOCKED) {
        // Ya se explicó el motivo real en init(); no tiene sentido reintentar.
        setPlayingUI(false);
        return;
      }

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
      if (CONFIG.MIXED_CONTENT_BLOCKED) return;
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
   * Usa dolarapi.com (vía Ámbito Financiero): devuelve SIEMPRE el último
   * valor vigente por casa de cambio (no un historial), con variación
   * porcentual y fecha de actualización incluidas. La versión anterior
   * consultaba un endpoint histórico y podía mostrar un valor viejo;
   * este es el endpoint correcto para "cotización actual".
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
        if (oficial) rows += fila("Oficial", oficial);
        if (blue) rows += fila("Blue", blue);

        var masReciente = [oficial, blue].filter(Boolean).sort(function (a, b) {
          return new Date(b.fechaActualizacion) - new Date(a.fechaActualizacion);
        })[0];

        body.innerHTML =
          '<table class="dollar-table"><thead><tr><th>Tipo</th><th>Compra</th><th>Venta</th><th>Var.</th></tr></thead><tbody>' +
          rows + "</tbody></table>" +
          '<p class="dollar-updated">Última actualización: ' + formatearFecha(masReciente && masReciente.fechaActualizacion) + ' · Fuente: Ámbito Financiero (vía dolarapi.com)</p>';
      })
      .catch(function () {
        body.innerHTML =
          '<p class="dollar-fallback">No pudimos cargar la cotización en este momento. ' +
          '<a href="https://www.ambito.com/contenidos/dolar.html" target="_blank" rel="noopener noreferrer" data-no-router>Consultar el valor del dólar</a>.</p>';
      });

    function fila(nombre, d) {
      var variacion = typeof d.variacion === "number" ? d.variacion : null;
      var claseVar = variacion === null ? "" : (variacion > 0 ? "up" : (variacion < 0 ? "down" : ""));
      var signo = variacion !== null && variacion > 0 ? "+" : "";
      var textoVar = variacion === null ? "—" : signo + variacion.toLocaleString("es-AR", { maximumFractionDigits: 2 }) + "%";
      return "<tr><td>" + nombre + "</td><td>$" + formatearMonto(d.compra) + "</td><td>$" + formatearMonto(d.venta) +
        '</td><td><span class="dollar-variation ' + claseVar + '">' + textoVar + "</span></td></tr>";
    }
    function formatearMonto(n) {
      if (typeof n !== "number") return "—";
      return n.toLocaleString("es-AR", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
    }
    function formatearFecha(iso) {
      if (!iso) return "—";
      try {
        return new Intl.DateTimeFormat("es-AR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
      } catch (e) { return "—"; }
    }
  }

  /* ------------------------------------------------------------------ *
   * 6b. WIDGET DEL TIEMPO (La Cruz, Corrientes)
   * Usa Open-Meteo (API pública, sin key) para mostrar el clima actual
   * y el pronóstico del día de forma automática. No reproducimos el
   * contenido de Meteored (evitamos problemas de derechos de autor y
   * de scraping); en su lugar, enlazamos a su pronóstico extendido.
   * ------------------------------------------------------------------ */
  var WEATHER_CODES = {
    0: ["Despejado", "☀️"], 1: ["Mayormente despejado", "🌤️"], 2: ["Parcialmente nublado", "⛅"], 3: ["Nublado", "☁️"],
    45: ["Niebla", "🌫️"], 48: ["Niebla escarchada", "🌫️"],
    51: ["Llovizna débil", "🌦️"], 53: ["Llovizna", "🌦️"], 55: ["Llovizna intensa", "🌧️"],
    56: ["Llovizna helada", "🌧️"], 57: ["Llovizna helada intensa", "🌧️"],
    61: ["Lluvia débil", "🌧️"], 63: ["Lluvia", "🌧️"], 65: ["Lluvia intensa", "🌧️"],
    66: ["Lluvia helada", "🌧️"], 67: ["Lluvia helada intensa", "🌧️"],
    71: ["Nevada débil", "🌨️"], 73: ["Nevada", "🌨️"], 75: ["Nevada intensa", "🌨️"], 77: ["Granizo pequeño", "🌨️"],
    80: ["Chubascos débiles", "🌦️"], 81: ["Chubascos", "🌦️"], 82: ["Chubascos intensos", "⛈️"],
    85: ["Chubascos de nieve", "🌨️"], 86: ["Chubascos de nieve intensos", "🌨️"],
    95: ["Tormenta eléctrica", "⛈️"], 96: ["Tormenta con granizo", "⛈️"], 99: ["Tormenta fuerte con granizo", "⛈️"]
  };

  function initWeatherWidget() {
    var widget = document.getElementById("clima-widget");
    if (!widget) return;
    var body = widget.querySelector("[data-clima-body]");
    if (!body) return;

    var lat = -29.19, lon = -56.64; // La Cruz, Corrientes
    var url = "https://api.open-meteo.com/v1/forecast?latitude=" + lat + "&longitude=" + lon +
      "&current_weather=true&daily=temperature_2m_max,temperature_2m_min&timezone=auto";

    fetch(url)
      .then(function (res) { if (!res.ok) throw new Error("No disponible"); return res.json(); })
      .then(function (data) {
        var actual = data.current_weather;
        if (!actual) throw new Error("Sin datos");
        var info = WEATHER_CODES[actual.weathercode] || ["Condición desconocida", "🌡️"];
        var max = data.daily && data.daily.temperature_2m_max ? Math.round(data.daily.temperature_2m_max[0]) : null;
        var min = data.daily && data.daily.temperature_2m_min ? Math.round(data.daily.temperature_2m_min[0]) : null;

        body.innerHTML =
          '<div class="weather-now">' +
            '<span class="weather-icon" aria-hidden="true">' + info[1] + '</span>' +
            '<div>' +
              '<span class="weather-temp">' + Math.round(actual.temperature) + '°C</span>' +
              '<span class="weather-desc">' + info[0] + '</span>' +
            '</div>' +
          '</div>' +
          (max !== null && min !== null
            ? '<p class="weather-range">Máx. ' + max + '° · Mín. ' + min + '°</p>'
            : '') +
          '<p class="weather-source">Datos: Open-Meteo · <a href="https://www.meteored.com.ar/tiempo-en_La+Cruz-America+Sur-Argentina-Corrientes--1-16730.html" target="_blank" rel="noopener noreferrer" data-no-router>Pronóstico extendido en Meteored →</a></p>';
      })
      .catch(function () {
        body.innerHTML =
          '<p class="dollar-fallback">No pudimos cargar el clima en este momento. ' +
          '<a href="https://www.meteored.com.ar/tiempo-en_La+Cruz-America+Sur-Argentina-Corrientes--1-16730.html" target="_blank" rel="noopener noreferrer" data-no-router>Ver el pronóstico en Meteored</a>.</p>';
      });
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
    initWeatherWidget();
    initContactForm();
  }

  document.addEventListener("re:pagechange", function () {
    initDollarWidget();
    initWeatherWidget();
    initContactForm();
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
