import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import ToastNotification from './components/ToastNotification.jsx';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
    <ToastNotification />
  </StrictMode>,
);
