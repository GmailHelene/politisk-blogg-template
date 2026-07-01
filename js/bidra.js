/* Skriv et gjesteinnlegg: intro-tekst fra innhold.json + innsending via Netlify Forms. */
(function () {
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => Array.from(document.querySelectorAll(s));
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"]/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[m]));
  const norm = (s) => String(s == null ? "" : s).trim().toLowerCase();

  // Renser bort Word/Office-søppel: beholder kun enkle semantiske tagger,
  // fjerner inline-stiler, mso-klasser, <o:p>, lang-attributter osv.
  const ALLOWED = { P: 1, H2: 1, H3: 1, H4: 1, STRONG: 1, B: 1, EM: 1, I: 1, U: 1, UL: 1, OL: 1, LI: 1, A: 1, BR: 1, BLOCKQUOTE: 1 };
  function cleanHtml(dirty) {
    const tmp = document.createElement("div");
    tmp.innerHTML = String(dirty || "");
    tmp.querySelectorAll("style, script, meta, link, title, o\\:p, xml").forEach((el) => el.remove());
    const walk = (node) => {
      Array.from(node.childNodes).forEach((child) => {
        if (child.nodeType === 1) {
          walk(child);
          let tag = child.tagName;
          if (tag === "H1") { const h = document.createElement("h2"); while (child.firstChild) h.appendChild(child.firstChild); node.replaceChild(h, child); return; }
          if (!ALLOWED[tag]) {
            while (child.firstChild) node.insertBefore(child.firstChild, child);
            node.removeChild(child);
          } else {
            Array.from(child.attributes).forEach((a) => { if (!(tag === "A" && a.name === "href")) child.removeAttribute(a.name); });
          }
        } else if (child.nodeType === 8) {
          node.removeChild(child); // kommentarer (Word legger inn mange)
        }
      });
    };
    walk(tmp);
    tmp.querySelectorAll("p, h2, h3, h4, li").forEach((el) => { if (!el.textContent.trim() && !el.querySelector("img")) el.remove(); });
    return tmp.innerHTML.replace(/\s+/g, " ").replace(/>\s+</g, "><").trim();
  }
  function htmlToText(html) {
    const t = document.createElement("div");
    t.innerHTML = String(html || "");
    const blocks = [];
    t.querySelectorAll("p, h2, h3, h4, li").forEach((el) => { const s = el.textContent.trim(); if (s) blocks.push((el.tagName === "LI" ? "- " : "") + s); });
    if (!blocks.length) { const s = t.textContent.trim(); if (s) blocks.push(s); }
    return blocks.join("\n\n");
  }

  fetch("content/innhold.json", { cache: "no-store" })
    .then((r) => (r.ok ? r.json() : {}))
    .then((D) => {
      const info = (D && D.info) || {};
      if (info.navn) $$("[data-navn]").forEach((el) => (el.textContent = info.navn));
      window.MV.renderNav();
      const intro = $("[data-bidra-tekst]");
      if (intro && D && D.bidraTekst) intro.innerHTML = D.bidraTekst;
      // Fyll select-feltene for tema og serie
      const fillSelect = (selectId, list) => {
        const sel = document.getElementById(selectId);
        if (!sel || !Array.isArray(list)) return;
        const nyttOpt = sel.querySelector('option[value="__nytt__"]');
        list.filter((it) => it && it.tittel).forEach((it) => {
          const o = document.createElement("option");
          o.value = it.tittel;
          o.textContent = it.tittel;
          sel.insertBefore(o, nyttOpt);
        });
      };
      fillSelect("bidraTemaSelect", D && D.temaer);
      fillSelect("bidraSerieSelect", D && D.serier);

      // Toggle "skriv inn"-felt nar bruker velger Annet
      const wireSelect = (selectId, inputId) => {
        const sel = document.getElementById(selectId), inp = document.getElementById(inputId);
        if (!sel || !inp) return;
        sel.addEventListener("change", () => {
          const annet = sel.value === "__nytt__";
          inp.hidden = !annet;
          if (annet) { inp.required = false; inp.focus(); } else { inp.value = ""; }
        });
      };
      wireSelect("bidraTemaSelect", "bidraTemaAnnet");
      wireSelect("bidraSerieSelect", "bidraSerieAnnet");
    })
    .catch(() => { window.MV.renderNav(); });

  // Rik-tekst-editor (contentEditable -> skjult textarea) i innleggsfeltet
  const rt = document.querySelector(".rt[data-rt-target='innlegg']");
  const rtEditor = rt && rt.querySelector(".rt__editor");
  const rtTextarea = document.getElementById("bidraInnleggTextarea");
  const rtTekst = document.getElementById("bidraTekst");
  if (rt && rtEditor && rtTextarea) {
    const syncToTextarea = () => {
      const ren = cleanHtml(rtEditor.innerHTML);
      rtTextarea.value = ren;
      if (rtTekst) rtTekst.value = htmlToText(ren);
    };
    rtEditor.addEventListener("input", syncToTextarea);
    // Lim inn fra Word/nettsider: rens bort stiler/mso-koder umiddelbart
    rtEditor.addEventListener("paste", (e) => {
      e.preventDefault();
      const cb = e.clipboardData || window.clipboardData;
      const html = cb && cb.getData("text/html");
      const text = cb && cb.getData("text/plain");
      if (html) { document.execCommand("insertHTML", false, cleanHtml(html)); }
      else if (text) { document.execCommand("insertText", false, text); }
      syncToTextarea();
    });
    rt.querySelectorAll(".rt__btn").forEach((btn) => {
      btn.addEventListener("mousedown", (e) => {
        e.preventDefault();
        const cmd = btn.getAttribute("data-cmd");
        let arg = btn.getAttribute("data-arg") || undefined;
        if (cmd === "createLink") {
          const url = prompt("Lenke (https://…)");
          if (!url) return;
          arg = url;
        }
        if (cmd === "formatBlock" && arg) arg = "<" + arg + ">";
        rtEditor.focus();
        document.execCommand(cmd, false, arg);
        syncToTextarea();
      });
    });
    // Vis plassholder via CSS når tom
    syncToTextarea();
  }

  // Innsending via Netlify Forms (AJAX, FormData stotter bade rich-text og bilde-vedlegg).
  const form = $("#bidraForm");
  if (form) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const feil = $("#skjemaFeil"); if (feil) feil.hidden = true;
      const btn = form.querySelector("button[type=submit]");
      if (btn) { btn.disabled = true; btn.textContent = "Sender …"; }
      // Sorg for at renset HTML + ren tekst fra rt-editoren er synket
      if (rtEditor && rtTextarea) {
        const ren = cleanHtml(rtEditor.innerHTML);
        rtTextarea.value = ren;
        if (rtTekst) rtTekst.value = htmlToText(ren);
      }
      // Hvis select er "__nytt__", erstatt med innskrevet verdi
      const temaSel = document.getElementById("bidraTemaSelect");
      const temaAnnet = document.getElementById("bidraTemaAnnet");
      if (temaSel && temaSel.value === "__nytt__") temaSel.value = (temaAnnet && temaAnnet.value.trim()) || "";
      const serieSel = document.getElementById("bidraSerieSelect");
      const serieAnnet = document.getElementById("bidraSerieAnnet");
      if (serieSel && serieSel.value === "__nytt__") serieSel.value = (serieAnnet && serieAnnet.value.trim()) || "";

      const fd = new FormData(form);
      // Hopp over tomt fil-felt (Netlify klager ellers)
      const bilde = fd.get("bilde");
      const bildeRett = document.getElementById("bidraBildeRett");
      if (bilde && bilde instanceof File && bilde.size === 0) {
        fd.delete("bilde");
      } else if (bilde && bilde instanceof File && bilde.size > 0) {
        // Bilde lagt ved: krev rettighets-bekreftelse
        if (bildeRett && !bildeRett.checked) {
          if (btn) { btn.disabled = false; btn.textContent = "Send inn innlegg"; }
          if (feil) { feil.textContent = "Krysse av for at du har rettigheter til bildet før du sender."; feil.hidden = false; }
          bildeRett.focus();
          return;
        }
      }
      fetch("/", { method: "POST", body: fd })
        .then((r) => {
          if (!r.ok) throw new Error("status " + r.status);
          form.hidden = true;
          const takk = $("#bidraTakk"); if (takk) takk.hidden = false;
          window.scrollTo({ top: 0, behavior: "smooth" });
        })
        .catch(() => {
          if (btn) { btn.disabled = false; btn.textContent = "Send inn innlegg"; }

          if (feil) feil.hidden = false;
        });
    });
  }
})();
