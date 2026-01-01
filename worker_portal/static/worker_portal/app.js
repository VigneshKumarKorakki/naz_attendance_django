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
  "[data-select-group], [data-stage=\"attendance\"], [data-attendance-secondary]"
);
const passwordToggles = document.querySelectorAll("[data-toggle-password]");
const attendanceSecondary = document.querySelector("[data-attendance-secondary]");
const sessionMeta = document.getElementById("session-meta");
let sessionAuthenticated = sessionMeta?.dataset.authenticated === "true";
const sessionDisplayName = sessionMeta?.dataset.sessionDisplayName || "";
const displayDateText = document.querySelector(".date-info .date");
const displayTimeText = document.getElementById("display-time-text");

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
  displayTimeText.textContent = timeValue
    .toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    .toLowerCase();
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

const clearShiftData = () => {
  clearGroupSelection("shift");
  clearGroupSelection("attendance-primary");
  clearGroupSelection("attendance-secondary");
  if (attendanceStage) {
    attendanceStage.classList.add("hidden");
  }
  if (attendanceSecondary) {
    attendanceSecondary.classList.add("hidden");
  }
  if (displayTimeText) {
    displayTimeText.dataset.timeSource = "clock";
  }
  window.workerTimeUI?.applyShiftTimes?.(null, null);
  
  // Reset Captured Location
  window.workerLocation = null;
  const locStatus = document.getElementById("location-status");
  if (locStatus) locStatus.textContent = "";

  // Ensure view sections are hidden on reset but the button itself is in the DOM
  document.getElementById("section-view-attendance")?.classList.add("hidden");
  document.getElementById("section-attendance-history")?.classList.add("hidden");
  document.getElementById("section-attendance-summary")?.classList.add("hidden");
};

const applyShiftData = (data) => {
  if (!data) return;
  
  // Reset captured location when loading existing record
  window.workerLocation = null;
  const locStatus = document.getElementById("location-status");
  if (locStatus) locStatus.textContent = "";
  
  applySelection("shift", "shiftType", data.shift_type);
  applySelection("attendance-primary", "attendancePrimary", data.status);
  setRecordedTime(data.worker_start_date_time || data.worker_end_date_time);
  window.workerTimeUI?.applyShiftTimes?.(
    data.worker_start_date_time,
    data.worker_end_date_time
  );
};

