/* Temaside: ?navn=<tema> -> lister innleggene som har det temaet,
   filtrert fra content/innlegg/index.json. */
(function () {
  const $ = (s) => document.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"]/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[m]));
  const norm = (s) => String(s == null ? "" : s).trim().toLowerCase();

  function fmtDato(d) {
    if (!d) return "";
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(d).trim());
    if (!m) return String(d);
    const mnd = ["januar", "februar", "mars", "april", "mai", "juni", "juli", "august", "september", "oktober", "november", "desember"];
    return `${Number(m[3])}. ${mnd[Number(m[2]) - 1]} ${m[1]}`;
  }

  const tema = new URLSearchParams(location.search).get("navn") || "";
  document.title = tema || "Tema";
  $("#temaTittel").textContent = tema || "Tema";

  // Toppmeny + intro fra rammen
  fetch("content/innhold.json", { cache: "no-store" })
    .then((r) => (r.ok ? r.json() : {}))
    .then((D) => {
      const info = (D && D.info) || {};
      if (info.navn) $$("[data-navn]").forEach((el) => (el.textContent = info.navn));
      window.MV.renderNav();
      const match = (D.temaer || []).find((t) => norm(t.tittel) === norm(tema));
      if (match && match.beskrivelse) {
        $("#temaIntro").textContent = match.beskrivelse;
        const md = $("#metaDesc"); if (md) md.setAttribute("content", match.beskrivelse);
      }
    })
    .catch(() => window.MV.renderNav());

  fetch("content/innlegg/index.json", { cache: "no-store" })
    .then((r) => (r.ok ? r.json() : []))
    .then((list) => renderPosts((Array.isArray(list) ? list : list.innlegg || []).filter((p) => norm(p.tema) === norm(tema))))
    .catch(() => renderPosts([]));

  function renderPosts(list) {
    const wrap = $("#postsList");
    const empty = $("#postsEmpty");
    if (!list.length) { wrap.innerHTML = ""; empty.hidden = false; return; }
    empty.hidden = true;
    wrap.innerHTML = list.map((p) => {
      const url = encodeURIComponent(p.slug) + ".html";
      const media = p.bilde
        ? `<a class="post-card__media" href="${url}"><img src="${esc(p.bilde)}" alt="${esc(p.tittel || "")}" loading="lazy"></a>`
        : "";
      return `
        <article class="post-card" ${p.bilde ? "" : 'style="grid-template-columns:1fr"'}>
          ${media}
          <div>
            ${p.dato ? `<p class="post-card__date">${esc(fmtDato(p.dato))}</p>` : ""}
            <h3><a href="${url}">${esc(p.tittel)}</a></h3>
            ${p.ingress ? `<p>${esc(p.ingress)}</p>` : ""}
            <a class="post-card__more" href="${url}">Les mer &rarr;</a>
          </div>
        </article>`;
    }).join("");
  }
})();
