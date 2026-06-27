// Schlanker Client für den Relay-Motor. Alle Calls gehen über /api (Next-Proxy → :3000),
// daher same-origin und mit Session-Cookie.

export type ApiResponse<T = unknown> = {
  success: boolean;
  message?: string;
  data?: T;
};

export type User = {
  id: number;
  username: string;
  display_name?: string;
  role?: number;
  status?: number;
  email?: string;
  quota?: number;
  used_quota?: number;
  request_count?: number;
};

async function request<T>(path: string, init?: RequestInit): Promise<ApiResponse<T>> {
  const res = await fetch(`/api${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
    ...init,
  });
  try {
    return (await res.json()) as ApiResponse<T>;
  } catch {
    return { success: false, message: `HTTP ${res.status}` };
  }
}

export const api = {
  status: () => request<Record<string, unknown>>("/status"),
  self: () => request<User>("/user/self"),
  login: (username: string, password: string) =>
    request<User>("/user/login", { method: "POST", body: JSON.stringify({ username, password }) }),
  logout: () => request("/user/logout"),
};
