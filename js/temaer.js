/* Full temaoversikt: klikkbare kort til hver tema-side. */
(function () {
  const { $, $$, esc, renderMeny } = window.MV;

  fetch("content/innhold.json", { cache: "no-store" })
    .then((r) => (r.ok ? r.json() : {}))
    .then((D) => {
      const info = (D && D.info) || {};
      if (info.navn) $$("[data-navn]").forEach((el) => (el.textContent = info.navn));
      renderMeny(D.meny, D.temaer, D.serier);
      const grid = $("#temaerGrid");
      const temaer = Array.isArray(D.temaer) ? D.temaer : [];
      grid.innerHTML = temaer.map((t) => {
        const url = "tema.html?navn=" + encodeURIComponent(t.tittel || "");
        return `
          <article class="tema">
            <h3><a href="${url}">${esc(t.tittel)}</a></h3>
            <p>${esc(t.beskrivelse)}</p>
          </article>`;
      }).join("");
      // JSON-LD: ItemList av temaer
      const ld = document.createElement("script");
      ld.type = "application/ld+json";
      ld.textContent = JSON.stringify({
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        name: "Temaoversikt",
        url: "https://modumvil.no/temaer.html",
        hasPart: {
          "@type": "ItemList",
          itemListElement: temaer.map((t, i) => ({
            "@type": "ListItem",
            position: i + 1,
            url: "https://modumvil.no/tema.html?navn=" + encodeURIComponent(t.tittel || ""),
            name: t.tittel,
          })),
        },
      });
      document.head.appendChild(ld);
    })
    .catch(() => renderMeny(null, null, null));
})();