const fetchShiftForDate = async (formattedDate) => {
  if (!formattedDate) return;
  const csrfToken = getCsrfToken();
  try {
    const response = await fetch("/worker/shift-upsert/", {
      method: "POST",
      credentials: "same-origin",
      headers: {
        "Content-Type": "application/json",
        ...(csrfToken ? { "X-CSRFToken": csrfToken } : {}),
      },
      body: JSON.stringify({ attendance_date: formattedDate }),
    });
    if (!response.ok || response.redirected) {
      return;
    }
    if (response.status === 401 || response.status === 403) {
      return;
    }
    const payload = await response.json().catch(() => ({}));
    if (!payload.ok) return;
    if (!payload.data) {
      clearShiftData();
      return;
    }
    applyShiftData(payload.data);
  } catch (error) {
    // Ignore fetch errors; fallback to current UI state.
  }
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
    loginInput.value = "56565656";
    loginInput.dispatchEvent(new Event("input", { bubbles: true }));
  }
  if (passwordInput && !passwordInput.value) {
    passwordInput.value = "B5656";
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

// Expose globally
window.showToast = showToast;

const saveShift = async (payload) => {
    const csrfToken = getCsrfToken();
    try {
        const response = await fetch("/worker/shift-upsert/", {
            method: "POST",
            credentials: "same-origin",
            headers: {
                "Content-Type": "application/json",
                ...(csrfToken ? { "X-CSRFToken": csrfToken } : {}),
            },
            body: JSON.stringify(payload),
        });
        const data = await response.json();
        if (data.ok) {
            showToast("Record updated successfully", "success");
            if (data.data) {
                applyShiftData(data.data);
            }
        } else {
            showToast(data.message || "Update failed", "error");
        }
    } catch (err) {
        console.error(err);
        showToast("Network error", "error");
    }
};

let currentCalendarDate = new Date();
let cachedHistory = [];

const parseAttendanceDate = (value) => {
    if (!value) return null;
    if (typeof value === "string") {
        const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
        if (match) {
            return {
                year: Number(match[1]),
                month: Number(match[2]) - 1,
                day: Number(match[3]),
            };
        }
    }
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return null;
    return { year: d.getFullYear(), month: d.getMonth(), day: d.getDate(), date: d };
};

const fetchAttendanceHistory = async () => {
    try {
        const response = await fetch("/api/v1/worker/attendance-history/");
        const data = await response.json();
        if (data.ok) {
            cachedHistory = data.data;
            renderAttendanceUI();
        }
    } catch (err) {
        console.error("Failed to fetch history:", err);
    }
};

const renderAttendanceUI = () => {
    const viewMonth = currentCalendarDate.getMonth();
    const viewYear = currentCalendarDate.getFullYear();
    const monthlyRecords = cachedHistory.filter(shift => {
        const parts = parseAttendanceDate(shift.attendance_date);
        return parts && parts.month === viewMonth && parts.year === viewYear;
    });

    const historySec = document.getElementById("section-attendance-history");
    const summarySec = document.getElementById("section-attendance-summary");

    historySec?.classList.remove("hidden");
    summarySec?.classList.remove("hidden");

    renderAttendanceTable(cachedHistory, currentCalendarDate);
    renderCalendar(cachedHistory, currentCalendarDate);
    renderAttendanceSummary(cachedHistory, currentCalendarDate);
};

const renderAttendanceTable = (history, baseDate) => {
    const tbody = document.getElementById("attendance-table-body");
    if (!tbody) return;
    tbody.innerHTML = "";
    
    const viewMonth = baseDate.getMonth();
    const viewYear = baseDate.getFullYear();

    const displayData = history.filter(shift => {
        const parts = parseAttendanceDate(shift.attendance_date);
        return parts && parts.month === viewMonth && parts.year === viewYear;
    });
    
    if (displayData.length === 0) {
        const tr = document.createElement("tr");
        const msg = I18N[localStorage.getItem("workerLang") || "en"]["dash.no_records"] || "No attendance records available for this month";
        tr.innerHTML = `<td colspan="3" style="text-align:center; padding: 20px; color: var(--muted);">${msg}</td>`;
        tbody.appendChild(tr);
        return;
    }

    displayData.forEach(shift => {
        const tr = document.createElement("tr");
        
        const formatDate = (iso) => {
            const parts = parseAttendanceDate(iso);
            if (!parts) return "";
            return `${parts.day}-${monthMapReverse[parts.month]}-${parts.year}`;
        };

        const formatTime = (iso) => {
            if (!iso) return "";
            const d = new Date(iso);
            return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }).toLowerCase();
        };

        tr.innerHTML = `
            <td>${formatDate(shift.attendance_date)}</td>
            <td>${formatTime(shift.worker_start_date_time)}</td>
            <td>${formatTime(shift.worker_end_date_time)}</td>
        `;
        tbody.appendChild(tr);
    });
};

