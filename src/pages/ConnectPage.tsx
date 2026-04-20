import { useEffect, useState } from 'react';
import { useTranslation } from '@/lib/i18n';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Link2, Copy, CheckCircle, RefreshCw, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import {
  useConnectedPage,
  useSaveFacebookConnection,
  useTestFacebookConnection,
} from '@/hooks/use-supabase-data';

const ConnectPage = () => {
  const { t } = useTranslation();
  const { data: pageInfo, isLoading } = useConnectedPage();
  const saveConnection = useSaveFacebookConnection();
  const testConnection = useTestFacebookConnection();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [newToken, setNewToken] = useState('');
  const [newPageId, setNewPageId] = useState('');
  const [newPageName, setNewPageName] = useState('');
  const [newWebhookUrl, setNewWebhookUrl] = useState('');
  const [newVerifyToken, setNewVerifyToken] = useState('');

  useEffect(() => {
    if (!dialogOpen) return;
    setNewPageId(pageInfo?.pageId || '');
    setNewPageName(pageInfo?.pageName || '');
    setNewWebhookUrl(pageInfo?.webhookUrl || '');
    setNewVerifyToken(pageInfo?.verifyToken || '');
  }, [dialogOpen, pageInfo]);

  const copyToClipboard = (text: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    toast.success(t('connect.copied'));
  };

  const handleTest = () => {
    testConnection.mutate({
      pageId: pageInfo?.pageId || newPageId || undefined,
      pageAccessToken: newToken.trim() || undefined,
    }, {
      onSuccess: () => toast.success(t('connect.connectionSuccess')),
      onError: (error: any) => {
        toast.error(error?.message || 'Connection test failed');
      },
    });
  };

  const handleUpdateToken = () => {
    const pageId = (newPageId || pageInfo?.pageId || '').trim();
    const pageName = (newPageName || pageInfo?.pageName || 'Facebook Page').trim();
    const webhookUrl = (newWebhookUrl || pageInfo?.webhookUrl || '').trim();
    const verifyToken = (newVerifyToken || pageInfo?.verifyToken || '').trim();

    if (!pageId) {
      toast.error('Page ID is required');
      return;
    }
    if (!newToken.trim() && !pageInfo?.hasAccessToken) {
      toast.error('Page access token is required');
      return;
    }
    if (!webhookUrl) {
      toast.error('Webhook URL is required');
      return;
    }

    saveConnection.mutate({
      pageId,
      pageName,
      pageAccessToken: newToken.trim() || undefined,
      webhookUrl,
      verifyToken: verifyToken || undefined,
    }, {
      onSuccess: () => {
        toast.success(t('connect.tokenUpdated'));
        setNewToken('');
        setDialogOpen(false);
      },
      onError: (error: any) => {
        toast.error(error?.message || 'Failed to update connection');
      },
    });
  };

  if (isLoading) {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!pageInfo || (!pageInfo.pageId && !pageInfo.webhookUrl)) {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <h1 className="text-xl font-bold text-foreground">{t('connect.title')}</h1>
        <Card>
          <CardContent className="flex flex-col items-center py-12 text-center space-y-3">
            <AlertCircle className="h-12 w-12 text-muted-foreground/30" />
            <p className="text-muted-foreground">No Facebook page connected yet. Add connection details to start.</p>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button>{t('connect.changeToken')}</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{t('connect.updateToken')}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>{t('connect.pageName')}</Label>
                    <Input value={newPageName} onChange={e => setNewPageName(e.target.value)} placeholder="Your Facebook page name" />
                  </div>
                  <div className="space-y-2">
                    <Label>{t('connect.pageId')}</Label>
                    <Input value={newPageId} onChange={e => setNewPageId(e.target.value)} placeholder="Facebook Page ID" className="font-mono text-xs" />
                  </div>
                  <div className="space-y-2">
                    <Label>Page Access Token</Label>
                    <Textarea value={newToken} onChange={e => setNewToken(e.target.value)} placeholder={t('connect.enterToken')} rows={4} />
                  </div>
                  <div className="space-y-2">
                    <Label>{t('connect.webhookUrl')}</Label>
                    <Input value={newWebhookUrl} onChange={e => setNewWebhookUrl(e.target.value)} placeholder="https://your-n8n-domain/webhook/facebook" className="font-mono text-xs" />
                  </div>
                  <div className="space-y-2">
                    <Label>Verify Token</Label>
                    <Input value={newVerifyToken} onChange={e => setNewVerifyToken(e.target.value)} placeholder="Meta webhook verify token" />
                  </div>
                  <Button onClick={handleUpdateToken} className="w-full" disabled={saveConnection.isPending}>
                    {saveConnection.isPending ? 'Saving...' : t('connect.update')}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-xl font-bold text-foreground">{t('connect.title')}</h1>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Link2 className="h-5 w-5 text-primary" />
              </div>
              <CardTitle className="text-base">{t('connect.connectedFB')}</CardTitle>
            </div>
            <Badge variant="outline" className={pageInfo.status === 'connected'
              ? 'border-status-delivered/30 bg-status-delivered/10 text-status-delivered'
              : 'border-status-cancelled/30 bg-status-cancelled/10 text-status-cancelled'}>
              <CheckCircle className="h-3 w-3 mr-1" /> {pageInfo.status === 'connected' ? t('connect.connected') : 'Disconnected'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>{t('connect.webhookUrl')}</Label>
            <div className="flex gap-2">
              <Input value={pageInfo.webhookUrl} readOnly className="font-mono text-xs" />
              <Button variant="outline" size="icon" onClick={() => copyToClipboard(pageInfo.webhookUrl)}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs text-muted-foreground">{t('connect.pageName')}</Label>
              <p className="text-sm font-medium text-foreground">{pageInfo.pageName}</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">{t('connect.pageId')}</Label>
              <div className="flex items-center gap-1">
                <p className="text-sm font-mono text-foreground">{pageInfo.pageId}</p>
                <button onClick={() => copyToClipboard(pageInfo.pageId)} className="text-muted-foreground hover:text-foreground">
                  <Copy className="h-3 w-3" />
                </button>
              </div>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">{t('connect.connectedOn')}</Label>
              <p className="text-sm text-foreground">{pageInfo.connectedOn}</p>
            </div>
          </div>
          <div className="flex gap-3 pt-4">
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">{t('connect.changeToken')}</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{t('connect.updateToken')}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>{t('connect.pageName')}</Label>
                    <Input value={newPageName} onChange={e => setNewPageName(e.target.value)} placeholder="Your Facebook page name" />
                  </div>
                  <div className="space-y-2">
                    <Label>{t('connect.pageId')}</Label>
                    <Input value={newPageId} onChange={e => setNewPageId(e.target.value)} placeholder="Facebook Page ID" className="font-mono text-xs" />
                  </div>
                  <div className="space-y-2">
                    <Label>Page Access Token</Label>
                    <Textarea value={newToken} onChange={e => setNewToken(e.target.value)} placeholder={pageInfo.hasAccessToken ? 'Leave empty to keep existing token' : t('connect.enterToken')} rows={4} />
                  </div>
                  <div className="space-y-2">
                    <Label>{t('connect.webhookUrl')}</Label>
                    <Input value={newWebhookUrl} onChange={e => setNewWebhookUrl(e.target.value)} placeholder="https://your-n8n-domain/webhook/facebook" className="font-mono text-xs" />
                  </div>
                  <div className="space-y-2">
                    <Label>Verify Token</Label>
                    <Input value={newVerifyToken} onChange={e => setNewVerifyToken(e.target.value)} placeholder="Meta webhook verify token" />
                  </div>
                  <Button onClick={handleUpdateToken} className="w-full" disabled={saveConnection.isPending}>
                    {saveConnection.isPending ? 'Saving...' : t('connect.update')}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
            <Button onClick={handleTest} disabled={testConnection.isPending}>
              <RefreshCw className={`h-4 w-4 mr-2 ${testConnection.isPending ? 'animate-spin' : ''}`} />
              {t('connect.testConnection')}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ConnectPage;
