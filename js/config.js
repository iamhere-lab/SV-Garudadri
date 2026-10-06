/* ============================================================
   SV Garudadri – Site configuration
   Edit this file only. Everything in main.js reads from here.
   ============================================================ */
window.SVG_CONFIG = {

  /* ---- OTP (MSG91) ----
     Set OTP_ENABLED to false to switch off SMS OTP verification on ALL forms.
     When off, the "Verify" button is hidden and leads submit directly. */
  OTP_ENABLED: true,
  MSG91: {
    widgetId: "366a66654164353739373232",
    tokenAuth: "563888TgHvlsjRKqye6ac486b5P1"
  },

  /* ---- Google Sheets (Apps Script Web App URL) ---- */
  SHEET_ENDPOINT: "https://script.google.com/macros/s/AKfycbwdakJ_Z-pStpnS1Rdg8ecX6Di_yPgXePF3I_-uSZPGTizgZ0UadV1SsuK4ZA_MNduarg/exec",

  /* ---- Lead meta ---- */
  PROJECT: "SV Garudadri",
  DEFAULT_STATUS: "New",

  /* ---- Pages & behaviour ---- */
  THANK_YOU_URL: "/thank-you",   // vercel.json cleanUrls serves thank-you.html here
  POPUP_DELAY_MS: 8000,          // auto-open popup after 8 s on the home page
  POPUP_ONCE_PER_SESSION: true,  // don't auto-open again after the visitor closes it

  /* ---- Contact (used in buttons/links) ---- */
  PHONE: "+919577330011",
  WHATSAPP: "919577330011"
};
