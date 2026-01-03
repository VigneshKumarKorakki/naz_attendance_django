{% load static %}
const CACHE_NAME = "worker-portal-v1";
const ASSETS = [
  "/worker/",
  "{% static 'worker_portal/styles.css' %}",
  "{% static 'worker_portal/offline.js' %}",
  "{% static 'worker_portal/app_state.js' %}",
  "{% static 'worker_portal/i18n_ui.js' %}",
  "{% static 'worker_portal/attendance_data.js' %}",
  "{% static 'worker_portal/selection_ui.js' %}",
  "{% static 'worker_portal/auth_ui.js' %}",
  "{% static 'worker_portal/bootstrap.js' %}",
  "{% static 'worker_portal/app.js' %}",
  "{% static 'worker_portal/manifest.json' %}",
  "{% static 'worker_portal/icons/icon-192.svg' %}",
  "{% static 'worker_portal/icons/icon-512.svg' %}",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
});

self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => response || fetch(event.request))
  );
});
