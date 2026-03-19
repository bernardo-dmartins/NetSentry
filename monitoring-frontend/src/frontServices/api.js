import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Criar instância do axios
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  },
  timeout: 10000 // 10 segundos
});

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

api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      
      // Redirecionar para login (se não estiver na página de login)
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/';
      }
    }

    if (!error.response) {
      console.error('Server connection error');
    }

    return Promise.reject(error);
  }
);


// Auth
export const authAPI = {
  login: (username, password) => 
    api.post('/auth/login', { username, password }),
  
  register: (username, email, password) => 
    api.post('/auth/register', { username, email, password }),
  
  logout: () => 
    api.post('/auth/logout'),
  
  getMe: () => 
    api.get('/auth/me')
};

// Devices
export const devicesAPI = {
  getAll: (params = {}) => 
    api.get('/devices', { params }),
  
  getById: (id) => 
    api.get(`/devices/${id}`),
  
  create: (data) => 
    api.post('/devices', data),
  
  update: (id, data) => 
    api.put(`/devices/${id}`, data),
  
  delete: (id) => 
    api.delete(`/devices/${id}`),
  
  check: (id) => 
    api.post(`/devices/${id}/check`),
  
  checkDevice: (id) => 
    api.post(`/devices/${id}/check`),
  
  getStats: () => 
    api.get('/devices/stats'),
};

// Alerts
export const alertsAPI = {
  getAll: (params = {}) => 
    api.get('/alerts', { params }),
  
  getRecent: () => 
    api.get('/alerts/recent'),
  
  getById: (id) => 
    api.get(`/alerts/${id}`),
  
  acknowledge: (id) => 
    api.put(`/alerts/${id}/acknowledge`),
  
  resolve: (id) => 
    api.put(`/alerts/${id}/resolve`),
  
  delete: (id) => 
    api.delete(`/alerts/${id}`),
  
  cleanup: (days = 30) => 
    api.delete('/alerts/cleanup', { params: { days } })
};

// Checks
export const checksAPI = {
  listByDevice: (deviceId) =>
    api.get(`/devices/${deviceId}/checks`),
  createForDevice: (deviceId, data) =>
    api.post(`/devices/${deviceId}/checks`, data),
  getById: (id) =>
    api.get(`/checks/${id}`),
  update: (id, data) =>
    api.put(`/checks/${id}`, data),
  delete: (id) =>
    api.delete(`/checks/${id}`),
  run: (id) =>
    api.post(`/checks/${id}/run`),
  results: (id, params = {}) =>
    api.get(`/checks/${id}/results`, { params }),
  history: (id, params = {}) =>
    api.get(`/checks/${id}/history`, { params }),
  stats: (id, params = {}) =>
    api.get(`/checks/${id}/stats`, { params }),
};

export default api;
