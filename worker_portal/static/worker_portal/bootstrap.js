if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/worker/service-worker.js");
  });
}

if (loginForm) {
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
