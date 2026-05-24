import axios from 'axios';

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api',
});

export const batchAPI = {
    getBatchById: (id: string) => api.get(`/batches/${id}`),
};

export const gameTypeAPI = {
    getByCompanyId: (companyId: string) => api.get(`/companies/${companyId}/game-types`),
};

export default api;
