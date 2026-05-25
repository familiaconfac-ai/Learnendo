import React from "react";
import ReactDOM from "react-dom/client";
import App from "./src/App";
import "./index.css";

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
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}
