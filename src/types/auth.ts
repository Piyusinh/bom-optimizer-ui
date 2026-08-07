// ─── Auth Types ─────────────────────────────────────────────────────────────

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  user: UserInfo;
}

export interface UserInfo {
  id: string;
  email: string;
  full_name: string;
  role: string;
  role_label: string;
  allowed_pages: string[];
}
