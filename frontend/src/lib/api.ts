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
  org_id?: number;
};

export type Organization = {
  id: number;
  name: string;
  status: number;
  created_time: number;
  user_count?: number;
};

// 401-Handler: wird vom AuthProvider registriert. Greift nur bei aktiver Session
// (sonst würde die öffentliche Landing, deren self()-Check 401 liefert, fälschlich ausloggen).
let onUnauthorized: (() => void) | null = null;
export function setUnauthorizedHandler(fn: (() => void) | null) {
  onUnauthorized = fn;
}

async function request<T>(path: string, init?: RequestInit): Promise<ApiResponse<T>> {
  const res = await fetch(`/api${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
    ...init,
  });
  if (res.status === 401) {
    onUnauthorized?.();
  }
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
  username?: string;
  model_name: string;
  prompt_tokens: number;
  completion_tokens: number;
  quota: number;
  content: string;
};

export type Redemption = {
  id: number;
  key: string;
  name: string;
  status: number;
  quota: number;
  created_time: number;
};

export type Agent = {
  id: number;
  name: string;
  org_id: number;
  owner_user_id: number;
  status: number;
  allowed_tools: string;
  allowed_models: string;
  confirm_tools: string;
  rate_limit_per_min: number;
  created_time: number;
  last_used_time: number;
};

export type PendingAction = {
  id: number;
  agent_id: number;
  org_id: number;
  tool: string;
  input: string;
  status: string;
  created_at: number;
  decided_at: number;
  decided_by: number;
};

export type Budget = {
  id: number;
  name: string;
  scope: string;
  ref: string;
  amount_micro_eur: number;
  used_micro_eur: number;
  period: string;
  on_exhaust: string;
  reset_at: number;
  valid_until: number;
  status: number;
};

export type CostEntry = {
  id: number;
  created_at: number;
  cost_source: string;
  model: string;
  prompt_tokens: number;
  completion_tokens: number;
  request_ms: number;
  cost_micro_eur: number;
};

export type CostSummary = {
  external_micro_eur: number;
  self_hosted_micro_eur: number;
  total_micro_eur: number;
  recent: CostEntry[];
};

export type Channel = {
  id: number;
  name: string;
  type: number;
  status: number;
  models: string;
  response_time: number;
  cost_source?: string;
};

export type SelfHostedProfile = {
  power_draw_kw: number;
  electricity_eur_per_kwh: number;
  hardware_capex_eur: number;
  hardware_lifetime_hours: number;
  maintenance_eur_per_month: number;
  throughput_ktokens_per_hour: number;
};

export const api = {
  status: () => request<Record<string, unknown>>("/status"),
  statusInfo: () =>
    request<{
      oidc?: boolean;
      oidc_client_id?: string;
      oidc_authorization_endpoint?: string;
    }>("/status"),
  oauthState: () => request<string>("/oauth/state"),
  oidcCallback: (code: string, state: string) =>
    request<User>(`/oauth/oidc?code=${encodeURIComponent(code)}&state=${encodeURIComponent(state)}`),
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
  organizations: () => request<Organization[]>("/organization?p=0"),
  createOrganization: (name: string) =>
    request("/organization", { method: "POST", body: JSON.stringify({ name }) }),
  deleteOrganization: (id: number) => request(`/organization/${id}`, { method: "DELETE" }),
  assignUserToOrg: (username: string, org_id: number) =>
    request("/organization/assign", { method: "POST", body: JSON.stringify({ username, org_id }) }),
  costSummary: (days = 30) => request<CostSummary>(`/cost/summary?days=${days}`),
  agents: () => request<Agent[]>("/agent?p=0"),
  createAgent: (body: { name: string; owner_user_id?: number; allowed_tools: string; allowed_models: string; confirm_tools: string; rate_limit_per_min: number }) =>
    request<{ id: number; key: string }>("/agent", { method: "POST", body: JSON.stringify(body) }),
  updateAgent: (body: Partial<Agent> & { id: number }) =>
    request("/agent", { method: "PUT", body: JSON.stringify(body) }),
  deleteAgent: (id: number) => request(`/agent/${id}`, { method: "DELETE" }),
  pendingAgentActions: () => request<PendingAction[]>("/agent/pending?p=0"),
  approveAgentAction: (action_id: number, approve: boolean) =>
    request("/agent/approve", { method: "POST", body: JSON.stringify({ action_id, approve }) }),
  budgets: () => request<Budget[]>("/budget?p=0"),
  createBudget: (body: { name: string; scope: string; ref: string; amount_micro_eur: number; period: string; on_exhaust: string }) =>
    request("/budget", { method: "POST", body: JSON.stringify(body) }),
  resetBudget: (id: number) => request(`/budget/${id}/reset`, { method: "POST" }),
  deleteBudget: (id: number) => request(`/budget/${id}`, { method: "DELETE" }),
  totpSetup: () => request<{ secret: string; uri: string }>("/user/totp/setup"),
  totpEnable: (code: string) =>
    request<{ backup_codes: string[] }>("/user/totp/enable", { method: "POST", body: JSON.stringify({ code }) }),
  totpDisable: (code: string) =>
    request("/user/totp/disable", { method: "POST", body: JSON.stringify({ code }) }),
  tokens: () => request<Token[]>("/token?p=0"),
  createToken: (opts: { name: string; remain_quota?: number; expired_time?: number; unlimited_quota?: boolean }) =>
    request<{ key: string }>("/token", {
      method: "POST",
      body: JSON.stringify({
        name: opts.name,
        remain_quota: opts.remain_quota ?? 500000,
        expired_time: opts.expired_time ?? -1,
        unlimited_quota: opts.unlimited_quota ?? false,
      }),
    }),
  deleteToken: (id: number) => request(`/token/${id}`, { method: "DELETE" }),
  logsSelf: () => request<LogEntry[]>("/log/self?p=0"),
  logsAll: () => request<LogEntry[]>("/log?p=0"),
  channels: () => request<Channel[]>("/channel?p=0"),
  testChannel: (id: number) => request<{ time?: number }>(`/channel/test/${id}`),
  createChannel: (body: {
    name: string;
    type: number;
    key: string;
    base_url: string;
    models: string;
    cost_source?: string;
  } & Partial<SelfHostedProfile>) =>
    request("/channel", {
      method: "POST",
      body: JSON.stringify({ ...body, groups: ["default"], group: "default" }),
    }),
  deleteChannel: (id: number) => request(`/channel/${id}`, { method: "DELETE" }),
  securityStatus: () => request<{ root_password_is_default: boolean }>("/security_status", { cache: "no-store" }),
  license: () =>
    request<{
      tier: string;
      customer: string;
      max_orgs: number;
      max_seats: number;
      max_nodes: number;
      features: string[];
      valid_until: string;
      valid: boolean;
      commercial: boolean;
    }>("/license"),
  options: () => request<{ key: string; value: string }[]>("/option"),
  oidcDiscover: (url: string) =>
    request<{
      issuer: string;
      authorization_endpoint: string;
      token_endpoint: string;
      userinfo_endpoint: string;
      well_known: string;
    }>(`/oidc/discovery?url=${encodeURIComponent(url)}`),
  updateOption: (key: string, value: string) =>
    request("/option", { method: "PUT", body: JSON.stringify({ key, value }) }),
  redemptions: () => request<Redemption[]>("/redemption?p=0"),
  createRedemptions: (name: string, quota: number, count: number) =>
    request("/redemption", { method: "POST", body: JSON.stringify({ name, quota, count }) }),
  deleteRedemption: (id: number) => request(`/redemption/${id}`, { method: "DELETE" }),
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
