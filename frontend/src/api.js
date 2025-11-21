import axios from 'axios';

// Create an axios instance with the base URL pre-configured
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL, 
});

export default api;