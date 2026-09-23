import React from "react";
import ReactDOM from "react-dom/client";
import App from "./src/App";
import "./index.css";

const PRELOAD_RECOVERY_STORAGE_KEY = "learnendo:preload-recovery-at";
const PRELOAD_RECOVERY_GUARD_MS = 60_000;

if (typeof window !== "undefined") {
  window.addEventListener("vite:preloadError", (event) => {
    let lastRecovery = 0;
    try {
      lastRecovery = Number(window.sessionStorage.getItem(PRELOAD_RECOVERY_STORAGE_KEY)) || 0;
    } catch { /* private browsing may deny session storage */ }

    if (Date.now() - lastRecovery < PRELOAD_RECOVERY_GUARD_MS) {
      // Let the original error surface if a fresh reload did not solve it.
      // This guard prevents a network outage from causing a reload loop.
      return;
    }

    event.preventDefault();
    try {
      window.sessionStorage.setItem(PRELOAD_RECOVERY_STORAGE_KEY, String(Date.now()));
    } catch { /* reloading still refreshes the application without storage */ }
    window.location.reload();
  });
}

if (import.meta.env.DEV && typeof window !== "undefined") {
  window.addEventListener(
    "load",
    () => {
      if ("serviceWorker" in navigator) {
        void navigator.serviceWorker.getRegistrations()
          .then((registrations) => Promise.all(registrations.map((registration) => registration.unregister())))
          .catch((error) => console.warn("[PWA] Unable to unregister dev service workers:", error));
      }

      if ("caches" in window) {
        void window.caches.keys()
          .then((keys) => Promise.all(
            keys
              .filter((key) => key.includes("workbox") || key.includes("precache") || key.includes("runtime"))
              .map((key) => window.caches.delete(key)),
          ))
          .catch((error) => console.warn("[PWA] Unable to clear dev caches:", error));
      }
    },
    { once: true },
  );
}

const rootElement = document.getElementById("root");

if (!rootElement) {
  console.error("Fatal Error: Root element '#root' not found in document.");
} else {
  ReactDOM.createRoot(rootElement).render(<App />);
}
