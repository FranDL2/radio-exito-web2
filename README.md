# Radio Éxito 105.1 — Portal de noticias y radio

Sitio generado con **Eleventy** (11ty), un generador de sitios estáticos: el resultado final son páginas HTML puras, ultrarrápidas, sin base de datos ni servidor que mantener. El contenido (noticias, programación, equipo, sponsors, contacto) se edita desde un panel visual en **`/admin`** (Decap CMS), sin tocar código.

## 📋 Registro de esta actualización (implementación completa del documento de 60 puntos)

Esta ronda retoma el documento grande que no se había terminado de implementar. Se cubrieron prácticamente todos los puntos, en el orden de prioridad que vos mismo definiste (radio → temas → home → noticias → programación → CMS → SEO → comercial → performance → detalles).

### Cambios realizados

**Radio y streaming (prioridad 1)**
- Reproductor reescrito: play/pausa, volumen, **mute independiente**, indicador de estado de conexión, "ahora suena" (sólo si el proveedor expone metadata real — nunca se inventa), programa actual calculado con la programación del CMS, y un **panel ampliado** (tipo "reproductor expandido").
- Reconexión con espera creciente y acotada (2s→30s, máximo 6 intentos), sin loops agresivos. Detección de HTTP/HTTPS con aviso claro y enlace directo a la señal si el navegador la bloquea.
- Controles del sistema operativo (Media Session API): play/pausa desde la pantalla de bloqueo o auriculares.
- Se agregó `nowPlayingUrl` y `streamUrlSSL` como campos editables en `/admin`, ninguno inventado.

**Sistema de temas (prioridad 2)** — ya estaba de una ronda anterior; se revisó y quedó intacto (oscuro/claro/sistema, sin flash, persistente, accesible).

**Home profesional (prioridad 3)**
- Hero radio-primero (frecuencia grande, "Escuchar ahora", al aire ahora/próximamente).
- Noticia principal separada del resto (con badge ÚLTIMA HORA cuando corresponde), sponsors de portada, franja institucional, y recién después el resto de las noticias.

**Noticias (prioridad 4)**
- Página `/noticias/` (todas las noticias). Compartir por WhatsApp/Facebook/X/copiar enlace/compartir nativo (con `article_share` a analítica). Etiquetas opcionales. `NewsArticle` con `dateModified`. Fechas "Hoy/Ayer" calculadas en el navegador en huso horario de Argentina (evita el bug de "hoy" desactualizado en un sitio estático).

**Programación (prioridad 5) y CMS (prioridad 6)**
- Ya existía la grilla con tabs; se agregaron: navegación por teclado (flechas) en los tabs, ARIA `tablist`/`tabpanel` completo, franja "al aire ahora" en la propia página, y **"Programación de hoy"** en `/radio-en-vivo.html`.
- **Equipo** nuevo: colección en `/admin`, página `/equipo.html`. No se inventó ningún integrante real — sólo queda una entrada de ejemplo marcada `activo: false` (no se publica) para que sirva de modelo.
- **Sponsors** ahora con posición (sidebar/home/footer/todas), activo, y fecha de inicio/fin — todo editable desde `/admin`, sin sponsors de ejemplo inventados.

**SEO (prioridad 7)**
- `Organization`, `WebSite` (con `SearchAction`) y `RadioStation` en todas las páginas; `NewsArticle` en cada noticia. Open Graph + Twitter Cards completos. **`/rss.xml`** con las últimas 30 noticias. **`/search-index.json` + `/buscar.html`**: buscador propio sin dependencias, por título/contenido/categoría/etiqueta, con resaltado de coincidencias. `sitemap.xml` ya excluía páginas `noindex`; se mantiene.
- Dominio: se verificó que `site.json` (`https://www.radioexito.com.ar`) es la única fuente usada en `canonical`, Open Graph y sitemap — no hay referencias sueltas a un dominio de prueba.

**Comercial (prioridad 8)**
- `/publicidad.html` nueva, con contenido editable desde `/admin` (canales, formatos, botón de WhatsApp) — sin inventar estadísticas de audiencia.

