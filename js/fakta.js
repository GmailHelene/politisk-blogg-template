/* Modum fakta: accordion-kort gruppert etter kategori, m/ historikk. */
(function () {
  const { $, $$, esc, renderMeny } = window.MV;

  function norm(s) { return String(s || "").trim(); }

  // Beregn endring fra historikk hvis ikke eksplisitt satt
  function autoEndring(historikk) {
    if (!Array.isArray(historikk) || historikk.length < 2) return "";
    const tall = (s) => {
      const n = parseFloat(String(s || "").replace(/\s+/g, "").replace(",", "."));
      return Number.isFinite(n) ? n : null;
    };
    const a = tall(historikk[0] && historikk[0].verdi);
    const b = tall(historikk[1] && historikk[1].verdi);
    if (a == null || b == null) return "";
    const d = a - b;
    const sign = d > 0 ? "+" : "";
    return sign + d.toLocaleString("no-NO", { maximumFractionDigits: 1 });
  }

  function renderKort(f, idx) {
    const tittel = esc(f.tittel || "");
    const hovedtall = esc(f.hovedtall || "");
    const enhet = f.enhet ? `<span class="faktakort__enhet"> ${esc(f.enhet)}</span>` : "";
    const endringRaw = f.endring && norm(f.endring) ? norm(f.endring) : autoEndring(f.historikk);
    let endringHtml = "";
    if (endringRaw) {
      const positive = /^\+/.test(endringRaw);
      const negative = /^-/.test(endringRaw);
      const cls = positive ? "faktakort__endring--opp" : negative ? "faktakort__endring--ned" : "";
      endringHtml = `<span class="faktakort__endring ${cls}">${esc(endringRaw)}</span>`;
    }
    const forklaringHtml = f.forklaring ? `<div class="faktakort__forklaring prose">${f.forklaring}</div>` : "";
    const kildeHtml = f.kilde
      ? (f.kildeUrl
          ? `<p class="faktakort__kilde"><strong>Kilde:</strong> <a href="${esc(f.kildeUrl)}" target="_blank" rel="noopener">${esc(f.kilde)}</a></p>`
          : `<p class="faktakort__kilde"><strong>Kilde:</strong> ${esc(f.kilde)}</p>`)
      : "";
    const oppdatertHtml = f.sistOppdatert ? `<p class="faktakort__oppdatert"><strong>Sist oppdatert:</strong> ${esc(f.sistOppdatert)}</p>` : "";

    let historikkHtml = "";
    const hist = Array.isArray(f.historikk) ? f.historikk.filter((h) => h && (h.dato || h.verdi)) : [];
    if (hist.length) {
      historikkHtml = `
        <div class="faktakort__historikk">
          <h4>Historikk</h4>
          <table>
            <thead><tr><th>Dato</th><th>Verdi</th>${hist.some(h=>h.kommentar)?'<th>Kommentar</th>':''}</tr></thead>
            <tbody>
              ${hist.map((h) => `<tr><td>${esc(h.dato || "")}</td><td><strong>${esc(h.verdi || "")}</strong></td>${hist.some(x=>x.kommentar)?`<td>${esc(h.kommentar || "")}</td>`:''}</tr>`).join("")}
            </tbody>
          </table>
        </div>`;
    }

    const id = "fakta-" + idx;
    return `
      <article class="faktakort">
        <button class="faktakort__topp" type="button" aria-expanded="false" aria-controls="${id}">
          <span class="faktakort__tekst">
            <span class="faktakort__tittel">${tittel}</span>
            <span class="faktakort__tall">${hovedtall}${enhet} ${endringHtml}</span>
          </span>
          <span class="faktakort__pil" aria-hidden="true">&#9662;</span>
        </button>
        <div class="faktakort__bunn" id="${id}" hidden>
          ${forklaringHtml}
          ${oppdatertHtml}
          ${kildeHtml}
          ${historikkHtml}
        </div>
      </article>`;
  }

  function wireAccordion(root) {
    const buttons = $$(".faktakort__topp", root);
    buttons.forEach((btn) => {
      btn.addEventListener("click", () => {
        const expanded = btn.getAttribute("aria-expanded") === "true";
        // Lukk alle andre forst (eksklusiv accordion)
        buttons.forEach((other) => {
          if (other === btn) return;
          other.setAttribute("aria-expanded", "false");
          const otherPanel = document.getElementById(other.getAttribute("aria-controls"));
          if (otherPanel) otherPanel.hidden = true;
        });
        // Toggle dette kortet
        btn.setAttribute("aria-expanded", String(!expanded));
        const panel = document.getElementById(btn.getAttribute("aria-controls"));
        if (panel) panel.hidden = expanded;
      });
    });
  }

  fetch("content/innhold.json", { cache: "no-store" })
    .then((r) => (r.ok ? r.json() : {}))
    .then((D) => {
      const info = (D && D.info) || {};
      if (info.navn) $$("[data-navn]").forEach((el) => (el.textContent = info.navn));
      renderMeny(D.meny, D.temaer, D.serier);
      const introEl = $("#faktaIntro");
      if (introEl && D.faktaIntro) introEl.innerHTML = D.faktaIntro;

      const list = Array.isArray(D.fakta) ? D.fakta.filter((f) => f && f.tittel) : [];
      const wrap = $("#faktaInnhold");
      const tom = $("#faktaTom");
      if (!list.length) { if (tom) tom.hidden = false; return; }

      // Grupper etter kategori (behold rekkefolge fra forste forekomst)
      const grupper = new Map();
      list.forEach((f, i) => {
        const k = norm(f.kategori) || "Annet";
        if (!grupper.has(k)) grupper.set(k, []);
        grupper.get(k).push({ ...f, _idx: i });
      });

      wrap.innerHTML = Array.from(grupper.entries()).map(([kat, kort]) => `
        <section class="fakta-gruppe">
          <h3 class="fakta-gruppe__tittel">${esc(kat)}</h3>
          <div class="fakta-grid">
            ${kort.map((f) => renderKort(f, f._idx)).join("")}
          </div>
        </section>
      `).join("");

      wireAccordion(wrap);

      // JSON-LD: CollectionPage
      const ld = document.createElement("script");
      ld.type = "application/ld+json";
      ld.textContent = JSON.stringify({
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        name: "Modum fakta",
        url: "https://modumvil.no/fakta.html",
        description: "Nøkkeltall om Modum kommune - oppdateres jevnlig.",
        hasPart: {
          "@type": "ItemList",
          itemListElement: list.map((f, i) => ({ "@type": "ListItem", position: i + 1, name: f.tittel })),
        },
      });
      document.head.appendChild(ld);
    })
    .catch(() => renderMeny(null, null, null));
})();
