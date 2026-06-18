/* Enkeltinnlegg: leser ?slug=... og henter content/innlegg/<slug>.json.
   Setter tittel/meta/Open Graph slik at delte lenker ser ordentlige ut. */
(function () {
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => Array.from(document.querySelectorAll(s));
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"]/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[m]));

  const DEFAULT_MENY = [
    { tittel: "Innlegg", lenke: "#innlegg" },
    { tittel: "Manifestet", lenke: "#manifest" },
    { tittel: "Temaoversikt", lenke: "#temaer" },
  ];

  const norm = (s) => String(s == null ? "" : s).trim().toLowerCase();

  function renderMeny(meny, temaer) {
    const nav = $("#navLinks");
    const cta = $("#navCta");
    if (!nav || !cta) return;
    Array.from(nav.children).forEach((c) => { if (c !== cta) c.remove(); });
    const items = Array.isArray(meny) && meny.length ? meny : DEFAULT_MENY;
    const hasTemaer = Array.isArray(temaer) && temaer.length;
    items.forEach((it) => {
      if (!it || !it.tittel) return;
      if (norm(it.lenke) === "#temaer" && hasTemaer) {
        const dd = document.createElement("div");
        dd.className = "nav__dd";
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "nav__dd-toggle";
        btn.setAttribute("aria-expanded", "false");
        btn.innerHTML = esc(it.tittel) + ' <span class="caret" aria-hidden="true">&#9662;</span>';
        const panel = document.createElement("div");
        panel.className = "nav__dd-panel";
        temaer.forEach((t) => {
          if (!t || !t.tittel) return;
          const a = document.createElement("a");
          a.href = "tema.html?navn=" + encodeURIComponent(t.tittel);
          a.textContent = t.tittel;
          panel.appendChild(a);
        });
        btn.addEventListener("click", (e) => { e.stopPropagation(); const open = panel.classList.toggle("open"); btn.setAttribute("aria-expanded", String(open)); });
        dd.appendChild(btn); dd.appendChild(panel);
        nav.insertBefore(dd, cta);
      } else {
        const a = document.createElement("a");
        a.href = (it.lenke || "#").charAt(0) === "#" ? "index.html" + it.lenke : (it.lenke || "#");
        a.textContent = it.tittel;
        nav.insertBefore(a, cta);
      }
    });
  }
  document.addEventListener("click", () => {
    $$(".nav__dd-panel.open").forEach((p) => { p.classList.remove("open"); const b = p.parentElement && p.parentElement.querySelector(".nav__dd-toggle"); if (b) b.setAttribute("aria-expanded", "false"); });
  });

  function fmtDato(d) {
    if (!d) return "";
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(d).trim());
    if (!m) return String(d);
    const mnd = ["januar", "februar", "mars", "april", "mai", "juni", "juli", "august", "september", "oktober", "november", "desember"];
    return `${Number(m[3])}. ${mnd[Number(m[2]) - 1]} ${m[1]}`;
  }

  const slug = new URLSearchParams(location.search).get("slug");

  // Toppmeny-merkenavn fra rammen (best effort)
  fetch("content/innhold.json", { cache: "no-store" })
    .then((r) => (r.ok ? r.json() : {}))
    .then((D) => {
      const info = (D && D.info) || {};
      if (info.navn) $$("[data-navn]").forEach((el) => (el.textContent = info.navn));
      renderMeny(D && D.meny, D && D.temaer);
      const kbtn = $("#kontaktBtn");
      if (kbtn && info.epost) { kbtn.href = "mailto:" + info.epost; kbtn.textContent = "Send meg en e-post"; kbtn.hidden = false; }
    })
    .catch(() => renderMeny(null, null));

  if (!slug || !/^[a-z0-9-]+$/.test(slug)) { showError("Fant ikke innlegget."); return; }

  fetch("content/innlegg/" + encodeURIComponent(slug) + ".json", { cache: "no-store" })
    .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
    .then(render)
    .catch(() => showError("Fant ikke innlegget."));

  function setMeta(id, attr, val) { const el = document.getElementById(id); if (el) el.setAttribute(attr, val); }

  function render(p) {
    p = p || {};
    const tittel = p.tittel || "Innlegg";
    document.title = tittel;
    setMeta("metaDesc", "content", p.ingress || tittel);
    setMeta("ogTitle", "content", tittel);
    setMeta("ogDesc", "content", p.ingress || "");
    if (p.bilde) setMeta("ogImage", "content", p.bilde);

    $("#postTitle").textContent = tittel;
    const dateEl = $("#postDate"); if (p.dato) dateEl.textContent = fmtDato(p.dato);
    const temaEl = $("#postTema");
    if (temaEl && p.tema) {
      temaEl.innerHTML = `<a class="post-card__date" style="text-decoration:none" href="tema.html?navn=${encodeURIComponent(p.tema)}">${esc(p.tema)} &rarr;</a>`;
      temaEl.hidden = false;
    }
    const lead = $("#postLead"); if (p.ingress) { lead.textContent = p.ingress; lead.hidden = false; }
    const media = $("#postMedia");
    if (p.bilde) { media.innerHTML = `<img src="${esc(p.bilde)}" alt="${esc(tittel)}">`; media.hidden = false; }
    $("#postBody").innerHTML = p.brodtekst || "";
  }

  function showError(msg) {
    $("#postTitle").textContent = msg;
    $("#postBody").innerHTML = '<p><a href="index.html#innlegg">Tilbake til alle innlegg</a></p>';
  }

  const toggle = $("#navToggle"), navLinks = $("#navLinks");
  if (toggle && navLinks) {
    const setOpen = (o) => { navLinks.classList.toggle("open", o); toggle.setAttribute("aria-expanded", String(o)); };
    toggle.addEventListener("click", () => setOpen(!navLinks.classList.contains("open")));
  }
})();
