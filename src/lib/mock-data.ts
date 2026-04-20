import type {
  DashboardSummary, Conversation, Order, AnalyticsSummary,
  TrendPoint, Distribution, UserProfile, TeamMember, Invoice,
  ErrorLogItem, Review, ConnectedPageInfo, NotificationSettings, Message
} from '@/types';

export const mockDashboard: DashboardSummary = {
  todayMessages: 142,
  activeConversations: 23,
  orders: 18,
  todayRevenue: 24500,
  aiName: 'ShopBot AI',
  aiActive: true,
  plan: 'Pro',
};

export const mockConversations: Conversation[] = [
  { id: '1', contactName: 'রহিম আহমেদ', facebookId: 'fb_1', lastMessage: 'আপনাদের পণ্যের দাম কত?', lastMessageTime: new Date(Date.now() - 300000).toISOString(), unreadCount: 2, isArchived: false, aiEnabled: true },
  { id: '2', contactName: 'করিম হোসেন', facebookId: 'fb_2', lastMessage: 'অর্ডারটি কবে পাবো?', lastMessageTime: new Date(Date.now() - 900000).toISOString(), unreadCount: 0, isArchived: false, aiEnabled: true },
  { id: '3', contactName: 'ফাতেমা বেগম', facebookId: 'fb_3', lastMessage: 'ধন্যবাদ!', lastMessageTime: new Date(Date.now() - 3600000).toISOString(), unreadCount: 1, isArchived: false, aiEnabled: false },
  { id: '4', contactName: 'সালমা খাতুন', facebookId: 'fb_4', lastMessage: 'ডেলিভারি চার্জ কত?', lastMessageTime: new Date(Date.now() - 7200000).toISOString(), unreadCount: 0, isArchived: true, aiEnabled: true },
];

export const mockMessages: Message[] = [
  { id: 'm1', conversationId: '1', content: 'আসসালামু আলাইকুম', sender: 'contact', timestamp: new Date(Date.now() - 600000).toISOString() },
  { id: 'm2', conversationId: '1', content: 'ওয়ালাইকুমুস সালাম! কিভাবে সাহায্য করতে পারি?', sender: 'ai', timestamp: new Date(Date.now() - 500000).toISOString() },
  { id: 'm3', conversationId: '1', content: 'আপনাদের পণ্যের দাম কত?', sender: 'contact', timestamp: new Date(Date.now() - 300000).toISOString() },
];

export const mockOrders: Order[] = [
  { id: 'ORD-001', date: '2026-04-08', customerName: 'রহিম আহমেদ', customerPhone: '01712345678', items: [{ name: 'Premium T-Shirt', quantity: 2, unitPrice: 850 }], amount: 1700, deliveryFee: 80, status: 'Delivered' },
  { id: 'ORD-002', date: '2026-04-07', customerName: 'করিম হোসেন', customerPhone: '01812345678', items: [{ name: 'Polo Shirt' }, { name: 'Cap' }], amount: 2200, deliveryFee: 100, status: 'Confirmed' },
  { id: 'ORD-003', date: '2026-04-07', customerName: 'ফাতেমা বেগম', customerPhone: '01912345678', items: [{ name: 'Saree' }], amount: 3500, status: 'Pending' },
  { id: 'ORD-004', date: '2026-04-06', customerName: 'সালমা খাতুন', customerPhone: '01612345678', items: [{ name: 'Kurti' }], amount: 1200, status: 'Cancelled' },
];

export const mockAnalytics: AnalyticsSummary = {
  totalMessages: 1842,
  incomingMessages: 1024,
  outgoingMessages: 818,
  avgResponseRate: 94.5,
  totalRevenue: 185000,
  avgDailyRevenue: 26430,
  customerSatisfaction: 92,
};

export const mockMessageTrend: TrendPoint[] = Array.from({ length: 7 }, (_, i) => ({
  date: new Date(Date.now() - (6 - i) * 86400000).toLocaleDateString('en-BD', { day: 'numeric', month: 'short' }),
  incoming: Math.floor(Math.random() * 50) + 30,
  outgoing: Math.floor(Math.random() * 40) + 20,
}));

export const mockOrderTrend: TrendPoint[] = Array.from({ length: 7 }, (_, i) => ({
  date: new Date(Date.now() - (6 - i) * 86400000).toLocaleDateString('en-BD', { day: 'numeric', month: 'short' }),
  orders: Math.floor(Math.random() * 15) + 5,
  revenue: Math.floor(Math.random() * 30000) + 10000,
}));

export const mockOrderStatusDist: Distribution[] = [
  { name: 'Pending', value: 8, color: 'hsl(38, 92%, 50%)' },
  { name: 'Confirmed', value: 12, color: 'hsl(217, 91%, 50%)' },
  { name: 'Delivered', value: 45, color: 'hsl(160, 84%, 32%)' },
  { name: 'Cancelled', value: 5, color: 'hsl(0, 84%, 60%)' },
];

export const mockProfile: UserProfile = {
  name: 'Neuton',
  email: 'neuton@example.com',
  phone: '+8801712345678',
};

export const mockTeam: TeamMember[] = [
  { id: 't1', name: 'Neuton', email: 'neuton@example.com', role: 'Admin' },
  { id: 't2', name: 'Rafi', email: 'rafi@example.com', role: 'Editor' },
];

export const mockInvoices: Invoice[] = [
  { id: 'INV-001', date: '2026-03-01', amount: 2990, status: 'Paid' },
  { id: 'INV-002', date: '2026-04-01', amount: 2990, status: 'Pending' },
];

export const mockErrorLogs: ErrorLogItem[] = [
  { id: 'e1', type: 'Error', message: 'Facebook API rate limit exceeded', timestamp: new Date(Date.now() - 300000).toISOString(), context: 'send_message', stack: 'at FacebookAPI.send (api.js:42)\nat MessageHandler.process (handler.js:15)' },
  { id: 'e2', type: 'Warning', message: 'Slow response from AI model', timestamp: new Date(Date.now() - 7200000).toISOString(), context: 'ai_reply' },
  { id: 'e3', type: 'Info', message: 'Webhook reconnected successfully', timestamp: new Date(Date.now() - 86400000).toISOString() },
];

export const mockReviews: Review[] = [
  { id: 'r1', customerName: 'রহিম', rating: 5, comment: 'অসাধারণ সেবা! দ্রুত ডেলিভারি।', date: '2026-04-05' },
  { id: 'r2', customerName: 'করিম', rating: 4, comment: 'ভালো পণ্য, তবে প্যাকেজিং আরো ভালো হতে পারত।', date: '2026-04-03' },
];

export const mockConnectPage: ConnectedPageInfo = {
  webhookUrl: 'https://n8n.example.com/webhook/fb-messages',
  status: 'connected',
  pageName: 'My Business Page',
  pageId: '123456789',
  connectedOn: '2026-03-15',
};

export const mockNotifications: NotificationSettings = {
  emailAlerts: true,
  errorAlerts: true,
  dailySummary: false,
};