**Performance y PWA (prioridad 9)**
- `manifest.webmanifest` + íconos propios (generados para este proyecto, sin depender de terceros).
- Filtro `srcset` preparado para el Image CDN de Netlify (WebP + varios anchos) — se activa solo si `site.imageCdn` está en `"netlify"`; si no, no hace nada (no se agregó ninguna dependencia de build nueva).
- **No se agregó Service Worker**: por el punto 34 del documento ("sólo si no rompe el streaming") y la dificultad de garantizar, sin poder probarlo en este entorno, que un SW no interfiera con la reproducción en vivo. Queda afuera a propósito.

**JavaScript modular (prioridad 10 / punto 42)**
- El `main.js` monolítico se dividió en 10 módulos con un pequeño núcleo compartido (`core.js` expone `window.RE`, cada módulo se registra solo): `theme.js`, `analytics.js`, `radio-player.js`, `navigation.js`, `widgets.js`, `content.js`, `search.js`, `forms.js`, y `main.js` (arranque).

**Analítica (punto 23)**
- `analytics.js`: GA4 opcional (vacío por defecto, no se activa nada sin ID), gateado por el mismo consentimiento de cookies de siempre. Eventos: `radio_play`, `radio_pause`, `radio_mute`, `article_view`, `article_share`, `whatsapp_click`, `sponsor_click`, `contact_submit`.

**Accesibilidad y manejo de errores (puntos 36, 43, 44)**
- Mensajes de error siempre en español y accionables (nunca un error técnico crudo). Formulario de contacto con errores por campo (`aria-invalid` + texto), navegación de tabs por teclado, `aria-label` en todos los controles nuevos.

### 🚨 Un bug real encontrado y corregido en esta pasada
Al reorganizar el JS en módulos, el reproductor ampliado (`/admin` → panel emergente) usaba un elemento `#player-cover` para la portada del tema que suena, pero ese `<img>` **no existía en el HTML** — hubiera fallado silenciosamente (sin portada nunca, aunque el proveedor de streaming la mandara). Se agregó el elemento faltante.

También se corrigió un problema de **rango de pantalla muerto**: el menú de escritorio aparecía recién en 1080px pero el botón de hamburguesa se ocultaba a partir de 900px — entre esos dos anchos no había forma de navegar. Ambos breakpoints quedaron alineados en 900px.

### Archivos nuevos
`src/assets/js/{theme,analytics,radio-player,navigation,widgets,content,search,forms}.js`, `src/_includes/components/{radio-player,news-card,sponsor-card,social-links,theme-toggle,weather,dollar}.njk`, `src/buscar.njk`, `src/noticias.njk`, `src/equipo.njk`, `src/publicidad.njk`, `src/manifest.njk`, `src/rss.njk`, `src/search-index.njk`, `src/equipo/equipo.11tydata.js`, `src/_data/publicidad.json`, íconos PWA en `src/assets/img/`.

### Archivos modificados (principales)
`.eleventy.js` (filtros y colecciones nuevas), `admin/config.yml` (equipo, sponsors con posición/vigencia, publicidad, etiquetas), `src/_includes/layouts/base.njk`, `src/_includes/layouts/articulo.njk`, `src/_includes/partials/{header,footer,sidebar}.njk`, `src/index.njk`, `src/radio-en-vivo.njk`, `src/programacion.njk`, `src/contacto.njk`, `src/nosotros.njk`, `src/assets/css/style.css` (ampliación grande, más de 300 líneas nuevas).

### Problemas encontrados
- No hay forma de confirmar si el Centova Cast de tu proveedor expone metadata pública ("ahora suena") sin acceso a su panel — `nowPlayingUrl` queda vacío hasta que lo confirmes.
- La URL de streaming sigue siendo HTTP (sin cambios respecto a la ronda anterior).

### Configuración pendiente
```text
site.json → streamUrlSSL   = falta confirmar si el proveedor ofrece HTTPS
site.json → nowPlayingUrl  = falta confirmar si existe un endpoint de metadata
site.json → gaId           = vacío (Google Analytics no está activado)
```

