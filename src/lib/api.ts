import axios from 'axios';

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api',
});

export const batchAPI = {
    getBatchById: (id: number) => api.get(`/batches/${id}`),
    getBatchByCode: (batchCode: string) => api.get(`/batches/code/${encodeURIComponent(batchCode)}`),
};

export const gameTypeAPI = {
    getByCompanyId: (companyId: number) => api.get(`/companies/${companyId}/game-types`),
};

export default api;
