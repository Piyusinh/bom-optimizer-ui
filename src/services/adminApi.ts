import axios from 'axios';
import { toast } from 'react-hot-toast';
import type {
  AdminUser,
  UserCreateInput,
  UserUpdateInput,
  RoleOption,
  RoleCreateInput,
  RoleUpdateInput,
  PageNode,
  PageCreateInput,
  PageUpdateInput,
} from '@/types/admin';
import { broadcastAuthError } from '@/contexts/UserContext';

const TOKEN_KEY = 'bom_access_token';

const client = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '',
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
      const message = 'Unable to reach the server. Please check your network connection.';
      toast.error(message);
      return Promise.reject(new Error(message));
    }
    const status = error.response.status;
    const data = error.response.data;
    const detail = data?.detail;
    const errors = data?.errors;
    let message = 'Something went wrong. Please try again.';
    if (Array.isArray(errors) && errors.length > 0) {
      message = errors.join('; ');
    } else if (typeof detail === 'string') {
      message = detail;
    }
    if (status === 401) {
      broadcastAuthError();
    } else {
      toast.error(message);
    }
    return Promise.reject(new Error(message));
  },
);

// ─── Users ────────────────────────────────────────────────────────────────────

export async function listUsers(q?: string): Promise<AdminUser[]> {
  const { data } = await client.get<AdminUser[]>('/api/admin/users', { params: q ? { q } : {} });
  return data;
}

export async function createUser(payload: UserCreateInput): Promise<AdminUser> {
  const { data } = await client.post<AdminUser>('/api/admin/users', payload);
  return data;
}

export async function updateUser(id: string, payload: UserUpdateInput): Promise<AdminUser> {
  const { data } = await client.put<AdminUser>(`/api/admin/users/${id}`, payload);
  return data;
}

export async function deleteUser(id: string): Promise<void> {
  await client.delete(`/api/admin/users/${id}`);
}

export async function resetUserPassword(id: string, newPassword: string): Promise<void> {
  await client.post(`/api/admin/users/${id}/reset-password`, { new_password: newPassword });
}

// ─── Roles ────────────────────────────────────────────────────────────────────

export async function listRoles(): Promise<RoleOption[]> {
  const { data } = await client.get<RoleOption[]>('/api/admin/roles');
  return data;
}

export async function createRole(payload: RoleCreateInput): Promise<RoleOption> {
  const { data } = await client.post<RoleOption>('/api/admin/roles', payload);
  return data;
}

export async function updateRole(id: string, payload: RoleUpdateInput): Promise<RoleOption> {
  const { data } = await client.put<RoleOption>(`/api/admin/roles/${id}`, payload);
  return data;
}

export async function deleteRole(id: string): Promise<void> {
  await client.delete(`/api/admin/roles/${id}`);
}

// ─── Pages / Menus ──────────────────────────────────────────────────────────────

export async function listPages(): Promise<PageNode[]> {
  const { data } = await client.get<PageNode[]>('/api/admin/pages');
  return data;
}

export async function createPage(payload: PageCreateInput): Promise<PageNode> {
  const { data } = await client.post<PageNode>('/api/admin/pages', payload);
  return data;
}

export async function updatePage(id: string, payload: PageUpdateInput): Promise<PageNode> {
  const { data } = await client.put<PageNode>(`/api/admin/pages/${id}`, payload);
  return data;
}

export async function deletePage(id: string): Promise<void> {
  await client.delete(`/api/admin/pages/${id}`);
}
