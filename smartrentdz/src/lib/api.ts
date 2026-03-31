/**
 * API Configuration for Backend Endpoints
 * Uses Axios with JWT token interceptor
 * Replaces Firebase/Firestore with Express.js PostgreSQL API
 */

import axios, { AxiosInstance } from 'axios';

export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

/**
 * Create axios instance with JWT interceptor
 */
const axiosInstance: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Request interceptor: Attach JWT token to Authorization header
 */
axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

/**
 * Response interceptor: Handle errors
 */
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid - clear localStorage and redirect
      localStorage.removeItem('token');
      localStorage.removeItem('userData');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

/**
 * Generic API call wrapper with error handling
 */
export async function apiCall<T>(
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  endpoint: string,
  data?: unknown
): Promise<T> {
  try {
    const response = await axiosInstance({
      method,
      url: endpoint,
      data,
    });
    return response.data as T;
  } catch (error: any) {
    const errorMessage = error.response?.data?.error || error.message || 'API Error';
    console.error(`API Error [${method} ${endpoint}]:`, errorMessage);
    throw new Error(errorMessage);
  }
}

/**
 * GET request
 */
export function apiGet<T>(endpoint: string): Promise<T> {
  return apiCall<T>('GET', endpoint);
}

/**
 * POST request
 */
export function apiPost<T>(endpoint: string, data: unknown): Promise<T> {
  return apiCall<T>('POST', endpoint, data);
}

/**
 * PUT request
 */
export function apiPut<T>(endpoint: string, data: unknown): Promise<T> {
  return apiCall<T>('PUT', endpoint, data);
}

/**
 * PATCH request
 */
export function apiPatch<T>(endpoint: string, data: unknown): Promise<T> {
  return apiCall<T>('PATCH', endpoint, data);
}

/**
 * DELETE request
 */
export function apiDelete<T>(endpoint: string): Promise<T> {
  return apiCall<T>('DELETE', endpoint);
}
