/* =====================================================================
   OhBlog — field gambar Cloudinary untuk Sveltia CMS
   - Upload: gambar diubah ke WebP & diperkecil di browser, lalu dikirim
     langsung ke Cloudinary dengan signature dari /api/cloudinary/sign.
   - Galeri: daftar gambar di folder blog dari /api/cloudinary/list.
   Endpoint hanya melayani sesi admin yang login GitHub & punya akses repo.
   ===================================================================== */
(function () {
  "use strict";

  var CMS = window.CMS;
  var React = CMS.React;
  var h = React.createElement;

  var MAX_SIZE = 2048; // sisi terpanjang, px
  var QUALITY = 0.85; // kualitas WebP

  /* ---- util ---------------------------------------------------------- */
  function getToken() {
    try {
      var user = JSON.parse(localStorage.getItem("sveltia-cms.user") || "null");
      return (user && user.token) || "";
    } catch (e) {
      return "";
    }
  }

  function api(path, options) {
    options = options || {};
    var token = getToken();
    if (!token) {
      return Promise.reject(new Error("Login dengan GitHub dulu untuk memakai Cloudinary."));
    }
    var headers = Object.assign({ Authorization: "Bearer " + token }, options.headers || {});
    return fetch(path, Object.assign({}, options, { headers: headers })).then(function (res) {
      return res.json().catch(function () { return {}; }).then(function (data) {
        if (!res.ok) throw new Error(data.error || "Permintaan gagal (" + res.status + ").");
        return data;
      });
    });
  }

  function formatBytes(bytes) {
    if (!bytes && bytes !== 0) return "";
    if (bytes < 1024 * 1024) return Math.max(1, Math.round(bytes / 1024)) + " KB";
    return (bytes / 1024 / 1024).toFixed(1) + " MB";
  }

  // nama file → public_id: "Foto Liburan.JPG" → "foto-liburan-lx3k9a"
  function toPublicId(name) {
    var base = String(name || "gambar")
      .replace(/\.[^.]+$/, "")
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "gambar";
    return base + "-" + Date.now().toString(36);
  }

  // URL thumbnail kecil untuk galeri/preview
  function thumb(url, width) {
    return String(url).replace("/upload/", "/upload/c_limit,w_" + (width || 400) + ",q_auto,f_auto/");
  }

  // Ubah gambar ke WebP & perkecil di browser sebelum diupload.
  // SVG/GIF dikirim apa adanya (Cloudinary tetap menyimpannya sebagai WebP).
  function toWebP(file) {
    if (!/^image\/(jpeg|png|webp|bmp|avif|heic|heif)$/i.test(file.type)) {
      return Promise.resolve(file);
    }
    return createImageBitmap(file, { imageOrientation: "from-image" })
      .then(function (bitmap) {
        var scale = Math.min(1, MAX_SIZE / Math.max(bitmap.width, bitmap.height));
        var canvas = document.createElement("canvas");
        canvas.width = Math.round(bitmap.width * scale);
        canvas.height = Math.round(bitmap.height * scale);
        canvas.getContext("2d").drawImage(bitmap, 0, 0, canvas.width, canvas.height);
        bitmap.close && bitmap.close();
        return new Promise(function (resolve) {
          canvas.toBlob(function (blob) {
            // browser lama yang tidak bisa membuat WebP → pakai file asli
            resolve(blob && blob.type === "image/webp" ? blob : file);
          }, "image/webp", QUALITY);
        });
      })
      .catch(function () {
        return file;
      });
  }

  function upload(file, onStatus) {
    onStatus("Mengubah ke WebP…");
    return toWebP(file).then(function (webp) {
      onStatus("Mengupload " + formatBytes(webp.size) + "…");
      return api("/api/cloudinary/sign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ public_id: toPublicId(file.name) }),
      }).then(function (sig) {
        var form = new FormData();
        form.append("file", webp, sig.public_id + ".webp");
        ["api_key", "timestamp", "signature", "folder", "public_id", "format"].forEach(function (key) {
          form.append(key, sig[key]);
        });
        return fetch("https://api.cloudinary.com/v1_1/" + sig.cloud_name + "/image/upload", {
          method: "POST",
          body: form,
        })
          .then(function (res) { return res.json(); })
          .then(function (data) {
            if (data.error) throw new Error(data.error.message || "Upload ke Cloudinary gagal.");
            return { url: data.secure_url, before: file.size, after: data.bytes };
          });
      });
    });
  }

  /* ---- gaya kecil (mengikuti warna tema admin bila ada) --------------- */
  var css = {
    box: { display: "flex", flexDirection: "column", gap: "10px" },
    row: { display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" },
    btn: {
      padding: "6px 12px", borderRadius: "6px", border: "1px solid rgba(128,128,128,.4)",
      background: "transparent", color: "inherit", cursor: "pointer", font: "inherit", fontSize: "13px",
    },
    preview: { maxWidth: "100%", maxHeight: "220px", borderRadius: "6px", objectFit: "contain", alignSelf: "flex-start", background: "rgba(128,128,128,.12)" },
    input: { width: "100%", font: "inherit", fontSize: "12px", padding: "6px 8px", borderRadius: "6px", border: "1px solid rgba(128,128,128,.4)", background: "transparent", color: "inherit" },
    note: { fontSize: "12px", opacity: 0.75 },
    error: { fontSize: "12px", color: "#e5484d" },
    grid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(110px, 1fr))", gap: "8px", maxHeight: "360px", overflowY: "auto", padding: "4px" },
    tile: { padding: 0, border: "2px solid transparent", borderRadius: "6px", overflow: "hidden", cursor: "pointer", background: "rgba(128,128,128,.12)", aspectRatio: "1 / 1" },
    tileImg: { width: "100%", height: "100%", objectFit: "cover", display: "block" },
  };

  /* ---- field: Gambar Cloudinary ---------------------------------------- */
  function CloudinaryImageControl(props) {
    var value = props.value || "";
    var useState = React.useState;
    var fileInput = React.useRef(null);

    var busyState = useState(""); var busy = busyState[0]; var setBusy = busyState[1];
    var errorState = useState(""); var error = errorState[0]; var setError = errorState[1];
    var noteState = useState(""); var note = noteState[0]; var setNote = noteState[1];
    var openState = useState(false); var open = openState[0]; var setOpen = openState[1];
    var itemsState = useState([]); var items = itemsState[0]; var setItems = itemsState[1];
    var cursorState = useState(null); var cursor = cursorState[0]; var setCursor = cursorState[1];

    function loadGallery(nextCursor) {
      setBusy("Memuat galeri…");
      setError("");
      api("/api/cloudinary/list" + (nextCursor ? "?cursor=" + encodeURIComponent(nextCursor) : ""))
        .then(function (data) {
          setItems(function (prev) { return nextCursor ? prev.concat(data.resources) : data.resources; });
          setCursor(data.next_cursor);
        })
        .catch(function (err) { setError(err.message); })
        .finally(function () { setBusy(""); });
    }

    function onFile(event) {
      var file = event.target.files && event.target.files[0];
      event.target.value = "";
      if (!file) return;
      setError("");
      setNote("");
      upload(file, setBusy)
        .then(function (result) {
          props.onChange(result.url);
          setNote("Tersimpan sebagai WebP: " + formatBytes(result.before) + " → " + formatBytes(result.after));
          setItems([]);
        })
        .catch(function (err) { setError(err.message); })
        .finally(function () { setBusy(""); });
    }

    function toggleGallery() {
      var next = !open;
      setOpen(next);
      if (next && !items.length) loadGallery(null);
    }

    return h("div", { style: css.box },
      value && h("img", { src: thumb(value, 800), alt: "", style: css.preview }),
      h("div", { style: css.row },
        h("button", { type: "button", style: css.btn, disabled: !!busy, onClick: function () { fileInput.current.click(); } }, "⬆ Upload gambar"),
        h("button", { type: "button", style: css.btn, disabled: !!busy, onClick: toggleGallery }, open ? "Tutup galeri" : "🖼 Pilih dari Cloudinary"),
        value && h("button", { type: "button", style: css.btn, disabled: !!busy, onClick: function () { props.onChange(""); setNote(""); } }, "Hapus"),
        h("input", { ref: fileInput, type: "file", accept: "image/*", style: { display: "none" }, onChange: onFile })
      ),
      busy && h("div", { style: css.note }, busy),
      note && h("div", { style: css.note }, "✓ " + note),
      error && h("div", { style: css.error }, error),
      open && h("div", { style: css.box },
        h("div", { style: css.grid },
          items.map(function (item) {
            var selected = item.url === value;
            return h("button", {
              key: item.public_id,
              type: "button",
              title: item.public_id + " · " + item.width + "×" + item.height + " · " + formatBytes(item.bytes),
              style: Object.assign({}, css.tile, selected ? { borderColor: "#e5484d" } : {}),
              onClick: function () { props.onChange(item.url); setOpen(false); },
            }, h("img", { src: thumb(item.url, 240), alt: "", loading: "lazy", style: css.tileImg }));
          })
        ),
        !busy && !items.length && !error && h("div", { style: css.note }, "Belum ada gambar di folder ini."),
        cursor && h("button", { type: "button", style: css.btn, disabled: !!busy, onClick: function () { loadGallery(cursor); } }, "Muat lebih banyak")
      ),
      h("input", {
        id: props.forID,
        type: "url",
        placeholder: "atau tempel URL gambar",
        value: value,
        style: css.input,
        onChange: function (event) { props.onChange(event.target.value); },
      })
    );
  }

  function CloudinaryImagePreview(props) {
    return props.value ? h("img", { src: thumb(props.value, 800), alt: "", style: { maxWidth: "100%" } }) : null;
  }

  CMS.registerFieldType("cloudinary-image", CloudinaryImageControl, CloudinaryImagePreview);

  /* ---- blok "Gambar Cloudinary" untuk isi artikel ------------------------ */
  // Ditulis sebagai tag <img> (bukan ![alt](url)) supaya tidak diambil alih
  // blok gambar bawaan Sveltia saat artikel dibuka ulang. Valid di MDX & Markdown.
  function escapeAttr(text) {
    return String(text || "").replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
  }
  function unescapeAttr(text) {
    return String(text || "").replace(/&lt;/g, "<").replace(/&quot;/g, '"').replace(/&amp;/g, "&");
  }

  CMS.registerEditorComponent({
    id: "cloudinary-image",
    label: "Gambar Cloudinary",
    fields: [
      { name: "src", label: "Gambar", widget: "cloudinary-image" },
      { name: "alt", label: "Teks alternatif (deskripsi gambar)", widget: "string", required: false },
    ],
    pattern: /^<img src="(https:\/\/res\.cloudinary\.com\/[^"]+)" alt="([^"]*)" \/>$/,
    fromBlock: function (match) {
      return { src: match[1], alt: unescapeAttr(match[2]) };
    },
    toBlock: function (data) {
      return '<img src="' + escapeAttr(data.src) + '" alt="' + escapeAttr(data.alt) + '" />';
    },
    toPreview: function (data) {
      return '<img src="' + escapeAttr(data.src) + '" alt="' + escapeAttr(data.alt) + '" />';
    },
  });

  CMS.init();
})();
