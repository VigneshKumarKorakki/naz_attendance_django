const tabs = document.querySelectorAll(".tab");
const forms = document.querySelectorAll(".form");
const langs = document.querySelectorAll(".lang");
const toast = document.querySelector(".toast");
const loginForm = document.querySelector('[data-form="login"]');
const authSection = document.querySelector('[data-section="auth"]');
const dashboardSection = document.querySelector('[data-section="dashboard"]');
const displayName = document.querySelector("[data-display-name]");
const i18nElements = document.querySelectorAll("[data-i18n]");
const i18nPlaceholders = document.querySelectorAll("[data-i18n-placeholder]");
const stageTriggers = document.querySelectorAll("[data-stage-trigger]");
const attendanceStage = document.querySelector('[data-stage="attendance"]');
const selectButtons = document.querySelectorAll("[data-select-group]");

/* I18N is loaded from i18n.js */

const applyTranslations = (lang) => {
  const bundle = I18N[lang] || I18N.en;
  document.documentElement.dir = bundle.rtl ? "rtl" : "ltr";
  i18nElements.forEach((el) => {
    const key = el.dataset.i18n;
    if (!key || !bundle[key]) return;
    if (el.tagName.toLowerCase() === "h1") {
      el.innerHTML = bundle[key].replace("\n", "<br />");
      return;
    }
    el.textContent = bundle[key];
  });
  i18nPlaceholders.forEach((el) => {
    const key = el.dataset.i18nPlaceholder;
    if (!key || !bundle[key]) return;
    el.setAttribute("placeholder", bundle[key]);
  });
};

tabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    tabs.forEach((t) => t.classList.remove("active"));
    tab.classList.add("active");
    const target = tab.dataset.tab;
    forms.forEach((form) => {
      form.classList.toggle("hidden", form.dataset.form !== target);
    });
  });
});

langs.forEach((lang) => {
  lang.addEventListener("click", () => {
    langs.forEach((l) => l.classList.remove("active"));
    lang.classList.add("active");
    const code = lang.dataset.lang || "en";
    localStorage.setItem("workerLang", code);
    applyTranslations(code);
  });
});

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/worker/service-worker.js");
  });
}

const savedLang = localStorage.getItem("workerLang") || "en";
applyTranslations(savedLang);
langs.forEach((lang) => {
  if (lang.dataset.lang === savedLang) {
    lang.classList.add("active");
  }
});

const showToast = (message, isError = false) => {
  if (!toast) return;
  toast.textContent = message;
  toast.classList.toggle("error", isError);
  toast.hidden = false;
  toast.classList.add("show");
  window.setTimeout(() => {
    toast.classList.remove("show");
    toast.hidden = true;
  }, 2200);
};

const clearGroupSelection = (groupName) => {
  selectButtons.forEach((btn) => {
    if (btn.dataset.selectGroup !== groupName) return;
    btn.classList.remove("selected");
    btn.setAttribute("aria-pressed", "false");
  });
};

selectButtons.forEach((btn) => {
  btn.setAttribute("aria-pressed", "false");
  btn.addEventListener("click", () => {
    const groupName = btn.dataset.selectGroup;
    clearGroupSelection(groupName);
    btn.classList.add("selected");
    btn.setAttribute("aria-pressed", "true");

    if (btn.dataset.stageTrigger === "attendance" && attendanceStage) {
      attendanceStage.classList.remove("hidden");
    }
  });
});

if (loginForm) {
  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const url = loginForm.dataset.loginUrl;
    if (!url) {
      showToast("Login endpoint missing", true);
      return;
    }

    const formData = new FormData(loginForm);
    const response = await fetch(url, {
      method: "POST",
      body: formData,
      headers: {
        "X-Requested-With": "XMLHttpRequest",
      },
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      showToast(payload.message || "Invalid credentials", true);
      return;
    }

    const payload = await response.json();
    if (dashboardSection) {
      dashboardSection.classList.remove("hidden");
    }
    if (displayName) {
      displayName.textContent = payload.name || "Display The Name Here";
    }
    showToast("Login success");
  });
}
