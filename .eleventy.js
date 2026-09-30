module.exports = function (eleventyConfig) {
  // ------------------------------------------------------------------
  // Archivos estáticos que se copian tal cual (sin procesar)
  // ------------------------------------------------------------------
  eleventyConfig.addPassthroughCopy({ "src/assets": "assets" });
  eleventyConfig.addPassthroughCopy({ admin: "admin" });
  eleventyConfig.addPassthroughCopy({ "src/robots.txt": "robots.txt" });

  // ------------------------------------------------------------------
  // Colecciones
  // ------------------------------------------------------------------

  // Noticias: todos los .md dentro de src/noticias, más nuevas primero
  eleventyConfig.addCollection("noticias", function (collectionApi) {
    return collectionApi
      .getFilteredByGlob("src/noticias/*.md")
      .sort((a, b) => b.date - a.date);
  });

  // Programación: cada programa es un archivo en src/programacion/*.md,
  // administrable desde /admin. Se ignoran los inactivos y se ordenan
  // por hora de inicio.
  eleventyConfig.addCollection("programas", function (collectionApi) {
    return collectionApi
      .getFilteredByGlob("src/programacion/*.md")
      .filter((p) => p.data.activo !== false)
      .sort((a, b) => (a.data.horaInicio || "").localeCompare(b.data.horaInicio || ""));
  });

  // Equipo: periodistas y conductores cargados desde /admin (src/equipo/*.md)
  eleventyConfig.addCollection("equipo", function (collectionApi) {
    return collectionApi
      .getFilteredByGlob("src/equipo/*.md")
      .filter((p) => p.data.activo !== false)
      .sort((a, b) => (a.data.orden || 100) - (b.data.orden || 100));
  });

  // ------------------------------------------------------------------
  // Filtros de fechas
  // ------------------------------------------------------------------

  // "24 de septiembre de 2026"
  eleventyConfig.addFilter("fechaLarga", function (dateObj) {
    try {
      return new Intl.DateTimeFormat("es-AR", {
        day: "numeric", month: "long", year: "numeric", timeZone: "America/Argentina/Buenos_Aires"
      }).format(new Date(dateObj));
    } catch (e) { return ""; }
  });

  // "12:42" (hora de Argentina)
  eleventyConfig.addFilter("horaCorta", function (dateObj) {
    try {
      return new Intl.DateTimeFormat("es-AR", {
        hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "America/Argentina/Buenos_Aires"
      }).format(new Date(dateObj));
    } catch (e) { return ""; }
  });

  // ISO completo para el atributo datetime de <time>
  eleventyConfig.addFilter("isoDate", function (dateObj) {
    try { return new Date(dateObj).toISOString(); } catch (e) { return ""; }
  });

  // Fecha RFC-822 (requerida por RSS)
  eleventyConfig.addFilter("rfc822", function (dateObj) {
    try { return new Date(dateObj).toUTCString(); } catch (e) { return ""; }
  });

  // ------------------------------------------------------------------
  // Filtros de colecciones
  // ------------------------------------------------------------------

  eleventyConfig.addFilter("porCategoria", function (posts, slug) {
    return (posts || []).filter((p) => p.data.categoria === slug);
  });

  eleventyConfig.addFilter("destacadas", function (posts) {
    return (posts || []).filter((p) => p.data.destacada === true);
  });

  // Separa la "noticia principal" del resto. Si hay una marcada como
  // ÚLTIMA HORA, esa es la principal; si no, la más reciente.
  eleventyConfig.addFilter("portada", function (posts) {
    const lista = posts || [];
    const lead = lista.find((p) => p.data.ultimaHora === true) || lista[0] || null;
    const resto = lista.filter((p) => p !== lead);
    return { lead: lead, resto: resto };
  });

  // Programas que salen al aire un día dado
  eleventyConfig.addFilter("enDia", function (programas, dia) {
    return (programas || []).filter((p) => (p.data.dias || []).indexOf(dia) !== -1);
  });

  // Quita valores vacíos de una lista (por ejemplo, redes sociales no cargadas)
  eleventyConfig.addFilter("compactar", function (arr) {
    return (arr || []).filter(Boolean);
  });

  eleventyConfig.addFilter("urlencode", function (v) {
    return encodeURIComponent(v == null ? "" : v);
  });

  eleventyConfig.addFilter("limitar", function (arr, n) {
    return (arr || []).slice(0, n);
  });

  eleventyConfig.addFilter("nombreCategoria", function (slug, categorias) {
    const encontrada = (categorias || []).find((c) => c.slug === slug);
    return encontrada ? encontrada.nombre : slug;
  });

  // Sponsors activos para una posición dada ("sidebar", "home", "noticia", "footer").
  // Las fechas de inicio/fin se controlan en el navegador (ver sponsors.js),
  // porque el sitio es estático y un sponsor puede vencer sin que haya un
  // nuevo build.
  eleventyConfig.addFilter("sponsorsPara", function (items, posicion) {
    return (items || []).filter(function (s) {
      const pos = s.posicion || "sidebar";
      return s.activo !== false && (pos === posicion || pos === "todas");
    });
  });

  // ------------------------------------------------------------------
  // Filtros de texto / serialización
  // ------------------------------------------------------------------

  // JSON seguro para incrustar dentro de <script>
  eleventyConfig.addFilter("dump", function (value) {
    return JSON.stringify(value === undefined ? null : value)
      .replace(/</g, "\\u003c")
      .replace(/>/g, "\\u003e")
      .replace(/\u2028/g, "\\u2028")
      .replace(/\u2029/g, "\\u2029");
  });

  // Quita etiquetas HTML y colapsa espacios
  eleventyConfig.addFilter("stripHtml", function (html) {
    return String(html || "")
      .replace(/<[^>]*>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\s+/g, " ")
      .trim();
  });

  eleventyConfig.addFilter("truncar", function (texto, largo) {
    const t = String(texto || "");
    return t.length > largo ? t.slice(0, largo).trim() + "…" : t;
  });

  // Escapa texto para XML (RSS / sitemap)
  eleventyConfig.addFilter("xmlEscape", function (texto) {
    return String(texto || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&apos;");
  });

  // Programación serializada para el navegador (programa actual / siguiente)
  eleventyConfig.addFilter("programasJson", function (programas) {
    return (programas || []).map(function (p) {
      return {
        nombre: p.data.nombre,
        conductor: p.data.conductor || "",
        horaInicio: p.data.horaInicio,
        horaFin: p.data.horaFin,
        dias: p.data.dias || [],
        url: p.url
      };
    });
  });

  // srcset con el Image CDN de Netlify (WebP + varios anchos). Sólo se usa
  // cuando site.imageCdn === "netlify"; en cualquier otro caso devuelve "".
  eleventyConfig.addFilter("srcset", function (src, anchos, cdn) {
    if (cdn !== "netlify" || !src || String(src).indexOf("/assets/") !== 0) return "";
    return (anchos || [400, 800, 1200])
      .map(function (w) {
        return "/.netlify/images?url=" + encodeURIComponent(src) + "&w=" + w + "&fm=webp " + w + "w";
      })
      .join(", ");
  });

  return {
    dir: {
      input: "src",
      includes: "_includes",
      data: "_data",
      output: "_site"
    },
    templateFormats: ["njk", "md", "html"],
    htmlTemplateEngine: "njk",
    markdownTemplateEngine: "njk",
    dataTemplateEngine: "njk"
  };
};
