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

  /* ---- Google Ads / GA4 / GTM tracking --------------------
     Fill in EITHER a GTM container ID, OR the Google Ads / GA4 IDs.
     Leave blank to load nothing.
       GOOGLE_ADS_ID    e.g. "AW-123456789"
       ADS_LEAD_LABEL   conversion label of the "Lead form submit" action
       ADS_CALL_LABEL   (optional) label for click-to-call
       ADS_WHATSAPP_LABEL (optional) label for WhatsApp clicks
       GA4_ID           e.g. "G-XXXXXXXXXX"
       GTM_ID           e.g. "GTM-XXXXXXX"                         */
  TRACKING: {
    GTM_ID: "",
    GOOGLE_ADS_ID: "",
    ADS_LEAD_LABEL: "",
    ADS_CALL_LABEL: "",
    ADS_WHATSAPP_LABEL: "",
    GA4_ID: "",
  },

  /* ---- Lead details ---------------------------------------- */
  PROJECT: "SV Garudadri",
  THANK_YOU_URL: "/thank-you",

  /* ---- Popup ----------------------------------------------- */
  POPUP_DELAY_MS: 8000,

  /* ---- Contact numbers (digits only, with country code) ---- */
  PHONE: "919291369426",
  WHATSAPP: "919291369426",
  WHATSAPP_TEXT: "Hi, I am interested in SV Garudadri (Inside ORR - Exit 9, Pocharam). Please share the price and availability.",
};
