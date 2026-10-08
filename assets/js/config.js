/**
 * Site configuration — edit these values only.
 *
 * SHEET_WEBAPP_URL: the Google Apps Script Web App URL (ends with /exec).
 *   See apps-script/Code.gs for setup. Leads are saved to the Google Sheet.
 *   While it is empty, leads are only logged to the browser console.
 */
window.SITE_CONFIG = {
  SHEET_WEBAPP_URL: "https://script.google.com/macros/s/AKfycbwdakJ_Z-pStpnS1Rdg8ecX6Di_yPgXePF3I_-uSZPGTizgZ0UadV1SsuK4ZA_MNduarg/exec",

  PROJECT: "SV Garudadri",
  PHONE: "9577330011",            // used for call buttons
  WHATSAPP: "919577330011",       // country code + number, no "+"
  WHATSAPP_TEXT: "Hi, I'm interested in SV Garudadri at Pocharam (Inside ORR Exit 9).",

  POPUP_DELAY_MS: 12000,          // auto-open popup once per session; 0 disables
  THANK_YOU_URL: "thank-you.html" // page shown after any form is submitted
};
