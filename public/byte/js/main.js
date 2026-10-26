/* =====================================================================
   Byte — main.js  (vanilla JS, guard-claused inits, no dependencies)
   ===================================================================== */
(function () {
  "use strict";

  /* ---- Dark-mode toggle (persisted) ---------------------------------- */
  function initTheme() {
    var btn = document.querySelector(".theme-toggle");
    if (!btn) return;
    var root = document.documentElement;

    function current() {
      var attr = root.getAttribute("data-theme");
      if (attr) return attr;
      return window.matchMedia &&
        window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    }
    function sync() {
      var isDark = current() === "dark";
      btn.setAttribute("aria-pressed", String(isDark));
      btn.setAttribute("aria-label", isDark ? "Switch to light theme" : "Switch to dark theme");
    }
    sync();

    btn.addEventListener("click", function () {
      var next = current() === "dark" ? "light" : "dark";
      root.setAttribute("data-theme", next);
      try { localStorage.setItem("byte-theme", next); } catch (e) {}
      sync();
    });

    /* keep in sync if the OS theme changes and user hasn't overridden */
    if (window.matchMedia) {
      var mq = window.matchMedia("(prefers-color-scheme: dark)");
      var onChange = function () { if (!root.getAttribute("data-theme")) sync(); };
      if (mq.addEventListener) mq.addEventListener("change", onChange);
      else if (mq.addListener) mq.addListener(onChange);
    }
  }

  /* ---- Mobile nav ---------------------------------------------------- */
  function initNav() {
    var toggle = document.querySelector(".nav-toggle");
    var nav = document.querySelector("#main-nav");
    if (!toggle || !nav) return;

    toggle.addEventListener("click", function () {
      var open = nav.classList.toggle("open");
      toggle.setAttribute("aria-expanded", String(open));
    });
    nav.querySelectorAll("a").forEach(function (a) {
      a.addEventListener("click", function () {
        nav.classList.remove("open");
        toggle.setAttribute("aria-expanded", "false");
      });
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && nav.classList.contains("open")) {
        nav.classList.remove("open");
        toggle.setAttribute("aria-expanded", "false");
        toggle.focus();
      }
    });
  }

  /* ---- Copy buttons (code blocks) ------------------------------------ */
  function initCopy() {
    var buttons = document.querySelectorAll("[data-copy]");
    if (!buttons.length) return;

    buttons.forEach(function (btn) {
      btn.addEventListener("click", function () {
        var sel = btn.getAttribute("data-copy");
        var src = sel ? document.querySelector(sel) : null;
        var text = src ? src.innerText : "";
        var done = function () {
          var label = btn.querySelector(".copy-label");
          btn.classList.add("copied");
          if (label) label.textContent = "Copied";
          window.setTimeout(function () {
            btn.classList.remove("copied");
            if (label) label.textContent = "Copy";
          }, 1600);
        };
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(text).then(done).catch(done);
        } else {
          done();
        }
      });
    });
  }

  /* ---- Newsletter (fake submit, no backend) -------------------------- */
  function initNewsletter() {
    var form = document.querySelector("#nl-form");
    if (!form) return;
    var input = form.querySelector(".nl-input");
    var msg = document.querySelector("#nl-msg");

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (!input || !msg) return;
      var val = (input.value || "").trim();
      var ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
      if (!ok) {
        msg.style.color = "var(--brand)";
        msg.textContent = "error: enter a valid email address";
        return;
      }
      msg.style.color = "#28c840";
      msg.textContent = "✓ subscribed — check your inbox to confirm";
      form.reset();
    });
  }

  /* ---- TOC scroll-spy (post.html) ------------------------------------ */
  function initToc() {
    var links = document.querySelectorAll(".toc a[href^='#']");
    if (!links.length || !("IntersectionObserver" in window)) return;

    var map = {};
    var targets = [];
    links.forEach(function (a) {
      var id = a.getAttribute("href").slice(1);
      var el = document.getElementById(id);
      if (el) { map[id] = a; targets.push(el); }
    });
    if (!targets.length) return;

    var current = null;
    var obs = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          if (current) current.classList.remove("active");
          current = map[entry.target.id];
          if (current) current.classList.add("active");
        }
      });
    }, { rootMargin: "-15% 0px -70% 0px", threshold: 0 });

    targets.forEach(function (t) { obs.observe(t); });

    links.forEach(function (a) {
      a.addEventListener("click", function () {
        links.forEach(function (l) { l.classList.remove("active"); });
        a.classList.add("active");
      });
    });
  }

  /* ---- Header shadow on scroll --------------------------------------- */
  function initHeader() {
    var header = document.querySelector(".site-header");
    if (!header) return;
    var onScroll = function () {
      if (window.scrollY > 8) header.classList.add("scrolled");
      else header.classList.remove("scrolled");
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  /* ---- boot ---------------------------------------------------------- */
  function boot() {
    initTheme();
    initNav();
    initCopy();
    initNewsletter();
    initToc();
    initHeader();
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
