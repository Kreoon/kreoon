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

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

