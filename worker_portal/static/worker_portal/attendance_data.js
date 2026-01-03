const clearShiftData = () => {
  clearGroupSelection("shift");
  clearGroupSelection("attendance-primary");
  clearGroupSelection("attendance-secondary");
  if (attendanceSecondary) {
    attendanceSecondary.classList.add("hidden");
  }
  window.workerShiftCurrent = null;
  window.dispatchEvent(
    new CustomEvent("attendance:shift-updated", {
      detail: { hasShift: false },
    })
  );
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
  document
    .getElementById("section-attendance-history")
    ?.classList.add("hidden");
  document
    .getElementById("section-attendance-summary")
    ?.classList.add("hidden");
};

const applyShiftData = (data) => {
  if (!data) return;
  window.workerShiftCurrent = data;
  window.dispatchEvent(
    new CustomEvent("attendance:shift-updated", {
      detail: { hasShift: true },
    })
  );

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
    const localShift = cachedHistory.find(
      (shift) => shift.attendance_date === formattedDate
    );
    if (localShift) {
      applyShiftData(localShift);
    }
  }
};

const saveShift = async (payload) => {
  const workerId = currentWorkerId;
  if (workerId && offlineSupport) {
    const result = offlineSupport.applyLocalShiftUpdate(
      payload,
      cachedHistory,
      workerId
    );
    cachedHistory = result.history;
    offlineSupport.saveHistory(workerId, cachedHistory);
    if (
      !document
        .getElementById("section-attendance-history")
        ?.classList.contains("hidden")
    ) {
      renderAttendanceUI();
    }
  }
  if (!isOnline()) {
    if (workerId && offlineSupport) {
      offlineSupport.queueShift(workerId, payload);
    }
    showToast("Saved offline. Will sync when online.", "info");
    return { ok: true, offline: true };
  }
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
    const data = await response.json().catch(() => ({}));
    if (response.ok && data.ok) {
      showToast("Record updated successfully", "success");
      if (data.data) {
        applyShiftData(data.data);
        if (workerId && offlineSupport) {
          cachedHistory = offlineSupport.mergeHistory(cachedHistory, [
            data.data,
          ]);
          offlineSupport.saveHistory(workerId, cachedHistory);
        }
      }
      return { ok: true, data: data.data || null };
    } else {
      showToast(data.message || "Update failed", "error");
      return { ok: false, message: data.message || "Update failed" };
    }
  } catch (err) {
    if (workerId && offlineSupport) {
      offlineSupport.queueShift(workerId, payload);
    }
    showToast("Saved offline. Will sync when online.", "info");
    return { ok: true, offline: true };
  }
};

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
  return {
    year: d.getFullYear(),
    month: d.getMonth(),
    day: d.getDate(),
    date: d,
  };
};

const lastUpdatedDbEl = document.querySelector("[data-last-updated-db]");
const lastUpdatedLocalEl = document.querySelector("[data-last-updated-local]");

const formatUpdatedAt = (iso) => {
  if (!iso) return "—";
  const dateValue = new Date(iso);
  if (Number.isNaN(dateValue.getTime())) return "—";
  return `${formatShortDate(dateValue)} ${formatShortTime(dateValue)}`;
};

const updateLastUpdatedUI = (localHistory, dbUpdatedAt) => {
  const localUpdatedAt =
    offlineSupport?.getHistoryLastUpdated(localHistory) || "";
  if (lastUpdatedDbEl) {
    lastUpdatedDbEl.textContent = formatUpdatedAt(dbUpdatedAt);
  }
  if (lastUpdatedLocalEl) {
    lastUpdatedLocalEl.textContent = formatUpdatedAt(localUpdatedAt);
  }
};

const isIsoAfter = (left, right) => {
  if (!left) return false;
  if (!right) return true;
  const leftTime = new Date(left).getTime();
  const rightTime = new Date(right).getTime();
  if (Number.isNaN(leftTime) || Number.isNaN(rightTime)) return false;
  return leftTime > rightTime;
};

