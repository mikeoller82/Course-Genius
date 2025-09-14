import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

try {
  const rootElement = document.getElementById('root');
  if (!rootElement) {
    throw new Error("Could not find root element to mount to");
  }

  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
} catch (error) {
  console.error("Failed to render the application", error);
  const rootElement = document.getElementById('root');
  if (rootElement) {
    rootElement.innerHTML = `
      <div style="color: #cbd5e1; font-family: sans-serif; display: flex; flex-direction: column; justify-content: center; align-items: center; height: 100vh; padding: 2rem; text-align: center;">
        <h1 style="font-size: 1.875rem; font-weight: bold; color: #f87171; margin-bottom: 1rem;">Application Failed to Load</h1>
        <p style="font-size: 1.125rem;">A critical error prevented the app from starting.</p>
        <p style="color: #94a3b8; margin-top: 0.5rem;">Please check the browser's developer console (F12) for specific error messages.</p>
      </div>
    `;
  }
}
