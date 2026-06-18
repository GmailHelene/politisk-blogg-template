/* Forside: leser content/innhold.json (toppmeny, manifest, temaer) og
   content/innlegg/index.json (innleggslista). Redigeres via Studio-portalen.
   Støtter live forhåndsvisning av "rammen" via postMessage. */
(function () {
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"]/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[m]));

  function fmtDato(d) {
    if (!d) return "";
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(d).trim());
    if (!m) return String(d);
    const mnd = ["januar", "februar", "mars", "april", "mai", "juni", "juli", "august", "september", "oktober", "november", "desember"];
    return `${Number(m[3])}. ${mnd[Number(m[2]) - 1]} ${m[1]}`;
  }

  const inPreview = window.parent !== window && location.hash.indexOf("preview") !== -1;

  // Innleggslista hentes alltid fra fila (også i forhåndsvisning viser vi
  // de publiserte innleggene). Rammen kan overstyres av portalen live.
  fetch("content/innlegg/index.json", { cache: "no-store" })
    .then((r) => (r.ok ? r.json() : []))
    .then((list) => renderPosts(Array.isArray(list) ? list : (list && list.innlegg) || []))
    .catch(() => renderPosts([]));

  if (inPreview) {
    window.addEventListener("message", (e) => {
      const m = e.data;
      if (m && m.type === "studioportal-preview") renderChrome(m.content || {});
    });
    try { window.parent.postMessage({ type: "studioportal-ready" }, "*"); } catch (e) {}
  } else {
    fetch("content/innhold.json", { cache: "no-store" })
      .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
      .then(renderChrome)
      .catch(() => renderChrome(window.SITE_DATA || {}));
  }

  function renderChrome(D) {
    D = D || {};
    const info = D.info || {};
    $$("[data-navn]").forEach((el) => { if (info.navn) el.textContent = info.navn; });
    if (info.navn) document.title = info.navn;
    const setText = (sel, t) => { const el = $(sel); if (el && t) el.textContent = t; };
    setText("[data-tittel]", info.tittel);
    setText("[data-ingress]", info.ingress);
    if (info.tittel) {
      const meta = $('meta[name="description"]'); if (meta) meta.setAttribute("content", info.ingress || info.tittel);
    }
    const cta = $("[data-cta]"); if (cta && info.ctaTekst) cta.textContent = info.ctaTekst;

    const heroMedia = $("#heroMedia");
    if (heroMedia) {
      if (info.heroBilde) { heroMedia.innerHTML = `<img src="${esc(info.heroBilde)}" alt="${esc(info.tittel || "Forsidebilde")}">`; heroMedia.hidden = false; }
      else heroMedia.hidden = true;
    }

    const mTittel = $("[data-manifest-tittel]"); if (mTittel && D.manifestTittel) mTittel.textContent = D.manifestTittel;
    const manifest = $("[data-manifest]"); if (manifest) manifest.innerHTML = D.manifest || "";

    const grid = $("#temaerGrid");
    if (grid && Array.isArray(D.temaer)) {
      grid.innerHTML = D.temaer.map((t) => `
        <article class="tema">
          <h3>${esc(t.tittel)}</h3>
          <p>${esc(t.beskrivelse)}</p>
        </article>`).join("");
    }

    const kbtn = $("#kontaktBtn");
    if (kbtn) {
      if (info.epost) { kbtn.href = "mailto:" + info.epost; kbtn.textContent = "Send meg en e-post"; kbtn.hidden = false; }
      else kbtn.hidden = true;
    }
  }

  function renderPosts(list) {
    const wrap = $("#postsList");
    const empty = $("#postsEmpty");
    if (!wrap) return;
    if (!list.length) { wrap.innerHTML = ""; if (empty) empty.hidden = false; return; }
    if (empty) empty.hidden = true;
    wrap.innerHTML = list.map((p) => {
      const url = "innlegg.html?slug=" + encodeURIComponent(p.slug);
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

  // Mobilmeny
  const toggle = $("#navToggle"), navLinks = $("#navLinks");
  if (toggle && navLinks) {
    const setOpen = (o) => { navLinks.classList.toggle("open", o); toggle.setAttribute("aria-expanded", String(o)); };
    toggle.addEventListener("click", () => setOpen(!navLinks.classList.contains("open")));
    $$("a", navLinks).forEach((a) => a.addEventListener("click", () => setOpen(false)));
  }
})();
