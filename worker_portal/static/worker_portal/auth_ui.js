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

if (sessionAuthenticated) {
  if (dashboardSection) {
    dashboardSection.classList.remove("hidden");
  }
  if (displayName && sessionDisplayName) {
    displayName.textContent = sessionDisplayName;
  }
  attendanceStage?.classList.remove("hidden");
  setStoredSession({
    workerId: currentWorkerId,
    displayName: sessionDisplayName,
  });
} else if (!isOnline()) {
  const storedSession = getStoredSession();
  if (storedSession?.workerId) {
    sessionAuthenticated = true;
    setActiveWorker(storedSession.workerId);
    if (dashboardSection) {
      dashboardSection.classList.remove("hidden");
    }
    if (authSection) {
      authSection.classList.add("hidden");
    }
    if (displayName) {
      displayName.textContent = storedSession.displayName || "";
    }
    attendanceStage?.classList.remove("hidden");
    fetchAttendanceHistory();
    fetchShiftForDate(getFormattedDateFromDisplay());
  }
}

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
    if (el.dataset.attendanceSecondary !== undefined) {
      el.classList.add("hidden");
    }
  });
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
    setActiveWorker(payload.worker_id || "");
    showToast("Login success", "success");
    sessionAuthenticated = true;
    attendanceStage?.classList.remove("hidden");
    setStoredSession({
      workerId: payload.worker_id || "",
      displayName: payload.name || "",
    });
    fetchShiftForDate(getFormattedDateFromDisplay());
    fetchAttendanceHistory();
  });
}
