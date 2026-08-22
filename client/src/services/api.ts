import axios from 'axios';

export const api = axios.create({
  baseURL: (import.meta as any).env?.VITE_API_URL || 'http://localhost:5005/api',
});

// Attach JWT header automatically to all API requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);
