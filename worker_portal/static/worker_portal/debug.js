function debugLog(...args) {
  const hostname = window.location.hostname;
  const isDev = hostname === "localhost" || hostname === "127.0.0.1";
  if (isDev) {
    console.log(...args);
  }
}
