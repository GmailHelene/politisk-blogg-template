/* Felles toppmeny + diverse hjelpere for sider som ikke er forsiden.
   Eksponert som window.MV (ModumVil). */
(function (root) {
  const $ = (s, c) => (c || document).querySelector(s);
  const $$ = (s, c) => Array.from((c || document).querySelectorAll(s));
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"]/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[m]));
  const norm = (s) => String(s == null ? "" : s).trim().toLowerCase();
  const menyHref = (lenke) => ((lenke || "#").charAt(0) === "#" ? "index.html" + lenke : (lenke || "#"));

  // Fast hovedmeny - lik på alle sider. Innlegg + Bidra er dropdowns med faste underpunkter.
  const NAV = [
    { tittel: "Innlegg", barn: [
      { tittel: "Alle innlegg", lenke: "arkiv.html" },
      { tittel: "Serier", lenke: "serier.html" },
      { tittel: "Temaoversikt", lenke: "temaer.html" },
    ] },
    { tittel: "Modum fakta", lenke: "fakta.html" },
    { tittel: "Om siden", lenke: "om.html" },
    { tittel: "Skribenter", lenke: "skribenter.html" },
    { tittel: "Bidra", cta: true, barn: [
      { tittel: "Skriv innlegg", lenke: "bidra.html" },
      { tittel: "Send tips eller idé", lenke: "tips.html" },
      { tittel: "Bli skribent", lenke: "bli-skribent.html" },
    ] },
  ];

  function renderNav() {
    const nav = $("#navLinks");
    if (!nav) return;
    nav.innerHTML = "";
    NAV.forEach((it) => {
      if (it.barn && it.barn.length) {
        const wrap = document.createElement("div"); wrap.className = "nav__dd" + (it.cta ? " nav__dd--cta" : "");
        const btn = document.createElement("button"); btn.type = "button"; btn.className = "nav__dd-toggle" + (it.cta ? " nav__dd-toggle--cta" : ""); btn.setAttribute("aria-expanded", "false");
        btn.innerHTML = esc(it.tittel) + ' <span class="caret" aria-hidden="true">&#9662;</span>';
        const panel = document.createElement("div"); panel.className = "nav__dd-panel";
        it.barn.forEach((b) => { if (!b || !b.tittel) return; const a = document.createElement("a"); a.href = b.lenke; a.textContent = b.tittel; panel.appendChild(a); });
        btn.addEventListener("click", (e) => { e.stopPropagation(); const open = panel.classList.toggle("open"); btn.setAttribute("aria-expanded", String(open)); });
        wrap.appendChild(btn); wrap.appendChild(panel); nav.appendChild(wrap);
      } else {
        const a = document.createElement("a"); a.href = it.lenke; a.textContent = it.tittel; nav.appendChild(a);
      }
    });
  }

  // Bakoverkompatibel alias - eldre sider kaller renderMeny(...); menyen er nå fast.
  function renderMeny() { renderNav(); }

  document.addEventListener("click", () => {
    $$(".nav__dd-panel.open").forEach((p) => { p.classList.remove("open"); const b = p.parentElement && p.parentElement.querySelector(".nav__dd-toggle"); if (b) b.setAttribute("aria-expanded", "false"); });
  });

  // Mobil-toggle
  document.addEventListener("DOMContentLoaded", () => {
    const toggle = $("#navToggle"), navLinks = $("#navLinks");
    if (!toggle || !navLinks) return;
    const setOpen = (o) => { navLinks.classList.toggle("open", o); toggle.setAttribute("aria-expanded", String(o)); };
    toggle.addEventListener("click", () => setOpen(!navLinks.classList.contains("open")));
    navLinks.addEventListener("click", (e) => { if (e.target.closest("a")) setOpen(false); });
  });

  function fmtDato(d) {
    if (!d) return "";
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(d).trim());
    if (!m) return String(d);
    const mnd = ["januar", "februar", "mars", "april", "mai", "juni", "juli", "august", "september", "oktober", "november", "desember"];
    return `${Number(m[3])}. ${mnd[Number(m[2]) - 1]} ${m[1]}`;
  }

  function renderPostCards(wrap, list, opts) {
    opts = opts || {};
    if (!wrap) return;
    if (!list.length) { wrap.innerHTML = ""; if (opts.empty) opts.empty.hidden = false; return; }
    if (opts.empty) opts.empty.hidden = true;
    wrap.innerHTML = list.map((p) => {
      const url = encodeURIComponent(p.slug) + ".html";
      const media = p.bilde
        ? `<a class="post-card__media" href="${url}"><img src="${esc(p.bilde)}" alt="${esc(p.tittel || "")}" loading="lazy"></a>`
        : "";
      const serieLabel = p.serie ? (p.serie + (p.delnr ? " · del " + p.delnr : "")) : "";
      const meta = [p.dato ? fmtDato(p.dato) : "", serieLabel || p.tema || ""].filter(Boolean).join(" · ");
      // Vis byline kun nar et innlegg er av en gjesteforfatter (ulik standard forfatter)
      const isGuest = p.forfatter && opts.defaultForfatter && p.forfatter !== opts.defaultForfatter;
      const byline = isGuest ? `<p class="post-card__byline">Av <strong>${esc(p.forfatter)}</strong></p>` : "";
      return `
        <article class="post-card" ${p.bilde ? "" : 'style="grid-template-columns:1fr"'}>
          ${media}
          <div>
            ${meta ? `<p class="post-card__date">${esc(meta)}</p>` : ""}
            <h3><a href="${url}">${esc(p.tittel)}</a></h3>
            ${byline}
            ${p.ingress ? `<p>${esc(p.ingress)}</p>` : ""}
            <a class="post-card__more" href="${url}">Les mer &rarr;</a>
          </div>
        </article>`;
    }).join("");
  }

  // Setter JSON-LD via id="ld..."
  function setJsonLd(id, data) {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = JSON.stringify(data);
  }

  // Eksporter
  root.MV = { $, $$, esc, norm, renderNav, renderMeny, fmtDato, renderPostCards, setJsonLd, menyHref };
})(window);
