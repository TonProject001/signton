import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

console.log("Index.tsx: Script started execution");

try {
    const rootElement = document.getElementById('root');
    if (!rootElement) {
      throw new Error("Could not find root element to mount to");
    }

    console.log("Index.tsx: Root element found, creating root...");
    const root = ReactDOM.createRoot(rootElement);

    console.log("Index.tsx: Rendering App...");
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
    console.log("Index.tsx: Render called successfully");
} catch (error) {
    console.error("CRITICAL ERROR in index.tsx:", error);
    // Try to report to screen if possible
    const errDiv = document.getElementById('error-log');
    if (errDiv) {
        errDiv.style.display = 'block';
        errDiv.innerHTML += `<div class="mb-2"><strong>Launch Error:</strong> ${error.message}</div>`;
    }
}
