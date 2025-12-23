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
const authResetTargets = document.querySelectorAll(
  "[data-select-group], [data-stage=\"attendance\"], [data-attendance-secondary]"
);
const passwordToggles = document.querySelectorAll("[data-toggle-password]");
const attendanceSecondary = document.querySelector("[data-attendance-secondary]");

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

const isLocalhost = ["localhost", "127.0.0.1"].includes(window.location.hostname);

if ("serviceWorker" in navigator && !isLocalhost) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/worker/service-worker.js");
  });
}

if (isLocalhost && loginForm) {
  const loginInput = loginForm.querySelector('input[name="login"]');
  const passwordInput = loginForm.querySelector('input[name="password"]');
  if (loginInput && !loginInput.value) {
    loginInput.value = "9994944329";
    loginInput.dispatchEvent(new Event("input", { bubbles: true }));
  }
  if (passwordInput && !passwordInput.value) {
    passwordInput.value = "Welcome123!";
    passwordInput.dispatchEvent(new Event("input", { bubbles: true }));
  }
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

const getCookie = (name) => {
  const match = document.cookie.match(new RegExp(`(^|;)\\s*${name}=([^;]+)`));
  return match ? decodeURIComponent(match[2]) : "";
};

const getCsrfToken = () => {
  const cookieToken = getCookie("csrftoken");
  if (cookieToken) {
    return cookieToken;
  }
  const formToken = loginForm?.querySelector("input[name=csrfmiddlewaretoken]");
  return formToken?.value || "";
};

const logoutWorker = async (csrfToken) => {
  try {
    await fetch("/worker/logout/", {
      method: "POST",
      credentials: "same-origin",
      headers: {
        "X-Requested-With": "XMLHttpRequest",
        ...(csrfToken ? { "X-CSRFToken": csrfToken } : {}),
      },
    });
  } catch (error) {
    // Ignore logout failures so login can still proceed.
  }
};

passwordToggles.forEach((toggle) => {
  const targetId = toggle.dataset.togglePassword;
  const input = targetId ? document.getElementById(targetId) : null;
  if (!input) return;
  toggle.addEventListener("click", () => {
    const show = input.type === "password";
    input.type = show ? "text" : "password";
    toggle.classList.toggle("is-on", show);
    toggle.setAttribute("aria-pressed", show ? "true" : "false");
    toggle.setAttribute("aria-label", show ? "Hide password" : "Show password");
  });
});

const resetDashboardState = () => {
  if (dashboardSection) {
    dashboardSection.classList.add("hidden");
  }
  if (displayName) {
    displayName.textContent = "";
  }
  authResetTargets.forEach((el) => {
    if (el.dataset.selectGroup) {
      el.classList.remove("selected");
      el.setAttribute("aria-pressed", "false");
      return;
    }
    if (el.dataset.stage === "attendance") {
      el.classList.add("hidden");
    }
    if (el.dataset.attendanceSecondary !== undefined) {
      el.classList.add("hidden");
    }
  });
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

    if (groupName === "attendance-primary" && attendanceSecondary) {
      const primary = btn.dataset.attendancePrimary;
      if (primary === "absent") {
        attendanceSecondary.classList.remove("hidden");
      } else {
        attendanceSecondary.classList.add("hidden");
        clearGroupSelection("attendance-secondary");
      }
    }
  });
});

if (loginForm) {
  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    resetDashboardState();
    const url = loginForm.dataset.loginUrl;
    if (!url) {
      showToast("Login endpoint missing", true);
      return;
    }

    const formData = new FormData(loginForm);
    const csrfToken = getCsrfToken();
    await logoutWorker(csrfToken);
    const refreshedToken = getCsrfToken();
    if (refreshedToken) {
      formData.set("csrfmiddlewaretoken", refreshedToken);
      const tokenInput = loginForm.querySelector(
        "input[name=csrfmiddlewaretoken]"
      );
      if (tokenInput) {
        tokenInput.value = refreshedToken;
      }
    }
    const response = await fetch(url, {
      method: "POST",
      body: formData,
      credentials: "same-origin",
      headers: {
        "X-Requested-With": "XMLHttpRequest",
        ...(refreshedToken ? { "X-CSRFToken": refreshedToken } : {}),
      },
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      showToast(payload.message || "Invalid credentials", true);
      resetDashboardState();
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
