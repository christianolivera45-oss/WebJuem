import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Global error shield for runtime errors in development sandbox
if (typeof window !== "undefined") {
  window.addEventListener('error', (event) => {
    const isScriptError = 
      !event || 
      event.message === "Script error." || 
      event.message?.toLowerCase().includes("script error") || 
      !event.filename;

    if (isScriptError) {
      // Gracefully silent because cross-origin tracking block or iframe sandbox limits
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
    }
  }, true);

  window.addEventListener('unhandledrejection', (event) => {
    const reason = event?.reason;
    const isScriptError = 
      reason && 
      (reason.message === "Script error." || 
       reason.message?.toLowerCase().includes("script error"));

    if (isScriptError) {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
    }
  }, true);
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
