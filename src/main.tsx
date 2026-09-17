import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import './lib/i18n';

// Guard against third-party browser extensions (such as MetaMask or Web3 injectors)
// and transient network fetch errors when operating in iframe/preview environments.
if (typeof window !== "undefined") {
  window.addEventListener("unhandledrejection", (event) => {
    const reason = event.reason?.message || String(event.reason || "");
    const low = reason.toLowerCase();
    if (
      low.includes("metamask") ||
      low.includes("ethereum") ||
      low.includes("wallet") ||
      low.includes("failed to fetch")
    ) {
      event.preventDefault();
      console.warn("[Impacto] Handled transient network/rejection notice:", reason);
    }
  });

  window.addEventListener("error", (event) => {
    const msg = event.message || "";
    const low = msg.toLowerCase();
    if (
      low.includes("metamask") ||
      low.includes("ethereum") ||
      low.includes("failed to fetch")
    ) {
      event.preventDefault();
      console.warn("[Impacto] Handled transient network error:", msg);
    }
  });
}

// Forces light mode by default unless stored otherwise
const initialTheme = localStorage.getItem("theme") || "light";
document.documentElement.setAttribute("data-theme", initialTheme);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

