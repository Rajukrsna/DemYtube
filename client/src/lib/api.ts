import { queryClient } from "./queryClient";

// API base URL - uses environment variable in production, empty string in development (uses proxy)
const API_BASE_URL = import.meta.env.VITE_API_URL || '';

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  meta?: {
    total: number;
    timestamp: string;
  };
}

export interface ApiError {
  success: false;
  message: string;
  errors?: any[];
}

// Global auth token getter (will be set by App.tsx)
let getAuthToken: (() => Promise<string | null>) | null = null;

export const setAuthTokenGetter = (getter: () => Promise<string | null>) => {
  getAuthToken = getter;
};

// Authenticated fetch wrapper that automatically adds auth headers
export const authFetch = async (url: string, options: RequestInit = {}): Promise<Response> => {
  const token = getAuthToken ? await getAuthToken() : null;
  
  // Prepend API base URL if url starts with /api
  const fullUrl = url.startsWith('/api') ? `${API_BASE_URL}${url}` : url;
  
  const headers = new Headers(options.headers);
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  if (!headers.has('Content-Type') && options.body) {
    headers.set('Content-Type', 'application/json');
  }
  
  return fetch(fullUrl, {
    ...options,
    headers,
    credentials: 'include',
  });
};

export async function fetchFromApi<T>(url: string, options: RequestInit = {}): Promise<T> {
  const response = await authFetch(url, options);
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: response.statusText }));
    throw new Error(error.message || `HTTP ${response.status}: ${response.statusText}`);
  }
  
  return response.json();
}

export const invalidateQueries = (queryKey: string[]) => {
  queryClient.invalidateQueries({ queryKey });
};
