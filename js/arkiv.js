/* Arkiv: alle innleggene, nyeste øverst. */
(function () {
  const { $, $$, renderMeny, renderPostCards, setJsonLd } = window.MV;

  fetch("content/innhold.json", { cache: "no-store" })
    .then((r) => (r.ok ? r.json() : {}))
    .then((D) => {
      const info = (D && D.info) || {};
      if (info.navn) $$("[data-navn]").forEach((el) => (el.textContent = info.navn));
      renderMeny(D.meny, D.temaer, D.serier);
    })
    .catch(() => renderMeny(null, null, null));

  fetch("content/innlegg/index.json", { cache: "no-store" })
    .then((r) => (r.ok ? r.json() : []))
    .then((list) => {
      const items = Array.isArray(list) ? list : (list.innlegg || []);
      renderPostCards($("#postsList"), items, { empty: $("#postsEmpty") });
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
