/* main.js — arranque. Los módulos se registran solos (core.js, theme.js,
   analytics.js, radio-player.js, navigation.js, widgets.js, content.js,
   search.js, forms.js); acá sólo se los inicia, en ese orden. */
(function () {
  "use strict";
  function start() { if (window.RE && window.RE.boot) window.RE.boot(); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();