const monthMapReverse = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const renderCalendar = (history, baseDate) => {
    const grid = document.getElementById("calendar-grid");
    if (!grid) return;
    
    // Clear previous days (keep DOW headers)
    const dows = grid.querySelectorAll(".dow");
    grid.innerHTML = "";
    dows.forEach(dow => grid.appendChild(dow));

    const viewYear = baseDate.getFullYear();
    const viewMonth = baseDate.getMonth();
    
    const firstDay = new Date(viewYear, viewMonth, 1).getDay();
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    
    const monthName = new Intl.DateTimeFormat('en-US', { month: 'long' }).format(baseDate);
    const monthDisplay = document.getElementById("current-month-display");
    if (monthDisplay) monthDisplay.textContent = `${monthName} ${viewYear}`;

    // Padding for first day
    for (let i = 0; i < firstDay; i++) {
        const div = document.createElement("div");
        div.className = "calendar-day other-month";
        grid.appendChild(div);
    }

    const now = new Date();
    for (let d = 1; d <= daysInMonth; d++) {
        const div = document.createElement("div");
        div.className = "calendar-day";
        if (viewMonth === now.getMonth() && viewYear === now.getFullYear() && d === now.getDate()) {
            div.classList.add("today");
        }
        
        const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const shift = history.find(s => s.attendance_date === dateStr);
        
        div.innerHTML = `<span class="day-num">${d}</span>`;
        
        if (shift) {
            if (shift.status === "absent" || shift.absence_reason) {
                div.innerHTML += `<span class="tick red">✖</span>`;
            } else {
                if (shift.recorded_by_worker) {
                    div.innerHTML += `<span class="tick black">✔</span>`;
                }
                if (shift.recorded_by_staff) {
                    div.innerHTML += `<span class="tick green">✔</span>`;
                }
            }
        }
        
        grid.appendChild(div);
    }
};

const renderAttendanceSummary = (history, baseDate) => {
    const viewMonth = baseDate.getMonth();
    const viewYear = baseDate.getFullYear();

    const currentMonthShifts = history.filter(shift => {
        const parts = parseAttendanceDate(shift.attendance_date);
        return parts && parts.month === viewMonth && parts.year === viewYear;
    });

    const present = currentMonthShifts.filter(s => s.status === "present").length;
    // Total Absent = anything not present + explicitly absent status
    const totalAbsent = currentMonthShifts.filter(s => s.status === "absent" || s.absence_reason).length;

    const sick = currentMonthShifts.filter(s => s.absence_reason === "sick").length;
    const absentOnly = currentMonthShifts.filter(s => s.status === "absent" && !s.absence_reason).length;
    const noBus = currentMonthShifts.filter(s => s.absence_reason === "no_bus").length;
    const missedBus = currentMonthShifts.filter(s => s.absence_reason === "missed_bus").length;
    const siteOut = currentMonthShifts.filter(s => s.absence_reason === "site_out").length;
    const noWork = currentMonthShifts.filter(s => s.absence_reason === "no_work").length;
    const safety = currentMonthShifts.filter(s => s.absence_reason === "safety").length;
    const training = currentMonthShifts.filter(s => s.absence_reason === "training").length;

    const updateEl = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.textContent = val;
    };

    const summaryPeriod = document.getElementById("summary-month-year");
    if (summaryPeriod) {
        const monthName = new Intl.DateTimeFormat("en-US", { month: "long" }).format(baseDate);
        summaryPeriod.textContent = `- ${monthName} ${viewYear}`;
    }

    // Main Stats
    updateEl("summary-total-present-main", present);
    updateEl("summary-total-absent-main", totalAbsent);

    // Detail Grid
    updateEl("summary-total-present", present);
    updateEl("summary-total-absent", absentOnly);
    updateEl("summary-total-sick", sick);
    updateEl("summary-total-no-bus", noBus);
    updateEl("summary-total-missed-bus", missedBus);
    updateEl("summary-total-site-out", siteOut);
    updateEl("summary-total-no-work", noWork);
    updateEl("summary-total-safety", safety);
    updateEl("summary-total-training", training);
};

if (sessionAuthenticated) {
  if (dashboardSection) {
    dashboardSection.classList.remove("hidden");
  }
  if (displayName && sessionDisplayName) {
    displayName.textContent = sessionDisplayName;
  }
}

window.addEventListener("load", () => {
  fetchShiftForDate(getFormattedDateFromDisplay());
  if (sessionAuthenticated) {
    fetchAttendanceHistory();
  }
});

