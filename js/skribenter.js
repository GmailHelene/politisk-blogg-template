/* Vise oversikt over faste skribenter (navn, tittel/rolle, bilde, kort tekst, lenke). */
(function () {
  const { $, $$, esc, renderMeny } = window.MV;

  fetch("content/innhold.json", { cache: "no-store" })
    .then((r) => (r.ok ? r.json() : {}))
    .then((D) => {
      const info = (D && D.info) || {};
      if (info.navn) $$("[data-navn]").forEach((el) => (el.textContent = info.navn));
      renderMeny(D.meny, D.temaer, D.serier);

      const grid = $("#skribenterGrid");
      const tom = $("#skribenterTom");
      const list = Array.isArray(D.fasteSkribenter) ? D.fasteSkribenter.filter((s) => s && s.navn) : [];
      if (!list.length) { if (tom) tom.hidden = false; return; }
      grid.innerHTML = list.map((s) => {
        const img = s.bilde && /\S/.test(s.bilde)
          ? `<div class="skribent__media"><img src="${esc(s.bilde)}" alt="${esc(s.navn)}" loading="lazy"></div>`
          : `<div class="skribent__media skribent__media--placeholder" aria-hidden="true">${esc((s.navn || "?").slice(0, 1).toUpperCase())}</div>`;
        const rolle = s.tittel ? `<p class="skribent__rolle">${esc(s.tittel)}</p>` : "";
        const tekst = s.tekst ? `<p>${esc(s.tekst)}</p>` : "";
        const lenke = s.lenke ? `<a class="skribent__lenke" href="${esc(s.lenke)}" target="_blank" rel="noopener">Mer om ${esc(s.navn)} &rarr;</a>` : "";
        return `
          <article class="skribent">
            ${img}
            <div class="skribent__body">
              <h3>${esc(s.navn)}</h3>
              ${rolle}
              ${tekst}
              ${lenke}
            </div>
          </article>`;
      }).join("");

      // JSON-LD: liste over Person
      const ld = document.createElement("script");
      ld.type = "application/ld+json";
      ld.textContent = JSON.stringify({
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        name: "Våre faste skribenter",
        url: "https://modumvil.no/skribenter.html",
        hasPart: {
          "@type": "ItemList",
          itemListElement: list.map((s, i) => ({
            "@type": "ListItem",
            position: i + 1,
            item: { "@type": "Person", name: s.navn, jobTitle: s.tittel || undefined, url: s.lenke || undefined, image: s.bilde || undefined },
          })),
        },
      });
      document.head.appendChild(ld);
    })
    .catch(() => renderMeny(null, null, null));
})();
