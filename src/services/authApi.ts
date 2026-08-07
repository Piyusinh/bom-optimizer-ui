import axios from 'axios';
import type { LoginResponse, UserInfo } from '@/types/auth';

const client = axios.create({
  baseURL: '',
  headers: { 'Content-Type': 'application/json' },
});

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
