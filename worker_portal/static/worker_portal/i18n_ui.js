const applyTranslations = (lang) => {
  const bundle = I18N[lang] || I18N.en;
  document.documentElement.dir = bundle.rtl ? "rtl" : "ltr";
  document.documentElement.lang = lang;
  document.documentElement.dataset.lang = lang;
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
  window.dispatchEvent(
    new CustomEvent("worker:language-changed", { detail: { lang } })
  );
};

langs.forEach((lang) => {
  lang.addEventListener("click", () => {
    langs.forEach((l) => l.classList.remove("active"));
    lang.classList.add("active");
    const code = lang.dataset.lang || "en";
    localStorage.setItem("workerLang", code);
    applyTranslations(code);
  });
});

const savedLang = getSelectedLang();
applyTranslations(savedLang);
langs.forEach((lang) => {
  if (lang.dataset.lang === savedLang) {
    lang.classList.add("active");
  }
});
