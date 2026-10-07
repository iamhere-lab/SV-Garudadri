/* ==========================================================
   SV Garudadri — Google Ads / GA4 / GTM tracking
   IDs live in assets/js/config.js (TRACKING block).
   Nothing loads until at least one ID is filled in.
   ========================================================== */
(function () {
  "use strict";
  var T = (window.SITE_CONFIG || {}).TRACKING || {};
  window.dataLayer = window.dataLayer || [];
  function gtag() { window.dataLayer.push(arguments); }
  window.gtag = window.gtag || gtag;

  var useGtm = !!T.GTM_ID;
  var useGtag = !useGtm && !!(T.GOOGLE_ADS_ID || T.GA4_ID);

  function load(src) {
    var s = document.createElement("script");
    s.async = true;
    s.src = src;
    document.head.appendChild(s);
  }

  if (useGtm) {
    window.dataLayer.push({ "gtm.start": Date.now(), event: "gtm.js" });
    load("https://www.googletagmanager.com/gtm.js?id=" + encodeURIComponent(T.GTM_ID));
  } else if (useGtag) {
    load("https://www.googletagmanager.com/gtag/js?id=" + encodeURIComponent(T.GOOGLE_ADS_ID || T.GA4_ID));
    gtag("js", new Date());
    if (T.GOOGLE_ADS_ID) gtag("config", T.GOOGLE_ADS_ID, { allow_enhanced_conversions: true });
    if (T.GA4_ID) gtag("config", T.GA4_ID);
  }

  /* One call for every event: GTM gets a dataLayer event, gtag gets a gtag event. */
  window.svTrack = function (name, params) {
    params = params || {};
    if (useGtag) { gtag("event", name, params); return; }
    var o = { event: name };
    for (var k in params) if (Object.prototype.hasOwnProperty.call(params, k)) o[k] = params[k];
    window.dataLayer.push(o);
  };

  /* Google Ads conversion (direct gtag mode only; in GTM mode use the dataLayer events). */
  window.svConversion = function (label, extra) {
    if (!useGtag || !T.GOOGLE_ADS_ID || !label) return;
    var p = { send_to: T.GOOGLE_ADS_ID + "/" + label };
    for (var k in (extra || {})) p[k] = extra[k];
    gtag("event", "conversion", p);
  };

  /* Enhanced conversions: pass the lead's own email + phone (Google hashes them). */
  window.svUserData = function (email, phone) {
    var d = {};
    if (email) d.email = String(email).trim().toLowerCase();
    if (phone) d.phone_number = phone;
    if (useGtag) gtag("set", "user_data", d);
    else window.dataLayer.push({ user_data: d });
  };

  /* Click-to-call and WhatsApp clicks */
  document.addEventListener("click", function (e) {
    var a = e.target.closest && e.target.closest("a[href^='tel:'], a[href*='wa.me']");
    if (!a) return;
    if (a.href.indexOf("tel:") === 0) {
      window.svTrack("click_to_call", { link_url: a.href });
      window.svConversion(T.ADS_CALL_LABEL);
    } else {
      window.svTrack("click_whatsapp", { link_url: a.href });
      window.svConversion(T.ADS_WHATSAPP_LABEL);
    }
  });
})();
