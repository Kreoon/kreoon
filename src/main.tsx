import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Debug: detect real reloads vs. UI re-renders when switching tabs/windows
// (helps us confirm the remaining issue in production/client role)
window.addEventListener('pageshow', (e) => {
  const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
  console.log('[lifecycle] pageshow', { persisted: (e as PageTransitionEvent).persisted, type: nav?.type });
});
window.addEventListener('pagehide', (e) => {
  console.log('[lifecycle] pagehide', { persisted: (e as PageTransitionEvent).persisted });
});
document.addEventListener('visibilitychange', () => {
  console.log('[lifecycle] visibilitychange', document.visibilityState);
});

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
