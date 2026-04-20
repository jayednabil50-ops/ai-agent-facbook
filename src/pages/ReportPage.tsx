import { useTranslation } from '@/lib/i18n';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { MessageSquare, TrendingUp, DollarSign, ShoppingBag, Download } from 'lucide-react';
import { useState } from 'react';
import { useOrders, useConversations, useMessageTrend, useOrderTrend } from '@/hooks/use-supabase-data';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid, Legend } from 'recharts';

const ReportPage = () => {
  const { t } = useTranslation();
  const [range, setRange] = useState('7');
  const days = Number(range);
  const { data: orders = [] } = useOrders();
  const { data: conversations = [] } = useConversations();
  const { data: messageTrend = [], isLoading: loadingMsg } = useMessageTrend(days);
  const { data: orderTrend = [], isLoading: loadingOrder } = useOrderTrend(days);

  const totalRevenue = orders.reduce((s, o) => s + o.amount, 0);
  const totalMessages = conversations.length;
  const totalOrders = orders.length;

  const kpis = [
    { label: t('report.totalMessages'), value: totalMessages.toLocaleString(), icon: MessageSquare, color: 'kpi-blue' },
    { label: t('orders.totalOrders'), value: totalOrders.toLocaleString(), icon: ShoppingBag, color: 'kpi-purple' },
    { label: t('report.totalRevenue'), value: `৳${totalRevenue.toLocaleString()}`, icon: DollarSign, color: 'kpi-emerald' },
    { label: t('orders.delivered'), value: orders.filter(o => o.status === 'Delivered').length.toLocaleString(), icon: TrendingUp, color: 'kpi-rose' },
  ];

  const colorMap: Record<string, { bg: string; text: string }> = {
    'kpi-blue': { bg: 'bg-kpi-blue-bg', text: 'text-kpi-blue' },
    'kpi-purple': { bg: 'bg-kpi-purple-bg', text: 'text-kpi-purple' },
    'kpi-emerald': { bg: 'bg-kpi-emerald-bg', text: 'text-kpi-emerald' },
    'kpi-rose': { bg: 'bg-kpi-rose-bg', text: 'text-kpi-rose' },
  };

  const handleExport = () => {
    const headers = ['Date', 'Incoming Messages', 'Outgoing Messages', 'Orders', 'Revenue'];
    const merged = messageTrend.map((mt, i) => {
      const ot = orderTrend[i] || { orders: 0, revenue: 0 };
      return [mt.date, mt.incoming, mt.outgoing, ot.orders, ot.revenue].join(',');
    });
    const csv = [headers.join(','), ...merged].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `report-${days}days-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">{t('report.title')}</h1>
          <p className="text-sm text-muted-foreground">{t('report.subtitle')}</p>
        </div>
        <div className="flex gap-2">
          <Select value={range} onValueChange={setRange}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="7">{t('report.last7')}</SelectItem>
              <SelectItem value="30">{t('report.last30')}</SelectItem>
              <SelectItem value="90">{t('report.last90')}</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={handleExport}><Download className="h-4 w-4 mr-1" /> {t('report.export')}</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {kpis.map(kpi => {
          const colors = colorMap[kpi.color];
          return (
            <Card key={kpi.label} className="border-0">
              <CardContent className="p-4">
                <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${colors.bg}`}>
                  <kpi.icon className={`h-5 w-5 ${colors.text}`} />
                </div>
                <p className="mt-3 text-2xl font-bold text-foreground">{kpi.value}</p>
                <p className="text-xs text-muted-foreground">{kpi.label}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">{t('report.messageTrend')}</CardTitle></CardHeader>
        <CardContent>
          {loadingMsg ? <Skeleton className="h-[300px] w-full" /> : (
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={messageTrend}>
                <defs>
                  <linearGradient id="rIncoming" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(271, 81%, 56%)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(271, 81%, 56%)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="rOutgoing" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(24, 95%, 53%)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(24, 95%, 53%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                <Area type="monotone" dataKey="incoming" name={t('home.incoming')} stroke="hsl(271, 81%, 56%)" fillOpacity={1} fill="url(#rIncoming)" />
                <Area type="monotone" dataKey="outgoing" name={t('home.outgoing')} stroke="hsl(24, 95%, 53%)" fillOpacity={1} fill="url(#rOutgoing)" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">{t('report.orderRevenueTrend')}</CardTitle></CardHeader>
        <CardContent>
          {loadingOrder ? <Skeleton className="h-[300px] w-full" /> : (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={orderTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
                <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
                <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                <Line yAxisId="left" type="monotone" dataKey="orders" name="Orders" stroke="hsl(217, 91%, 50%)" strokeWidth={2} dot={false} />
                <Line yAxisId="right" type="monotone" dataKey="revenue" name="Revenue (৳)" stroke="hsl(160, 84%, 32%)" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ReportPage;