const OFFLINE_RETENTION_DAYS = 7;
const OFFLINE_STORAGE_PREFIX = "worker_portal_offline";
const SHIFT_UPSERT_URL = "/worker/shift-upsert/";

const safeParseJSON = (value, fallback) => {
  if (!value) return fallback;
  try {
    return JSON.parse(value);
  } catch (error) {
    return fallback;
  }
};

const getStorageKey = (workerId, key) => {
  if (!workerId) return "";
  return `${OFFLINE_STORAGE_PREFIX}:${workerId}:${key}`;
};

const getRetentionCutoff = () => {
  const cutoff = new Date();
  cutoff.setHours(0, 0, 0, 0);
  cutoff.setDate(cutoff.getDate() - (OFFLINE_RETENTION_DAYS - 1));
  return cutoff;
};

const parseDateOnly = (value) => {
  if (!value) return null;
  if (typeof value === "string") {
    const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (match) {
      return new Date(
        Number(match[1]),
        Number(match[2]) - 1,
        Number(match[3])
      );
    }
  }
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
};

const pruneHistory = (history) => {
  const cutoff = getRetentionCutoff();
  return history.filter((shift) => {
    const dateOnly = parseDateOnly(shift?.attendance_date);
    if (!dateOnly) return false;
    return dateOnly >= cutoff;
  });
};

const mergeHistory = (baseHistory, incomingHistory) => {
  const map = new Map();
  baseHistory.forEach((shift) => {
    if (shift?.attendance_date) {
      map.set(shift.attendance_date, shift);
    }
  });
  incomingHistory.forEach((shift) => {
    if (shift?.attendance_date) {
      map.set(shift.attendance_date, shift);
    }
  });
  return Array.from(map.values()).sort((a, b) =>
    String(b.attendance_date).localeCompare(String(a.attendance_date))
  );
};

const getHistoryLastUpdated = (history) => {
  let maxTime = 0;
  history.forEach((shift) => {
    const candidate =
      shift?.local_updated_at ||
      shift?.modified ||
      shift?.updated_at ||
      shift?.created;
    if (!candidate) return;
    const time = new Date(candidate).getTime();
    if (!Number.isNaN(time) && time > maxTime) {
      maxTime = time;
    }
  });
  return maxTime ? new Date(maxTime).toISOString() : "";
};

const loadHistory = (workerId) => {
  const key = getStorageKey(workerId, "attendance_history");
  if (!key) return [];
  const stored = safeParseJSON(localStorage.getItem(key), []);
  if (!Array.isArray(stored)) return [];
  return pruneHistory(stored);
};

const saveHistory = (workerId, history) => {
  const key = getStorageKey(workerId, "attendance_history");
  if (!key) return [];
  const pruned = pruneHistory(history);
  localStorage.setItem(key, JSON.stringify(pruned));
  return pruned;
};

const getDbUpdatedAt = (workerId) => {
  const key = getStorageKey(workerId, "db_updated_at");
  if (!key) return "";
  return localStorage.getItem(key) || "";
};

const setDbUpdatedAt = (workerId, value) => {
  const key = getStorageKey(workerId, "db_updated_at");
  if (!key) return;
  if (!value) {
    localStorage.removeItem(key);
    return;
  }
  localStorage.setItem(key, value);
};

const getLastSyncAt = (workerId) => {
  const key = getStorageKey(workerId, "last_sync_at");
  if (!key) return "";
  return localStorage.getItem(key) || "";
};

const setLastSyncAt = (workerId, value) => {
  const key = getStorageKey(workerId, "last_sync_at");
  if (!key) return;
  if (!value) {
    localStorage.removeItem(key);
    return;
  }
  localStorage.setItem(key, value);
};

const loadQueue = (workerId) => {
  const key = getStorageKey(workerId, "offline_queue");
  if (!key) return [];
  const stored = safeParseJSON(localStorage.getItem(key), []);
  return Array.isArray(stored) ? stored : [];
};

const saveQueue = (workerId, queue) => {
  const key = getStorageKey(workerId, "offline_queue");
  if (!key) return;
  localStorage.setItem(key, JSON.stringify(queue));
};

const applyLocalShiftUpdate = (payload, history, workerId) => {
  const attendanceDate = payload.attendance_date;
  const existing = history.find(
    (shift) => shift.attendance_date === attendanceDate
  );
  const next = { ...(existing || {}) };
  next.attendance_date = attendanceDate;
  next.shift_type = payload.shift_type || next.shift_type;
  next.status = payload.status || next.status || "present";
  next.absence_reason =
    payload.absence_reason !== undefined
      ? payload.absence_reason
      : next.absence_reason;
  next.recorded_by_worker = workerId || next.recorded_by_worker || true;
  if (payload.action === "start") {
    if (next.status !== "present") {
      next.worker_start_date_time = null;
    } else {
      next.worker_start_date_time =
        payload.worker_start_date_time || new Date().toISOString();
    }
  }
  if (payload.action === "end") {
    next.worker_end_date_time =
      payload.worker_end_date_time || new Date().toISOString();
  }
  next._local = true;
  next.local_updated_at = new Date().toISOString();
  return {
    updatedShift: next,
    history: mergeHistory(history, [next]),
  };
};

const queueShift = (workerId, payload) => {
  if (!workerId) return;
  const queue = loadQueue(workerId);
  queue.push({
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    queued_at: new Date().toISOString(),
    payload,
  });
  saveQueue(workerId, queue);
};

const syncQueue = async ({ workerId, csrfToken, onShift }) => {
  if (!workerId) return [];
  const queue = loadQueue(workerId);
  if (!queue.length) return [];

  const nextQueue = [];
  for (const item of queue) {
    try {
      const response = await fetch(SHIFT_UPSERT_URL, {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
          ...(csrfToken ? { "X-CSRFToken": csrfToken } : {}),
        },
        body: JSON.stringify(item.payload),
      });
      const data = await response.json().catch(() => ({}));
      if (response.ok && data.ok && data.data) {
        onShift?.(data.data);
      } else {
        nextQueue.push(item);
      }
    } catch (error) {
      nextQueue.push(item);
    }
  }

  saveQueue(workerId, nextQueue);
  return nextQueue;
};

window.workerOffline = {
  retentionDays: OFFLINE_RETENTION_DAYS,
  getRetentionCutoff,
  mergeHistory,
  getHistoryLastUpdated,
  loadHistory,
  saveHistory,
  getDbUpdatedAt,
  setDbUpdatedAt,
  getLastSyncAt,
  setLastSyncAt,
  applyLocalShiftUpdate,
  queueShift,
  syncQueue,
};
