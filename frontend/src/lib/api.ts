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
  totp_enabled?: boolean;
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

export type Token = {
  id: number;
  name: string;
  status: number;
  used_quota: number;
  remain_quota: number;
  unlimited_quota: boolean;
  created_time: number;
  expired_time: number;
};

export type LogEntry = {
  id: number;
  created_at: number;
  type: number;
  model_name: string;
  prompt_tokens: number;
  completion_tokens: number;
  quota: number;
  content: string;
};

export type Channel = {
  id: number;
  name: string;
  type: number;
  status: number;
  models: string;
  response_time: number;
};

export const api = {
  status: () => request<Record<string, unknown>>("/status"),
  self: () => request<User>("/user/self"),
  login: (username: string, password: string, totpCode?: string) =>
    request<User & { totp_required?: boolean }>("/user/login", {
      method: "POST",
      body: JSON.stringify({ username, password, totp_code: totpCode || "" }),
    }),
  logout: () => request("/user/logout"),
  users: () => request<User[]>("/user?p=0"),
  createUser: (username: string, password: string) =>
    request("/user", { method: "POST", body: JSON.stringify({ username, password }) }),
  manageUser: (username: string, action: "enable" | "disable" | "promote" | "demote" | "delete") =>
    request("/user/manage", { method: "POST", body: JSON.stringify({ username, action }) }),
  totpSetup: () => request<{ secret: string; uri: string }>("/user/totp/setup"),
  totpEnable: (code: string) =>
    request<{ backup_codes: string[] }>("/user/totp/enable", { method: "POST", body: JSON.stringify({ code }) }),
  totpDisable: (code: string) =>
    request("/user/totp/disable", { method: "POST", body: JSON.stringify({ code }) }),
  tokens: () => request<Token[]>("/token?p=0"),
  createToken: (name: string) =>
    request("/token", {
      method: "POST",
      body: JSON.stringify({ name, remain_quota: 500000, expired_time: -1, unlimited_quota: false }),
    }),
  deleteToken: (id: number) => request(`/token/${id}`, { method: "DELETE" }),
  logsSelf: () => request<LogEntry[]>("/log/self?p=0"),
  channels: () => request<Channel[]>("/channel?p=0"),
  createChannel: (body: { name: string; type: number; key: string; base_url: string; models: string }) =>
    request("/channel", {
      method: "POST",
      body: JSON.stringify({ ...body, groups: ["default"], group: "default" }),
    }),
  deleteChannel: (id: number) => request(`/channel/${id}`, { method: "DELETE" }),
};

// ── Formatierungs-Helfer ─────────────────────────────────────────────
export function formatNumber(n: number | undefined, lng?: string): string {
  if (n == null) return "0";
  return new Intl.NumberFormat(lng, { notation: "compact", maximumFractionDigits: 1 }).format(n);
}

export function formatDate(epochSeconds: number | undefined, lng?: string): string {
  if (!epochSeconds) return "—";
  return new Intl.DateTimeFormat(lng, { dateStyle: "medium", timeStyle: "short" }).format(
    new Date(epochSeconds * 1000),
  );
}
