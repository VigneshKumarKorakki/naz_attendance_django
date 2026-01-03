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
      const timerDisplay = document.getElementById("timer-display");
      const timeLabels = document.querySelectorAll(
        'p.section-title.muted[data-i18n="dash.system_time"]'
      );

      const timeStage = document.querySelector('[data-stage="time"]');
      const locationStage = document.querySelector('[data-stage="location"]');

      if (primary === "absent") {
        attendanceSecondary.classList.remove("hidden");
        // Hide End, Timer and labels
        endBtn?.classList.add("hidden");
        timerDisplay?.classList.add("hidden");
        timeLabels.forEach((el) => el.classList.add("hidden"));

        // Hide Time and Location stages
        timeStage?.classList.add("hidden");
        locationStage?.classList.add("hidden");

        // Scroll to it for better UX
        attendanceSecondary.scrollIntoView({
          behavior: "smooth",
          block: "nearest",
        });
      } else {
        attendanceSecondary.classList.add("hidden");
        // Show End, Timer and labels
        endBtn?.classList.remove("hidden");
        timerDisplay?.classList.remove("hidden");
        timeLabels.forEach((el) => el.classList.remove("hidden"));

        // Show Time and Location stages
        timeStage?.classList.remove("hidden");
        locationStage?.classList.remove("hidden");

        clearGroupSelection("attendance-secondary");
      }
    }

    if (groupName === "attendance-secondary") {
      const reason = btn.dataset.attendanceSecondary;
      const shiftBtn = document.querySelector(
        '.option-btn[data-select-group="shift"].selected'
      );
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
        action: "start",
      };
      saveShift(payload);
    }
  });
});
