
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { initInstallCapture } from './lib/installPrompt'

initInstallCapture(); // catch beforeinstallprompt before the lazy /arcade route mounts

createRoot(document.getElementById("root")!).render(<App />);
