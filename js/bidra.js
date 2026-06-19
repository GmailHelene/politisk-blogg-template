/* Skriv et gjesteinnlegg: intro-tekst fra innhold.json + innsending via Netlify Forms. */
(function () {
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => Array.from(document.querySelectorAll(s));
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"]/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[m]));
  const norm = (s) => String(s == null ? "" : s).trim().toLowerCase();

  const DEFAULT_MENY = [
    { tittel: "Start her", lenke: "om.html" },
    { tittel: "Serier", lenke: "#serier" },
    { tittel: "Temaoversikt", lenke: "#temaer" },
    { tittel: "Innlegg", lenke: "#innlegg" },
  ];

  const menyHref = (lenke) => ((lenke || "#").charAt(0) === "#" ? "index.html" + lenke : (lenke || "#"));
  function ddConfig(lenke, temaer, serier) {
    const ln = norm(lenke);
    if (ln === "#temaer") return { list: temaer, item: "tema.html?navn=", all: "#temaer", allTekst: "Se hele temaoversikten" };
    if (ln === "#serier") return { list: serier, item: "serie.html?navn=", all: "serier.html", allTekst: "Se alle serier" };
    return null;
  }
  function renderMeny(meny, temaer, serier) {
    const nav = $("#navLinks"), cta = $("#navCta");
    if (!nav || !cta) return;
    Array.from(nav.children).forEach((c) => { if (c !== cta) c.remove(); });
    const items = Array.isArray(meny) && meny.length ? meny : DEFAULT_MENY;
    items.forEach((it) => {
      if (!it || !it.tittel) return;
      const dd = ddConfig(it.lenke, temaer, serier);
      if (dd && Array.isArray(dd.list) && dd.list.length) {
        const wrap = document.createElement("div"); wrap.className = "nav__dd";
        const btn = document.createElement("button"); btn.type = "button"; btn.className = "nav__dd-toggle"; btn.setAttribute("aria-expanded", "false");
        btn.innerHTML = esc(it.tittel) + ' <span class="caret" aria-hidden="true">&#9662;</span>';
        const panel = document.createElement("div"); panel.className = "nav__dd-panel";
        const all = document.createElement("a"); all.className = "nav__dd-all"; all.href = menyHref(dd.all); all.textContent = dd.allTekst; panel.appendChild(all);
        dd.list.forEach((t) => { if (!t || !t.tittel) return; const a = document.createElement("a"); a.href = dd.item + encodeURIComponent(t.tittel); a.textContent = t.tittel; panel.appendChild(a); });
        btn.addEventListener("click", (e) => { e.stopPropagation(); const open = panel.classList.toggle("open"); btn.setAttribute("aria-expanded", String(open)); });
        wrap.appendChild(btn); wrap.appendChild(panel); nav.insertBefore(wrap, cta);
      } else {
        const a = document.createElement("a"); a.href = menyHref(it.lenke); a.textContent = it.tittel; nav.insertBefore(a, cta);
      }
    });
  }
  document.addEventListener("click", () => {
    $$(".nav__dd-panel.open").forEach((p) => { p.classList.remove("open"); const b = p.parentElement && p.parentElement.querySelector(".nav__dd-toggle"); if (b) b.setAttribute("aria-expanded", "false"); });
  });

  fetch("content/innhold.json", { cache: "no-store" })
    .then((r) => (r.ok ? r.json() : {}))
    .then((D) => {
      const info = (D && D.info) || {};
      if (info.navn) $$("[data-navn]").forEach((el) => (el.textContent = info.navn));
      renderMeny(D && D.meny, D && D.temaer, D && D.serier);
      const intro = $("[data-bidra-tekst]");
      if (intro && D && D.bidraTekst) intro.innerHTML = D.bidraTekst;
      // Fyll tema-/serie-dropdowns fra eksisterende temaer/serier
      const fillDatalist = (id, list) => {
        const dl = document.getElementById(id);
        if (!dl || !Array.isArray(list)) return;
        dl.innerHTML = list.filter((it) => it && it.tittel).map((it) => `<option value="${esc(it.tittel)}"></option>`).join("");
      };
      fillDatalist("bidra-temaer", D && D.temaer);
      fillDatalist("bidra-serier", D && D.serier);
    })
    .catch(() => { renderMeny(null, null, null); });

  // Rik-tekst-editor (contentEditable -> skjult textarea) i innleggsfeltet
  const rt = document.querySelector(".rt[data-rt-target='innlegg']");
  const rtEditor = rt && rt.querySelector(".rt__editor");
  const rtTextarea = document.getElementById("bidraInnleggTextarea");
  if (rt && rtEditor && rtTextarea) {
    const syncToTextarea = () => { rtTextarea.value = rtEditor.innerHTML; };
    rtEditor.addEventListener("input", syncToTextarea);
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
      // Sorg for at HTML-en fra rt-editoren er synket til hidden textarea
      if (rtEditor && rtTextarea) rtTextarea.value = rtEditor.innerHTML;
      const fd = new FormData(form);
      // Hopp over tomt fil-felt (Netlify klager ellers)
      const bilde = fd.get("bilde");
      if (bilde && bilde instanceof File && bilde.size === 0) fd.delete("bilde");
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

  const toggle = $("#navToggle"), navLinks = $("#navLinks");
  if (toggle && navLinks) {
    const setOpen = (o) => { navLinks.classList.toggle("open", o); toggle.setAttribute("aria-expanded", String(o)); };
    toggle.addEventListener("click", () => setOpen(!navLinks.classList.contains("open")));
    navLinks.addEventListener("click", (e) => { if (e.target.closest("a")) setOpen(false); });
  }
})();
