/* Forside: 3-blokks hub (første serie + siste innlegg + temaoversikt).
   Manifest valgfritt under hub-en. Støtter live forhåndsvisning via postMessage. */
(function () {
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"]/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[m]));
  const norm = (s) => String(s == null ? "" : s).trim().toLowerCase();

  const DEFAULT_MENY = [
    { tittel: "Start her", lenke: "om.html" },
    { tittel: "Modum framover", lenke: "serie.html?navn=Modum framover" },
    { tittel: "Om siden", lenke: "om.html" },
    { tittel: "Temaoversikt", lenke: "temaer.html" },
    { tittel: "Alle innlegg", lenke: "arkiv.html" },
  ];

  function fmtDato(d) {
    if (!d) return "";
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(d).trim());
    if (!m) return String(d);
    const mnd = ["januar", "februar", "mars", "april", "mai", "juni", "juli", "august", "september", "oktober", "november", "desember"];
    return `${Number(m[3])}. ${mnd[Number(m[2]) - 1]} ${m[1]}`;
  }

  const inPreview = window.parent !== window && location.hash.indexOf("preview") !== -1;

  // Innleggslista hentes alltid fra fila (sortert nyeste øverst i index.json).
  let _innlegg = [];
  fetch("content/innlegg/index.json", { cache: "no-store" })
    .then((r) => (r.ok ? r.json() : []))
    .then((list) => { _innlegg = Array.isArray(list) ? list : (list && list.innlegg) || []; renderHubIfReady(); })
    .catch(() => { _innlegg = []; renderHubIfReady(); });

  let _innhold = null;
  let _defaultForfatter = null;

  if (inPreview) {
    window.addEventListener("message", (e) => {
      const m = e.data;
      if (m && m.type === "studioportal-preview") { _innhold = m.content || {}; renderChrome(_innhold); renderHubIfReady(); }
    });
    try { window.parent.postMessage({ type: "studioportal-ready" }, "*"); } catch (e) {}
  } else {
    fetch("content/innhold.json", { cache: "no-store" })
      .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
      .then((D) => { _innhold = D; renderChrome(D); renderHubIfReady(); })
      .catch(() => { _innhold = window.SITE_DATA || {}; renderChrome(_innhold); renderHubIfReady(); });
  }

  // Hash-lenker beholdes som de er på forsiden (de scroller).
  const menyHref = (lenke) => lenke || "#";
  function ddConfig(lenke, temaer, serier) {
    const ln = norm(lenke);
    if (ln === "#temaer") return { list: temaer, item: "tema.html?navn=", all: "temaer.html", allTekst: "Se hele temaoversikten" };
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

  function renderChrome(D) {
    D = D || {};
    const info = D.info || {};
    $$("[data-navn]").forEach((el) => { if (info.navn) el.textContent = info.navn; });
    if (info.navn) document.title = info.navn;
    const setText = (sel, t) => { const el = $(sel); if (t != null && t !== "") el.textContent = t; };
    setText("[data-tittel]", info.tittel);
    setText("[data-ingress]", info.ingress);
    // Meta + OG
    const setAttr = (id, attr, val) => { const el = document.getElementById(id); if (el && val) el.setAttribute(attr, val); };
    const desc = info.ingress || info.tittel || "";
    const metaDesc = $('meta[name="description"]'); if (metaDesc && desc) metaDesc.setAttribute("content", desc);
    setAttr("ogTitle", "content", info.navn || info.tittel);
    setAttr("ogDesc", "content", desc);
    if (info.heroBilde && /^https?:/i.test(info.heroBilde)) setAttr("ogImage", "content", info.heroBilde);

    const cta = $("[data-cta]"); if (cta && info.ctaTekst) cta.textContent = info.ctaTekst;
    _defaultForfatter = info.forfatter || null;

    renderMeny(D.meny, D.temaer, D.serier);

    const heroByline = $("#heroByline");
    if (heroByline && info.forfatter) {
      heroByline.textContent = "Skrevet av " + info.forfatter;
      heroByline.hidden = false;
    }

    const hero = $(".hero");
    if (hero) {
      if (info.heroBilde) {
        hero.style.backgroundImage = `url("${String(info.heroBilde).replace(/"/g, "%22")}")`;
        hero.classList.add("hero--bilde");
      } else { hero.style.backgroundImage = ""; hero.classList.remove("hero--bilde"); }
    }

    const omSec = $("#om");
    const omT = $("[data-om-tittel]"), omTekst = $("[data-om-tekst]");
    if (omT && D.omTittel) omT.textContent = D.omTittel;
    if (omTekst) omTekst.innerHTML = D.omTekst || "";
    if (omSec) omSec.hidden = !(D.omTittel || D.omTekst);

    const mTittel = $("[data-manifest-tittel]"); if (mTittel && D.manifestTittel) mTittel.textContent = D.manifestTittel;
    const manifest = $("[data-manifest]"); if (manifest) manifest.innerHTML = D.manifest || "";
    const manifestSec = $("#manifest"); if (manifestSec) manifestSec.hidden = !(D.manifest && D.manifest.replace(/<[^>]+>/g, "").trim().length);

    setText("[data-kontakt-tittel]", D.kontaktTittel);
    setText("[data-kontakt-tekst]", D.kontaktTekst);

    const kbtn = $("#kontaktBtn");
    if (kbtn) {
      if (info.epost) { kbtn.href = "mailto:" + info.epost; kbtn.textContent = "Send e-post direkte"; kbtn.hidden = false; }
      else kbtn.hidden = true;
    }

    // JSON-LD: WebSite + Person
    setLd("ldWebsite", {
      "@context": "https://schema.org",
      "@type": "WebSite",
      url: "https://modumvil.no/",
      name: info.navn || "ModumVil.no",
      description: desc,
      inLanguage: "nb-NO",
      potentialAction: {
        "@type": "SearchAction",
        target: "https://modumvil.no/arkiv.html?q={search_term_string}",
        "query-input": "required name=search_term_string",
      },
    });
  }

  function setLd(id, data) {
    const el = document.getElementById(id);
    if (el) el.textContent = JSON.stringify(data);
  }

  function renderHubIfReady() {
    if (!_innhold) return;
    const D = _innhold;
    const grid = $("#hubGrid");
    if (!grid) return;
    const serier = Array.isArray(D.serier) ? D.serier.filter((s) => s && s.tittel) : [];
    const forste = serier[0];
    const siste = (_innlegg || []).slice(0, 3);
    const temaer = Array.isArray(D.temaer) ? D.temaer.filter((t) => t && t.tittel) : [];

    const hubBlocks = [];

    if (forste) {
      hubBlocks.push({
        eyebrow: "Første serie",
        tittel: forste.tittel,
        tekst: forste.beskrivelse || "En serie om hvilken retning Modum bør ta de neste 10, 20 og 30 årene.",
        knapp: "Start serien",
        url: "serie.html?navn=" + encodeURIComponent(forste.tittel),
      });
    }

    // Siste innlegg: vis det nyeste som et ekte innleggskort
    if (siste[0]) {
      const p = siste[0];
      const url = "innlegg.html?slug=" + encodeURIComponent(p.slug);
      const serieLabel = p.serie ? (p.serie + (p.delnr ? " · del " + p.delnr : "")) : "";
      const meta = [p.dato ? fmtDato(p.dato) : "", serieLabel || p.tema || ""].filter(Boolean).join(" · ");
      hubBlocks.push({
        type: "post",
        eyebrow: "Siste innlegg",
        meta,
        tittel: p.tittel,
        tekst: p.ingress || "",
        knapp: "Les innlegget",
        url,
        secondaryKnapp: "Se alle innlegg",
        secondaryUrl: "arkiv.html",
      });
    } else {
      hubBlocks.push({
        eyebrow: "Siste innlegg",
        tittel: "Siste publiseringer",
        tekst: "De nyeste publiseringene, uansett serie eller tema.",
        knapp: "Se alle innlegg",
        url: "arkiv.html",
      });
    }

    if (temaer.length) {
      hubBlocks.push({
        eyebrow: "Temaoversikt",
        tittel: "Finn etter sak",
        tekst: "Bla i innlegg sortert etter tema: " + temaer.slice(0, 4).map((t) => t.tittel).join(", ") + (temaer.length > 4 ? " og flere." : "."),
        knapp: "Utforsk temaene",
        url: "temaer.html",
      });
    }

    grid.innerHTML = hubBlocks.map((b) => `
      <article class="hub-card ${b.type === "post" ? "hub-card--post" : ""}">
        <p class="eyebrow">${esc(b.eyebrow)}</p>
        ${b.meta ? `<p class="hub-card__meta">${esc(b.meta)}</p>` : ""}
        <h2>${esc(b.tittel)}</h2>
        ${b.tekst ? `<p>${esc(b.tekst)}</p>` : ""}
        <div class="hub-card__actions">
          <a href="${b.url}" class="btn">${esc(b.knapp)}</a>
          ${b.secondaryKnapp ? `<a href="${b.secondaryUrl}" class="hub-card__secondary">${esc(b.secondaryKnapp)} &rarr;</a>` : ""}
        </div>
      </article>
    `).join("");

    // JSON-LD: liste over siste innlegg (hjelper indeksering)
    if (siste.length) {
      let ldList = document.getElementById("ldLatest");
      if (!ldList) { ldList = document.createElement("script"); ldList.type = "application/ld+json"; ldList.id = "ldLatest"; document.head.appendChild(ldList); }
      ldList.textContent = JSON.stringify({
        "@context": "https://schema.org",
        "@type": "ItemList",
        name: "Siste innlegg",
        itemListElement: siste.map((p, i) => ({
          "@type": "ListItem",
          position: i + 1,
          url: "https://modumvil.no/innlegg.html?slug=" + encodeURIComponent(p.slug),
          name: p.tittel,
        })),
      });
    }
  }

  // Mobilmeny
  const toggle = $("#navToggle"), navLinks = $("#navLinks");
  if (toggle && navLinks) {
    const setOpen = (o) => { navLinks.classList.toggle("open", o); toggle.setAttribute("aria-expanded", String(o)); };
    toggle.addEventListener("click", () => setOpen(!navLinks.classList.contains("open")));
    navLinks.addEventListener("click", (e) => { if (e.target.closest("a")) setOpen(false); });
  }
})();
