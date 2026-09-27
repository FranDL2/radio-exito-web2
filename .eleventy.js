module.exports = function (eleventyConfig) {
  // ------------------------------------------------------------------
  // Archivos estáticos que se copian tal cual (sin procesar)
  // ------------------------------------------------------------------
  eleventyConfig.addPassthroughCopy({ "src/assets": "assets" });
  eleventyConfig.addPassthroughCopy({ admin: "admin" });
  eleventyConfig.addPassthroughCopy({ "src/robots.txt": "robots.txt" });

  // ------------------------------------------------------------------
  // Colección de noticias: todos los .md dentro de src/noticias
  // ------------------------------------------------------------------
  eleventyConfig.addCollection("noticias", function (collectionApi) {
    return collectionApi
      .getFilteredByGlob("src/noticias/*.md")
      .sort((a, b) => b.date - a.date);
  });

  // Programación: cada programa es un archivo en src/programacion/*.md,
  // administrable desde /admin. Se ignoran los marcados como inactivos
  // y se ordenan por hora de inicio.
  eleventyConfig.addCollection("programas", function (collectionApi) {
    return collectionApi
      .getFilteredByGlob("src/programacion/*.md")
      .filter((p) => p.data.activo !== false)
      .sort((a, b) => (a.data.horaInicio || "").localeCompare(b.data.horaInicio || ""));
  });

  // ------------------------------------------------------------------
  // Filtros
  // ------------------------------------------------------------------

  // Formatea una fecha en español, ej: "24 de septiembre de 2026"
  eleventyConfig.addFilter("fechaLarga", function (dateObj) {
    try {
      return new Intl.DateTimeFormat("es-AR", {
        day: "numeric",
        month: "long",
        year: "numeric"
      }).format(new Date(dateObj));
    } catch (e) {
      return "";
    }
  });

  // Fecha completa en formato ISO, para el atributo datetime de <time>
  eleventyConfig.addFilter("isoDate", function (dateObj) {
    try { return new Date(dateObj).toISOString(); } catch (e) { return ""; }
  });

  // Hora corta (HH:MM) en español
  eleventyConfig.addFilter("horaCorta", function (dateObj) {
    try {
      return new Intl.DateTimeFormat("es-AR", { hour: "2-digit", minute: "2-digit" }).format(new Date(dateObj));
    } catch (e) { return ""; }
  });

  // Filtra un array de noticias por el slug de categoría
  eleventyConfig.addFilter("porCategoria", function (posts, slug) {
    return (posts || []).filter((p) => p.data.categoria === slug);
  });

  // Devuelve sólo las noticias marcadas como destacadas ("lo más leído")
  eleventyConfig.addFilter("destacadas", function (posts) {
    return (posts || []).filter((p) => p.data.destacada === true);
  });

  // Filtra programas de la colección "programas" que salen al aire un día dado
  eleventyConfig.addFilter("enDia", function (programas, dia) {
    return (programas || []).filter((p) => (p.data.dias || []).indexOf(dia) !== -1);
  });

  // Recorta un array a los primeros N elementos
  eleventyConfig.addFilter("limitar", function (arr, n) {
    return (arr || []).slice(0, n);
  });

  // Nombre legible de una categoría a partir de su slug
  eleventyConfig.addFilter("nombreCategoria", function (slug, categorias) {
    const encontrada = (categorias || []).find((c) => c.slug === slug);
    return encontrada ? encontrada.nombre : slug;
  });

  // Convierte un valor a JSON seguro para insertarlo dentro de un <script>
  eleventyConfig.addFilter("dump", function (value) {
    return JSON.stringify(value === undefined ? null : value);
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
