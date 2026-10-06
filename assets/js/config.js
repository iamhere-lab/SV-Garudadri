/* ==========================================================
   SV Garudadri — SITE SETTINGS
   Edit this one file to control every form on the site.
   ========================================================== */
window.SITE_CONFIG = {
  /* ---- OTP verification -----------------------------------
     true  = phone number must be verified by SMS OTP (MSG91)
     false = OTP step is hidden on ALL forms                    */
  OTP_ENABLED: true,

  /* ---- MSG91 OTP widget ----------------------------------- */
  MSG91: {
    widgetId: "366a66654164353739373232",
    tokenAuth: "563888TgHvlsjRKqye6ac486b5P1",
  },
  COUNTRY_CODE: "91",
  OTP_RESEND_SECONDS: 30,

  /* ---- Google Sheets ("SV Garudadri Lead Tracker") ---------
     Paste the Apps Script Web App URL (ends with /exec) here.  */
  SHEET_WEBAPP_URL: "https://script.google.com/macros/s/AKfycbwdakJ_Z-pStpnS1Rdg8ecX6Di_yPgXePF3I_-uSZPGTizgZ0UadV1SsuK4ZA_MNduarg/exec",

  /* ---- Lead details ---------------------------------------- */
  PROJECT: "SV Garudadri",
  THANK_YOU_URL: "/thank-you",

  /* ---- Popup ----------------------------------------------- */
  POPUP_DELAY_MS: 8000,

  /* ---- Contact numbers (digits only, with country code) ---- */
  PHONE: "919291369426",
  WHATSAPP: "919291369426",
  WHATSAPP_TEXT: "Hi, I am interested in SV Garudadri, Ghatkesar. Please share the details.",
};