window.addEventListener("attendance:date-changed", (event) => {
  const formattedDate = event.detail?.formattedDate || "";
  fetchShiftForDate(formattedDate);
});

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
  if (authSection) {
    authSection.classList.remove("hidden");
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

document.getElementById("btn-view-attendance")?.addEventListener("click", () => {
    const viewSec = document.getElementById("section-view-attendance");
    const isHidden = viewSec.classList.contains("hidden");
    
    if (isHidden) {
        viewSec.classList.remove("hidden");
        // We call fetchAttendanceHistory which will then call renderAttendanceUI
        // renderAttendanceUI will decide if history/summary should be visible
        fetchAttendanceHistory();
    } else {
        viewSec.classList.add("hidden");
        document.getElementById("section-attendance-history")?.classList.add("hidden");
        document.getElementById("section-attendance-summary")?.classList.add("hidden");
    }
});

document.getElementById("prev-month")?.addEventListener("click", () => {
    currentCalendarDate.setMonth(currentCalendarDate.getMonth() - 1);
    renderAttendanceUI();
});

document.getElementById("next-month")?.addEventListener("click", () => {
    currentCalendarDate.setMonth(currentCalendarDate.getMonth() + 1);
    renderAttendanceUI();
});

// Re-query attendanceSecondary in case DOM updates affect it? No, it's consistent.
// But we need to make sure this logic runs.
// The issue might be that attendanceSecondary isn't found if it's hidden? No.
// Let's verify variable names.
// attendanceSecondary is defined at top: const attendanceSecondary = document.querySelector("[data-attendance-secondary]");

selectButtons.forEach((btn) => {
  btn.setAttribute("aria-pressed", "false");
  btn.addEventListener("click", () => {
    const groupName = btn.dataset.selectGroup;
    clearGroupSelection(groupName);
    
    // Toggle check: if already selected, we are unselecting? No, radio behavior usually.
    // But specific request: just select it.
    btn.classList.add("selected");
    btn.setAttribute("aria-pressed", "true");

    if (btn.dataset.stageTrigger === "attendance" && attendanceStage) {
      attendanceStage.classList.remove("hidden");
    }

    if (groupName === "attendance-primary" && attendanceSecondary) {
      const primary = btn.dataset.attendancePrimary;
      const endBtn = document.getElementById("btn-end-work");
      const timerBtn = document.getElementById("btn-timer");
      const timeLabels = document.querySelectorAll('p.section-title.muted[data-i18n="dash.system_time"]');

        const timeStage = document.querySelector('[data-stage="time"]');
        const locationStage = document.querySelector('[data-stage="location"]');

        if (primary === "absent") {
          attendanceSecondary.classList.remove("hidden");
          // Hide End, Timer and labels
          endBtn?.classList.add("hidden");
          timerBtn?.classList.add("hidden");
          timeLabels.forEach(el => el.classList.add("hidden"));
          
          // Hide Time and Location stages
          timeStage?.classList.add("hidden");
          locationStage?.classList.add("hidden");
          
          // Scroll to it for better UX
          attendanceSecondary.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        } else {
          attendanceSecondary.classList.add("hidden");
          // Show End, Timer and labels
          endBtn?.classList.remove("hidden");
          timerBtn?.classList.remove("hidden");
          timeLabels.forEach(el => el.classList.remove("hidden"));

          // Show Time and Location stages
          timeStage?.classList.remove("hidden");
          locationStage?.classList.remove("hidden");
          
          clearGroupSelection("attendance-secondary");
        }
    }

    if (groupName === "attendance-secondary") {
        const reason = btn.dataset.attendanceSecondary;
        const shiftBtn = document.querySelector('.option-btn[data-select-group="shift"].selected');
        const formattedDate = getFormattedDateFromDisplay();
        
        if (!shiftBtn) {
            showToast("Please select a shift first", "error");
            return;
        }
        
        const payload = {
            attendance_date: formattedDate,
            shift_type: shiftBtn.dataset.shiftType,
            status: "absent",
            absence_reason: reason,
            action: "start"
        };
        saveShift(payload);
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
    if (authSection) {
      authSection.classList.add("hidden");
    }
    if (displayName) {
      displayName.textContent = payload.name || "Display The Name Here";
    }
    showToast("Login success", "success");
    sessionAuthenticated = true;
    fetchShiftForDate(getFormattedDateFromDisplay());
  });
}
