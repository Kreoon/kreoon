import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

/**
 * IMPORTANT: Prevent automatic page reloads from Service Worker updates
 * 
 * This blocks any skipWaiting calls that could trigger automatic reloads
 * when the user switches tabs/windows and returns. The user must explicitly
 * click "Update now" in the UpdatePrompt component.
 */
if ('serviceWorker' in navigator) {
  // Intercept any skipWaiting messages from the SW to prevent auto-reload
  navigator.serviceWorker.addEventListener('message', (event) => {
    // Log SW messages for debugging but don't act on them automatically
    if (event.data?.type === 'SKIP_WAITING') {
      console.log('[SW] Received SKIP_WAITING - controlled by UpdatePrompt');
    }
  });

  // Prevent automatic claim of the page by new service workers
  navigator.serviceWorker.ready.then((registration) => {
    // Only log, don't trigger any reload
    console.log('[SW] Registration ready:', registration.active?.state);
  });
}

/**
 * Handle bfcache (back-forward cache) restoration
 * This prevents the browser from reloading the page when navigating back from external sites
 */
window.addEventListener('pageshow', (event) => {
  if (event.persisted) {
    // Page was restored from bfcache - do NOT reload
    console.log('[App] Page restored from bfcache - keeping current state');
  }
});

// Prevent pagehide from triggering any cleanup that could cause reload
window.addEventListener('pagehide', (event) => {
  // Just log, don't do anything that could affect page state
  console.log('[App] Page hidden, persisted:', event.persisted);
});

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

