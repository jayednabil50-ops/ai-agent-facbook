import { useState } from 'react';
import { useTranslation } from '@/lib/i18n';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Search, Trash2, RefreshCw, Copy, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { useErrorLogs, useDeleteErrorLog, useDeleteAllErrorLogs, useAppSetting } from '@/hooks/use-supabase-data';

const typeColors: Record<string, string> = {
  Error: 'bg-destructive/10 text-destructive border-destructive/30',
  Warning: 'bg-status-pending/10 text-status-pending border-status-pending/30',
  Info: 'bg-status-confirmed/10 text-status-confirmed border-status-confirmed/30',
};

const ErrorLogPage = () => {
  const { t } = useTranslation();
  const { data: logs = [], isLoading, refetch } = useErrorLogs();
  const deleteLog = useDeleteErrorLog();
  const deleteAll = useDeleteAllErrorLogs();
  const { data: webhookUrl } = useAppSetting('error_webhook_url');
  const [search, setSearch] = useState('');

  const displayWebhookUrl = (webhookUrl as string) || '';

  const filtered = logs.filter(l =>
    !search || l.message.toLowerCase().includes(search.toLowerCase()) || l.type.toLowerCase().includes(search.toLowerCase())
  );

  const relativeTime = (ts: string) => {
    const diff = Date.now() - new Date(ts).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins} ${t('errorLog.minAgo')}`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs} ${t('errorLog.hAgo')}`;
    return `${Math.floor(hrs / 24)} ${t('errorLog.dAgo')}`;
  };

  const handleDelete = (id: string) => {
    deleteLog.mutate(id, { onSuccess: () => toast.success(t('errorLog.deleted')) });
  };

  const handleDeleteAll = () => {
    deleteAll.mutate(undefined, { onSuccess: () => toast.success(t('errorLog.allDeleted')) });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">{t('errorLog.title')}</h1>
          <p className="text-sm text-muted-foreground">{t('errorLog.subtitle')}</p>
        </div>
        <div className="flex gap-2">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm" disabled={logs.length === 0}>
                <Trash2 className="h-4 w-4 mr-1" /> {t('errorLog.deleteAll')}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete all errors?</AlertDialogTitle>
                <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteAll}>Delete All</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-1" /> {t('errorLog.refresh')}
          </Button>
        </div>
      </div>

      {displayWebhookUrl && (
        <Card>
          <CardContent className="p-4">
            <Label className="text-xs text-muted-foreground">{t('errorLog.webhookUrl')}</Label>
            <div className="flex gap-2 mt-1">
              <Input value={displayWebhookUrl} readOnly className="font-mono text-xs" />
              <Button variant="outline" size="icon" onClick={() => { navigator.clipboard.writeText(displayWebhookUrl); toast.success(t('errorLog.copied')); }}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={search} onChange={e => setSearch(e.target.value)} placeholder={t('errorLog.searchErrors')} className="pl-9" />
      </div>

      {isLoading ? Array.from({ length: 3 }).map((_, i) => (
        <Card key={i}><CardContent className="p-4"><Skeleton className="h-16 w-full" /></CardContent></Card>
      )) : filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center py-12 text-center">
            <AlertTriangle className="h-12 w-12 text-muted-foreground/30 mb-3" />
            <p className="text-muted-foreground">{t('errorLog.noErrors')}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map(log => (
            <Card key={log.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className={typeColors[log.type] || typeColors.Info}>{log.type}</Badge>
                      <span className="text-xs text-muted-foreground">{relativeTime(log.timestamp)}</span>
                    </div>
                    <p className="text-sm font-medium text-foreground">{log.message}</p>
                  </div>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => handleDelete(log.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                {(log.stack || log.context) && (
                  <Accordion type="single" collapsible className="mt-2">
                    {log.stack && (
                      <AccordionItem value="stack" className="border-0">
                        <AccordionTrigger className="text-xs py-1 text-muted-foreground">{t('errorLog.stackTrace')}</AccordionTrigger>
                        <AccordionContent>
                          <pre className="text-xs bg-muted/50 p-3 rounded-lg overflow-x-auto text-foreground">{log.stack}</pre>
                        </AccordionContent>
                      </AccordionItem>
                    )}
                    {log.context && (
                      <AccordionItem value="context" className="border-0">
                        <AccordionTrigger className="text-xs py-1 text-muted-foreground">{t('errorLog.context')}</AccordionTrigger>
                        <AccordionContent>
                          <p className="text-xs text-muted-foreground">{log.context}</p>
                        </AccordionContent>
                      </AccordionItem>
                    )}
                  </Accordion>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default ErrorLogPage;