const fetchAttendanceHistory = async () => {
  const workerId = currentWorkerId;
  if (!workerId) return;

  const localHistory = offlineSupport?.loadHistory(workerId) || [];
  const lastSyncAt = offlineSupport?.getLastSyncAt(workerId) || "";
  const storedDbUpdatedAt = offlineSupport?.getDbUpdatedAt(workerId) || "";
  updateLastUpdatedUI(localHistory, storedDbUpdatedAt);
  if (!lastSyncAt && localHistory.length) {
    cachedHistory = localHistory;
  }
  if (!isOnline()) {
    cachedHistory = localHistory;
    renderAttendanceUI();
    return;
  }

  try {
    const response = await fetch("/api/v1/worker/attendance-history/");
    const data = await response.json().catch(() => ({}));
    if (response.ok && data.ok) {
      const dbUpdatedAt = data.last_updated_at || "";
      const localUpdatedAt =
        offlineSupport?.getHistoryLastUpdated(localHistory) || "";
      offlineSupport?.setDbUpdatedAt(workerId, dbUpdatedAt);

      let merged = [];
      if (isIsoAfter(localUpdatedAt, dbUpdatedAt)) {
        merged = offlineSupport?.mergeHistory(data.data || [], localHistory) || [];
        offlineSupport?.syncQueue({
          workerId,
          csrfToken: getCsrfToken(),
          onShift: (shift) => {
            cachedHistory =
              offlineSupport?.mergeHistory(cachedHistory, [shift]) ||
              cachedHistory;
            offlineSupport?.saveHistory(workerId, cachedHistory);
          },
        });
      } else if (isIsoAfter(dbUpdatedAt, localUpdatedAt)) {
        merged = Array.isArray(data.data) ? data.data : [];
      } else {
        merged = offlineSupport?.mergeHistory(data.data || [], localHistory) || [];
      }

      cachedHistory = merged;
      offlineSupport?.saveHistory(workerId, merged);
      offlineSupport?.setLastSyncAt(workerId, new Date().toISOString());
      updateLastUpdatedUI(merged, dbUpdatedAt);
      renderAttendanceUI();
    } else {
      cachedHistory = localHistory;
      renderAttendanceUI();
    }
  } catch (err) {
    cachedHistory = localHistory;
    renderAttendanceUI();
  }
};

