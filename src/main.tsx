
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { initInstallCapture } from './lib/installPrompt'

initInstallCapture(); // catch beforeinstallprompt before the lazy /arcade route mounts

// Register the (no-op) service worker so the site is an installable PWA — this is what
// lets Android use the manifest icon for "Add to Home Screen" instead of a letter tile.
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {
      /* SW registration failed (e.g. private mode) — site still works, just not installable */
    });
  });
}

createRoot(document.getElementById("root")!).render(<App />);
