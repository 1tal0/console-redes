import axios from 'axios';
import { pushToast, setConnectionState } from './notifyBus';

const API_BASE_URL = 'http://192.168.100.10:3000/api';
const SESSION_MSG = 'Sessão expirada ou não autorizada. Por favor, faça login novamente.';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 8000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('console_n2_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

const isLoginRequest = (config) => {
  const url = `${config?.baseURL || ''}${config?.url || ''}`;
  return url.includes('/auth/login');
};

const isExpiredSession = (error) => {
  const status = error.response?.status;
  const message = String(error.response?.data?.error || '');

  if (status === 401) return true;
  if (status === 403 && /token|expirad/i.test(message)) return true;
  return false;
};

const forceLogout = () => {
  localStorage.removeItem('console_n2_token');
  localStorage.removeItem('console_n2_user');
  sessionStorage.setItem('console_n2_session_notice', SESSION_MSG);
  window.location.assign('/');
};

const isNetworkFailure = (error) => {
  if (error.response) return false;
  const code = error.code || '';
  const message = String(error.message || '');
  return (
    code === 'ERR_NETWORK' ||
    code === 'ECONNABORTED' ||
    message.includes('Network Error') ||
    message.toLowerCase().includes('timeout')
  );
};

api.interceptors.response.use(
  (response) => {
    setConnectionState('online');
    return response;
  },
  (error) => {
    if (isNetworkFailure(error)) {
      setConnectionState('offline');
    } else {
      setConnectionState('online');
      const status = error.response?.status;
      const message = error.response?.data?.error || '';
      if (status === 403 && /permiss/i.test(message)) {
        pushToast({ type: 'error', message: message || 'Permissão negada.' });
      }
    }

    if (!isLoginRequest(error.config) && isExpiredSession(error)) {
      forceLogout();
    }
    return Promise.reject(error);
  }
);

export default api;
