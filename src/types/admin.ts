// ─── Admin console types — Users, Roles, Pages/Menus (RBAC) ──────────────────

export interface AdminUser {
  id: string;
  email: string;
  username: string | null;
  full_name: string;
  role_id: string | null;
  role_name: string | null;
  role_label: string | null;
  is_super_admin: boolean;
  is_active: boolean;
  created_at: string | null;
  last_login_at: string | null;
}

export interface UserCreateInput {
  email: string;
  username?: string;
  full_name: string;
  password: string;
  role_id?: string | null;
  is_super_admin?: boolean;
  is_active?: boolean;
}

export interface UserUpdateInput {
  email?: string;
  username?: string;
  full_name?: string;
  role_id?: string | null;
  is_super_admin?: boolean;
  is_active?: boolean;
}

export interface RoleOption {
  id: string;
  name: string;
  label: string;
  description: string | null;
  is_system: boolean;
  user_count: number;
  page_ids: string[];
}

export interface RoleCreateInput {
  name: string;
  label: string;
  description?: string;
  page_ids?: string[];
}

export interface RoleUpdateInput {
  label?: string;
  description?: string;
  page_ids?: string[];
}

export interface PageNode {
  id: string;
  key: string;
  label: string;
  icon: string | null;
  parent_id: string | null;
  sort_order: number;
  is_menu: boolean;
  is_active: boolean;
  is_system: boolean;
}

export interface PageCreateInput {
  key: string;
  label: string;
  icon?: string;
  parent_id?: string | null;
  sort_order?: number;
  is_menu?: boolean;
}

export interface PageUpdateInput {
  key?: string;
  label?: string;
  icon?: string;
  parent_id?: string | null;
  sort_order?: number;
  is_menu?: boolean;
  is_active?: boolean;
}
