/* Byte — flash-free theme init.
   Runs blocking in <head> BEFORE first paint so a stored dark/light
   choice never flashes. Only touches documentElement — no DOM needed.
   CSP-safe: external self-hosted file, no inline script. */
(function () {
  try {
    var saved = localStorage.getItem("byte-theme");
    if (saved === "dark" || saved === "light") {
      document.documentElement.setAttribute("data-theme", saved);
    }
    /* No saved choice -> leave attribute unset so the CSS
       prefers-color-scheme media query handles it automatically. */
  } catch (e) { /* private mode / storage blocked: fall back to CSS */ }
})();
