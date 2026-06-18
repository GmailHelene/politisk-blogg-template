/* Arkiv: alle innleggene, nyeste øverst. */
(function () {
  const { $, $$, renderMeny, renderPostCards, setJsonLd } = window.MV;

  let _info = null;
  function maybeRenderList() {
    if (!_info || !_innlegg) return;
    renderPostCards($("#postsList"), _innlegg, { empty: $("#postsEmpty"), defaultForfatter: _info.forfatter });
  }
  let _innlegg = null;

  fetch("content/innhold.json", { cache: "no-store" })
    .then((r) => (r.ok ? r.json() : {}))
    .then((D) => {
      _info = (D && D.info) || {};
      if (_info.navn) $$("[data-navn]").forEach((el) => (el.textContent = _info.navn));
      renderMeny(D.meny, D.temaer, D.serier);
      maybeRenderList();
    })
    .catch(() => { _info = {}; renderMeny(null, null, null); maybeRenderList(); });

  fetch("content/innlegg/index.json", { cache: "no-store" })
    .then((r) => (r.ok ? r.json() : []))
    .then((list) => {
      const items = Array.isArray(list) ? list : (list.innlegg || []);
      _innlegg = items;
      maybeRenderList();
      // JSON-LD: CollectionPage som lister postene
      const itemListElement = items.map((p, i) => ({
        "@type": "ListItem",
        position: i + 1,
        url: "https://modumvil.no/innlegg.html?slug=" + encodeURIComponent(p.slug),
        name: p.tittel,
      }));
      const ld = document.createElement("script");
      ld.type = "application/ld+json";
      ld.textContent = JSON.stringify({
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        name: "Alle innlegg",
        url: "https://modumvil.no/arkiv.html",
        hasPart: { "@type": "ItemList", itemListElement },
      });
      document.head.appendChild(ld);
    })
    .catch(() => renderPostCards($("#postsList"), [], { empty: $("#postsEmpty") }));
})();
