/* =====================================================================
   OhBlog — preview admin bergaya tema Byte
   Panel Preview Sveltia berjalan di iframe terpisah, jadi CSS tema dipasang
   lewat registerPreviewStyle, dan susunan halaman artikel dibuat ulang
   (mengikuti src/layouts/PostSingle.astro) lewat registerPreviewTemplate.
   ===================================================================== */
(function () {
  "use strict";

  var CMS = window.CMS;
  var h = CMS.React.createElement;
  var origin = window.location.origin;

  [
    "https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,700;12..96,800&family=IBM+Plex+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;700&display=swap",
    origin + "/byte/css/vendor/bootstrap.min.css",
    origin + "/byte/css/style.css",
    origin + "/byte/css/ohblog.css",
  ].forEach(function (url) { CMS.registerPreviewStyle(url); });
  CMS.registerPreviewStyle("body { min-height: 0; } .preview-note { font-family: var(--font-mono); font-size: .72rem; color: var(--ink-faint); padding: .8rem var(--gutter); border-bottom: 1px solid var(--line); }", { raw: true });

  /* ---- util ---------------------------------------------------------- */
  function toJS(value) {
    return value && typeof value.toJS === "function" ? value.toJS() : value;
  }
  // gambar lokal (/images/...) → URL lengkap; Cloudinary → versi lebar 1600px
  function imageUrl(src) {
    if (!src) return "";
    if (src.indexOf("res.cloudinary.com") !== -1) return src.replace("/upload/", "/upload/c_limit,w_1600,q_auto,f_auto/");
    return src.charAt(0) === "/" ? origin + src : src;
  }
  function formatDate(value) {
    if (!value) return "";
    var date = new Date(value);
    return isNaN(date) ? String(value) : date.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
  }
  function readingTime(body) {
    var words = String(body || "").split(/\s+/).filter(function (w) { return /\w/.test(w); }).length;
    return Math.max(1, Math.ceil(words / 200)) + " menit baca";
  }
  function slugify(text) {
    return String(text || "").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  }
  // warna titik chip, sama dengan src/lib/utils/chipColor.ts
  var palette = ["#d08b5b", "#3178c6", "#2c7a5f", "#e3c220", "#00add8", "#b4394d", "#6d4aa3", "#d67e2b"];
  function chipColor(name) {
    var hash = 0;
    String(name).toLowerCase().split("").forEach(function (ch) { hash = (hash * 31 + ch.charCodeAt(0)) >>> 0; });
    return palette[hash % palette.length];
  }

  /* ---- preview artikel ------------------------------------------------ */
  function BlogPreview(props) {
    var data = props.entry.get("data");
    var title = data.get("title") || "Judul artikel";
    var description = data.get("description");
    var image = data.get("image");
    var author = data.get("author") || "admin";
    // artikel menyimpan ID penulis (mis. "admin"); tampilkan nama dari koleksi Penulis
    var nameState = CMS.React.useState(author);
    var authorName = nameState[0];
    var setAuthorName = nameState[1];
    CMS.React.useEffect(function () {
      setAuthorName(author);
      if (!props.getCollection) return;
      Promise.resolve(props.getCollection("authors", author))
        .then(function (found) {
          var entry = Array.isArray(found) ? found[0] : found;
          var name = entry && (typeof entry.getIn === "function" ? entry.getIn(["data", "title"]) : entry.data && entry.data.title);
          if (name) setAuthorName(name);
        })
        .catch(function () {});
    }, [author]);
    var categories = toJS(data.get("categories")) || [];
    var tags = toJS(data.get("tags")) || [];
    var meta = [formatDate(data.get("date")), readingTime(data.get("body"))].filter(Boolean);

    return h("div", null,
      data.get("draft") && h("div", { className: "preview-note" }, "// draft — belum tampil di situs"),
      h("article", null,
        h("div", { className: "article-hero" },
          h("div", { className: "wrap" },
            h("nav", { className: "breadcrumb" },
              h("span", null, "~/"), h("span", { className: "sl" }, "/"),
              h("span", null, "blog"), h("span", { className: "sl" }, "/"),
              h("span", null, props.entry.get("slug") || slugify(title))
            ),
            h("div", { className: "pcard-chips", style: { marginTop: "1rem" } },
              categories.map(function (category) {
                return h("span", { key: category, className: "chip", style: { "--dot": chipColor(category) } }, h("span", { className: "dot" }), category);
              })
            ),
            h("h1", { className: "article-title" }, title),
            description && h("p", { className: "article-lead" }, description),
            h("div", { className: "article-meta" },
              h("span", { className: "byline" }, h("b", null, authorName)),
              h("span", { className: "meta" }, meta.join(" · "))
            ),
            image && h("figure", { className: "article-figure" },
              h("div", { className: "frame" }, h("img", { src: imageUrl(image), alt: title }))
            )
          )
        ),
        h("div", { className: "section section--tight" },
          h("div", { className: "wrap" },
            h("div", { className: "prose", style: { marginInline: "auto" } },
              props.widgetFor("body"),
              tags.length > 0 && h("div", { className: "post-tags" },
                h("h4", { className: "widget-title" }, "Tag"),
                h("div", { className: "tag-cloud" },
                  tags.map(function (tag) { return h("a", { key: tag }, "#" + slugify(tag)); })
                )
              )
            )
          )
        )
      )
    );
  }

  /* ---- preview halaman biasa (About, Kontak, Privasi) ------------------ */
  function PagePreview(props) {
    var data = props.entry.get("data");
    var title = data.get("title") || "Judul halaman";
    var image = data.get("image");
    return h("div", null,
      h("section", { className: "page-head" },
        h("div", { className: "wrap" },
          h("h1", null, title),
          data.get("description") && h("p", null, data.get("description"))
        )
      ),
      h("section", { className: "section section--tight" },
        h("div", { className: "wrap" },
          h("div", { className: "prose", style: { marginInline: "auto" } },
            image && h("figure", { className: "page-figure" }, h("img", { src: imageUrl(image), alt: title })),
            data.get("body") !== undefined && props.widgetFor("body")
          )
        )
      )
    );
  }

  CMS.registerPreviewTemplate("blog", BlogPreview);
  ["about", "contact", "privacy"].forEach(function (name) { CMS.registerPreviewTemplate(name, PagePreview); });
})();
