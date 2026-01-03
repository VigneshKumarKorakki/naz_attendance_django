const tabs = document.querySelectorAll(".tab");
const forms = document.querySelectorAll(".form");
const langs = document.querySelectorAll(".lang");
const toast = document.querySelector(".toast");
const loginForm = document.querySelector('[data-form="login"]');
const authSection = document.querySelector('[data-section="auth"]');
const dashboardSection = document.querySelector('[data-section="dashboard"]');
const displayName = document.querySelector(".display-name[data-display-name]");
const i18nElements = document.querySelectorAll("[data-i18n]");
const i18nPlaceholders = document.querySelectorAll("[data-i18n-placeholder]");
const stageTriggers = document.querySelectorAll("[data-stage-trigger]");
const attendanceStage = document.querySelector('[data-stage="attendance"]');
const selectButtons = document.querySelectorAll("[data-select-group]");
const authResetTargets = document.querySelectorAll(
  '[data-select-group], [data-stage="attendance"], [data-attendance-secondary]'
);
const passwordToggles = document.querySelectorAll("[data-toggle-password]");
const attendanceSecondary = document.querySelector(
  "[data-attendance-secondary]"
);
const sessionMeta = document.getElementById("session-meta");
let sessionAuthenticated = sessionMeta?.dataset.authenticated === "true";
const sessionDisplayName = sessionMeta?.dataset.sessionDisplayName || "";
let currentWorkerId = sessionMeta?.dataset.workerId || "";
const displayDateText = document.querySelector(".date-info .date");
const displayTimeText = document.getElementById("display-time-text");

/* I18N is loaded from i18n.js */
const offlineSupport = window.workerOffline;
const LANGUAGE_LOCALES = {
  en: "en-US",
  ur: "ur-PK",
  rn: "rn-BI",
};

const getSelectedLang = () => localStorage.getItem("workerLang") || "en";
const getSelectedLocale = () =>
  LANGUAGE_LOCALES[getSelectedLang()] || getSelectedLang();

const formatShortTime = (date) =>
  new Intl.DateTimeFormat(getSelectedLocale(), {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);

const formatShortDate = (date) =>
  new Intl.DateTimeFormat(getSelectedLocale(), {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);

const formatMonthYear = (date) =>
  new Intl.DateTimeFormat(getSelectedLocale(), {
    month: "long",
    year: "numeric",
  }).format(date);

const SESSION_STORAGE_KEY = "worker_portal_session";
const getStoredSession = () => {
  try {
    return JSON.parse(localStorage.getItem(SESSION_STORAGE_KEY) || "null");
  } catch (error) {
    return null;
  }
};
const setStoredSession = ({ workerId, displayName }) => {
  if (!workerId) return;
  const payload = {
    workerId: String(workerId),
    displayName: displayName || "",
    savedAt: new Date().toISOString(),
  };
  localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(payload));
};
const clearStoredSession = () => {
  localStorage.removeItem(SESSION_STORAGE_KEY);
};

let currentCalendarDate = new Date();
let cachedHistory = [];

const setActiveWorker = (workerId) => {
  if ((workerId || "") !== currentWorkerId) {
    cachedHistory = [];
  }
  currentWorkerId = workerId || "";
};

const isOnline = () => navigator.onLine;

const monthMap = {
  Jan: "01",
  Feb: "02",
  Mar: "03",
  Apr: "04",
  May: "05",
  Jun: "06",
  Jul: "07",
  Aug: "08",
  Sep: "09",
  Oct: "10",
  Nov: "11",
  Dec: "12",
};

const getFormattedDateFromDisplay = () => {
  const isoDate = displayDateText?.dataset?.isoDate;
  if (isoDate) return isoDate;
  const dateText = displayDateText?.textContent.trim();
  if (!dateText) return "";
  const [day, monthStr, year] = dateText.split("-");
  if (!monthMap[monthStr]) return "";
  return `${year}-${monthMap[monthStr]}-${day}`;
};

const setRecordedTime = (isoString) => {
  if (!displayTimeText) return;
  if (!isoString) {
    displayTimeText.dataset.timeSource = "clock";
    return;
  }
  const timeValue = new Date(isoString);
  if (Number.isNaN(timeValue.getTime())) {
    displayTimeText.dataset.timeSource = "clock";
    return;
  }
  displayTimeText.textContent = formatShortTime(timeValue);
  displayTimeText.dataset.timeSource = "recorded";
};

const applySelection = (group, dataKey, value) => {
  if (!value) return;
  const button = Array.from(selectButtons).find(
    (btn) => btn.dataset.selectGroup === group && btn.dataset[dataKey] === value
  );
  if (button) {
    button.click();
  }
};

const clearGroupSelection = (groupName) => {
  selectButtons.forEach((btn) => {
    if (btn.dataset.selectGroup !== groupName) return;
    btn.classList.remove("selected");
    btn.setAttribute("aria-pressed", "false");
  });
};

const showToast = (message, type = "info") => {
  if (!toast) return;
  toast.textContent = message;
  toast.classList.remove("error", "success");
  if (type === "error" || type === true) toast.classList.add("error");
  if (type === "success") toast.classList.add("success");

  toast.hidden = false;
  toast.classList.add("show");

  if (window._toastTimeout) clearTimeout(window._toastTimeout);
  window._toastTimeout = window.setTimeout(() => {
    toast.classList.remove("show");
    // Wait for transition before hiding
    setTimeout(() => {
      if (!toast.classList.contains("show")) {
        toast.hidden = true;
      }
    }, 400);
  }, 3000);
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

window.showToast = showToast;
window.getCookie = getCookie;
window.getCsrfToken = getCsrfToken;
