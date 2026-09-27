# Proxy HTTPS para el stream (opcional, gratis)

Este archivo (`worker.js`) resuelve el problema de "contenido mixto" del reproductor: la web es HTTPS y el stream de Centova es HTTP, así que el navegador bloquea el audio.

**Antes de usar esto**, la opción más simple sigue siendo preguntarle al proveedor de streaming (Centova / Radiosnet Hosting) si el panel tiene un puerto o URL alternativa con HTTPS/SSL — si la tienen, se evita este paso y alcanza con pegar esa URL directamente como "URL segura del stream" en `/admin`.

Si no la tienen, este Worker de Cloudflare hace de intermediario gratuito: recibe el pedido de audio por HTTPS y se lo reenvía al servidor real por HTTP, sin que el navegador se entere de que el origen es HTTP.

## Pasos

1. Crear una cuenta gratuita en [Cloudflare](https://dash.cloudflare.com/sign-up) (no pide tarjeta para el plan gratuito de Workers).
2. En el panel: *Workers y Pages* → *Crear* → *Crear Worker*.
3. Ponerle un nombre (por ejemplo `radioexito-stream-proxy`) y crear.
4. Reemplazar todo el código de ejemplo por el contenido de `worker.js` de esta carpeta.
5. Guardar y desplegar. Cloudflare entrega una URL parecida a:
   `https://radioexito-stream-proxy.tu-usuario.workers.dev`
6. Probarla: pegarla en la barra de un navegador — tendría que empezar a sonar la radio.
7. Copiar esa URL y pegarla en `/admin` → **Configuración del sitio → Datos generales de la emisora → URL segura del stream (HTTPS)**. El reproductor la usa automáticamente en vez de la URL HTTP, sin tocar código.

## Límites del plan gratuito

100.000 solicitudes por día — de sobra para una radio de este tamaño (cada oyente hace una sola solicitud larga mientras escucha, no una por segundo).
