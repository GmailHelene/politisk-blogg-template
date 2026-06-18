/* Skriv et gjesteinnlegg: intro-tekst fra innhold.json + innsending via Netlify Forms. */
(function () {
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => Array.from(document.querySelectorAll(s));
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"]/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[m]));
  const norm = (s) => String(s == null ? "" : s).trim().toLowerCase();

  const DEFAULT_MENY = [
    { tittel: "Innlegg", lenke: "#innlegg" },
    { tittel: "Manifestet", lenke: "#manifest" },
    { tittel: "Temaoversikt", lenke: "#temaer" },
    { tittel: "Om siden", lenke: "om.html" },
  ];

  function renderMeny(meny, temaer) {
    const nav = $("#navLinks"), cta = $("#navCta");
    if (!nav || !cta) return;
    Array.from(nav.children).forEach((c) => { if (c !== cta) c.remove(); });
    const items = Array.isArray(meny) && meny.length ? meny : DEFAULT_MENY;
    const hasTemaer = Array.isArray(temaer) && temaer.length;
    items.forEach((it) => {
      if (!it || !it.tittel) return;
      if (norm(it.lenke) === "#temaer" && hasTemaer) {
        const dd = document.createElement("div"); dd.className = "nav__dd";
        const btn = document.createElement("button"); btn.type = "button"; btn.className = "nav__dd-toggle"; btn.setAttribute("aria-expanded", "false");
        btn.innerHTML = esc(it.tittel) + ' <span class="caret" aria-hidden="true">&#9662;</span>';
        const panel = document.createElement("div"); panel.className = "nav__dd-panel";
        const all = document.createElement("a"); all.href = "index.html#temaer"; all.className = "nav__dd-all"; all.textContent = "Se hele temaoversikten"; panel.appendChild(all);
        temaer.forEach((t) => { if (!t || !t.tittel) return; const a = document.createElement("a"); a.href = "tema.html?navn=" + encodeURIComponent(t.tittel); a.textContent = t.tittel; panel.appendChild(a); });
        btn.addEventListener("click", (e) => { e.stopPropagation(); const open = panel.classList.toggle("open"); btn.setAttribute("aria-expanded", String(open)); });
        dd.appendChild(btn); dd.appendChild(panel); nav.insertBefore(dd, cta);
      } else {
        const a = document.createElement("a");
        a.href = (it.lenke || "#").charAt(0) === "#" ? "index.html" + it.lenke : (it.lenke || "#");
        a.textContent = it.tittel; nav.insertBefore(a, cta);
      }
    });
  }
  document.addEventListener("click", () => {
    $$(".nav__dd-panel.open").forEach((p) => { p.classList.remove("open"); const b = p.parentElement && p.parentElement.querySelector(".nav__dd-toggle"); if (b) b.setAttribute("aria-expanded", "false"); });
  });

  fetch("content/innhold.json", { cache: "no-store" })
    .then((r) => (r.ok ? r.json() : {}))
    .then((D) => {
      const info = (D && D.info) || {};
      if (info.navn) $$("[data-navn]").forEach((el) => (el.textContent = info.navn));
      renderMeny(D && D.meny, D && D.temaer);
      const intro = $("[data-bidra-tekst]");
      if (intro && D && D.bidraTekst) intro.innerHTML = D.bidraTekst;
    })
    .catch(() => { renderMeny(null, null); });

  // Innsending via Netlify Forms (AJAX, så brukeren blir på siden).
  const form = $("#bidraForm");
  if (form) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const feil = $("#skjemaFeil"); if (feil) feil.hidden = true;
      const btn = form.querySelector("button[type=submit]");
      if (btn) { btn.disabled = true; btn.textContent = "Sender …"; }
      const body = new URLSearchParams(new FormData(form)).toString();
      fetch("/", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body })
        .then((r) => {
          if (!r.ok) throw new Error("status " + r.status);
          form.hidden = true;
          const takk = $("#bidraTakk"); if (takk) takk.hidden = false;
          window.scrollTo({ top: 0, behavior: "smooth" });
        })
        .catch(() => {
          if (btn) { btn.disabled = false; btn.textContent = "Send inn innlegg"; }
          if (feil) feil.hidden = false;
        });
    });
  }

  const toggle = $("#navToggle"), navLinks = $("#navLinks");
  if (toggle && navLinks) {
    const setOpen = (o) => { navLinks.classList.toggle("open", o); toggle.setAttribute("aria-expanded", String(o)); };
    toggle.addEventListener("click", () => setOpen(!navLinks.classList.contains("open")));
    navLinks.addEventListener("click", (e) => { if (e.target.closest("a")) setOpen(false); });
  }
})();
