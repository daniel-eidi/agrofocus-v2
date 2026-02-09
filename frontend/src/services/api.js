/**
 * Serviço de API do Frontend
 * Configuração do Axios para comunicação com backend
 */

import axios from 'axios';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:3001',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Interceptor para adicionar token de autenticação (se necessário)
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

// Interceptor para tratamento de erros
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Redirecionar para login se não autorizado
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;

// Serviços específicos para índices
export const indicesService = {
  /**
   * Lista todos os índices disponíveis
   */
  listar: () => api.get('/api/indices'),

  /**
   * Calcula NDVI para um talhão
   */
  calcularNDVI: (talhaoId, params) => 
    api.get(`/api/ndvi/${talhaoId}`, { params }),

  /**
   * Calcula NDRE para um talhão
   */
  calcularNDRE: (talhaoId, params) => 
    api.get(`/api/ndre/${talhaoId}`, { params }),

  /**
   * Calcula MSAVI para um talhão
   */
  calcularMSAVI: (talhaoId, params) => 
    api.get(`/api/msavi/${talhaoId}`, { params }),

  /**
   * Compara todos os índices
   */
  comparar: (talhaoId, params) => 
    api.get(`/api/comparar/${talhaoId}`, { params })
};
