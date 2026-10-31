import axios from 'axios';

const API_BASE_URL = 'http://192.168.100.10:3000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
});

// Interceptor para injetar o Token JWT em todas as requisições
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('console_n2_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;