import { getApiConfig } from '../../../services/apiConfig'

export const baseURL =
  getApiConfig().baseUrl ||
  import.meta.env.VITE_API_BASE_URL ||
  'http://localhost:8000'
