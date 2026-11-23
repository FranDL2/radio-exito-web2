/* forms.js — formulario de contacto con validación y consentimiento explícito.
   En Netlify se envía con Netlify Forms (sin backend propio). */
(function () {
  "use strict";
  var RE = window.RE;

  function setError(field, msg) {
    var err = document.getElementById(field.id + "-error");
    field.setAttribute("aria-invalid", msg ? "true" : "false");
    if (err) err.textContent = msg || "";
  }

  function validate(form) {
    var ok = true, first = null;
    function fail(field, msg) { setError(field, msg); if (!first) first = field; ok = false; }
    var name = form.querySelector("#name"), email = form.querySelector("#email"), message = form.querySelector("#message"), consent = form.querySelector("#contact-consent");
    setError(name, ""); setError(email, ""); setError(message, ""); setError(consent, "");
    if (!name.value.trim() || name.value.trim().length < 2) fail(name, "Escribí tu nombre y apellido.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim())) fail(email, "Escribí un correo electrónico válido.");
    if (message.value.trim().length < 5) fail(message, "Escribí tu mensaje.");
    if (!consent.checked) fail(consent, "Necesitamos tu aceptación de la Política de Privacidad para enviar el mensaje.");
    if (first) first.focus();
    return ok;
  }

  RE.register("forms", {
    page: function () {
      var form = document.getElementById("contact-form");
      if (!form) return;
      var status = document.getElementById("form-status");
      var submit = form.querySelector("[type=submit]");
      function say(text, state) { status.textContent = text; status.setAttribute("data-state", state); }

      form.addEventListener("submit", function (e) {
        e.preventDefault();
        if (!validate(form)) { say("Revisá los campos marcados.", "error"); return; }
        submit.disabled = true;
        say("Enviando…", "info");
        var body = new URLSearchParams(new FormData(form)).toString();
        fetch("/", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: body })
          .then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); })
          .then(function () {
            say("¡Gracias! Recibimos tu mensaje y te vamos a responder a la brevedad.", "success");
            form.reset();
            RE.track("contact_submit");
          })
          .catch(function () {
            say("No pudimos enviar el mensaje. Intentá nuevamente más tarde o escribinos por WhatsApp.", "error");
          })
          .then(function () { submit.disabled = false; });
      });
    }
  });
})();
