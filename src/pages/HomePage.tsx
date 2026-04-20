import { useNavigate } from 'react-router-dom';
import { useTranslation } from '@/lib/i18n';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import {
  MessageSquare, Users, ShoppingBag, DollarSign,
  TrendingUp, Bot, ArrowRight, BarChart2
} from 'lucide-react';
import { useDashboardSummary, useConversations, useMessageTrend, useOrderStatusDistribution } from '@/hooks/use-supabase-data';
import { useInboxRealtime } from '@/hooks/use-inbox-realtime';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

const container = { hidden: {}, show: { transition: { staggerChildren: 0.1 } } };
const item = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { duration: 0.4 } } };

const colorMap: Record<string, { bg: string; text: string }> = {
  'kpi-blue': { bg: 'bg-kpi-blue-bg', text: 'text-kpi-blue' },
  'kpi-purple': { bg: 'bg-kpi-purple-bg', text: 'text-kpi-purple' },
  'kpi-rose': { bg: 'bg-kpi-rose-bg', text: 'text-kpi-rose' },
  'kpi-emerald': { bg: 'bg-kpi-emerald-bg', text: 'text-kpi-emerald' },
};

const HomePage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  useInboxRealtime();
  const { data: dashboard, isLoading } = useDashboardSummary();
  const { data: conversations } = useConversations();
  const { data: messageTrend = [] } = useMessageTrend(7);
  const { data: orderStatusDist = [] } = useOrderStatusDistribution();

  const d = dashboard || { todayMessages: 0, activeConversations: 0, orders: 0, todayRevenue: 0, aiName: 'ShopBot AI', aiActive: true, plan: 'Pro' };

  const kpiCards = [
    { key: 'home.todayMessages', value: d.todayMessages, icon: MessageSquare, color: 'kpi-blue' },
    { key: 'home.activeConversations', value: d.activeConversations, icon: Users, color: 'kpi-purple' },
    { key: 'home.orders', value: d.orders, icon: ShoppingBag, color: 'kpi-rose' },
    { key: 'home.todayRevenue', value: d.todayRevenue, icon: DollarSign, color: 'kpi-emerald', currency: true },
  ];

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      {/* Hero */}
      <motion.div variants={item}>
        <Card className="overflow-hidden border-0 bg-gradient-to-r from-primary to-primary/80">
          <CardContent className="flex flex-col gap-4 p-6 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-primary-foreground">{t('home.welcome')}</h1>
              <p className="mt-1 text-primary-foreground/80">{t('home.subtitle')}</p>
              <span className="mt-2 inline-block rounded-full bg-primary-foreground/20 px-3 py-0.5 text-xs font-semibold text-primary-foreground">
                {d.plan}
              </span>
            </div>
            <div className="flex gap-3">
              <Button onClick={() => navigate('/inbox')} className="bg-primary-foreground text-primary hover:bg-primary-foreground/90">
                {t('home.openInbox')}
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* AI Status */}
      <motion.div variants={item}>
        <Card className="border-0 bg-foreground/[0.03] dark:bg-card">
          <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                <Bot className="h-5 w-5 text-primary" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-pulse-dot rounded-full bg-status-delivered opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-status-delivered" />
                  </span>
                  <span className="font-semibold text-foreground">{d.aiName}</span>
                  <span className="text-sm text-muted-foreground">{t('home.activelyResponding')}</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {d.todayMessages} {t('home.messagesHandled')} • {'< 2s'} {t('home.avgResponse')}
                </p>
              </div>
            </div>
            <Button variant="link" onClick={() => navigate('/ai-settings')} className="text-primary p-0">
              {t('home.manageAI')}
            </Button>
          </CardContent>
        </Card>
      </motion.div>

      {/* KPIs */}
      <motion.div variants={item} className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {isLoading ? Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="border-0"><CardContent className="p-4"><Skeleton className="h-20 w-full" /></CardContent></Card>
        )) : kpiCards.map(kpi => {
          const colors = colorMap[kpi.color];
          return (
            <Card key={kpi.key} className="border-0">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${colors.bg}`}>
                    <kpi.icon className={`h-5 w-5 ${colors.text}`} />
                  </div>
                </div>
                <p className="mt-3 text-2xl font-bold text-foreground">
                  {kpi.currency ? `৳${kpi.value.toLocaleString()}` : kpi.value}
                </p>
                <p className="text-xs text-muted-foreground">{t(kpi.key)}</p>
              </CardContent>
            </Card>
          );
        })}
      </motion.div>

      {/* Charts */}
      <motion.div variants={item} className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">{t('home.messageActivity')}</CardTitle>
              <span className="text-xs text-muted-foreground">{t('home.last7days')}</span>
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={messageTrend}>
                <defs>
                  <linearGradient id="colorIncoming" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(271, 81%, 56%)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(271, 81%, 56%)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorOutgoing" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(24, 95%, 53%)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(24, 95%, 53%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
                <YAxis hide />
                <Tooltip />
                <Area type="monotone" dataKey="incoming" stroke="hsl(271, 81%, 56%)" fillOpacity={1} fill="url(#colorIncoming)" />
                <Area type="monotone" dataKey="outgoing" stroke="hsl(24, 95%, 53%)" fillOpacity={1} fill="url(#colorOutgoing)" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">{t('home.orderStatus')}</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={orderStatusDist} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" paddingAngle={4}>
                  {orderStatusDist.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Legend iconType="circle" iconSize={8} />
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </motion.div>

      {/* AI Performance */}
      <motion.div variants={item}>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">{t('home.aiPerformance')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-muted-foreground">{t('home.responseRate')}</span>
                <span className="font-medium text-foreground">{d.aiActive ? 'Active' : 'Inactive'}</span>
              </div>
              <Progress value={d.aiActive ? 100 : 0} className="h-2" />
            </div>
            <div className="grid grid-cols-3 gap-4 pt-2">
              {[
                { label: t('home.handled'), value: String(d.todayMessages) },
                { label: t('home.avgTime'), value: '< 2s' },
                { label: t('home.uptime'), value: '24/7' },
              ].map(s => (
                <div key={s.label} className="text-center rounded-lg bg-muted/50 p-3">
                  <p className="text-lg font-bold text-foreground">{s.value}</p>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Recent Conversations */}
      <motion.div variants={item}>
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">{t('home.recentConversations')}</CardTitle>
              <Button variant="link" onClick={() => navigate('/inbox')} className="text-primary p-0 text-xs">
                {t('home.viewAll')}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {(conversations || []).slice(0, 4).map(conv => (
              <button
                key={conv.id}
                onClick={() => navigate('/inbox')}
                className="flex w-full items-center gap-3 rounded-lg p-2 hover:bg-muted/50 transition-colors"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                  {conv.contactName.charAt(0)}
                </div>
                <div className="flex-1 text-left overflow-hidden">
                  <p className="text-sm font-medium text-foreground truncate">{conv.contactName}</p>
                  <p className="text-xs text-muted-foreground truncate">{conv.lastMessage}</p>
                </div>
                {conv.unreadCount > 0 && (
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                    {conv.unreadCount}
                  </span>
                )}
              </button>
            ))}
            {(!conversations || conversations.length === 0) && (
              <p className="text-sm text-muted-foreground text-center py-4">No conversations yet</p>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Quick Actions */}
      <motion.div variants={item}>
        <h3 className="mb-3 text-sm font-medium text-foreground">{t('home.quickActions')}</h3>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[
            { label: t('nav.aiSettings'), desc: t('home.aiSettingsDesc'), icon: Bot, path: '/ai-settings' },
            { label: t('nav.inbox'), desc: t('home.inboxDesc'), icon: MessageSquare, path: '/inbox' },
            { label: t('nav.orders'), desc: t('home.ordersDesc'), icon: ShoppingBag, path: '/orders' },
            { label: t('home.reports'), desc: t('home.reportsDesc'), icon: BarChart2, path: '/report' },
          ].map(action => (
            <Card
              key={action.path}
              className="cursor-pointer hover:border-primary/30 transition-colors"
              onClick={() => navigate(action.path)}
            >
              <CardContent className="flex items-center gap-3 p-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <action.icon className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 overflow-hidden">
                  <p className="text-sm font-medium text-foreground">{action.label}</p>
                  <p className="text-xs text-muted-foreground truncate">{action.desc}</p>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
              </CardContent>
            </Card>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
};

export default HomePage;