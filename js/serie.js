/* Serie-side: ?navn=<serie> -> lister innleggene i serien i riktig rekkefølge
   (etter delnr stigende, så dato). Filtrert fra content/innlegg/index.json. */
(function () {
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => Array.from(document.querySelectorAll(s));
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"]/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[m]));
  const norm = (s) => String(s == null ? "" : s).trim().toLowerCase();

  const DEFAULT_MENY = [
    { tittel: "Start her", lenke: "om.html" },
    { tittel: "Serier", lenke: "#serier" },
    { tittel: "Temaoversikt", lenke: "#temaer" },
    { tittel: "Innlegg", lenke: "#innlegg" },
  ];
  const menyHref = (lenke) => ((lenke || "#").charAt(0) === "#" ? "index.html" + lenke : (lenke || "#"));
  function ddConfig(lenke, temaer, serier) {
    const ln = norm(lenke);
    if (ln === "#temaer") return { list: temaer, item: "tema.html?navn=", all: "#temaer", allTekst: "Se hele temaoversikten" };
    if (ln === "#serier") return { list: serier, item: "serie.html?navn=", all: "#serier", allTekst: "Se alle serier" };
    return null;
  }
  function renderMeny(meny, temaer, serier) {
    const nav = $("#navLinks"), cta = $("#navCta");
    if (!nav || !cta) return;
    Array.from(nav.children).forEach((c) => { if (c !== cta) c.remove(); });
    const items = Array.isArray(meny) && meny.length ? meny : DEFAULT_MENY;
    items.forEach((it) => {
      if (!it || !it.tittel) return;
      const dd = ddConfig(it.lenke, temaer, serier);
      if (dd && Array.isArray(dd.list) && dd.list.length) {
        const wrap = document.createElement("div"); wrap.className = "nav__dd";
        const btn = document.createElement("button"); btn.type = "button"; btn.className = "nav__dd-toggle"; btn.setAttribute("aria-expanded", "false");
        btn.innerHTML = esc(it.tittel) + ' <span class="caret" aria-hidden="true">&#9662;</span>';
        const panel = document.createElement("div"); panel.className = "nav__dd-panel";
        const all = document.createElement("a"); all.className = "nav__dd-all"; all.href = menyHref(dd.all); all.textContent = dd.allTekst; panel.appendChild(all);
        dd.list.forEach((t) => { if (!t || !t.tittel) return; const a = document.createElement("a"); a.href = dd.item + encodeURIComponent(t.tittel); a.textContent = t.tittel; panel.appendChild(a); });
        btn.addEventListener("click", (e) => { e.stopPropagation(); const open = panel.classList.toggle("open"); btn.setAttribute("aria-expanded", String(open)); });
        wrap.appendChild(btn); wrap.appendChild(panel); nav.insertBefore(wrap, cta);
      } else {
        const a = document.createElement("a"); a.href = menyHref(it.lenke); a.textContent = it.tittel; nav.insertBefore(a, cta);
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

  const serie = new URLSearchParams(location.search).get("navn") || "";
  document.title = serie || "Serie";
  $("#serieTittel").textContent = serie || "Serie";

  fetch("content/innhold.json", { cache: "no-store" })
    .then((r) => (r.ok ? r.json() : {}))
    .then((D) => {
      const info = (D && D.info) || {};
      if (info.navn) $$("[data-navn]").forEach((el) => (el.textContent = info.navn));
      renderMeny(D && D.meny, D && D.temaer, D && D.serier);
      const match = (D.serier || []).find((s) => norm(s.tittel) === norm(serie));
      if (match && match.beskrivelse) {
        $("#serieIntro").textContent = match.beskrivelse;
        const md = $("#metaDesc"); if (md) md.setAttribute("content", match.beskrivelse);
      }
    })
    .catch(() => renderMeny(null, null, null));

  fetch("content/innlegg/index.json", { cache: "no-store" })
    .then((r) => (r.ok ? r.json() : []))
    .then((list) => {
      const items = (Array.isArray(list) ? list : list.innlegg || [])
        .filter((p) => norm(p.serie) === norm(serie))
        .sort((a, b) => {
          const da = Number(a.delnr), db = Number(b.delnr);
          const va = isNaN(da) ? Infinity : da, vb = isNaN(db) ? Infinity : db;
          if (va !== vb) return va - vb;
          return String(a.dato || "").localeCompare(String(b.dato || ""));
        });
      renderPosts(items);
    })
    .catch(() => renderPosts([]));

  function renderPosts(list) {
    const wrap = $("#postsList"), empty = $("#postsEmpty");
    if (!list.length) { wrap.innerHTML = ""; empty.hidden = false; return; }
    empty.hidden = true;
    wrap.innerHTML = list.map((p) => {
      const url = "innlegg.html?slug=" + encodeURIComponent(p.slug);
      const del = p.delnr ? `Del ${esc(p.delnr)}` : "";
      const meta = [del, p.dato ? fmtDato(p.dato) : ""].filter(Boolean).join(" · ");
      return `
        <li class="post-card" style="grid-template-columns:1fr">
          <div>
            ${meta ? `<p class="post-card__date">${esc(meta)}</p>` : ""}
            <h3><a href="${url}">${esc(p.tittel)}</a></h3>
            ${p.ingress ? `<p>${esc(p.ingress)}</p>` : ""}
            <a class="post-card__more" href="${url}">Les mer &rarr;</a>
          </div>
        </li>`;
    }).join("");
  }

  const toggle = $("#navToggle"), navLinks = $("#navLinks");
  if (toggle && navLinks) {
    const setOpen = (o) => { navLinks.classList.toggle("open", o); toggle.setAttribute("aria-expanded", String(o)); };
    toggle.addEventListener("click", () => setOpen(!navLinks.classList.contains("open")));
    navLinks.addEventListener("click", (e) => { if (e.target.closest("a")) setOpen(false); });
  }
})();
