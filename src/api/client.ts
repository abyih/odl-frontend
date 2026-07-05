import axios from 'axios';

const apiClient = axios.create({
  // In dev mode, Vite proxy forwards /rests and /restconf to the ODL controller
  // In production, set the full URL via VITE_ODL_API_URL
  baseURL: import.meta.env.PROD
    ? import.meta.env.VITE_ODL_API_URL
    : '',
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  auth: {
    username: import.meta.env.VITE_ODL_USERNAME || 'admin',
    password: import.meta.env.VITE_ODL_PASSWORD || 'admin',
  },
});

export const getPollingInterval = (): number => {
  return Number(import.meta.env.VITE_POLLING_INTERVAL) || 5000;
};

export default apiClient;
