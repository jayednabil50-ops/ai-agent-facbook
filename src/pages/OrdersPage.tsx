import { useState } from 'react';
import { useTranslation } from '@/lib/i18n';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ShoppingBag, DollarSign, Clock, Truck, Search, RefreshCw, Download, FileText, X } from 'lucide-react';
import { useOrders } from '@/hooks/use-supabase-data';
import { useQueryClient } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import type { Order } from '@/types';

const statusColors: Record<string, string> = {
  Pending: 'bg-status-pending/10 text-status-pending border-status-pending/30',
  Confirmed: 'bg-status-confirmed/10 text-status-confirmed border-status-confirmed/30',
  Delivered: 'bg-status-delivered/10 text-status-delivered border-status-delivered/30',
  Cancelled: 'bg-status-cancelled/10 text-status-cancelled border-status-cancelled/30',
};

const OrdersPage = () => {
  const { t } = useTranslation();
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const { data: orders = [], isLoading, isError, error } = useOrders();
  const queryClient = useQueryClient();

  const filtered = orders.filter(o => {
    if (statusFilter !== 'all' && o.status !== statusFilter) return false;
    if (search) {
      const s = search.toLowerCase();
      return o.customerName.toLowerCase().includes(s) || o.customerPhone.includes(s) || o.id.toLowerCase().includes(s);
    }
    return true;
  });

  const totalRevenue = orders.reduce((s, o) => s + o.amount, 0);
  const pending = orders.filter(o => o.status === 'Pending').length;
  const delivered = orders.filter(o => o.status === 'Delivered').length;

  const colorMap: Record<string, { bg: string; text: string }> = {
    'kpi-blue': { bg: 'bg-kpi-blue-bg', text: 'text-kpi-blue' },
    'kpi-emerald': { bg: 'bg-kpi-emerald-bg', text: 'text-kpi-emerald' },
    'kpi-rose': { bg: 'bg-kpi-rose-bg', text: 'text-kpi-rose' },
    'kpi-purple': { bg: 'bg-kpi-purple-bg', text: 'text-kpi-purple' },
  };

  const kpis = [
    { label: t('orders.totalOrders'), value: orders.length, icon: ShoppingBag, color: 'kpi-blue' },
    { label: t('orders.totalRevenue'), value: `৳${totalRevenue.toLocaleString()}`, icon: DollarSign, color: 'kpi-emerald' },
    { label: t('orders.pending'), value: pending, icon: Clock, color: 'kpi-rose' },
    { label: t('orders.deliveredToday'), value: delivered, icon: Truck, color: 'kpi-purple' },
  ];

  const printInvoice = (order: Order) => {
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(`<html><head><title>Invoice ${order.id}</title><style>body{font-family:Inter,sans-serif;padding:40px;color:#1a1a2e}table{width:100%;border-collapse:collapse;margin:20px 0}th,td{border:1px solid #ddd;padding:8px;text-align:left}.total{font-size:1.2em;font-weight:bold}</style></head><body>
      <h1>Invoice</h1><p>Order: ${order.id}</p><p>Date: ${order.date}</p><p>Customer: ${order.customerName}</p><p>Phone: ${order.customerPhone}</p>
      <table><tr><th>Item</th><th>Amount</th></tr>${order.items.map(i => `<tr><td>${i.name}</td><td>৳${i.unitPrice || '-'}</td></tr>`).join('')}
      ${order.deliveryFee ? `<tr><td>Delivery Fee</td><td>৳${order.deliveryFee}</td></tr>` : ''}
      <tr><td class="total">Total</td><td class="total">৳${order.amount.toLocaleString()}</td></tr></table>
      <p>Status: ${order.status}</p></body></html>`);
    w.document.close();
    w.print();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold text-foreground">{t('orders.title')}</h1>
          <Badge variant="secondary">{orders.length}</Badge>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => queryClient.invalidateQueries({ queryKey: ['orders'] })}><RefreshCw className="h-4 w-4 mr-1" /> Refresh</Button>
          <Button variant="outline" size="sm" onClick={() => {
            if (!filtered.length) return;
            const headers = ['Order ID','Date','Customer','Phone','Address','Items','SKU','Size','Amount','Status'];
            const csvRows = [headers.join(','), ...filtered.map(o =>
              [o.id, o.date, o.customerName, o.customerPhone, `"${o.address || ''}"`, o.items.map(i=>i.name).join('; '), o.sku||'', o.productSize||'', o.amount, o.status].join(',')
            )];
            const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a'); a.href = url; a.download = `orders-${new Date().toISOString().split('T')[0]}.csv`; a.click();
            URL.revokeObjectURL(url);
          }}><Download className="h-4 w-4 mr-1" /> {t('orders.export')}</Button>
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
                <p className="mt-3 text-2xl font-bold text-foreground">{isLoading ? <Skeleton className="h-8 w-16" /> : kpi.value}</p>
                <p className="text-xs text-muted-foreground">{kpi.label}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('orders.allOrders')}</SelectItem>
            <SelectItem value="Pending">{t('orders.pending')}</SelectItem>
            <SelectItem value="Confirmed">{t('orders.confirmed')}</SelectItem>
            <SelectItem value="Delivered">{t('orders.delivered')}</SelectItem>
            <SelectItem value="Cancelled">{t('orders.cancelled')}</SelectItem>
          </SelectContent>
        </Select>
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder={t('orders.searchPlaceholder')} className="pl-9" />
        </div>
        {(statusFilter !== 'all' || search) && (
          <Button variant="ghost" size="sm" onClick={() => { setStatusFilter('all'); setSearch(''); }}>
            <X className="h-4 w-4 mr-1" /> Clear
          </Button>
        )}
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('orders.orderId')}</TableHead>
              <TableHead>{t('orders.date')}</TableHead>
              <TableHead>{t('orders.customer')}</TableHead>
              <TableHead>Address</TableHead>
              <TableHead>{t('orders.items')}</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead>Size</TableHead>
              <TableHead>{t('orders.amount')}</TableHead>
              <TableHead>{t('orders.statusLabel')}</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? Array.from({ length: 3 }).map((_, i) => (
              <TableRow key={i}>{Array.from({ length: 10 }).map((_, j) => <TableCell key={j}><Skeleton className="h-5 w-full" /></TableCell>)}</TableRow>
            )) : isError ? (
              <TableRow><TableCell colSpan={10} className="text-center py-8 text-destructive">⚠️ Google Sheet থেকে data আনতে সমস্যা হয়েছে: {(error as Error)?.message || 'Unknown error'}</TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={10} className="text-center py-8 text-muted-foreground">{search || statusFilter !== 'all' ? 'কোন order পাওয়া যায়নি' : 'এখনো কোন order নেই'}</TableCell></TableRow>
            ) : filtered.map(order => (
              <TableRow key={order.id} className="cursor-pointer" onClick={() => setSelectedOrder(order)}>
                <TableCell className="font-mono text-xs">{order.id.slice(0, 8)}</TableCell>
                <TableCell className="text-sm">{order.date}</TableCell>
                <TableCell>
                  <p className="text-sm font-medium text-foreground">{order.customerName}</p>
                  <p className="text-xs text-muted-foreground">{order.customerPhone}</p>
                </TableCell>
                <TableCell className="text-xs max-w-[150px] truncate">{order.address || '-'}</TableCell>
                <TableCell className="text-sm">
                  {order.items[0]?.name}
                  {order.items.length > 1 && <Badge variant="secondary" className="ml-1 text-[10px]">+{order.items.length - 1} {t('orders.more')}</Badge>}
                </TableCell>
                <TableCell className="text-xs font-mono">{order.sku || '-'}</TableCell>
                <TableCell className="text-xs">{order.productSize || '-'}</TableCell>
                <TableCell className="font-medium">৳{order.amount.toLocaleString()}</TableCell>
                <TableCell>
                  <Badge variant="outline" className={cn('text-xs', statusColors[order.status])}>{order.status}</Badge>
                </TableCell>
                <TableCell>
                  <Button variant="ghost" size="sm" onClick={e => { e.stopPropagation(); printInvoice(order); }}>
                    <FileText className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{t('orders.invoice')}</DialogTitle></DialogHeader>
          {selectedOrder && (
            <div className="space-y-4">
              <div className="flex justify-between"><span className="text-sm text-muted-foreground">{t('orders.orderId')}</span><span className="text-sm font-mono">{selectedOrder.id}</span></div>
              <div className="flex justify-between"><span className="text-sm text-muted-foreground">{t('orders.date')}</span><span className="text-sm">{selectedOrder.date}</span></div>
              <div className="flex justify-between"><span className="text-sm text-muted-foreground">{t('orders.customer')}</span><span className="text-sm">{selectedOrder.customerName}</span></div>
              <div className="flex justify-between"><span className="text-sm text-muted-foreground">Phone</span><span className="text-sm">{selectedOrder.customerPhone}</span></div>
              {selectedOrder.address && <div className="flex justify-between"><span className="text-sm text-muted-foreground">Address</span><span className="text-sm text-right max-w-[200px]">{selectedOrder.address}</span></div>}
              {selectedOrder.sku && <div className="flex justify-between"><span className="text-sm text-muted-foreground">SKU</span><span className="text-sm font-mono">{selectedOrder.sku}</span></div>}
              {selectedOrder.productSize && <div className="flex justify-between"><span className="text-sm text-muted-foreground">Size</span><span className="text-sm">{selectedOrder.productSize}</span></div>}
              <hr className="border-border" />
              {selectedOrder.items.map((item, i) => (
                <div key={i} className="flex justify-between text-sm"><span>{item.name}</span><span>৳{item.unitPrice || '-'}</span></div>
              ))}
              {selectedOrder.deliveryFee && (
                <div className="flex justify-between text-sm text-muted-foreground"><span>Delivery Fee</span><span>৳{selectedOrder.deliveryFee}</span></div>
              )}
              <hr className="border-border" />
              <div className="flex justify-between font-bold"><span>Total</span><span>৳{selectedOrder.amount.toLocaleString()}</span></div>
              <Badge variant="outline" className={cn('text-xs', statusColors[selectedOrder.status])}>{selectedOrder.status}</Badge>
              <Button onClick={() => printInvoice(selectedOrder)} className="w-full">Print Invoice</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default OrdersPage;
