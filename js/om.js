/* Om siden: leser omSiden (rik tekst) fra content/innhold.json. */
(function () {
  const $ = (s) => document.querySelector(s);
  const $$ = (s, root) => Array.from((root || document).querySelectorAll(s));
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"]/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[m]));
  const norm = (s) => String(s == null ? "" : s).trim().toLowerCase();

  fetch("content/innhold.json", { cache: "no-store" })
    .then((r) => (r.ok ? r.json() : {}))
    .then((D) => {
      const info = (D && D.info) || {};
      if (info.navn) $$("[data-navn]").forEach((el) => (el.textContent = info.navn));
      window.MV.renderNav();
      const body = $("[data-om-siden]");
      if (body) body.innerHTML = (D && D.omSiden) || "<p>Innholdet på denne siden redigeres i portalen.</p>";

      // FAQ JSON-LD: hent ut alle H3 + følgende paragraf som Q&A (AEO).
      try {
        const faqs = [];
        $$("h3", body).forEach((h) => {
          const q = h.textContent.trim();
          let p = h.nextElementSibling;
          while (p && p.tagName !== "P" && p.tagName !== "H3") p = p.nextElementSibling;
          if (q && p && p.tagName === "P") faqs.push({ q, a: p.textContent.trim() });
        });
        if (faqs.length) {
          const ld = document.getElementById("ldFaq");
          if (ld) ld.textContent = JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: faqs.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
          });
        }
      } catch (e) { /* ikke fatalt */ }

      const ldB = document.getElementById("ldBreadcrumb");
      if (ldB) ldB.textContent = JSON.stringify({
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Forsiden", item: "https://modumvil.no/" },
          { "@type": "ListItem", position: 2, name: "Om siden", item: "https://modumvil.no/om.html" },
        ],
      });
    })
    .catch(() => { window.MV.renderNav(); });
})();
