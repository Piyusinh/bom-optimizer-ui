// ─── Auth Types ─────────────────────────────────────────────────────────────

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  expires_at: string;
  user: UserInfo;
}

export interface MenuNode {
  id: string;
  key: string;
  label: string;
  icon: string | null;
  sort_order: number;
  children: MenuNode[];
}

export interface UserInfo {
  id: string;
  email: string;
  full_name: string;
  role: string;
  role_label: string;
  is_super_admin: boolean;
  allowed_pages: string[];
  menu: MenuNode[];
}
