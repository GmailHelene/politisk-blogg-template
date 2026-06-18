/* Full serie-oversikt: klikkbare kort til hver serie-side. */
(function () {
  const { $, $$, esc, renderMeny } = window.MV;

  fetch("content/innhold.json", { cache: "no-store" })
    .then((r) => (r.ok ? r.json() : {}))
    .then((D) => {
      const info = (D && D.info) || {};
      if (info.navn) $$("[data-navn]").forEach((el) => (el.textContent = info.navn));
      renderMeny(D.meny, D.temaer, D.serier);
      const grid = $("#serierGrid");
      const serier = Array.isArray(D.serier) ? D.serier.filter((s) => s && s.tittel) : [];
      grid.innerHTML = serier.map((s) => {
        const url = "serie.html?navn=" + encodeURIComponent(s.tittel);
        return `
          <article class="tema">
            <h3><a href="${url}">${esc(s.tittel)}</a></h3>
            <p>${esc(s.beskrivelse)}</p>
          </article>`;
      }).join("");
      // JSON-LD: ItemList av serier
      const ld = document.createElement("script");
      ld.type = "application/ld+json";
      ld.textContent = JSON.stringify({
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        name: "Serier",
        url: "https://modumvil.no/serier.html",
        hasPart: {
          "@type": "ItemList",
          itemListElement: serier.map((s, i) => ({
            "@type": "ListItem",
            position: i + 1,
            url: "https://modumvil.no/serie.html?navn=" + encodeURIComponent(s.tittel || ""),
            name: s.tittel,
          })),
        },
      });
      document.head.appendChild(ld);
    })
    .catch(() => renderMeny(null, null, null));
})();
