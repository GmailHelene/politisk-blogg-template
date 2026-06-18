/* Forside: leser content/innhold.json (meny, forside, manifest, temaer, bunntekst)
   og content/innlegg/index.json (innleggslista). Redigeres via Studio-portalen.
   Støtter live forhåndsvisning av "rammen" via postMessage. */
(function () {
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"]/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[m]));
  const norm = (s) => String(s == null ? "" : s).trim().toLowerCase();

  const DEFAULT_MENY = [
    { tittel: "Innlegg", lenke: "#innlegg" },
    { tittel: "Manifestet", lenke: "#manifest" },
    { tittel: "Temaoversikt", lenke: "#temaer" },
    { tittel: "Om siden", lenke: "om.html" },
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

  function renderMeny(meny, temaer) {
    const nav = $("#navLinks");
    const cta = $("#navCta");
    if (!nav || !cta) return;
    // Fjern tidligere dynamiske punkter (alt unntatt CTA-knappen)
    Array.from(nav.children).forEach((c) => { if (c !== cta) c.remove(); });
    const items = Array.isArray(meny) && meny.length ? meny : DEFAULT_MENY;
    const hasTemaer = Array.isArray(temaer) && temaer.length;
    items.forEach((it) => {
      if (!it || !it.tittel) return;
      // Temaoversikt-punktet blir en dropdown med alle temaene
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
        const all = document.createElement("a");
        all.href = "#temaer";
        all.className = "nav__dd-all";
        all.textContent = "Se hele temaoversikten";
        panel.appendChild(all);
        temaer.forEach((t) => {
          if (!t || !t.tittel) return;
          const a = document.createElement("a");
          a.href = "tema.html?navn=" + encodeURIComponent(t.tittel);
          a.textContent = t.tittel;
          panel.appendChild(a);
        });
        btn.addEventListener("click", (e) => {
          e.stopPropagation();
          const open = panel.classList.toggle("open");
          btn.setAttribute("aria-expanded", String(open));
        });
        dd.appendChild(btn);
        dd.appendChild(panel);
        nav.insertBefore(dd, cta);
      } else {
        const a = document.createElement("a");
        a.href = it.lenke || "#";
        a.textContent = it.tittel;
        nav.insertBefore(a, cta);
      }
    });
  }
  // Lukk åpne dropdowns ved klikk utenfor
  document.addEventListener("click", () => {
    $$(".nav__dd-panel.open").forEach((p) => {
      p.classList.remove("open");
      const b = p.parentElement && p.parentElement.querySelector(".nav__dd-toggle");
      if (b) b.setAttribute("aria-expanded", "false");
    });
  });

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

    renderMeny(D.meny, D.temaer);

    const hero = $(".hero");
    if (hero) {
      if (info.heroBilde) {
        hero.style.backgroundImage = `url("${String(info.heroBilde).replace(/"/g, "%22")}")`;
        hero.classList.add("hero--bilde");
      } else {
        hero.style.backgroundImage = "";
        hero.classList.remove("hero--bilde");
      }
    }

    // Info-boks under hero (skjules om både tittel og tekst er tomme)
    const omSec = $("#om");
    const omT = $("[data-om-tittel]"), omTekst = $("[data-om-tekst]");
    if (omT && D.omTittel) omT.textContent = D.omTittel;
    if (omTekst) omTekst.innerHTML = D.omTekst || "";
    if (omSec) omSec.hidden = !(D.omTittel || D.omTekst);

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
      if (info.epost) { kbtn.href = "mailto:" + info.epost; kbtn.textContent = "eller send meg en e-post"; kbtn.hidden = false; }
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
