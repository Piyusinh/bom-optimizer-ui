import axios from 'axios';
import type { LoginResponse, UserInfo } from '@/types/auth';

const TOKEN_KEY = 'bom_access_token';

const client = axios.create({
  baseURL: '',
  headers: { 'Content-Type': 'application/json' },
});

client.interceptors.request.use((config) => {
  const token = sessionStorage.getItem(TOKEN_KEY) || localStorage.getItem(TOKEN_KEY);
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

client.interceptors.response.use(
  (response) => response,
  (error) => {
    if (!error.response) {
      return Promise.reject(new Error('Unable to reach the server. Please check your network connection.'));
    }
    const data = error.response.data;
    const detail = data?.detail;
    const errors = data?.errors;
    let message = 'Something went wrong. Please try again.';
    if (Array.isArray(errors) && errors.length > 0) {
      message = errors.join('; ');
    } else if (typeof detail === 'string') {
      message = detail;
    }
    return Promise.reject(new Error(message));
  },
);

export async function loginApi(email: string, password: string): Promise<LoginResponse> {
  const { data } = await client.post<LoginResponse>('/api/auth/login', { email, password });
  return data;
}

export async function fetchUserInfo(token: string): Promise<UserInfo> {
  const { data } = await client.get<UserInfo>('/api/auth/me', {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data;
}

export async function refreshApi(): Promise<LoginResponse> {
  const { data } = await client.post<LoginResponse>('/api/auth/refresh');
  return data;
}

export async function logoutApi(): Promise<void> {
  await client.post('/api/auth/logout');
}
