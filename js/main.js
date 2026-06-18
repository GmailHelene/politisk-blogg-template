/* Forside: leser content/innhold.json (meny, forside, manifest, temaer, bunntekst)
   og content/innlegg/index.json (innleggslista). Redigeres via Studio-portalen.
   Støtter live forhåndsvisning av "rammen" via postMessage. */
(function () {
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"]/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[m]));

  const DEFAULT_MENY = [
    { tittel: "Innlegg", lenke: "#innlegg" },
    { tittel: "Manifestet", lenke: "#manifest" },
    { tittel: "Temaoversikt", lenke: "#temaer" },
  ];

  function fmtDato(d) {
    if (!d) return "";
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(d).trim());
    if (!m) return String(d);
    const mnd = ["januar", "februar", "mars", "april", "mai", "juni", "juli", "august", "september", "oktober", "november", "desember"];
    return `${Number(m[3])}. ${mnd[Number(m[2]) - 1]} ${m[1]}`;
  }

  const inPreview = window.parent !== window && location.hash.indexOf("preview") !== -1;

  // Innleggslista hentes alltid fra fila.
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

  function renderMeny(meny) {
    const nav = $("#navLinks");
    const cta = $("#navCta");
    if (!nav || !cta) return;
    // Fjern tidligere dynamiske lenker (alt unntatt CTA-knappen)
    $$("a", nav).forEach((a) => { if (a !== cta) a.remove(); });
    const items = Array.isArray(meny) && meny.length ? meny : DEFAULT_MENY;
    items.forEach((it) => {
      if (!it || !it.tittel) return;
      const a = document.createElement("a");
      a.href = it.lenke || "#";
      a.textContent = it.tittel;
      nav.insertBefore(a, cta);
    });
  }

  function renderChrome(D) {
    D = D || {};
    const info = D.info || {};
    $$("[data-navn]").forEach((el) => { if (info.navn) el.textContent = info.navn; });
    if (info.navn) document.title = info.navn;
    const setText = (sel, t) => { const el = $(sel); if (t != null && t !== "") el.textContent = t; };
    setText("[data-tittel]", info.tittel);
    setText("[data-ingress]", info.ingress);
    if (info.tittel) {
      const meta = $('meta[name="description"]'); if (meta) meta.setAttribute("content", info.ingress || info.tittel);
    }
    const cta = $("[data-cta]"); if (cta && info.ctaTekst) cta.textContent = info.ctaTekst;

    renderMeny(D.meny);

    const heroMedia = $("#heroMedia");
    if (heroMedia) {
      if (info.heroBilde) { heroMedia.innerHTML = `<img src="${esc(info.heroBilde)}" alt="${esc(info.tittel || "Forsidebilde")}">`; heroMedia.hidden = false; }
      else heroMedia.hidden = true;
    }

    const mTittel = $("[data-manifest-tittel]"); if (mTittel && D.manifestTittel) mTittel.textContent = D.manifestTittel;
    const manifest = $("[data-manifest]"); if (manifest) manifest.innerHTML = D.manifest || "";

    setText("[data-kontakt-tittel]", D.kontaktTittel);
    setText("[data-kontakt-tekst]", D.kontaktTekst);

    const grid = $("#temaerGrid");
    if (grid && Array.isArray(D.temaer)) {
      grid.innerHTML = D.temaer.map((t) => {
        const url = "tema.html?navn=" + encodeURIComponent(t.tittel || "");
        return `
        <article class="tema">
          <h3><a href="${url}">${esc(t.tittel)}</a></h3>
          <p>${esc(t.beskrivelse)}</p>
        </article>`;
      }).join("");
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
      const meta = [p.dato ? fmtDato(p.dato) : "", p.tema || ""].filter(Boolean).join(" · ");
      return `
        <article class="post-card" ${p.bilde ? "" : 'style="grid-template-columns:1fr"'}>
          ${media}
          <div>
            ${meta ? `<p class="post-card__date">${esc(meta)}</p>` : ""}
            <h3><a href="${url}">${esc(p.tittel)}</a></h3>
            ${p.ingress ? `<p>${esc(p.ingress)}</p>` : ""}
            <a class="post-card__more" href="${url}">Les mer &rarr;</a>
          </div>
        </article>`;
    }).join("");
  }

  // Mobilmeny (delegert klikk, siden lenker legges til dynamisk)
  const toggle = $("#navToggle"), navLinks = $("#navLinks");
  if (toggle && navLinks) {
    const setOpen = (o) => { navLinks.classList.toggle("open", o); toggle.setAttribute("aria-expanded", String(o)); };
    toggle.addEventListener("click", () => setOpen(!navLinks.classList.contains("open")));
    navLinks.addEventListener("click", (e) => { if (e.target.closest("a")) setOpen(false); });
  }
})();