### Verificación realizada
Igual que en la ronda anterior, **no hay acceso a internet en este entorno** para correr `npm install`/`npm run build` de verdad. Se repitió toda la batería de chequeos estáticos (ahora más estricta): sintaxis de los 11 archivos JS, YAML de `config.yml` y de los ~49 archivos con front matter, balance de etiquetas Nunjucks, resolución de cada `include`/`import`/filtro/colección usados en las plantillas, **y un cruce completo de cada clase CSS usada contra las definidas** (que encontró y corrigió 3 clases realmente faltantes: `.main-nav`, `.hero-copy`, y el elemento `#player-cover`). Resultado: **0 problemas** en la verificación estática.

```text
BUILD NO EJECUTADO (sin acceso a red en este entorno)
VERIFICACIÓN ESTÁTICA: OK, 0 problemas detectados
```

### Próximos pasos
Páginas individuales por programa ya existen (`/programacion/<slug>/`) pero no están enlazadas desde `/equipo.html` (los perfiles del equipo no tienen página propia a propósito, son sólo tarjetas). Falta, si lo querés: Service Worker para uso offline del portal (no del audio), y cargar datos reales de audiencia si alguna vez se contrata analítica más profunda.

---

## Registro de la actualización anterior (bug de permalinks, tema oscuro/claro, programación v1)


### Cambios realizados
- 🚨 **Bug crítico de compilación corregido:** ninguna página de nivel superior (`contacto.njk`, `nosotros.njk`, `radio-en-vivo.njk`, `tapas-de-diarios.njk`, y las 4 legales) tenía un `permalink` explícito. Eleventy las habría publicado en `/contacto/`, `/nosotros/`, etc. (con carpeta), mientras que **todo el sitio** las enlaza como `/contacto.html`, `/nosotros.html`, etc. — es decir, casi toda la navegación interna habría devuelto 404 en producción. Se agregó `permalink:` explícito a las 9 páginas afectadas. Este bug ya existía antes de esta ronda de cambios y no había sido detectado porque nunca se había podido ejecutar un build real de Eleventy.
- **Sistema de tema oscuro / claro / según el sistema**, con selector accesible en el header, persistencia en `localStorage`, y script anti-parpadeo en el `<head>`.
- **Header rediseñado**: nav Inicio · Radio · Programación · Tapas de diarios · categorías · Nosotros · Contacto, badge "🔴 EN VIVO", selector de tema y logo más grande.
- **Página `/programacion.html` nueva**, con tabs por día (lista vertical en mobile), **administrable desde Decap CMS** (colección "Programación"), y cada programa genera además su propia página individual (`/programacion/<programa>/`).
- **"Lo más leído" renombrado a "Noticias destacadas"** en todo el sitio y en el CMS, porque no hay analítica real de visitas detrás — se evita prometer algo que no existe.
- **Noticia individual mejorada:** badge opcional "🔴 ÚLTIMA HORA", fecha inteligente ("Hoy · 12:42" / "Ayer · 18:32", calculada en el navegador para que nunca quede desactualizada en un sitio estático), botones de compartir (WhatsApp, Facebook, X, copiar enlace) y datos estructurados `NewsArticle`.
- **Datos estructurados ampliados:** `Organization` y `WebSite` en todas las páginas (antes sólo había `RadioStation` en el home).
- **"Nosotros" ahora editable desde `/admin`** (título, introducción, misión, compromiso).
- **Mapa de contacto:** coordenadas actualizadas a `-29.173365, -56.642993` y se quitó el texto técnico debajo del mapa.
- Se quitó el texto interno de "Tapas de diarios" que mencionaba el nombre del archivo fuente.
- Se verificó consistencia de dominio (`www.radioexito.com.ar` en `canonical`, Open Graph y sitemap): no se encontraron inconsistencias.

