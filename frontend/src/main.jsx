import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { GoogleOAuthProvider } from '@react-oauth/google'
import './index.css'
import 'leaflet/dist/leaflet.css'
import App from './App.jsx'

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '516349052894-mrhftjps3e3cbjp3jropeu7sf6sh05ls.apps.googleusercontent.com';

// ── Theme initialization (runs before React renders, prevents flash) ──────────
;(function initTheme() {
  try {
    const saved = localStorage.getItem('theme')
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    const theme = saved || (prefersDark ? 'dark' : 'light')
    document.documentElement.setAttribute('data-theme', theme)
  } catch (_) {}
})()

const root = createRoot(document.getElementById('root'));
root.render(
  <StrictMode>
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <App />
    </GoogleOAuthProvider>
  </StrictMode>,
);

const splash = document.getElementById('splash-screen');
if (splash) {
  const hideSplash = () => {
    splash.classList.add('splash-screen--fade');
    splash.addEventListener('transitionend', () => splash.remove(), { once: true });
  };

  // Wait 2.6s (giving time for drawing & text animations to complete)
  setTimeout(hideSplash, 2600);
  
  // Safety fallback in case transitionend event doesn't trigger
  setTimeout(() => {
    if (document.body.contains(splash)) splash.remove();
  }, 3500);
}
