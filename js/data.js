/* Offline-reserve hvis siden åpnes uten server. Ekte kilde er
   content/innhold.json + content/innlegg/ (redigeres via Studio-portalen). */
window.SITE_DATA = {
  info: {
    navn: "Politisk blogg",
    tittel: "En tydeligere samtale om framtiden",
    ingress: "Tanker om hvilken retning kommunen vår bør ta.",
    ctaTekst: "Les innleggene"
  },
  meny: [
    { tittel: "Start her", lenke: "om.html" },
    { tittel: "Serier", lenke: "#serier" },
    { tittel: "Temaoversikt", lenke: "#temaer" },
    { tittel: "Innlegg", lenke: "#innlegg" }
  ],
  serier: [{ tittel: "Modum framover", beskrivelse: "En serie om framtidens Modum." }],
  omTittel: "Hva er ModumVil.no?",
  omTekst: "<p>En kort forklaring av hva siden er. Rediger denne i portalen.</p>",
  omSiden: "<p>Innholdet på Om siden-siden redigeres i portalen.</p>",
  bidraTekst: "<p>Her kan du sende inn et gjesteinnlegg.</p>",
  manifestTittel: "Dette handler om mer enn valgkamp",
  manifest: "<p>Skriv manifestet ditt her, i portalen.</p>",
  temaer: [],
  kontaktTittel: "Vil du bidra til debatten?",
  kontaktTekst: "Har du innspill eller tanker om samfunnsutviklingen i kommunen? Ta kontakt."
};