### Archivos modificados (principales)
`src/_includes/layouts/base.njk`, `src/_includes/layouts/articulo.njk`, `src/_includes/partials/header.njk`, `src/_includes/partials/footer.njk`, `src/_includes/partials/sidebar.njk`, `src/_includes/partials/macros.njk`, `src/assets/css/style.css`, `src/assets/js/main.js`, `.eleventy.js`, `admin/config.yml`, `src/contacto.njk`, `src/nosotros.njk`, `src/tapas-de-diarios.njk`.

### Archivos nuevos
`src/programacion.njk`, `src/_includes/layouts/programa.njk`, `src/programacion/*.md` (5 programas de ejemplo), `src/_data/nosotros.json`.

### Problemas encontrados
- La URL de streaming sigue siendo HTTP (ver sección "Streaming: HTTP vs HTTPS" más abajo) — no depende del código sino del proveedor.
- No hay forma de implementar "Ahora suena" (artista/canción en vivo) sin saber si el servidor Centova Cast expone un endpoint de metadata pública (`/status-json.xsl` o similar). Quedó fuera de esta ronda para no inventar una integración que no se pueda confirmar.

### Configuración pendiente
```text
STREAM_URL_SSL = falta confirmar si el proveedor (Centova/Radiosnet) ofrece un puerto HTTPS
GA_MEASUREMENT_ID = vacío (Google Analytics no está activado)
```

### Comandos utilizados
Este entorno de trabajo **no tiene acceso a internet**, así que no pude ejecutar `npm install` ni `npm run build` (un intento real de `npm install` devolvió `403 Forbidden` del registro de npm). En su lugar, verifiqué manualmente lo que un build de Eleventy comprueba en la práctica:
- Sintaxis de todo el JavaScript (`node --check`) → **sin errores**.
- Validez YAML de `admin/config.yml` y del front matter de los 22 archivos `.njk` y de todos los `.md` de noticias/programación → **sin errores**.
- Balance de etiquetas Nunjucks (`{% if %}/{% endif %}`, `{% for %}/{% endfor %}`, `{% macro %}/{% endmacro %}`, `{{ }}`) → **sin errores** (un caso detectado en `base.njk` resultó ser JavaScript válido, no una etiqueta Nunjucks).
- Que cada `{% include %}` / `{% import %}` apunte a un archivo real → **sin errores**.
- Que cada filtro usado en las plantillas (`| nombreDeFiltro`) esté definido en `.eleventy.js` → **sin errores**.
- **Permalinks:** acá encontré el bug crítico ya descripto arriba, y lo corregí.

### Resultado del build
```text
BUILD NO EJECUTADO (sin acceso a red en este entorno para instalar Eleventy)
VERIFICACIÓN ESTÁTICA: OK, sin errores detectados
```
Recomiendo que la primera vez que lo subas a GitHub/Netlify revises el log de build en Netlify (tarda ~1 minuto) para confirmar que compila — con las verificaciones hechas acá, no debería haber sorpresas, pero un build real siempre es la prueba definitiva.

### Próximos pasos (fuera del alcance de esta ronda)
Buscador de noticias, feed RSS, PWA/manifest, página `/publicidad` o `/anunciate`, página `/equipo`, metadata real de "ahora suena" (si el proveedor de streaming la expone), eventos de Google Analytics 4, `srcset`/WebP en imágenes, sponsors con fecha de inicio/fin y posición configurable.

---

## Novedades de la actualización anterior (integración de logo, mapa, clima, dólar)


