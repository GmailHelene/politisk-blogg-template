/* Generisk skjemaside (tips, bli skribent): henter merkenavn + meny, og
   sender skjema via Netlify Forms (AJAX, urlencoded). Skjemaet markeres med
   data-ajax, data-takk="#id" og data-feil="#id". */
(function () {
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => Array.from(document.querySelectorAll(s));

  fetch("content/innhold.json", { cache: "no-store" })
    .then((r) => (r.ok ? r.json() : {}))
    .then((D) => {
      const info = (D && D.info) || {};
      if (info.navn) $$("[data-navn]").forEach((el) => (el.textContent = info.navn));
      window.MV.renderNav();
    })
    .catch(() => window.MV.renderNav());

  $$("form[data-ajax]").forEach((form) => {
    const takkSel = form.getAttribute("data-takk");
    const feilSel = form.getAttribute("data-feil");
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const feil = feilSel ? $(feilSel) : null;
      if (feil) feil.hidden = true;
      const btn = form.querySelector("button[type=submit]");
      const orig = btn ? btn.textContent : "";
      if (btn) { btn.disabled = true; btn.textContent = "Sender …"; }
      const body = new URLSearchParams(new FormData(form)).toString();
      fetch("/", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body })
        .then((r) => {
          if (!r.ok) throw new Error("status " + r.status);
          form.hidden = true;
          const takk = takkSel ? $(takkSel) : null;
          if (takk) takk.hidden = false;
          window.scrollTo({ top: 0, behavior: "smooth" });
        })
        .catch(() => {
          if (btn) { btn.disabled = false; btn.textContent = orig; }
          if (feil) feil.hidden = false;
        });
    });
  });
})();
