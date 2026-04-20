import type {
  DashboardSummary, ConnectedPageInfo, Conversation, Message,
  Order, AnalyticsSummary, TrendPoint, Distribution, UserProfile,
  TeamMember, Invoice, NotificationSettings, Review, ErrorLogItem
} from '@/types';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options?.headers },
  });
  if (!res.ok) throw new Error(`API ${res.status}`);
  return res.json();
}

export const api = {
  getDashboard: () => apiFetch<DashboardSummary>('/dashboard/summary'),
  getConnectPage: () => apiFetch<ConnectedPageInfo>('/connect-page'),
  testConnection: () => apiFetch<{ success: boolean }>('/connect-page/test', { method: 'POST' }),
  changeToken: (token: string) => apiFetch<ConnectedPageInfo>('/connect-page/change-token', {
    method: 'POST', body: JSON.stringify({ token })
  }),
  getConversations: (params?: { status?: string; search?: string }) =>
    apiFetch<Conversation[]>(`/conversations?${new URLSearchParams(params as any)}`),
  getMessages: (id: string) => apiFetch<Message[]>(`/conversations/${id}/messages`),
  sendMessage: (id: string, content: string) =>
    apiFetch<Message>(`/conversations/${id}/send`, { method: 'POST', body: JSON.stringify({ content }) }),
  toggleAI: (id: string, enabled: boolean) =>
    apiFetch<void>(`/conversations/${id}/ai`, { method: 'PATCH', body: JSON.stringify({ enabled }) }),
  archiveConversation: (id: string, archive: boolean) =>
    apiFetch<void>(`/conversations/${id}/archive`, { method: 'PATCH', body: JSON.stringify({ archive }) }),
  getOrders: (params?: Record<string, string>) =>
    apiFetch<{ orders: Order[]; total: number }>(`/orders?${new URLSearchParams(params)}`),
  getAnalyticsSummary: (from: string, to: string) =>
    apiFetch<AnalyticsSummary>(`/analytics/summary?from=${from}&to=${to}`),
  getMessagesTrend: (from: string, to: string) =>
    apiFetch<TrendPoint[]>(`/analytics/messages-trend?from=${from}&to=${to}`),
  getOrdersTrend: (from: string, to: string) =>
    apiFetch<TrendPoint[]>(`/analytics/orders-trend?from=${from}&to=${to}`),
  getRevenueTrend: (from: string, to: string) =>
    apiFetch<TrendPoint[]>(`/analytics/revenue-trend?from=${from}&to=${to}`),
  getOrderStatusDist: (from: string, to: string) =>
    apiFetch<Distribution[]>(`/analytics/order-status-distribution?from=${from}&to=${to}`),
  getProfile: () => apiFetch<UserProfile>('/settings/profile'),
  putProfile: (data: Partial<UserProfile>) =>
    apiFetch<UserProfile>('/settings/profile', { method: 'PUT', body: JSON.stringify(data) }),
  getWebhook: () => apiFetch<{ messageWebhook: string; errorWebhook: string }>('/settings/webhook'),
  getBilling: () => apiFetch<{ plan: string; invoices: Invoice[] }>('/billing/summary'),
  getTeam: () => apiFetch<TeamMember[]>('/team/members'),
  inviteTeam: (email: string, role: string) =>
    apiFetch<TeamMember>('/team/invite', { method: 'POST', body: JSON.stringify({ email, role }) }),
  getNotifications: () => apiFetch<NotificationSettings>('/settings/notifications'),
  putNotifications: (data: NotificationSettings) =>
    apiFetch<NotificationSettings>('/settings/notifications', { method: 'PUT', body: JSON.stringify(data) }),
  getReviews: () => apiFetch<Review[]>('/reviews'),
};
