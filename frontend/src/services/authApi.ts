const API_BASE = import.meta.env.VITE_API_BASE_URL || "";
const AUTH_BASE = `${API_BASE}/api/auth`;

export interface AuthUser {
  id: string;
  email: string;
  username: string;
  role: string;
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  token_type: string;
  user: AuthUser;
}

export async function apiRegister(
  email: string,
  username: string,
  password: string,
): Promise<AuthTokens> {
  const res = await fetch(`${AUTH_BASE}/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, username, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "Registration failed");
  return data;
}

export async function apiLogin(
  email: string,
  password: string,
): Promise<AuthTokens> {
  const res = await fetch(`${AUTH_BASE}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "Login failed");
  return data;
}

export async function apiRefresh(
  refreshToken: string,
): Promise<AuthTokens> {
  const res = await fetch(`${AUTH_BASE}/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "Token refresh failed");
  return data;
}

export async function apiGetMe(
  accessToken: string,
): Promise<AuthUser> {
  const res = await fetch(`${AUTH_BASE}/me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "Unauthorized");
  return data;
}
