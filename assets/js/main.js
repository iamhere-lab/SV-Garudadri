(function () {
  "use strict";

  var CFG = window.SITE_CONFIG || {};
  var API = (CFG.SHEET_WEBAPP_URL || "").trim();

  /* ---------------- helpers ---------------- */
  function $(sel, root) { return (root || document).querySelector(sel); }
  function $all(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function store(kind) { try { return window[kind]; } catch (e) { return null; } }
  function sGet(k) { var s = store("sessionStorage"); try { return s ? s.getItem(k) : null; } catch (e) { return null; } }
  function sSet(k, v) { var s = store("sessionStorage"); try { if (s) s.setItem(k, v); } catch (e) {} }

  /* ---------------- contact links ---------------- */
  var phone = CFG.PHONE || "9577330011";
  var phonePretty = "+91 " + phone.slice(0, 5) + " " + phone.slice(5);
  $all("[data-phone-link]").forEach(function (a) { a.href = "tel:+91" + phone; });
  $all("[data-phone-text]").forEach(function (el) { el.textContent = phonePretty; });
  $all("[data-wa-link]").forEach(function (a) {
    a.href = "https://api.whatsapp.com/send?phone=" + (CFG.WHATSAPP || "91" + phone) + "&text=" + encodeURIComponent(CFG.WHATSAPP_TEXT || "");
  });
  $all("[data-year]").forEach(function (el) { el.textContent = new Date().getFullYear(); });

  /* ---------------- tracking context ---------------- */
  var UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"];
  var utm = {};
  (function () {
    var q = new URLSearchParams(location.search);
    var saved = {};
    try { saved = JSON.parse(sGet("sv_utm") || "{}"); } catch (e) {}
    UTM_KEYS.forEach(function (k) { utm[k] = q.get(k) || saved[k] || ""; });
    sSet("sv_utm", JSON.stringify(utm));
  })();

  var clientIP = "";
  fetch("https://api.ipify.org?format=json").then(function (r) { return r.json(); })
    .then(function (d) { clientIP = d.ip || ""; }).catch(function () {});

  /* ---------------- header ---------------- */
  var header = $(".header");
  var menuBtn = $(".menu-btn");
  window.addEventListener("scroll", function () {
    header.classList.toggle("is-scrolled", window.scrollY > 10);
  }, { passive: true });
  menuBtn.addEventListener("click", function () {
    var open = header.classList.toggle("menu-open");
    menuBtn.setAttribute("aria-expanded", open ? "true" : "false");
  });
  $all(".mobile-nav a, .mobile-nav button").forEach(function (el) {
    el.addEventListener("click", function () {
      header.classList.remove("menu-open");
      menuBtn.setAttribute("aria-expanded", "false");
    });
  });

  /* ---------------- reveal on scroll ---------------- */
  var reveals = $all(".reveal");
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add("is-visible"); io.unobserve(en.target); }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
    reveals.forEach(function (el) { io.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add("is-visible"); });
  }

  /* ---------------- lead form ---------------- */
  var formCount = 0;

  function formHTML(n) {
    var id = function (s) { return "lf" + n + "-" + s; };
    return '' +
      '<form class="lf" novalidate>' +
        '<div class="lf__field"><input class="lf__input" name="name" type="text" autocomplete="name" placeholder="Name*" required maxlength="60" aria-label="Name"></div>' +
        '<div class="lf__field">' +
          '<div class="lf__phone">' +
            '<span class="lf__cc">+91</span>' +
            '<input class="lf__input" name="phone" type="tel" inputmode="numeric" autocomplete="tel-national" placeholder="Mobile Number*" maxlength="10" required aria-label="Mobile Number">' +
          '</div>' +
        '</div>' +
        '<div class="lf__field"><input class="lf__input" name="email" type="email" autocomplete="email" placeholder="Email Address" maxlength="80" aria-label="Email Address"></div>' +
        '<fieldset class="lf__cfg">' +
          '<legend>Preferred Configuration:</legend>' +
          '<div class="lf__opts">' +
            '<div class="lf__opt"><input type="radio" id="' + id("c2") + '" name="config" value="2 BHK"><label for="' + id("c2") + '"><svg class="icon"><use href="#i-home"/></svg>2 BHK</label></div>' +
            '<div class="lf__opt"><input type="radio" id="' + id("c3") + '" name="config" value="3 BHK"><label for="' + id("c3") + '"><svg class="icon"><use href="#i-home"/></svg>3 BHK</label></div>' +
          '</div>' +
        '</fieldset>' +
        '<input class="lf__hp" type="text" name="company" tabindex="-1" autocomplete="off" aria-hidden="true">' +
        '<p class="lf__msg" role="status" aria-live="polite"></p>' +
        '<button type="submit" class="lf__submit">Get Details</button>' +
        '<p class="lf__note">Our team will share the latest price, available units and floor plans.</p>' +
      '</form>' +
      '<div class="lf__done">' +
        '<svg class="icon"><use href="#i-check"/></svg>' +
        '<h3>Thank you!</h3>' +
        '<p>Your details have been received. Our team will call you shortly with the latest price, available units and floor plans.</p>' +
      '</div>';
  }

  function initForm(wrap) {
    var n = ++formCount;
    wrap.innerHTML = formHTML(n);
    var form = $("form", wrap);
    var f = {
      name: form.elements.name,
      phone: form.elements.phone,
      email: form.elements.email,
      hp: form.elements.company
    };
    var msg = $(".lf__msg", form);
    var submitBtn = $(".lf__submit", form);

    function say(text, info) { msg.textContent = text || ""; msg.classList.toggle("is-info", !!info); }

    f.phone.addEventListener("input", function () {
      f.phone.value = f.phone.value.replace(/\D/g, "").slice(0, 10);
    });

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (f.hp.value) return; // bot
      var name = f.name.value.trim();
      var mobile = f.phone.value.replace(/\D/g, "").slice(-10);
      var email = f.email.value.trim();
      var cfgEl = form.querySelector('input[name="config"]:checked');

      if (name.length < 2) { say("Please enter your name."); f.name.focus(); return; }
      if (!/^[6-9]\d{9}$/.test(mobile)) { say("Please enter a valid 10-digit mobile number."); f.phone.focus(); return; }
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) { say("Please enter a valid email address."); f.email.focus(); return; }
      if (!cfgEl) { say("Please choose your preferred configuration."); return; }

      // Field names match the Lead Tracker sheet's header row exactly.
      var data = {
        "Name": name,
        "Phone": "+91" + mobile,
        "Email": email,
        "Configuration": cfgEl.value,
        "Source": wrap.getAttribute("data-source") || "Website",
        "Project": CFG.PROJECT || "SV Garudadri",
        "OTP Verified": "Not Required",
        "Page URL": location.href,
        "IP Address": clientIP,
        "UTM Source": utm.utm_source,
        "UTM Medium": utm.utm_medium,
        "UTM Campaign": utm.utm_campaign,
        "UTM Term": utm.utm_term,
        "UTM Content": utm.utm_content,
        "Status": "New",
        "Feedback": ""
      };

      submitBtn.disabled = true;
      submitBtn.textContent = "Submitting…";
      say("");

      var req = !API
        ? new Promise(function (res) { console.info("[DEMO] lead", data); setTimeout(res, 600); })
        : fetch(API, { method: "POST", mode: "no-cors", body: new URLSearchParams(data) });

      req.then(function () {
        window.dataLayer = window.dataLayer || [];
        window.dataLayer.push({ event: "lead_submit", form_source: data.Source, configuration: data.Configuration });
        sSet("sv_lead_done", "1");
        sSet("sv_lead_name", name.split(" ")[0]);       // greeting on thank-you page (kept out of the URL)
        sSet("sv_lead_config", data.Configuration);
        if (CFG.THANK_YOU_URL) {
          // small delay lets GTM / pixels fire the lead_submit event before leaving the page
          setTimeout(function () { location.href = CFG.THANK_YOU_URL; }, 400);
          return;
        }
        wrap.classList.add("is-done");
      }).catch(function () {
        say("Something went wrong. Please try again or call " + phonePretty + ".");
        submitBtn.disabled = false;
        submitBtn.textContent = "Get Details";
      });
    });

    return {
      setConfig: function (val) {
        $all('input[name="config"]', form).forEach(function (r) { r.checked = r.value === val; });
      },
      focus: function () { if (!wrap.classList.contains("is-done")) f.name.focus({ preventScroll: true }); }
    };
  }

  var forms = $all("[data-lead-form]").map(function (wrap) { return { wrap: wrap, api: initForm(wrap) }; });

  /* ---------------- modal ---------------- */
  var modal = $("#lead-modal");
  var modalWrap = $("[data-lead-form]", modal);
  var modalForm = forms.filter(function (x) { return x.wrap === modalWrap; })[0].api;
  var lastFocus = null;

  function openModal(source, config) {
    if (source) modalWrap.setAttribute("data-source", "Popup - " + source);
    if (config) modalForm.setConfig(config);
    lastFocus = document.activeElement;
    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden", "false");
    document.body.classList.add("modal-open");
    sSet("sv_popup_seen", "1");
    setTimeout(function () { modalForm.focus(); }, 350);
  }
  function closeModal() {
    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("modal-open");
    if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
  }

  $all("[data-open-modal]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      openModal(btn.getAttribute("data-source"), btn.getAttribute("data-config"));
    });
  });
  $all("[data-close-modal]").forEach(function (el) { el.addEventListener("click", closeModal); });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && modal.classList.contains("is-open")) closeModal();
  });

  if (CFG.POPUP_DELAY_MS && !sGet("sv_popup_seen") && !sGet("sv_lead_done")) {
    setTimeout(function () {
      if (!modal.classList.contains("is-open") && !sGet("sv_popup_seen")) openModal("Auto Popup");
    }, CFG.POPUP_DELAY_MS);
  }
})();
