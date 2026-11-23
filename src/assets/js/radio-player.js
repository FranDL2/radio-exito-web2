/* radio-player.js — reproductor persistente de Radio Éxito.
   - Vive fuera de <main>, por eso el audio no se corta al navegar.
   - Play / pausa, volumen, mute, estado de conexión y panel ampliado.
   - Reconexión con reintentos controlados (sin loops agresivos).
   - "Ahora suena": sólo se muestra si el servidor entrega metadata real
     (site.json → nowPlayingUrl). Nunca se inventa información.
   - "Programa": se calcula con la programación cargada en el CMS. */
(function () {
  "use strict";
  var RE = window.RE;
  var CFG = RE.config;

  var audio, toggleBtn, statusEl, errorEl, volumeEl, muteBtn, expandBtn, panel;
  var nowBox, nowText, progBox, progText, panelNow, panelProgram, panelCover;
  var attempts = 0, reconnectTimer = null, userPaused = true, loaded = false;
  var metaTimer = null, programTimer = null, lastTrack = "", reconnecting = false;

  var ICON_PLAY = '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>';
  var ICON_PAUSE = '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M6 5h4v14H6zM14 5h4v14h-4z"/></svg>';

  /* --- Estado visible ---------------------------------------------------- */
  function setStatus(text) { if (statusEl) statusEl.textContent = text; }
  function setError(html) {
    document.body.classList.toggle("player-has-error", !!html);
    if (errorEl) errorEl.innerHTML = html || "";
  }
  function setPlayingUI(isPlaying) {
    document.body.classList.toggle("is-playing", isPlaying);
    toggleBtn.setAttribute("aria-pressed", String(isPlaying));
    toggleBtn.setAttribute("aria-label", isPlaying ? "Pausar transmisión en vivo" : "Reproducir transmisión en vivo");
    toggleBtn.innerHTML = isPlaying ? ICON_PAUSE : ICON_PLAY;
    if (isPlaying) { setStatus("En vivo"); startMetaPolling(); }
    else stopMetaPolling();
  }

  /* --- Contenido bloqueado por el navegador (HTTP en sitio HTTPS) --------- */
  function showBlocked() {
    setStatus("Señal no disponible");
    var direct = CFG.STREAM_URL ? ' <a href="' + RE.escapeHtml(CFG.STREAM_URL) + '" target="_blank" rel="noopener noreferrer" data-no-router>Abrir la señal en otra pestaña</a>.' : "";
    setError("Tu navegador bloquea esta señal por seguridad (el servidor de streaming usa HTTP y el sitio HTTPS)." + direct);
  }

  /* --- Reproducción ------------------------------------------------------- */
  function play(isReconnect) {
    if (!CFG.STREAM_URL) { setStatus("Señal no configurada"); return; }
    if (CFG.MIXED_CONTENT_BLOCKED) { showBlocked(); return; }
    userPaused = false;
    reconnecting = !!isReconnect;
    if (!isReconnect) { attempts = 0; clearTimeout(reconnectTimer); }
    setStatus(isReconnect ? "Reconectando…" : "Conectando…");
    if (!loaded || isReconnect) {
      // Cache-buster: evita reproducir un buffer viejo al reconectar
      audio.src = CFG.STREAM_URL + (CFG.STREAM_URL.indexOf("?") === -1 ? "?" : "&") + "t=" + Date.now();
      loaded = true;
    }
    var p = audio.play();
    if (p && p.catch) {
      p.catch(function (err) {
        // NotAllowedError: el navegador pide un gesto del usuario
        if (err && err.name === "NotAllowedError") { setStatus("Tocá play para escuchar"); setPlayingUI(false); }
        else onStreamError();
      });
    }
    if (!isReconnect) RE.track("radio_play");
  }

  function pause() {
    userPaused = true;
    clearTimeout(reconnectTimer);
    audio.pause();
    // Al pausar un stream en vivo se descarta el buffer: al volver a tocar play se retoma "en vivo".
    audio.removeAttribute("src");
    audio.load();
    loaded = false;
    setStatus("En pausa");
    RE.track("radio_pause");
  }

  function onStreamError() {
    if (userPaused) return;
    setPlayingUI(false);
    if (CFG.MIXED_CONTENT_BLOCKED) { showBlocked(); return; }
    if (attempts >= CFG.RECONNECT_MAX_ATTEMPTS) {
      setStatus("Sin conexión");
      setError("No pudimos reconectar con la señal. Probá de nuevo en unos minutos.");
      return;
    }
    attempts += 1;
    // Espera creciente y acotada: 2s, 4s, 8s, 16s, 30s, 30s
    var delay = Math.min(30000, 2000 * Math.pow(2, attempts - 1));
    setStatus("Reconectando…");
    setError("Se interrumpió la señal. Reconectando (" + attempts + " de " + CFG.RECONNECT_MAX_ATTEMPTS + ")…");
    clearTimeout(reconnectTimer);
    reconnectTimer = setTimeout(function () { if (!userPaused) play(true); }, delay);
  }

  /* --- "Ahora suena" (sólo con metadata real) ------------------------------ */
  function parseMeta(data) {
    var artist = "", title = "", cover = "";
    function fromString(s) {
      var parts = String(s).split(" - ");
      if (parts.length >= 2) { artist = parts.shift().trim(); title = parts.join(" - ").trim(); }
      else title = String(s).trim();
    }
    if (data && data.icestats && data.icestats.source) {           // Icecast
      var src = Array.isArray(data.icestats.source) ? data.icestats.source[0] : data.icestats.source;
      if (src.artist) artist = src.artist;
      if (src.title) { if (artist) title = src.title; else fromString(src.title); }
    } else if (data && data.songtitle) {                             // Shoutcast 2
      fromString(data.songtitle);
    } else if (data) {                                               // Formato genérico / Centova
      if (data.artist || data.title) { artist = data.artist || ""; title = data.title || ""; }
      else if (data.song) fromString(data.song);
      else if (data.nowPlaying) fromString(data.nowPlaying);
      cover = data.cover || data.art || data.image || "";
    }
    if (!title && !artist) return null;
    return { artist: artist, title: title, cover: cover };
  }

  function renderNow(info) {
    var text = info ? (info.artist ? info.artist + " — " + info.title : info.title) : "";
    if (nowBox) nowBox.hidden = !text;
    if (nowText) nowText.textContent = text;
    if (panelNow) panelNow.textContent = text ? "Ahora suena: " + text : "";
    if (panelCover) {
      if (info && info.cover && /^https:/.test(info.cover)) { panelCover.src = info.cover; panelCover.hidden = false; }
      else panelCover.hidden = true;
    }
    if (text && text !== lastTrack && "mediaSession" in navigator) {
      lastTrack = text;
      try {
        navigator.mediaSession.metadata = new MediaMetadata({
          title: info.title, artist: info.artist || CFG.STATION_NAME, album: CFG.STATION_NAME,
          artwork: [{ src: "/assets/img/icon-512.png", sizes: "512x512", type: "image/png" }]
        });
      } catch (e) { /* no crítico */ }
    }
  }

  function fetchMeta() {
    if (!CFG.NOW_PLAYING_URL) return;
    if (window.location.protocol === "https:" && CFG.NOW_PLAYING_URL.indexOf("http://") === 0) return;
    fetch(CFG.NOW_PLAYING_URL, { cache: "no-store" })
      .then(function (r) { if (!r.ok) throw new Error(); return r.json(); })
      .then(function (d) { renderNow(parseMeta(d)); })
      .catch(function () { renderNow(null); }); // sin metadata: se oculta, nunca se inventa
  }
  function startMetaPolling() {
    if (!CFG.NOW_PLAYING_URL || metaTimer) return;
    fetchMeta();
    metaTimer = setInterval(fetchMeta, 20000);
  }
  function stopMetaPolling() { clearInterval(metaTimer); metaTimer = null; }

  /* --- Programa actual ------------------------------------------------------ */
  function updateProgram() {
    var s = RE.getSchedule();
    var label = s.current ? s.current.nombre : "";
    if (progBox) progBox.hidden = !label;
    if (progText) progText.textContent = label;
    if (panelProgram) {
      panelProgram.textContent = label
        ? "Programa actual: " + label + (s.next ? " · A continuación: " + s.next.nombre + " (" + s.next.horaInicio + ")" : "")
        : "";
    }
  }

  /* --- Volumen / mute --------------------------------------------------------- */
  function syncMuteUI() {
    var muted = audio.muted || audio.volume === 0;
    muteBtn.setAttribute("aria-pressed", String(muted));
    muteBtn.setAttribute("aria-label", muted ? "Activar sonido" : "Silenciar");
    muteBtn.classList.toggle("is-muted", muted);
  }
  function toggleMute() {
    audio.muted = !audio.muted;
    syncMuteUI();
    RE.track("radio_mute", { muted: audio.muted });
  }

  /* --- Panel ampliado ------------------------------------------------------------ */
  function setPanel(open) {
    panel.hidden = !open;
    expandBtn.setAttribute("aria-expanded", String(open));
    expandBtn.setAttribute("aria-label", open ? "Cerrar reproductor ampliado" : "Abrir reproductor ampliado");
    document.body.classList.toggle("player-panel-open", open);
  }

  RE.Player = { play: function () { play(false); }, pause: pause, isPlaying: function () { return !!audio && !audio.paused; } };

  RE.register("player", {
    init: function () {
      audio = document.getElementById("radio-audio");
      toggleBtn = document.getElementById("player-toggle");
      if (!audio || !toggleBtn) return;
      statusEl = document.getElementById("player-status-text");
      errorEl = document.getElementById("player-error");
      volumeEl = document.getElementById("player-volume");
      muteBtn = document.getElementById("player-mute");
      expandBtn = document.getElementById("player-expand");
      panel = document.getElementById("player-panel");
      nowBox = document.getElementById("player-now");
      nowText = document.getElementById("player-now-text");
      progBox = document.getElementById("player-program");
      progText = document.getElementById("player-program-text");
      panelNow = document.getElementById("player-panel-now");
      panelProgram = document.getElementById("player-panel-program");
      panelCover = document.getElementById("player-cover");

      audio.preload = "none";
      var saved = parseFloat(localStorage.getItem("re_volume"));
      audio.volume = isNaN(saved) ? 0.85 : Math.min(1, Math.max(0, saved));
      volumeEl.value = audio.volume;
      syncMuteUI();

      if (CFG.MIXED_CONTENT_BLOCKED) showBlocked();

      toggleBtn.addEventListener("click", function () { if (audio.paused) play(false); else pause(); });
      muteBtn.addEventListener("click", toggleMute);
      volumeEl.addEventListener("input", function () {
        audio.volume = parseFloat(volumeEl.value);
        if (audio.volume > 0) audio.muted = false;
        try { localStorage.setItem("re_volume", String(audio.volume)); } catch (e) { /* ignorar */ }
        syncMuteUI();
      });
      expandBtn.addEventListener("click", function () { setPanel(panel.hidden); });
      document.addEventListener("keydown", function (e) { if (e.key === "Escape" && !panel.hidden) { setPanel(false); expandBtn.focus(); } });

      audio.addEventListener("playing", function () { attempts = 0; reconnecting = false; setError(""); setPlayingUI(true); });
      audio.addEventListener("pause", function () {
        if (userPaused) { setPlayingUI(false); return; }
        // Pausa iniciada fuera de la página (auriculares, sistema operativo): se trata como pausa del usuario
        if (!reconnecting && loaded && !audio.ended && !audio.error) { pause(); }
      });
      audio.addEventListener("waiting", function () { if (!userPaused) setStatus("Conectando…"); });
      audio.addEventListener("error", onStreamError);
      audio.addEventListener("stalled", function () { if (!userPaused && !audio.paused) setStatus("Conectando…"); });
      audio.addEventListener("ended", onStreamError); // un stream en vivo no debería terminar

      // Se recupera la conexión al volver internet
      window.addEventListener("online", function () { if (!userPaused && audio.paused) { attempts = 0; play(true); } });
      window.addEventListener("offline", function () { if (!userPaused) { setStatus("Sin conexión"); setError("Sin conexión a internet."); } });

      // Botones "Escuchar" de cualquier página (delegado: sigue funcionando tras cada navegación)
      document.addEventListener("click", function (e) {
        var b = e.target.closest("[data-play-stream]");
        if (!b || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
        e.preventDefault();
        if (audio.paused) play(false);
      });

      // Controles del sistema (pantalla de bloqueo, auriculares)
      if ("mediaSession" in navigator) {
        try {
          navigator.mediaSession.metadata = new MediaMetadata({
            title: CFG.STATION_NAME, artist: "La Cruz, Corrientes", album: "En vivo",
            artwork: [{ src: "/assets/img/icon-512.png", sizes: "512x512", type: "image/png" }]
          });
          navigator.mediaSession.setActionHandler("play", function () { play(false); });
          navigator.mediaSession.setActionHandler("pause", pause);
          navigator.mediaSession.setActionHandler("stop", pause);
        } catch (e) { /* no crítico */ }
      }

      updateProgram();
      programTimer = setInterval(updateProgram, 60000);
    }
  });
})();