- **Logo oficial** integrado en el header y en el footer (`src/assets/img/logo.png`), a la izquierda del nombre/frecuencia.
- **Mapa de Contacto corregido:** el marcador ahora apunta a la intersección real de **Ayacucho y Manuel Susini, La Cruz, Corrientes** (coordenadas verificadas: `-29.173033, -56.643779`), ya no al río.
- **Widget del tiempo** nuevo en la barra lateral de todo el sitio (ver sección "Widget del tiempo" más abajo).
- **Tabla del dólar corregida:** ahora usa el endpoint correcto para valores *vigentes* (antes, por error, consultaba un endpoint de histórico que podía devolver un valor viejo). Se agregó columna de variación porcentual y hora exacta de actualización.
- **Sección "Tapas de diarios" rediseñada** como grilla de tarjetas (antes era una lista de enlaces simple).
- **Email de contacto** actualizado a `radioexito105uno@hotmail.com` en todo el sitio (footer, contacto, legales).
- **URL de streaming** actualizada a `http://centova.radiosnethosting.com:9748/stream`, y se agregó un campo separado para una futura **URL segura (HTTPS)** del mismo stream, más un Worker de Cloudflare listo para copiar y pegar como proxy gratuito (ver "Streaming: HTTP vs HTTPS" más abajo) — el problema de fondo (protocolo mixto) sigue sin resolverse del lado del servidor de streaming, así que hace falta una de las dos acciones descriptas ahí.

## ⚠️ Todavía pendiente de tu lado

**La URL de streaming sigue siendo HTTP, no HTTPS:** `http://centova.radiosnethosting.com:9748/stream`. No tengo forma de entrar al panel de Centova Cast de tu proveedor para revisar si existe un puerto SSL alternativo — eso sólo lo puede confirmar quien tenga acceso a ese panel o el propio proveedor. Mientras tanto, el reproductor detecta el bloqueo por "contenido mixto" y lo explica en pantalla en vez de mostrar un error genérico. Opciones, de más a menos recomendable:

1. **Preguntarle al proveedor de streaming** (Centova / Radiosnet Hosting) si el panel tiene un puerto o URL alternativa con HTTPS/SSL para el mismo stream. Muchos paneles Centova Cast lo ofrecen sin costo extra; sólo hay que activarlo. Cuando la tengas, pegala en `/admin` → *Configuración del sitio → Datos generales de la emisora → URL segura del stream (HTTPS)* — el reproductor la usa automáticamente, sin tocar código.
2. **Usar el proxy gratuito ya preparado** en la carpeta `streaming-proxy/` (Cloudflare Workers, plan gratuito, sin tarjeta). Instrucciones paso a paso en `streaming-proxy/README.md`. Es una solución de 5 minutos si la opción 1 no está disponible.
3. Servir el sitio por HTTP simple — **no recomendado**: se pierde seguridad en todo el sitio, formulario de contacto incluido.

## 1. Cómo se edita el contenido (para tu papá, sin código)

Una vez publicado el sitio (sección 3), se entra a **`https://tudominio.com.ar/admin`**, se inicia sesión con el correo invitado, y aparece un panel con dos secciones:

- **Noticias:** botón "Nueva Noticia" → cargar título, fecha, elegir la categoría de una lista desplegable, subir la foto de portada, escribir la bajada y el cuerpo de la nota en un editor de texto enriquecido (como Word). Al guardar y publicar, la nota aparece sola en la portada y en su sección dentro de 1 a 2 minutos (tiempo que tarda el sitio en reconstruirse).
- **Configuración del sitio:** tres formularios para cambiar, sin tocar código:
  - **Datos de contacto y redes sociales:** WhatsApp, email, dirección, Facebook, Instagram, YouTube, X.
  - **Sponsors y banners publicitarios:** agregar, editar o quitar banners (nombre, imagen, enlace) que se muestran en la barra lateral de todo el sitio.
  - **Datos generales de la emisora:** nombre, frecuencia, eslogan, la URL del stream de audio y, cuando esté disponible, la URL segura (HTTPS) del mismo stream.

Los cambios en "Noticias" quedan guardados como una lista con fecha, para poder ver el historial o deshacer un error.

## 2. Estructura del proyecto