const renderAttendanceUI = () => {
  if (!isOnline()) {
    const cutoff = offlineSupport?.getRetentionCutoff?.() || new Date();
    const viewMonthStart = new Date(
      currentCalendarDate.getFullYear(),
      currentCalendarDate.getMonth(),
      1
    );
    if (viewMonthStart < cutoff) {
      showToast("Online required to view attendance older than 7 days.", "error");
    }
  }
  const viewMonth = currentCalendarDate.getMonth();
  const viewYear = currentCalendarDate.getFullYear();
  const monthlyRecords = cachedHistory.filter((shift) => {
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

  const displayData = history.filter((shift) => {
    const parts = parseAttendanceDate(shift.attendance_date);
    return parts && parts.month === viewMonth && parts.year === viewYear;
  });

  if (displayData.length === 0) {
    const tr = document.createElement("tr");
    const bundle = I18N[getSelectedLang()] || I18N.en;
    const msg =
      bundle["dash.no_records"] ||
      "No attendance records available for this month";
    tr.innerHTML = `<td colspan="3" style="text-align:center; padding: 20px; color: var(--muted);">${msg}</td>`;
    tbody.appendChild(tr);
    return;
  }

  displayData.forEach((shift) => {
    const tr = document.createElement("tr");

    const formatDate = (iso) => {
      const parts = parseAttendanceDate(iso);
      if (!parts) return "";
      return formatShortDate(new Date(parts.year, parts.month, parts.day));
    };

    const formatTime = (iso) => {
      if (!iso) return "";
      const d = new Date(iso);
      if (Number.isNaN(d.getTime())) return "";
      return formatShortTime(d);
    };

    tr.innerHTML = `
            <td>${formatDate(shift.attendance_date)}</td>
            <td>${formatTime(shift.worker_start_date_time)}</td>
            <td>${formatTime(shift.worker_end_date_time)}</td>
        `;
    tbody.appendChild(tr);
  });
};

const renderCalendar = (history, baseDate) => {
  const grid = document.getElementById("calendar-grid");
  if (!grid) return;

  // Clear previous days (keep DOW headers)
  const dows = grid.querySelectorAll(".dow");
  grid.innerHTML = "";
  dows.forEach((dow) => grid.appendChild(dow));

  const viewYear = baseDate.getFullYear();
  const viewMonth = baseDate.getMonth();

  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  const monthDisplay = document.getElementById("current-month-display");
  if (monthDisplay) monthDisplay.textContent = formatMonthYear(baseDate);

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
    if (
      viewMonth === now.getMonth() &&
      viewYear === now.getFullYear() &&
      d === now.getDate()
    ) {
      div.classList.add("today");
    }

    const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(
      2,
      "0"
    )}-${String(d).padStart(2, "0")}`;
    const shift = history.find((s) => s.attendance_date === dateStr);

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

  const currentMonthShifts = history.filter((shift) => {
    const parts = parseAttendanceDate(shift.attendance_date);
    return parts && parts.month === viewMonth && parts.year === viewYear;
  });

  const present = currentMonthShifts.filter(
    (s) => s.status === "present"
  ).length;
  // Total Absent = anything not present + explicitly absent status
  const totalAbsent = currentMonthShifts.filter(
    (s) => s.status === "absent" || s.absence_reason
  ).length;

  const sick = currentMonthShifts.filter(
    (s) => s.absence_reason === "sick"
  ).length;
  const absentOnly = currentMonthShifts.filter(
    (s) => s.status === "absent" && !s.absence_reason
  ).length;
  const noBus = currentMonthShifts.filter(
    (s) => s.absence_reason === "no_bus"
  ).length;
  const missedBus = currentMonthShifts.filter(
    (s) => s.absence_reason === "missed_bus"
  ).length;
  const siteOut = currentMonthShifts.filter(
    (s) => s.absence_reason === "site_out"
  ).length;
  const noWork = currentMonthShifts.filter(
    (s) => s.absence_reason === "no_work"
  ).length;
  const safety = currentMonthShifts.filter(
    (s) => s.absence_reason === "safety"
  ).length;
  const training = currentMonthShifts.filter(
    (s) => s.absence_reason === "training"
  ).length;

  const updateEl = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  };

  const summaryPeriod = document.getElementById("summary-month-year");
  if (summaryPeriod) {
    summaryPeriod.textContent = `- ${formatMonthYear(baseDate)}`;
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

window.addEventListener("worker:language-changed", () => {
  renderAttendanceTable(cachedHistory, currentCalendarDate);
  renderCalendar(cachedHistory, currentCalendarDate);
  renderAttendanceSummary(cachedHistory, currentCalendarDate);
});

window.addEventListener("load", () => {
  if (sessionAuthenticated) {
    const workerId = currentWorkerId;
    if (workerId) {
      const localHistory = offlineSupport?.loadHistory(workerId) || [];
      if (localHistory.length) {
        cachedHistory = localHistory;
        renderAttendanceUI();
      }
      offlineSupport?.syncQueue({
        workerId,
        csrfToken: getCsrfToken(),
        onShift: (shift) => {
          cachedHistory =
            offlineSupport?.mergeHistory(cachedHistory, [shift]) ||
            cachedHistory;
          offlineSupport?.saveHistory(workerId, cachedHistory);
        },
      });
      fetchAttendanceHistory();
    }
  }
  fetchShiftForDate(getFormattedDateFromDisplay());
});

window.addEventListener("online", () => {
  if (!currentWorkerId) return;
  offlineSupport?.syncQueue({
    workerId: currentWorkerId,
    csrfToken: getCsrfToken(),
    onShift: (shift) => {
      cachedHistory =
        offlineSupport?.mergeHistory(cachedHistory, [shift]) || cachedHistory;
      offlineSupport?.saveHistory(currentWorkerId, cachedHistory);
    },
  });
  fetchAttendanceHistory();
});

window.addEventListener("offline", () => {
  if (!currentWorkerId) return;
  const localHistory = offlineSupport?.loadHistory(currentWorkerId) || [];
  if (localHistory.length) {
    cachedHistory = localHistory;
    renderAttendanceUI();
  }
});

window.addEventListener("attendance:date-changed", (event) => {
  const formattedDate = event.detail?.formattedDate || "";
  fetchShiftForDate(formattedDate);
});

document
  .getElementById("btn-view-attendance")
  ?.addEventListener("click", () => {
    const viewSec = document.getElementById("section-view-attendance");
    const isHidden = viewSec.classList.contains("hidden");

    if (isHidden) {
      viewSec.classList.remove("hidden");
      localStorage.setItem("workerViewAttendanceOpen", "true");
      // We call fetchAttendanceHistory which will then call renderAttendanceUI
      // renderAttendanceUI will decide if history/summary should be visible
      fetchAttendanceHistory();
    } else {
      viewSec.classList.add("hidden");
      localStorage.setItem("workerViewAttendanceOpen", "false");
      document
        .getElementById("section-attendance-history")
        ?.classList.add("hidden");
      document
        .getElementById("section-attendance-summary")
        ?.classList.add("hidden");
    }
  });

const applyViewAttendanceState = () => {
  const viewSec = document.getElementById("section-view-attendance");
  if (!viewSec) return;
  const isOpen = localStorage.getItem("workerViewAttendanceOpen") === "true";
  if (isOpen) {
    viewSec.classList.remove("hidden");
    fetchAttendanceHistory();
  } else {
    viewSec.classList.add("hidden");
  }
};

applyViewAttendanceState();

document.getElementById("prev-month")?.addEventListener("click", () => {
  currentCalendarDate.setMonth(currentCalendarDate.getMonth() - 1);
  renderAttendanceUI();
});

document.getElementById("next-month")?.addEventListener("click", () => {
  currentCalendarDate.setMonth(currentCalendarDate.getMonth() + 1);
  renderAttendanceUI();
});
