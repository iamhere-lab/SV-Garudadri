/* ============================================================
   SV Garudadri – main.js
   Header, popup, lightbox, FAQ, plan filters, reveal animations,
   and the shared lead-form handler (validation + MSG91 OTP +
   Google Sheets submission + redirect to thank-you page).
   ============================================================ */
(function () {
  "use strict";
  const CFG = window.SVG_CONFIG || {};
  const $ = (s, c) => (c || document).querySelector(s);
  const $$ = (s, c) => Array.from((c || document).querySelectorAll(s));

  /* ---------------- Header / nav ---------------- */
  const header = $("#header");
  const onScroll = () => header && header.classList.toggle("scrolled", window.scrollY > 40);
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  const mobileNav = $("#mobileNav");
  $("#hamburger") && $("#hamburger").addEventListener("click", () => mobileNav.classList.add("open"));
  $("#mobileClose") && $("#mobileClose").addEventListener("click", () => mobileNav.classList.remove("open"));
  mobileNav && $$("a", mobileNav).forEach(a => a.addEventListener("click", () => mobileNav.classList.remove("open")));

  $("#year") && ($("#year").textContent = new Date().getFullYear());

  /* ---------------- Reveal on scroll ---------------- */
  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } });
  }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
  $$(".reveal").forEach(el => io.observe(el));

  /* ---------------- FAQ ---------------- */
  $$(".faq button").forEach(btn => btn.addEventListener("click", () => {
    const item = btn.closest(".faq");
    const open = item.classList.contains("open");
    $$(".faq.open").forEach(f => f.classList.remove("open"));
    if (!open) item.classList.add("open");
  }));

  /* ---------------- Floor plan filter ---------------- */
  $$(".plans-tabs .tab").forEach(tab => tab.addEventListener("click", () => {
    $$(".plans-tabs .tab").forEach(t => t.classList.remove("active"));
    tab.classList.add("active");
    const f = tab.dataset.filter;
    $$(".plan-card").forEach(c => c.classList.toggle("hide", f !== "all" && c.dataset.cfg !== f));
  }));

  /* ---------------- Lightbox ---------------- */
  const lb = $("#lightbox");
  if (lb) {
    const lbImg = $("img", lb);
    $$("[data-lightbox]").forEach(el => el.addEventListener("click", () => {
      lbImg.src = el.dataset.lightbox; lb.classList.add("open");
    }));
    lb.addEventListener("click", (e) => { if (e.target === lb || e.target.classList.contains("close")) lb.classList.remove("open"); });
  }

  /* ---------------- Popup modal ---------------- */
  const modal = $("#leadModal");
  let popupShown = false;
  function openPopup(cfg) {
    if (!modal) return;
    modal.classList.add("open");
    document.body.style.overflow = "hidden";
    popupShown = true;
    if (cfg) { const r = $(`input[name="configuration"][value="${cfg}"]`, modal); if (r) r.checked = true; }
    setTimeout(() => { const f = $('input[name="name"]', modal); f && f.focus(); }, 150);
  }
  function closePopup() {
    if (!modal) return;
    modal.classList.remove("open");
    document.body.style.overflow = "";
  }
  $$(".js-open-popup").forEach(b => b.addEventListener("click", () => openPopup(b.dataset.cfg)));
  modal && $$("[data-modal-close]", modal).forEach(b => b.addEventListener("click", closePopup));
  modal && modal.addEventListener("click", (e) => { if (e.target === modal) closePopup(); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") { closePopup(); lb && lb.classList.remove("open"); } });

  // Auto popup after N seconds (home page only, not after a submission)
  if (modal && !sessionStorage.getItem("svg_lead_submitted")) {
    const already = CFG.POPUP_ONCE_PER_SESSION && sessionStorage.getItem("svg_popup_shown");
    if (!already) {
      setTimeout(() => {
        if (!popupShown && !modal.classList.contains("open")) {
          openPopup();
          sessionStorage.setItem("svg_popup_shown", "1");
        }
      }, CFG.POPUP_DELAY_MS || 8000);
    }
  }

  /* ---------------- Tracking data (UTM, IP, page) ---------------- */
  const params = new URLSearchParams(location.search);
  const utm = {
    utm_source: params.get("utm_source") || "", utm_medium: params.get("utm_medium") || "",
    utm_campaign: params.get("utm_campaign") || "", utm_term: params.get("utm_term") || "", utm_content: params.get("utm_content") || ""
  };
  // persist first-touch UTMs for the session so later forms still carry them
  try {
    const saved = JSON.parse(sessionStorage.getItem("svg_utm") || "{}");
    Object.keys(utm).forEach(k => { if (!utm[k] && saved[k]) utm[k] = saved[k]; });
    if (Object.values(utm).some(Boolean)) sessionStorage.setItem("svg_utm", JSON.stringify(utm));
  } catch (_) {}

  let visitorIP = "";
  fetch("https://api.ipify.org?format=json", { cache: "no-store" })
    .then(r => r.json()).then(d => { visitorIP = d.ip || ""; }).catch(() => {});

  /* ---------------- MSG91 OTP ---------------- */
  const OTP_ON = !!CFG.OTP_ENABLED;
  let msg91Ready = false, msg91Loading = null;

  function loadMsg91() {
    if (msg91Ready) return Promise.resolve();
    if (msg91Loading) return msg91Loading;
    msg91Loading = new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = "https://verify.msg91.com/otp-provider.js";
      s.async = true;
      s.onload = () => {
        try {
          window.initSendOTP({
            widgetId: CFG.MSG91.widgetId,
            tokenAuth: CFG.MSG91.tokenAuth,
            exposeMethods: true,     // exposes window.sendOtp / verifyOtp / retryOtp
            success: () => {}, failure: () => {}
          });
          msg91Ready = true; resolve();
        } catch (err) { reject(err); }
      };
      s.onerror = () => reject(new Error("Could not load OTP service"));
      document.head.appendChild(s);
    });
    return msg91Loading;
  }
  if (OTP_ON) { window.addEventListener("load", () => { loadMsg91().catch(() => {}); }); }

  /* ---------------- Lead forms ---------------- */
  const PHONE_RE = /^[6-9]\d{9}$/;
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  $$("[data-lead-form]").forEach(initForm);

  function initForm(form) {
    const nameEl = $('input[name="name"]', form);
    const phoneEl = $('input[name="phone"]', form);
    const emailEl = $('input[name="email"]', form);
    const sendBtn = $("[data-otp-send]", form);
    const verifyBtn = $("[data-otp-verify]", form);
    const otpBox = $("[data-otp-box]", form);
    const otpInput = $("[data-otp-input]", form);
    const otpStatus = $("[data-otp-status]", form);
    const alertEl = $("[data-form-alert]", form);
    const submitBtn = $(".btn-submit", form);

    const state = { verified: false, verifiedPhone: "", sending: false, cooldown: 0 };

    if (!OTP_ON) {
      sendBtn && (sendBtn.style.display = "none");
      $(".phone-row", form) && ($(".phone-row", form).style.gridTemplateColumns = "1fr");
    }

    // digits only in phone / otp
    phoneEl.addEventListener("input", () => {
      phoneEl.value = phoneEl.value.replace(/\D/g, "").slice(0, 10);
      if (state.verified && phoneEl.value !== state.verifiedPhone) resetOtp("Number changed – please verify again.");
      if (sendBtn) sendBtn.disabled = !PHONE_RE.test(phoneEl.value) || state.sending || state.cooldown > 0;
    });
    sendBtn && (sendBtn.disabled = true);
    otpInput && otpInput.addEventListener("input", () => { otpInput.value = otpInput.value.replace(/\D/g, "").slice(0, 6); });

    function setStatus(msg, cls) { if (otpStatus) { otpStatus.textContent = msg || ""; otpStatus.className = "otp-status" + (cls ? " " + cls : ""); } }
    function resetOtp(msg) {
      state.verified = false; state.verifiedPhone = "";
      otpBox && otpBox.classList.remove("show");
      if (otpInput) otpInput.value = "";
      if (sendBtn) { sendBtn.textContent = "Verify"; sendBtn.classList.remove("verified"); sendBtn.disabled = !PHONE_RE.test(phoneEl.value); }
      setStatus(msg || "", msg ? "err" : "");
    }
    function startCooldown(sec) {
      state.cooldown = sec;
      const tick = () => {
        if (state.cooldown <= 0) { if (sendBtn && !state.verified) { sendBtn.textContent = "Resend OTP"; sendBtn.disabled = false; } return; }
        if (sendBtn) { sendBtn.textContent = `Resend in ${state.cooldown}s`; sendBtn.disabled = true; }
        state.cooldown--; setTimeout(tick, 1000);
      };
      tick();
    }

    // --- send OTP ---
    sendBtn && sendBtn.addEventListener("click", async () => {
      if (!PHONE_RE.test(phoneEl.value)) { markInvalid(phoneEl, true); return; }
      markInvalid(phoneEl, false);
      state.sending = true; sendBtn.disabled = true; sendBtn.textContent = "Sending…"; setStatus("");
      try {
        await loadMsg91();
        await new Promise((res, rej) => window.sendOtp("91" + phoneEl.value, res, rej));
        otpBox.classList.add("show"); otpInput.focus();
        setStatus("OTP sent to +91 " + phoneEl.value, "ok");
        startCooldown(30);
      } catch (err) {
        setStatus(errMsg(err, "Could not send OTP. Please try again."), "err");
        sendBtn.disabled = false; sendBtn.textContent = "Verify";
      } finally { state.sending = false; }
    });

    // --- verify OTP ---
    verifyBtn && verifyBtn.addEventListener("click", async () => {
      const code = (otpInput.value || "").trim();
      if (code.length < 4) { setStatus("Enter the OTP you received.", "err"); return; }
      verifyBtn.disabled = true; verifyBtn.textContent = "Checking…";
      try {
        await new Promise((res, rej) => window.verifyOtp(code, res, rej));
        state.verified = true; state.verifiedPhone = phoneEl.value;
        otpBox.classList.remove("show");
        sendBtn.textContent = "✓ Verified"; sendBtn.classList.add("verified"); sendBtn.disabled = true;
        setStatus("Mobile number verified.", "ok");
      } catch (err) {
        setStatus(errMsg(err, "Incorrect OTP. Please try again."), "err");
      } finally { verifyBtn.disabled = false; verifyBtn.textContent = "Confirm"; }
    });

    // --- submit ---
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      hideAlert();
      let ok = true;
      ok &= !markInvalid(nameEl, nameEl.value.trim().length < 2);
      ok &= !markInvalid(phoneEl, !PHONE_RE.test(phoneEl.value));
      ok &= !markInvalid(emailEl, !EMAIL_RE.test(emailEl.value.trim()));
      const cfgEl = $('input[name="configuration"]:checked', form);
      const cfgField = $('input[name="configuration"]', form).closest(".field");
      cfgField.classList.toggle("invalid", !cfgEl); ok &= !!cfgEl;
      if (!ok) { showAlert("Please fill in all the required fields."); return; }

      if (OTP_ON && !state.verified) {
        showAlert("Please verify your mobile number with the OTP before submitting.");
        if (!otpBox.classList.contains("show") && sendBtn && !sendBtn.disabled) sendBtn.click();
        return;
      }

      const payload = {
        timestamp: new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }),
        name: nameEl.value.trim(),
        phone: "+91" + phoneEl.value,
        email: emailEl.value.trim(),
        configuration: cfgEl.value,
        source: form.dataset.source || "Website",
        project: CFG.PROJECT || "SV Garudadri",
        otp_verified: OTP_ON ? (state.verified ? "Yes" : "No") : "OTP Off",
        page_url: location.href,
        ip_address: visitorIP,
        utm_source: utm.utm_source, utm_medium: utm.utm_medium, utm_campaign: utm.utm_campaign,
        utm_term: utm.utm_term, utm_content: utm.utm_content,
        status: CFG.DEFAULT_STATUS || "New",
        feedback: ""
      };

      submitBtn.classList.add("loading");
      try {
        await sendToSheet(payload);
        try {
          sessionStorage.setItem("svg_lead_submitted", "1");
          sessionStorage.setItem("svg_lead_name", payload.name);
          sessionStorage.setItem("svg_lead_cfg", payload.configuration);
        } catch (_) {}
        window.location.href = CFG.THANK_YOU_URL || "/thank-you";
      } catch (err) {
        submitBtn.classList.remove("loading");
        showAlert("Something went wrong while submitting. Please try again or call us.");
        console.error(err);
      }
    });

    function markInvalid(el, bad) { el.closest(".field").classList.toggle("invalid", !!bad); return !!bad; }
    function showAlert(msg) { if (alertEl) { alertEl.textContent = msg; alertEl.classList.add("show"); } }
    function hideAlert() { alertEl && alertEl.classList.remove("show"); }
  }

  function errMsg(err, fallback) {
    if (!err) return fallback;
    if (typeof err === "string") return err;
    return err.message || (err.error && err.error.message) || fallback;
  }

  /* POST to Google Apps Script.
     text/plain + no-cors avoids the CORS pre-flight; Apps Script reads e.postData.contents. */
  async function sendToSheet(payload) {
    if (!CFG.SHEET_ENDPOINT) throw new Error("SHEET_ENDPOINT not set");
    const res = await fetch(CFG.SHEET_ENDPOINT, {
      method: "POST", mode: "no-cors", keepalive: true,
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payload)
    });
    return res; // opaque response (status 0) is expected with no-cors
  }
})();
