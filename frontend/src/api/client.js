import axios from 'axios';
import { getApiOrigin } from './config';

const API_URL = `${getApiOrigin()}/api`;

const client = axios.create({
  baseURL: API_URL,
  timeout: 28000,
  headers: {
    'Content-Type': 'application/json',
    // ngrok free muestra un interstitial HTML que rompe el API en el navegador
    'ngrok-skip-browser-warning': 'true',
  },
});

// Interceptor para agregar token JWT
client.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type'];
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Interceptor para manejar errores
client.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('usuario');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default client;
