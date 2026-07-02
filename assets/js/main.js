/* ============================================================
   QITEP Interactive Math Course — Shared JavaScript
   ------------------------------------------------------------
   Beginner note: this file is loaded on every page. It does two
   small, independent jobs. Read the comments — they're written
   as a mini walkthrough, not just documentation.
   ============================================================ */

// ---- JOB 1: Highlight the current page in the top navigation ----
// Every nav link has a "data-page" attribute (e.g. data-page="module-4").
// We compare it to a global PAGE_ID variable that each HTML page sets
// in a small inline <script> before this file loads. If they match,
// we add the "current" CSS class so the link looks highlighted.
(function highlightCurrentNav() {
  var id = window.PAGE_ID || "";
  document.querySelectorAll("header.site-nav nav a[data-page]").forEach(function (a) {
    if (a.getAttribute("data-page") === id) {
      a.classList.add("current");
    }
  });
})();

/* ============================================================
   JOB 2: A reusable "watchdog" for third-party embeds
   ------------------------------------------------------------
   Desmos, Mathigon/Polypad, and Graspable Math are all external
   services. Sometimes they load instantly. Sometimes a school
   wifi is slow, a script version changes, or a site blocks being
   shown inside an <iframe>. Instead of leaving teachers staring
   at a blank box, every embed on this site follows the same
   pattern:

     1. Show a small spinner ("Loading Desmos...").
     2. Try to load the real tool.
     3. If it hasn't loaded after a few seconds, OR it throws an
        error, hide the spinner and show a friendly fallback with
        a button that opens the tool in a new browser tab instead.

   This function is intentionally generic so you can reuse it for
   ANY embed you add later — just give it the container's id and,
   optionally, a function that resolves once the embed is "ready".
   ============================================================ */
function watchEmbed(containerId, opts) {
  opts = opts || {};
  var timeoutMs = opts.timeoutMs || 6000;
  var container = document.getElementById(containerId);
  if (!container) return;

  var loadingEl = container.querySelector(".embed-loading");
  var fallbackEl = container.querySelector(".embed-fallback");

  var settled = false;
  function markReady() {
    if (settled) return;
    settled = true;
    if (loadingEl) loadingEl.style.display = "none";
  }
  function markFallback() {
    if (settled) return;
    settled = true;
    if (loadingEl) loadingEl.style.display = "none";
    if (fallbackEl) fallbackEl.classList.add("show");
  }

  // If the caller gave us a "ready" promise/check (e.g. Graspable Math's
  // loadGM callback), use it. Otherwise we just assume an <iframe> loaded
  // fine once its "load" event fires.
  if (opts.readyPromise) {
    opts.readyPromise.then(markReady).catch(markFallback);
  } else if (opts.iframe) {
    opts.iframe.addEventListener("load", markReady);
    opts.iframe.addEventListener("error", markFallback);
  }

  // Safety net: no matter what, stop waiting after `timeoutMs`.
  setTimeout(function () {
    if (!settled) markFallback();
  }, timeoutMs);
}

// ---- Small mobile nav horizontal-scroll hint (purely cosmetic) ----
(function () {
  var nav = document.querySelector("header.site-nav nav");
  if (!nav) return;
  var current = nav.querySelector("a.current");
  if (current && current.scrollIntoView) {
    current.scrollIntoView({ inline: "center", block: "nearest" });
  }
})();
