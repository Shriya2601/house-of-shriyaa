import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Capture and preserve AI Studio authentication token for seamless iframe API requests
if (typeof window !== 'undefined') {
  try {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('__aistudio_auth_token');
    if (token) {
      sessionStorage.setItem('__aistudio_auth_token', token);
      localStorage.setItem('__aistudio_auth_token', token);
    }
  } catch {}
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
