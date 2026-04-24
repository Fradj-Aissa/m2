/**
 * SmartRentDZ API Configuration
 * Centralized configuration for all API endpoints and settings
 */

export const API_CONFIG = {
  /**
   * Base URL for backend API
   * Uses VITE_API_URL environment variable
   * Falls back to localhost for development
   */
  BASE_URL: (import.meta.env.VITE_API_URL || 'http://localhost:3000/api').replace(/\/+$/, ''),

  /**
   * Production backends (Render)
   */
  RENDER_BACKEND: 'https://m2-3.onrender.com/api',

  /**
   * Timeout for API requests (milliseconds)
   */
  TIMEOUT: 30000,

  /**
   * Axios default config
   */
  AXIOS_CONFIG: {
    // Enable sending cookies and auth headers
    withCredentials: true,

    // Headers configuration
    headers: {
      'Content-Type': 'application/json',
    },

    // Request timeout
    timeout: 30000,
  },

  /**
   * Endpoints
   */
  ENDPOINTS: {
    AUTH: {
      LOGIN: '/auth/login',
      REGISTER: '/auth/register',
      LOGOUT: '/auth/logout',
      REFRESH: '/auth/refresh',
      VERIFY: '/auth/verify',
    },
    APARTMENTS: {
      LIST: '/apartments',
      DETAIL: (id: string) => `/apartments/${id}`,
      CREATE: '/apartments',
      UPDATE: (id: string) => `/apartments/${id}`,
      DELETE: (id: string) => `/apartments/${id}`,
      SEARCH: '/apartments/search',
    },
    USERS: {
      PROFILE: '/users/profile',
      UPDATE: '/users/profile',
      AVATAR: '/users/avatar',
    },
    FAVORITES: {
      LIST: '/favorites',
      ADD: '/favorites',
      REMOVE: (id: string) => `/favorites/${id}`,
    },
    SUBSCRIPTIONS: {
      LIST: '/subscriptions',
      REQUEST: '/subscriptions/request',
      CANCEL: (id: string) => `/subscriptions/${id}`,
    },
  },

  /**
   * Error messages
   */
  ERRORS: {
    NETWORK: 'خطأ في الاتصال. يرجى التحقق من الشبكة.',
    TIMEOUT: 'انتهت مهلة الانتظار. يرجى المحاولة لاحقاً.',
    UNAUTHORIZED: 'جلستك انتهت. يرجى تسجيل الدخول من جديد.',
    FORBIDDEN: 'ليس لديك صلاحية لتنفيذ هذه العملية.',
    NOT_FOUND: 'الموارد المطلوبة غير موجودة.',
    SERVER_ERROR: 'حدث خطأ في الخادم. يرجى المحاولة لاحقاً.',
  },
};

export default API_CONFIG;
