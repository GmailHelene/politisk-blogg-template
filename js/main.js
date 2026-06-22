/* Forside: 3-blokks hub (første serie + siste innlegg + temaoversikt).
   Manifest valgfritt under hub-en. Støtter live forhåndsvisning via postMessage. */
(function () {
  const $ = (s, c = document) => c.querySelector(s);
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

  function renderChrome(D) {
    D = D || {};
    const info = D.info || {};
    $$("[data-navn]").forEach((el) => { if (info.navn) el.textContent = info.navn; });
    // Tab-tittel/delingstittel: bruk delingsTittel hvis satt, ellers info.navn
    const docTitle = D.delingsTittel || info.navn || "";
    if (docTitle) document.title = docTitle;
    const setText = (sel, t) => { const el = $(sel); if (el && t != null && t !== "") el.textContent = t; };
    setText("[data-tittel]", info.tittel);
    setText("[data-ingress]", info.ingress);
    // Meta + OG
    const setAttr = (id, attr, val) => { const el = document.getElementById(id); if (el && val) el.setAttribute(attr, val); };
    const desc = D.delingsBeskrivelse || info.ingress || info.tittel || "";
    const ogTitle = D.delingsTittel || info.navn || info.tittel || "";
    const metaDesc = $('meta[name="description"]'); if (metaDesc && desc) metaDesc.setAttribute("content", desc);
    if (ogTitle) setAttr("ogTitle", "content", ogTitle);
    setAttr("ogDesc", "content", desc);
    const ogBilde = D.delingsBilde || info.heroBilde;
    if (ogBilde) setAttr("ogImage", "content", /^https?:/i.test(ogBilde) ? ogBilde : "https://modumvil.no/" + ogBilde.replace(/^\//, ""));
    // Favicon kan overstyres
    if (info.favicon) {
      const link = document.querySelector('link[rel="icon"]');
      if (link) link.setAttribute("href", info.favicon);
    }

    const cta = $("[data-cta]"); if (cta && info.ctaTekst) cta.textContent = info.ctaTekst;
    _defaultForfatter = info.forfatter || null;

    window.MV.renderNav();

    const hero = $(".hero");
    if (hero) {
      if (info.heroBilde) {
        hero.style.backgroundImage = `url("${String(info.heroBilde).replace(/"/g, "%22")}")`;
        // Posisjon: portal-verdi eller default "center top" (sa bunnen vises - bra for fotograf-kreditt)
        const pos = (info.heroBildePosisjon || "").trim().toLowerCase();
        const validPos = ["top", "center", "bottom"].includes(pos) ? pos : "top";
        hero.style.backgroundPosition = "center " + validPos;
        hero.classList.add("hero--bilde");
      } else { hero.style.backgroundImage = ""; hero.style.backgroundPosition = ""; hero.classList.remove("hero--bilde"); }
    }

    // «Hva er ModumVil.no?»-boksen er fjernet fra forsiden (innholdet bor pa Om siden).

    const mTittel = $("[data-manifest-tittel]"); if (mTittel && D.manifestTittel) mTittel.textContent = D.manifestTittel;
    const manifest = $("[data-manifest]"); if (manifest) manifest.innerHTML = D.manifest || "";
    const manifestSec = $("#manifest"); if (manifestSec) manifestSec.hidden = !(D.manifest && D.manifest.replace(/<[^>]+>/g, "").trim().length);

    // kontakt-seksjon er fjernet pa forsiden - Send innspill er na et hub-kort

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
    const siste = (_innlegg || []).slice(0, 4);

    // Siste innlegg som ekte innleggskort (gjenbruker delt kort-render)
    const liste = $("#sisteListe");
    if (liste && window.MV) {
      window.MV.renderPostCards(liste, siste, { empty: $("#sisteTom"), defaultForfatter: _defaultForfatter });
    }

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
          url: "https://modumvil.no/" + encodeURIComponent(p.slug) + ".html",
          name: p.tittel,
        })),
      });
    }
  }
})();
