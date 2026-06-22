/* Serie-side: ?navn=<serie> -> lister innleggene i serien i riktig rekkefølge
   (etter delnr stigende, så dato). Filtrert fra content/innlegg/index.json. */
(function () {
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => Array.from(document.querySelectorAll(s));
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"]/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[m]));
  const norm = (s) => String(s == null ? "" : s).trim().toLowerCase();

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
      window.MV.renderNav();
      const match = (D.serier || []).find((s) => norm(s.tittel) === norm(serie));
      if (match && match.beskrivelse) {
        $("#serieIntro").textContent = match.beskrivelse;
        const md = $("#metaDesc"); if (md) md.setAttribute("content", match.beskrivelse);
      }
    })
    .catch(() => window.MV.renderNav());

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
      const url = encodeURIComponent(p.slug) + ".html";
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
})();