```
radio-exito-portal/
├── package.json / .eleventy.js     Configuración de Eleventy
├── netlify.toml                    Configuración de build para Netlify
├── admin/                          Panel de administración (Decap CMS)
│   ├── index.html
│   └── config.yml                  Acá se definen los campos del formulario de noticias
├── streaming-proxy/                Proxy HTTPS opcional para el stream (Cloudflare Workers)
├── src/
│   ├── _data/
│   │   ├── categorias.js            Lista única de secciones del menú
│   │   ├── site.json                Nombre, frecuencia, URL del stream (HTTP y HTTPS)
│   │   ├── contacto.json            WhatsApp, email, redes sociales, dirección
│   │   └── sponsors.json            Banners publicitarios
│   ├── _includes/
│   │   ├── layouts/base.njk         Estructura HTML común a todo el sitio
│   │   ├── layouts/articulo.njk     Plantilla de una noticia individual
│   │   └── partials/                Header, footer, reproductor, sidebar, etc.
│   ├── noticias/                    Cada noticia es un archivo .md (uno por nota)
│   ├── legal/                       Privacidad, Términos, Cookies, Reembolsos
│   ├── assets/img/logo.png          Logo oficial (el que subiste)
│   ├── index.njk                    Portada
│   ├── seccion.njk                  Genera automáticamente una página por categoría
│   ├── contacto.njk / nosotros.njk / radio-en-vivo.njk / tapas-de-diarios.njk
│   └── assets/                      CSS, JS e imágenes propias
```

## 3. Publicar el sitio (recomendado: Netlify + GitHub)

Esta combinación es gratuita para un sitio de este tamaño y es la que hace posible el panel `/admin` sin backend propio.

