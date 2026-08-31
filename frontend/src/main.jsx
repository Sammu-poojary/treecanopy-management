import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import 'leaflet/dist/leaflet.css'
import App from './App.jsx'

const root = createRoot(document.getElementById('root'));
root.render(
  <StrictMode>
    <App />
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

