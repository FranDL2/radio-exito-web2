/**
 * Proxy HTTPS gratuito para el stream de Centova Cast de Radio Éxito 105.1.
 *
 * PROBLEMA QUE RESUELVE:
 * El servidor de streaming entrega el audio por HTTP
 * (http://centova.radiosnethosting.com:9748/stream). El sitio web se sirve
 * por HTTPS (Netlify, GitHub Pages, etc.), y los navegadores bloquean por
 * seguridad cualquier recurso HTTP cargado desde una página HTTPS
 * ("contenido mixto"). Este Worker resuelve el problema sin pedirle nada
 * al proveedor de streaming: recibe el pedido por HTTPS y lo reenvía al
 * servidor real por HTTP, devolviendo el audio como si fuera propio.
 *
 * CÓMO USARLO (gratis, sin tarjeta de crédito, ~5 minutos):
 * 1. Crear una cuenta en https://dash.cloudflare.com/sign-up (plan gratuito).
 * 2. Menú lateral → "Workers y Pages" → "Crear" → "Crear Worker".
 * 3. Ponerle un nombre, por ejemplo "radioexito-stream-proxy".
 * 4. Borrar el código de ejemplo que trae y pegar TODO el contenido de
 *    este archivo en su lugar.
 * 5. Guardar y desplegar ("Deploy"). Cloudflare va a asignar una URL como:
 *    https://radioexito-stream-proxy.TU-USUARIO.workers.dev
 * 6. Copiar esa URL y pegarla como "URL segura del stream (HTTPS)" dentro
 *    del panel /admin → Configuración del sitio → Datos generales de la
 *    emisora. El reproductor la va a usar automáticamente en vez de la
 *    URL HTTP, sin tocar ningún otro archivo.
 *
 * El plan gratuito de Cloudflare Workers alcanza sin problema para una
 * radio de este tamaño (100.000 solicitudes por día).
 */

const STREAM_UPSTREAM = "http://centova.radiosnethosting.com:9748/stream";

export default {
  async fetch(request) {
    // Sólo reenviamos GET/HEAD; cualquier otro método no tiene sentido acá.
    if (request.method !== "GET" && request.method !== "HEAD") {
      return new Response("Método no permitido", { status: 405 });
    }

    let upstreamResponse;
    try {
      upstreamResponse = await fetch(STREAM_UPSTREAM, {
        method: request.method,
        headers: {
          // Le pedimos al servidor Icecast/Centova que no intercale
          // metadatos ICY en el cuerpo del audio (evita ruido en el <audio>).
          "Icy-MetaData": "0",
          "User-Agent": "RadioExitoStreamProxy/1.0"
        }
      });
    } catch (err) {
      return new Response(
        "No se pudo conectar con el servidor de streaming en este momento.",
        { status: 502 }
      );
    }

    const headers = new Headers();
    headers.set(
      "Content-Type",
      upstreamResponse.headers.get("Content-Type") || "audio/mpeg"
    );
    headers.set("Cache-Control", "no-store");
    // Permite que el <audio> del sitio lo reproduzca sin problemas de CORS.
    headers.set("Access-Control-Allow-Origin", "*");

    return new Response(upstreamResponse.body, {
      status: upstreamResponse.status,
      headers
    });
  }
};