1. **Crear un repositorio en GitHub** y subir todo el contenido de esta carpeta.
2. **Crear una cuenta en [Netlify](https://www.netlify.com/)** (gratis) y conectar ese repositorio: "Add new site" → "Import an existing project" → elegir el repositorio. Netlify va a detectar solo el comando de build (`npm run build`) y la carpeta de publicación (`_site`) gracias al archivo `netlify.toml`.
3. **Activar Identity:** en el sitio dentro de Netlify → *Site configuration → Identity → Enable Identity*.
4. **Activar Git Gateway:** en la misma sección de Identity → *Services → Git Gateway → Enable Git Gateway*. Esto es lo que permite que el panel `/admin` guarde cambios en GitHub sin que el editor tenga una cuenta de GitHub.
5. **Invitar a tu papá como usuario:** *Identity → Invite users* → cargar su email. Le va a llegar un correo para crear su contraseña.
6. Listo: ya puede entrar a `https://tudominio.com.ar/admin`, iniciar sesión, y editar.
7. **Conectar el dominio propio:** *Domain management* → agregar `www.radioexito.com.ar` y seguir las instrucciones para apuntar los DNS.

### Probar en tu computadora antes de publicar (opcional, para vos)

Con [Node.js](https://nodejs.org/) instalado:

```bash
npm install
npm start
```

Abre el sitio en `http://localhost:8080`. El panel `/admin` en local no permite iniciar sesión con Git Gateway (eso sólo funciona ya publicado en Netlify), pero sirve para revisar diseño y contenido.

## 4. Formulario de contacto

Ya está conectado a **Netlify Forms**, que funciona automáticamente al desplegar en Netlify (no hace falta backend ni servicio externo): los mensajes enviados desde `/contacto.html` van a aparecer en el panel de Netlify, en *Forms*. Se puede configurar ahí mismo una notificación por email cada vez que llega un mensaje nuevo (*Forms → Settings and usage → Form notifications*).

Si en algún momento se despliega en un hosting distinto de Netlify, hay que reemplazar ese envío por un servicio como Formspree o Web3Forms, o un backend propio — el punto exacto a modificar está señalado con `TODO` en `src/assets/js/main.js`.

## 5. Widget de cotización del dólar

Se actualiza solo, sin que nadie cargue un valor a mano. Usa **dolarapi.com** (que a su vez toma los datos de Ámbito Financiero) para traer siempre el **valor vigente**, con columnas de Compra, Venta y Variación porcentual para Oficial y Blue, más la hora exacta de la última actualización al pie. Si la API no responde, el widget lo indica y ofrece un enlace alternativo, en vez de mostrar un dato viejo o incorrecto.

> Nota técnica: la versión anterior de este widget consultaba un endpoint de *histórico* de cotizaciones y podía terminar mostrando un valor de un día distinto al actual. Ya está corregido usando el endpoint pensado específicamente para "cotización de hoy".

## 6. Widget del tiempo (La Cruz, Corrientes)

Aparece en la barra lateral de todas las páginas: temperatura actual, condición (con ícono) y máxima/mínima del día, actualizado solo mediante **Open-Meteo**, una API meteorológica pública y gratuita, sin necesidad de clave ni de carga manual.

**Por qué no es un widget embebido de Meteored directamente:** los sitios de pronóstico del tiempo casi siempre bloquean que su página se muestre dentro de un `<iframe>` ajeno (política de seguridad `X-Frame-Options`), y no hay una forma confiable de insertar su contenido en la barra lateral sin ese mecanismo. Para no prometer una integración que se rompa sola, el widget usa una fuente de datos abierta y confiable, y agrega debajo un enlace directo a **"Pronóstico extendido en Meteored"** apuntando a la URL que diste, para quien quiera el detalle completo de esa fuente.

## 7. "Lo más leído"

Por simplicidad y para no depender de analítica en tiempo real, esta sección se arma con las noticias que se marquen como **"Destacar en Lo más leído"** al cargarlas desde `/admin` — así tu papá controla qué aparece ahí, sin necesitar Google Analytics ni ninguna integración extra.

## 8. Tapas de diarios

Ahora es una grilla de tarjetas (una por diario), con el ámbito (Nacional / Corrientes) y un botón "Ver tapa de hoy" que lleva directo al sitio oficial de cada medio.

**Por qué no se muestran las miniaturas de las portadas del día:** reproducir automáticamente la portada de otro medio (aunque sea en miniatura) significa mostrar contenido protegido por derechos de autor de terceros sin su autorización explícita, algo que evitamos por principio en este proyecto. La forma prolija de lograr ese resultado visual es contratando un servicio con licencia para eso, o generando ustedes mismos una captura diaria de cada tapa (por ejemplo, subiendo una foto de la tapa impresa que la radio ya tenga autorizada, un tapa por vez, como si fuera una noticia más desde `/admin`). Si quieren ese camino, lo puedo dejar armado en una próxima vuelta.

## 9. Accesibilidad, SEO y cumplimiento legal ya incluidos

- Contraste verificado para modo oscuro, navegación completa por teclado con foco visible, enlace "Saltar al contenido principal", `prefers-reduced-motion` respetado.
- HTML semántico, metadatos Open Graph (con el logo como imagen por defecto), `sitemap.xml` generado automáticamente a partir de todas las páginas y noticias, `robots.txt`.
- Cuatro páginas legales completas para Argentina: Privacidad (Ley 25.326, derechos ARCO, AAIP), Términos y Condiciones (Ley 24.240, jurisdicción Corrientes), Cookies (con banner que bloquea Google Analytics hasta el consentimiento) y Reembolsos (acotada a pauta publicitaria).
- El formulario de contacto exige tildar la casilla de consentimiento antes de habilitar el envío.
- Los íconos son SVG propios; no hay imágenes de stock ni contenido de terceros embebido sin autorización.

## 10. Cómo funciona el reproductor persistente

El `<audio>` y la barra del reproductor viven **fuera** de `<main id="main-content">`, en `base.njk`. Un router liviano en `assets/js/main.js` intercepta los clics en enlaces internos, trae la página siguiente por `fetch()` y reemplaza sólo el contenido de `<main>` — así el audio nunca se corta al pasar de una noticia a otra o de sección. Si JavaScript falla o está desactivado, cada enlace sigue funcionando como una navegación de página completa normal.

## 11. Streaming: HTTP vs HTTPS

Ver la sección "⚠️ Todavía pendiente de tu lado" al principio de este documento.

## 12. Google Analytics (opcional)

El banner de cookies ya bloquea la carga de Google Analytics hasta que el visitante acepta. Para activarlo, pegá tu ID de medición (`G-XXXXXXXXXX`) como `gaId` en la parte superior de `src/_includes/layouts/base.njk` (`window.SITE_CONFIG`), o convertilo en un campo más del panel de administración si preferís no tocar código nunca más.

