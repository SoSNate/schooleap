import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
);

// Register Service Worker for Web Push notifications
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((reg) => {
        console.log('[push] Service Worker registered successfully', reg);
      })
      .catch((err) => {
        console.error('[push] Service Worker registration failed:', err);
      });
  });
} else {
  console.warn('[push] Service Worker not supported');
}
