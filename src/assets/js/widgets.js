/* widgets.js — cotización del dólar y clima de La Cruz.
   Ambos consultan APIs públicas sin clave y degradan con gracia:
   si algo falla, la persona ve un mensaje amable, nunca un error técnico. */
(function () {
  "use strict";
  var RE = window.RE;
  var DOLAR_API = "https://dolarapi.com/v1/ambito/dolares";
  var METEORED = "https://www.meteored.com.ar/tiempo-en_La+Cruz-America+Sur-Argentina-Corrientes--1-16730.html";
  var FALLBACK = "No pudimos obtener esta información. Intentá nuevamente más tarde.";

  /* --- Dólar ----------------------------------------------------------- */
  function fmtMoney(n) {
    return typeof n === "number" ? n.toLocaleString("es-AR", { minimumFractionDigits: 0, maximumFractionDigits: 2 }) : "—";
  }
  function fmtDate(iso) {
    try {
      return new Intl.DateTimeFormat("es-AR", { timeZone: RE.config.TZ, day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(iso));
    } catch (e) { return "—"; }
  }
  function dollarRow(name, d) {
    var v = typeof d.variacion === "number" ? d.variacion : null;
    var cls = v === null ? "" : (v > 0 ? "up" : (v < 0 ? "down" : ""));
    var txt = v === null ? "—" : (v > 0 ? "▲ +" : (v < 0 ? "▼ " : "")) + v.toLocaleString("es-AR", { maximumFractionDigits: 2 }) + "%";
    return "<tr><th scope=\"row\">" + name + "</th><td>$" + fmtMoney(d.compra) + "</td><td>$" + fmtMoney(d.venta) +
      "</td><td><span class=\"dollar-variation " + cls + "\">" + txt + "</span></td></tr>";
  }
  function initDollar() {
    var body = document.querySelector("#dolar-widget [data-dolar-body]");
    if (!body) return;
    RE.cachedJson("re_dolar", DOLAR_API, 5 * 60 * 1000).then(function (data) {
      var oficial = data.filter(function (d) { return d.casa === "oficial"; })[0];
      var blue = data.filter(function (d) { return d.casa === "blue"; })[0];
      if (!oficial && !blue) throw new Error("sin datos");
      var latest = [oficial, blue].filter(Boolean).sort(function (a, b) { return new Date(b.fechaActualizacion) - new Date(a.fechaActualizacion); })[0];
      body.innerHTML =
        "<table class=\"dollar-table\"><thead><tr><th scope=\"col\">Tipo</th><th scope=\"col\">Compra</th><th scope=\"col\">Venta</th><th scope=\"col\">Var.</th></tr></thead><tbody>" +
        (oficial ? dollarRow("Oficial", oficial) : "") + (blue ? dollarRow("Blue", blue) : "") +
        "</tbody></table><p class=\"widget-note\">Actualizado: " + fmtDate(latest.fechaActualizacion) + " · Fuente: Ámbito Financiero</p>";
    }).catch(function () {
      body.innerHTML = "<p class=\"widget-text\">" + FALLBACK + "</p>";
    });
  }

  /* --- Clima ----------------------------------------------------------- */
  var CODES = {
    0: ["Despejado", "☀️"], 1: ["Mayormente despejado", "🌤️"], 2: ["Parcialmente nublado", "⛅"], 3: ["Nublado", "☁️"],
    45: ["Niebla", "🌫️"], 48: ["Niebla escarchada", "🌫️"], 51: ["Llovizna débil", "🌦️"], 53: ["Llovizna", "🌦️"], 55: ["Llovizna intensa", "🌧️"],
    56: ["Llovizna helada", "🌧️"], 57: ["Llovizna helada intensa", "🌧️"], 61: ["Lluvia débil", "🌧️"], 63: ["Lluvia", "🌧️"], 65: ["Lluvia intensa", "🌧️"],
    66: ["Lluvia helada", "🌧️"], 67: ["Lluvia helada intensa", "🌧️"], 80: ["Chubascos débiles", "🌦️"], 81: ["Chubascos", "🌦️"], 82: ["Chubascos intensos", "⛈️"],
    95: ["Tormenta eléctrica", "⛈️"], 96: ["Tormenta con granizo", "⛈️"], 99: ["Tormenta fuerte con granizo", "⛈️"]
  };
  function initWeather() {
    var body = document.querySelector("#clima-widget [data-clima-body]");
    if (!body) return;
    var url = "https://api.open-meteo.com/v1/forecast?latitude=-29.1734&longitude=-56.643&current_weather=true&daily=temperature_2m_max,temperature_2m_min&timezone=America%2FArgentina%2FBuenos_Aires";
    RE.cachedJson("re_clima", url, 10 * 60 * 1000).then(function (data) {
      var now = data.current_weather;
      if (!now) throw new Error("sin datos");
      var info = CODES[now.weathercode] || ["Condición actual", "🌡️"];
      var max = data.daily && data.daily.temperature_2m_max && Math.round(data.daily.temperature_2m_max[0]);
      var min = data.daily && data.daily.temperature_2m_min && Math.round(data.daily.temperature_2m_min[0]);
      body.innerHTML =
        "<div class=\"weather-now\"><span class=\"weather-icon\" aria-hidden=\"true\">" + info[1] + "</span><div>" +
        "<span class=\"weather-temp\">" + Math.round(now.temperature) + "°C</span><span class=\"weather-desc\">" + info[0] + "</span></div></div>" +
        (typeof max === "number" && typeof min === "number" ? "<p class=\"weather-range\">Máx. " + max + "° · Mín. " + min + "°</p>" : "") +
        "<p class=\"widget-note\">Datos: Open-Meteo · <a href=\"" + METEORED + "\" target=\"_blank\" rel=\"noopener noreferrer\" data-no-router>Pronóstico extendido en Meteored →</a></p>";
    }).catch(function () {
      body.innerHTML = "<p class=\"widget-text\">" + FALLBACK + " <a href=\"" + METEORED + "\" target=\"_blank\" rel=\"noopener noreferrer\" data-no-router>Ver el pronóstico en Meteored</a>.</p>";
    });
  }

  RE.register("widgets", { page: function () { initDollar(); initWeather(); } });
})();
