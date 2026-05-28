const axios = require('axios'); // Wait, since this is a Vite ESModules environment, we should use export / import.
// Let's write ESModules format!
import axiosInstance from 'axios';

const api = axiosInstance.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor to automatically add JWT token to all requests
api.interceptors.request.use(
  (config) => {
    const token = sessionStorage.getItem('easytrip_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default api;
