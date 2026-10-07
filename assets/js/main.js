/* ==========================================================
   SV Garudadri — Landing page logic
   Forms · MSG91 OTP · Google Sheets · Popup · UI
   Settings live in assets/js/config.js
   ========================================================== */
(function () {
  "use strict";

  var CFG = window.SITE_CONFIG || {};
  var OTP_ON = CFG.OTP_ENABLED === true;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  function store(key, val) {
    try {
      if (val === undefined) return sessionStorage.getItem(key);
      sessionStorage.setItem(key, val);
    } catch (e) { return null; }
  }

  /* ---------- Contact links from config ---------- */
  $$("[data-tel]").forEach(function (a) { if (CFG.PHONE) a.href = "tel:+" + CFG.PHONE; });
  $$("[data-wa]").forEach(function (a) {
    if (CFG.WHATSAPP) a.href = "https://wa.me/" + CFG.WHATSAPP + "?text=" + encodeURIComponent(CFG.WHATSAPP_TEXT || "");
  });

  /* ---------- UTM capture (kept for the whole visit) ---------- */
  var UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"];
  var utm = {};
  (function () {
    var qs = new URLSearchParams(window.location.search);
    var saved = {};
    try { saved = JSON.parse(store("svg_utm") || "{}"); } catch (e) {}
    var found = false;
    UTM_KEYS.forEach(function (k) { if (qs.get(k)) { utm[k] = qs.get(k); found = true; } });
    if (found) store("svg_utm", JSON.stringify(utm)); else utm = saved;
  })();

  /* ---------- Google click IDs (kept 90 days, for offline conversion import) ---------- */
  var clickId = "";
  (function () {
    var qs = new URLSearchParams(window.location.search);
    var id = qs.get("gclid") || qs.get("gbraid") || qs.get("wbraid") || "";
    try {
      if (id) localStorage.setItem("svg_gclid", JSON.stringify({ id: id, t: Date.now() }));
      var saved = JSON.parse(localStorage.getItem("svg_gclid") || "null");
      if (saved && Date.now() - saved.t < 90 * 864e5) clickId = saved.id;
    } catch (e) { clickId = id; }
  })();

  function track(name, params) { if (window.svTrack) window.svTrack(name, params || {}); }

  /* ---------- IP address (best effort) ---------- */
  var ipAddress = store("svg_ip") || "";
  if (!ipAddress && window.fetch) {
    fetch("https://api.ipify.org?format=json")
      .then(function (r) { return r.json(); })
      .then(function (d) { ipAddress = d.ip || ""; store("svg_ip", ipAddress); })
      .catch(function () {});
  }

  /* ==========================================================
     MSG91 OTP
     ========================================================== */
  var msg91Ready = null;
  var verifiedPhone = store("svg_verified") || "";

  function loadMsg91() {
    if (msg91Ready) return msg91Ready;
    msg91Ready = new Promise(function (resolve, reject) {
      var urls = [
        "https://verify.msg91.com/otp-provider.js",
        "https://verify.phone91.com/otp-provider.js",
      ];
      (function attempt(i) {
        if (i >= urls.length) { msg91Ready = null; return reject(new Error("OTP service could not be loaded")); }
        var s = document.createElement("script");
        s.src = urls[i];
        s.async = true;
        s.onload = function () {
          if (typeof window.initSendOTP !== "function") return attempt(i + 1);
          try {
            window.initSendOTP({
              widgetId: CFG.MSG91.widgetId,
              tokenAuth: CFG.MSG91.tokenAuth,
              exposeMethods: true,
              success: function () {},
              failure: function () {},
            });
          } catch (e) { return reject(e); }
          // exposed methods appear shortly after init
          var tries = 0;
          (function wait() {
            if (typeof window.sendOtp === "function") return resolve();
            if (++tries > 60) { msg91Ready = null; return reject(new Error("OTP service did not start")); }
            setTimeout(wait, 100);
          })();
        };
        s.onerror = function () { attempt(i + 1); };
        document.head.appendChild(s);
      })(0);
    });
    return msg91Ready;
  }

  function errText(err, fallback) {
    if (!err) return fallback;
    if (typeof err === "string") return err;
    return err.message || (err.data && err.data.message) || fallback;
  }

  /* ==========================================================
     Lead forms (built from the <template> in index.html)
     ========================================================== */
  var tpl = $("#lead-form-tpl");
  var formSeq = 0;

  function validators(form) {
    return {
      name: function (v) { return /^[A-Za-z][A-Za-z .'-]{1,}$/.test(v) ? "" : "Please enter your full name"; },
      phone: function (v) { return /^[6-9]\d{9}$/.test(v) ? "" : "Enter a valid 10-digit mobile number"; },
      email: function (v) { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v) ? "" : "Enter a valid email address"; },
      configuration: function (v) { return v ? "" : "Please select your preferred configuration"; },
    };
  }

  function setError(input, msg) {
    var field = input.closest(".field");
    if (!field) return;
    field.classList.toggle("has-error", !!msg);
    var el = $(".field__error", field);
    if (el) el.textContent = msg || "";
    input.setAttribute("aria-invalid", msg ? "true" : "false");
  }

  function mountForm(mount) {
    if (!tpl) return;
    var id = ++formSeq;
    mount.appendChild(tpl.content.cloneNode(true));
    var form = $("form", mount);
    var rules = validators(form);

    // unique ids so labels work on every copy of the form
    $$("[id]", form).forEach(function (el) {
      var old = el.id;
      el.id = old + "-" + id;
      $$('label[for="' + old + '"]', form).forEach(function (l) { l.setAttribute("for", el.id); });
    });

    var f = {
      name: form.elements.name,
      phone: form.elements.phone,
      email: form.elements.email,
      configuration: form.elements.configuration,
      otp: $("[data-otp-input]", form),
    };
    var cfgRadios = $$("input[name=configuration]", form);
    var sendBtn = $("[data-otp-send]", form);
    var otpRow = $("[data-otp-row]", form);
    var verifyBtn = $("[data-otp-verify]", form);
    var resendBtn = $("[data-otp-resend]", form);
    var timerEl = $("[data-otp-timer]", form);
    var statusEl = $("[data-otp-status]", form);
    var submitBtn = $('button[type="submit"]', form);
    var msgEl = $("[data-form-msg]", form);
    var timer = null;
    var submitting = false;

    if (mount.dataset.button) $("[data-submit-label]", form).textContent = mount.dataset.button;
    if (mount.dataset.config) f.configuration.value = mount.dataset.config;

    if (!OTP_ON) {
      sendBtn.hidden = true;
      otpRow.hidden = true;
    }

    function isVerified() { return !OTP_ON || (verifiedPhone && verifiedPhone === f.phone.value); }

    function showStatus(type, text) {
      statusEl.className = "otp-status" + (type ? " is-" + type : "");
      $("[data-otp-status-text]", statusEl).textContent = text || "";
      $("[data-otp-change]", statusEl).hidden = type !== "ok";
    }

    function paintVerified() {
      if (!OTP_ON) return;
      if (isVerified()) {
        f.phone.readOnly = true;
        sendBtn.hidden = true;
        otpRow.classList.remove("is-open");
        showStatus("ok", "Mobile number verified");
        setError(f.phone, "");
      } else {
        f.phone.readOnly = false;
        sendBtn.hidden = false;
      }
    }

    function startTimer() {
      var left = CFG.OTP_RESEND_SECONDS || 30;
      resendBtn.disabled = true;
      clearInterval(timer);
      timerEl.textContent = "Resend in " + left + "s";
      timer = setInterval(function () {
        left--;
        if (left <= 0) {
          clearInterval(timer);
          timerEl.textContent = "Didn't get the code?";
          resendBtn.disabled = false;
        } else {
          timerEl.textContent = "Resend in " + left + "s";
        }
      }, 1000);
    }

    function sendOtp(isResend) {
      var bad = rules.phone(f.phone.value);
      setError(f.phone, bad);
      if (bad) { f.phone.focus(); return; }
      sendBtn.disabled = true;
      sendBtn.textContent = "Sending…";
      showStatus("", "");
      loadMsg91()
        .then(function () {
          return new Promise(function (resolve, reject) {
            if (isResend && typeof window.retryOtp === "function") {
              window.retryOtp(null, resolve, reject);
            } else {
              window.sendOtp((CFG.COUNTRY_CODE || "91") + f.phone.value, resolve, reject);
            }
          });
        })
        .then(function () {
          otpRow.classList.add("is-open");
          track("otp_sent", { form_name: mount.dataset.source || "" });
          sendBtn.textContent = "OTP Sent";
          f.otp.value = "";
          f.otp.focus();
          startTimer();
          setTimeout(function () { sendBtn.disabled = false; sendBtn.textContent = "Resend OTP"; }, (CFG.OTP_RESEND_SECONDS || 30) * 1000);
        })
        .catch(function (err) {
          sendBtn.disabled = false;
          sendBtn.textContent = "Send OTP";
          showStatus("err", errText(err, "Could not send OTP. Please try again."));
        });
    }

    function verifyOtp() {
      var code = f.otp.value.trim();
      if (!/^\d{4,6}$/.test(code)) { setError(f.otp, "Enter the OTP sent to your mobile"); f.otp.focus(); return; }
      setError(f.otp, "");
      verifyBtn.disabled = true;
      verifyBtn.textContent = "Verifying…";
      new Promise(function (resolve, reject) { window.verifyOtp(code, resolve, reject); })
        .then(function () {
          verifiedPhone = f.phone.value;
          track("otp_verified", { form_name: mount.dataset.source || "" });
          store("svg_verified", verifiedPhone);
          clearInterval(timer);
          paintVerified();
          msgEl.classList.remove("is-on");
        })
        .catch(function (err) {
          setError(f.otp, errText(err, "Incorrect OTP. Please try again."));
        })
        .then(function () {
          verifyBtn.disabled = false;
          verifyBtn.textContent = "Verify";
        });
    }

    // --- field behaviour
    f.phone.addEventListener("input", function () {
      f.phone.value = f.phone.value.replace(/\D/g, "").slice(0, 10);
      if (OTP_ON && !isVerified()) { otpRow.classList.remove("is-open"); showStatus("", ""); }
    });
    f.otp.addEventListener("input", function () {
      f.otp.value = f.otp.value.replace(/\D/g, "").slice(0, 6);
    });
    cfgRadios.forEach(function (r) { r.addEventListener("change", function () { setError(cfgRadios[0], ""); }); });
    ["name", "phone", "email"].forEach(function (k) {
      f[k].addEventListener("blur", function () { if (f[k].value) setError(f[k], rules[k](f[k].value.trim())); });
      f[k].addEventListener("input", function () { if (f[k].closest(".field").classList.contains("has-error")) setError(f[k], rules[k](f[k].value.trim())); });
      f[k].addEventListener("change", function () { setError(f[k], rules[k](f[k].value.trim())); });
    });
    sendBtn.addEventListener("click", function () { sendOtp(false); });
    resendBtn.addEventListener("click", function () { sendOtp(true); });
    verifyBtn.addEventListener("click", verifyOtp);
    f.otp.addEventListener("keydown", function (e) { if (e.key === "Enter") { e.preventDefault(); verifyOtp(); } });
    $("[data-otp-change]", statusEl).addEventListener("click", function () {
      verifiedPhone = "";
      store("svg_verified", "");
      f.phone.readOnly = false;
      sendBtn.hidden = false;
      sendBtn.disabled = false;
      sendBtn.textContent = "Send OTP";
      showStatus("", "");
      f.phone.focus();
    });
    form.addEventListener("focusin", paintVerified);
    paintVerified();

    // --- first interaction with this form
    form.addEventListener("focusin", function once() {
      form.removeEventListener("focusin", once);
      track("form_start", { form_name: mount.dataset.source || "" });
    });

    // --- submit
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (submitting) return;
      msgEl.classList.remove("is-on");

      var firstBad = null;
      ["name", "phone", "email", "configuration"].forEach(function (k) {
        var m = rules[k](f[k].value.trim());
        var el = k === "configuration" ? cfgRadios[0] : f[k];
        setError(el, m);
        if (m && !firstBad) firstBad = el;
      });
      if (firstBad) { firstBad.focus(); return; }

      if (!isVerified()) {
        msgEl.textContent = "Please verify your mobile number with the OTP to continue.";
        msgEl.classList.add("is-on");
        if (!otpRow.classList.contains("is-open")) sendOtp(false); else f.otp.focus();
        return;
      }

      submitting = true;
      submitBtn.classList.add("is-loading");
      submitBtn.disabled = true;

      var source = mount.dataset.source || "Website Form";
      if (mount.dataset.trigger) source += " - " + mount.dataset.trigger;

      var lead = {
        "Timestamp": new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata", hour12: true }),
        "Name": f.name.value.trim(),
        "Phone": "+" + (CFG.COUNTRY_CODE || "91") + f.phone.value,
        "Email": f.email.value.trim(),
        "Configuration": f.configuration.value,
        "Source": source,
        "Project": CFG.PROJECT || "SV Garudadri",
        "OTP Verified": OTP_ON ? "Yes" : "No",
        "Page URL": window.location.href,
        "IP Address": ipAddress,
        "UTM Source": utm.utm_source || "",
        "UTM Medium": utm.utm_medium || "",
        "UTM Campaign": utm.utm_campaign || "",
        "UTM Term": utm.utm_term || "",
        "UTM Content": utm.utm_content || "",
        "Status": "",
        "Feedback": "",
        "GCLID": clickId, // only saved if the sheet has a "GCLID" column
      };

      sendToSheet(lead).then(function () {
        store("svg_lead", JSON.stringify({ name: lead.Name, configuration: lead.Configuration, email: lead.Email, phone: lead.Phone, source: lead.Source, fresh: true }));
        track("form_submit", { form_name: source, configuration: lead.Configuration });
        store("svg_submitted", "1");
        window.location.href = thankYouUrl();
      });
    });
  }

  function thankYouUrl() {
    var url = CFG.THANK_YOU_URL || "/thank-you";
    // opened straight from disk or a plain static server: use the .html file
    if (window.location.protocol === "file:" || /\.html$/.test(window.location.pathname)) return "thank-you.html";
    return url;
  }

  function sendToSheet(lead) {
    if (!CFG.SHEET_WEBAPP_URL) {
      console.warn("[SV Garudadri] SHEET_WEBAPP_URL is empty in config.js — lead not sent:", lead);
      return Promise.resolve();
    }
    var post = fetch(CFG.SHEET_WEBAPP_URL, {
      method: "POST",
      mode: "no-cors",
      keepalive: true,
      body: new URLSearchParams(lead),
    }).catch(function (e) { console.error("[SV Garudadri] Sheet error", e); });
    var timeout = new Promise(function (r) { setTimeout(r, 6000); });
    return Promise.race([post, timeout]);
  }

  $$("[data-lead-form]").forEach(mountForm);

  /* ==========================================================
     Popup
     ========================================================== */
  var popup = $("#enquiry-popup");
  var lastFocus = null;

  function openPopup(opts) {
    if (!popup) return;
    opts = opts || {};
    var mount = $("[data-lead-form]", popup);
    $("[data-popup-title]", popup).textContent = opts.title || "Get Price & Availability";
    $("[data-popup-text]", popup).textContent = opts.text || "Find Your 3 BHK at 2 BHK Pricing";
    if (opts.button) $("[data-submit-label]", popup).textContent = opts.button;
    mount.dataset.trigger = opts.trigger || "";
    if (opts.config) $$("input[name=configuration]", popup).forEach(function (r) { r.checked = r.value === opts.config; });
    lastFocus = document.activeElement;
    popup.classList.add("is-open");
    popup.setAttribute("aria-hidden", "false");
    track("popup_open", { trigger: opts.trigger || "" });
    document.body.classList.add("no-scroll");
    if (!opts.auto) setTimeout(function () { var i = $("input[name=name]", popup); if (i) i.focus(); }, 350);
  }
  function closePopup() {
    if (!popup) return;
    popup.classList.remove("is-open");
    popup.setAttribute("aria-hidden", "true");
    document.body.classList.remove("no-scroll");
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  document.addEventListener("click", function (e) {
    var t = e.target.closest("[data-popup]");
    if (t) {
      e.preventDefault();
      openPopup({
        title: t.dataset.popupTitle,
        text: t.dataset.popupText,
        button: t.dataset.popupButton || "Get Details",
        config: t.dataset.popupConfig,
        trigger: t.dataset.popup || t.textContent.trim(),
      });
      return;
    }
    if (e.target.closest("[data-popup-close]")) closePopup();
  });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") closePopup(); });

  // auto popup on the home page
  if (popup && popup.dataset.auto === "true") {
    setTimeout(function () {
      var typing = document.activeElement && document.activeElement.closest && document.activeElement.closest(".lead-form");
      var started = $$(".lead-form").some(function (fm) { return fm.elements.name.value || fm.elements.phone.value; });
      if (popup.classList.contains("is-open") || typing || started || store("svg_submitted") === "1") return;
      openPopup({ auto: true, title: "Get Price & Availability", button: "Get Details", trigger: "Auto (8s)" });
    }, CFG.POPUP_DELAY_MS || 8000);
  }

  /* ==========================================================
     UI
     ========================================================== */
  var header = $(".header");
  var toTop = $(".f-top");
  function onScroll() {
    var y = window.scrollY;
    if (header) header.classList.toggle("is-scrolled", y > 20);
    if (toTop) toTop.classList.toggle("is-on", y > 700);
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();
  if (toTop) toTop.addEventListener("click", function () { window.scrollTo({ top: 0, behavior: "smooth" }); });

  var nav = $(".nav");
  var toggle = $(".menu-toggle");
  if (nav && toggle) {
    toggle.addEventListener("click", function () {
      var open = nav.classList.toggle("is-open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
    nav.addEventListener("click", function (e) { if (e.target.closest("a")) nav.classList.remove("is-open"); });
  }

  // gallery marquee: duplicate items for a seamless loop
  $$(".marquee").forEach(function (m) {
    $$(".g-item", m).forEach(function (item) {
      var c = item.cloneNode(true);
      c.setAttribute("aria-hidden", "true");
      m.appendChild(c);
    });
  });

  // one FAQ open at a time
  $$(".faq details").forEach(function (d) {
    d.addEventListener("toggle", function () {
      if (d.open) $$(".faq details").forEach(function (o) { if (o !== d) o.open = false; });
    });
  });

  // reveal on scroll
  var reveals = $$(".reveal");
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add("is-in"); io.unobserve(en.target); } });
    }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
    reveals.forEach(function (el) { io.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add("is-in"); });
  }

  // map loads only when asked for (keeps the first load light)
  $$("[data-map-src]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var f = document.createElement("iframe");
      f.title = "SV Garudadri location map";
      f.loading = "lazy";
      f.referrerPolicy = "no-referrer-when-downgrade";
      f.src = btn.dataset.mapSrc;
      btn.parentNode.replaceChild(f, btn);
      track("map_open");
    });
  });

  var yr = $("[data-year]");
  if (yr) yr.textContent = new Date().getFullYear();
})();
