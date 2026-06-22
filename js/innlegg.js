/* Enkeltinnlegg: leser ?slug=... og henter content/innlegg/<slug>.json.
   Setter tittel/meta/Open Graph slik at delte lenker ser ordentlige ut. */
(function () {
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => Array.from(document.querySelectorAll(s));
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"]/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[m]));

  function fmtDato(d) {
    if (!d) return "";
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(d).trim());
    if (!m) return String(d);
    const mnd = ["januar", "februar", "mars", "april", "mai", "juni", "juli", "august", "september", "oktober", "november", "desember"];
    return `${Number(m[3])}. ${mnd[Number(m[2]) - 1]} ${m[1]}`;
  }

  // Slug: fra POST_SLUG (statisk per-innlegg-side) eller ?slug= (delt innlegg.html).
  const slug = window.POST_SLUG || new URLSearchParams(location.search).get("slug");
  // Kanonisk URL = gjeldende side (uten hash). På statisk side er det /<slug>.html.
  const selfUrl = location.href.split("#")[0].split("?")[0] +
    (window.POST_SLUG ? "" : (location.search || ""));

  // Toppmeny-merkenavn fra rammen (best effort)
  fetch("content/innhold.json", { cache: "no-store" })
    .then((r) => (r.ok ? r.json() : {}))
    .then((D) => {
      const info = (D && D.info) || {};
      if (info.navn) $$("[data-navn]").forEach((el) => (el.textContent = info.navn));
      if (info.forfatter) window.SITE_AUTHOR = info.forfatter;
      window.MV.renderNav();
      const kbtn = $("#kontaktBtn");
      if (kbtn && info.epost) { kbtn.href = "mailto:" + info.epost; kbtn.textContent = "Send meg en e-post"; kbtn.hidden = false; }
    })
    .catch(() => window.MV.renderNav());

  if (!slug || !/^[a-z0-9-]+$/.test(slug)) { showError("Fant ikke innlegget."); return; }

  fetch("content/innlegg/" + encodeURIComponent(slug) + ".json", { cache: "no-store" })
    .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
    .then(render)
    .catch(() => showError("Fant ikke innlegget."));

  function setMeta(id, attr, val) { const el = document.getElementById(id); if (el) el.setAttribute(attr, val); }

  function render(p) {
    p = p || {};
    const tittel = p.tittel || "Innlegg";
    document.title = tittel + " - ModumVil.no";
    const url = selfUrl;
    setMeta("metaDesc", "content", p.ingress || tittel);
    setMeta("canonical", "href", url);
    setMeta("ogTitle", "content", tittel);
    setMeta("ogDesc", "content", p.ingress || "");
    setMeta("ogUrl", "content", url);
    if (p.bilde && /^https?:/i.test(p.bilde)) setMeta("ogImage", "content", p.bilde);

    // JSON-LD: BlogPosting (forteller crawlere/AI hva siden er, ikke bare HTML)
    const article = {
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      headline: tittel,
      mainEntityOfPage: { "@type": "WebPage", "@id": url },
      url,
      inLanguage: "nb-NO",
    };
    if (p.dato) article.datePublished = p.dato;
    if (p.ingress) article.description = p.ingress;
    if (p.bilde) article.image = p.bilde;
    if (p.tema) article.about = p.tema;
    if (p.serie) article.isPartOf = { "@type": "CreativeWorkSeries", name: p.serie };
    const forfatter = p.forfatter || window.SITE_AUTHOR;
    if (forfatter) article.author = { "@type": "Person", name: forfatter };

    // Synlig byline under tittelen
    const byline = $("#postByline");
    if (byline && forfatter) {
      byline.innerHTML = `Av <strong>${esc(forfatter)}</strong>`;
      if (p.forfatter && window.SITE_AUTHOR && p.forfatter !== window.SITE_AUTHOR) {
        byline.innerHTML += ' <span class="article__byline-tag">Gjesteinnlegg</span>';
      }
      byline.hidden = false;
    }
    article.publisher = { "@type": "Organization", name: "ModumVil.no" };
    const ldA = document.getElementById("ldArticle"); if (ldA) ldA.textContent = JSON.stringify(article);

    // BreadcrumbList
    const crumbs = [
      { name: "Forsiden", item: "https://modumvil.no/" },
      { name: "Alle innlegg", item: "https://modumvil.no/arkiv.html" },
      { name: tittel, item: url },
    ];
    const ldB = document.getElementById("ldBreadcrumb");
    if (ldB) ldB.textContent = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: crumbs.map((c, i) => ({ "@type": "ListItem", position: i + 1, name: c.name, item: c.item })),
    });

    $("#postTitle").textContent = tittel;
    const dateEl = $("#postDate"); if (p.dato) dateEl.textContent = fmtDato(p.dato);
    const temaEl = $("#postTema");
    if (temaEl) {
      const links = [];
      if (p.serie) links.push(`<a class="post-card__date" style="text-decoration:none" href="serie.html?navn=${encodeURIComponent(p.serie)}">${esc(p.serie)}${p.delnr ? " · del " + esc(p.delnr) : ""} &rarr;</a>`);
      if (p.tema) links.push(`<a class="post-card__date" style="text-decoration:none" href="tema.html?navn=${encodeURIComponent(p.tema)}">${esc(p.tema)} &rarr;</a>`);
      if (links.length) { temaEl.innerHTML = links.join('<span style="margin:0 .5rem;color:var(--ink-soft)">·</span>'); temaEl.hidden = false; }
    }
    const lead = $("#postLead"); if (p.ingress) { lead.textContent = p.ingress; lead.hidden = false; }
    const media = $("#postMedia");
    if (p.bilde) {
      const caption = [p.bildetekst, p.bildeFotograf ? "Foto: " + p.bildeFotograf : ""].filter(Boolean).join(" - ");
      media.innerHTML = `<img src="${esc(p.bilde)}" alt="${esc(tittel)}">${caption ? `<figcaption class="article__bildetekst">${esc(caption)}</figcaption>` : ""}`;
      media.hidden = false;
    }
    $("#postBody").innerHTML = p.brodtekst || "";

    // Kommentarer (moderert via portalen)
    renderKommentarer(p.kommentarer || []);
    const slugIn = $("#kommentarSlug"); if (slugIn) slugIn.value = slug;
    const titIn = $("#kommentarTittel"); if (titIn) titIn.value = tittel;
    wireKommentarForm();
  }

  function fmtKommentarDato(d) {
    if (!d) return "";
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(d).trim());
    if (!m) return String(d);
    const mnd = ["januar","februar","mars","april","mai","juni","juli","august","september","oktober","november","desember"];
    return `${Number(m[3])}. ${mnd[Number(m[2]) - 1]} ${m[1]}`;
  }

  function renderKommentarer(list) {
    const liste = $("#kommentarListe");
    const tom = $("#kommentarTom");
    if (!liste) return;
    const items = Array.isArray(list) ? list.filter((k) => k && (k.navn || k.tekst)) : [];
    if (!items.length) { liste.innerHTML = ""; if (tom) tom.hidden = false; return; }
    if (tom) tom.hidden = true;
    liste.innerHTML = items.map((k) => `
      <li class="kommentar">
        <p class="kommentar__meta"><strong>${esc(k.navn || "Anonym")}</strong>${k.dato ? ` <span>· ${esc(fmtKommentarDato(k.dato))}</span>` : ""}</p>
        <p class="kommentar__tekst">${esc(k.tekst || "").replace(/\n/g, "<br>")}</p>
      </li>
    `).join("");
  }

  let _kommentarWired = false;
  function wireKommentarForm() {
    if (_kommentarWired) return;
    const form = $("#kommentarForm");
    if (!form) return;
    _kommentarWired = true;
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const feil = $("#kommentarFeil"); if (feil) feil.hidden = true;
      const btn = form.querySelector("button[type=submit]");
      if (btn) { btn.disabled = true; btn.textContent = "Sender …"; }
      const body = new URLSearchParams(new FormData(form)).toString();
      fetch("/", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body })
        .then((r) => {
          if (!r.ok) throw new Error("status " + r.status);
          form.hidden = true;
          const takk = $("#kommentarTakk"); if (takk) takk.hidden = false;
        })
        .catch(() => {
          if (btn) { btn.disabled = false; btn.textContent = "Send inn kommentar"; }
          if (feil) feil.hidden = false;
        });
    });
  }

  function showError(msg) {
    $("#postTitle").textContent = msg;
    $("#postBody").innerHTML = '<p><a href="arkiv.html">Tilbake til alle innlegg</a></p>';
  }
})();
