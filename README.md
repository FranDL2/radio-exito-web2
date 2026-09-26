# Radio Éxito 105.1 — Portal de noticias y radio

Sitio generado con **Eleventy** (11ty), un generador de sitios estáticos: el resultado final son páginas HTML puras, ultrarrápidas, sin base de datos ni servidor que mantener. El contenido (noticias, contacto, sponsors) se edita desde un panel visual en **`/admin`** (Decap CMS), sin tocar código.

## ⚠️ Antes que nada: dos cosas críticas para revisar

1. **No recibí las capturas del sitio anterior.** Tu mensaje las mencionaba, pero no llegó ningún archivo adjunto a esta conversación. Diseñé el portal a partir de tu descripción textual y de la estructura de menú que me diste. Si querés que ajuste colores, disposición de bloques o el estilo de las tarjetas para que se parezca más al original, compartí las capturas y lo adapto.

2. **La URL de streaming es HTTP, no HTTPS:** `http://centova.radiosnethosting.com:9748/;stream.mp3`. Un sitio publicado en Netlify (o cualquier hosting moderno) se sirve por HTTPS, y los navegadores **bloquean por seguridad** la carga de audio HTTP desde una página HTTPS ("contenido mixto"). El reproductor ya detecta esta situación y avisa en pantalla, pero **el audio no va a sonar hasta que se resuelva**. Opciones, de más a menos recomendable:
   - Pedirle a tu proveedor de streaming (Centova/Radiosnet Hosting) una URL con HTTPS o SSL para el mismo stream — es lo más común y muchos proveedores lo ofrecen sin costo extra.
   - Poner un proxy HTTPS gratuito delante del stream (por ejemplo, un Worker de Cloudflare) que reciba pedidos HTTPS y los reenvíe al servidor HTTP.
   - Como alternativa temporal, alojar el sitio en un hosting que sirva por HTTP simple — **no recomendado**, porque perdés seguridad en todo el sitio (formulario de contacto incluido).

## 1. Cómo se edita el contenido (para tu papá, sin código)

Una vez publicado el sitio (sección 3), se entra a **`https://tudominio.com.ar/admin`**, se inicia sesión con el correo invitado, y aparece un panel con dos secciones:

- **Noticias:** botón "Nueva Noticia" → cargar título, fecha, elegir la categoría de una lista desplegable, subir la foto de portada, escribir la bajada y el cuerpo de la nota en un editor de texto enriquecido (como Word). Al guardar y publicar, la nota aparece sola en la portada y en su sección dentro de 1 a 2 minutos (tiempo que tarda el sitio en reconstruirse).
- **Configuración del sitio:** tres formularios para cambiar, sin tocar código:
  - **Datos de contacto y redes sociales:** WhatsApp, email, dirección, Facebook, Instagram, YouTube, X.
  - **Sponsors y banners publicitarios:** agregar, editar o quitar banners (nombre, imagen, enlace) que se muestran en la barra lateral de todo el sitio.
  - **Datos generales de la emisora:** nombre, frecuencia, eslogan y **la URL del stream de audio** — se puede actualizar el día que tengan la URL con HTTPS, sin pedirle nada a nadie.

Los cambios en "Noticias" quedan guardados como una lista con fecha, para poder ver el historial o deshacer un error.

## 2. Estructura del proyecto

```
radio-exito-portal/
├── package.json / .eleventy.js     Configuración de Eleventy
├── netlify.toml                    Configuración de build para Netlify
├── admin/                          Panel de administración (Decap CMS)
│   ├── index.html
│   └── config.yml                  Acá se definen los campos del formulario de noticias
├── src/
│   ├── _data/
│   │   ├── categorias.js            Lista única de secciones del menú
│   │   ├── site.json                Nombre, frecuencia, URL del stream
│   │   ├── contacto.json            WhatsApp, email, redes sociales
│   │   └── sponsors.json            Banners publicitarios
│   ├── _includes/
│   │   ├── layouts/base.njk         Estructura HTML común a todo el sitio
│   │   ├── layouts/articulo.njk     Plantilla de una noticia individual
│   │   └── partials/                Header, footer, reproductor, sidebar, etc.
│   ├── noticias/                    Cada noticia es un archivo .md (uno por nota)
│   ├── legal/                       Privacidad, Términos, Cookies, Reembolsos
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

Se actualiza solo: consulta en el momento una API pública argentina (ArgentinaDatos, sin necesidad de clave ni de que nadie cargue el valor a mano) y muestra Oficial y Blue, compra y venta. Si la API no responde, el widget lo indica y ofrece un enlace alternativo, en vez de mostrar un dato viejo o incorrecto.

## 6. "Lo más leído"

Por simplicidad y para no depender de analítica en tiempo real, esta sección se arma con las noticias que se marquen como **"Destacar en Lo más leído"** al cargarlas desde `/admin` — así tu papá controla qué aparece ahí, sin necesitar Google Analytics ni ninguna integración extra.

## 7. Tapas de diarios

Por respeto a los derechos de autor, el sitio **no reproduce las portadas de otros medios**: la sección enlaza directamente a los sitios oficiales de los diarios nacionales y regionales, y a un agregador público de tapas (Kiosko.net).

## 8. Accesibilidad, SEO y cumplimiento legal ya incluidos

- Contraste verificado para modo oscuro, navegación completa por teclado con foco visible, enlace "Saltar al contenido principal", `prefers-reduced-motion` respetado.
- HTML semántico, metadatos Open Graph, `sitemap.xml` generado automáticamente a partir de todas las páginas y noticias, `robots.txt`.
- Cuatro páginas legales completas para Argentina: Privacidad (Ley 25.326, derechos ARCO, AAIP), Términos y Condiciones (Ley 24.240, jurisdicción Corrientes), Cookies (con banner que bloquea Google Analytics hasta el consentimiento) y Reembolsos (acotada a pauta publicitaria).
- El formulario de contacto exige tildar la casilla de consentimiento antes de habilitar el envío.
- Los íconos son SVG propios; no hay imágenes de stock ni contenido de terceros embebido sin autorización.

## 9. Cómo funciona el reproductor persistente

El `<audio>` y la barra del reproductor viven **fuera** de `<main id="main-content">`, en `base.njk`. Un router liviano en `assets/js/main.js` intercepta los clics en enlaces internos, trae la página siguiente por `fetch()` y reemplaza sólo el contenido de `<main>` — así el audio nunca se corta al pasar de una noticia a otra o de sección. Si JavaScript falla o está desactivado, cada enlace sigue funcionando como una navegación de página completa normal.

## 10. Google Analytics (opcional)

El banner de cookies ya bloquea la carga de Google Analytics hasta que el visitante acepta. Para activarlo, pegá tu ID de medición (`G-XXXXXXXXXX`) como `gaId` en la parte superior de `src/_includes/layouts/base.njk` (`window.SITE_CONFIG`), o convertilo en un campo más del panel de administración si preferís no tocar código nunca más.
