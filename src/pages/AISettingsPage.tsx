import { useState, useEffect } from 'react';
import { useTranslation } from '@/lib/i18n';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Bot, Webhook, KeyRound, Eye, EyeOff, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAISettings, useSaveAISettings, useAppSetting, useSaveAppSetting } from '@/hooks/use-supabase-data';

const AISettingsPage = () => {
  const { t } = useTranslation();
  const { data: settings, isLoading } = useAISettings();
  const { data: savedWebhookUrl, isLoading: webhookLoading } = useAppSetting('n8n_webhook_url');
  const { data: savedApiKey, isLoading: apiKeyLoading } = useAppSetting('openai_api_key');
  const { data: savedBaseUrl, isLoading: baseUrlLoading } = useAppSetting('openai_base_url');
  const saveSettings = useSaveAISettings();
  const saveAppSetting = useSaveAppSetting();
  const [aiName, setAiName] = useState('');
  const [instructions, setInstructions] = useState('');
  const [webhookUrl, setWebhookUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [baseUrl, setBaseUrl] = useState('https://api.openai.com/v1');
  const [showApiKey, setShowApiKey] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [savingProvider, setSavingProvider] = useState(false);

  useEffect(() => {
    if (settings) {
      setAiName(settings.aiName);
      setInstructions(settings.instructions);
    }
  }, [settings]);

  useEffect(() => {
    if (savedWebhookUrl) {
      setWebhookUrl(savedWebhookUrl as string);
    }
  }, [savedWebhookUrl]);

  useEffect(() => {
    if (savedApiKey) setApiKey(savedApiKey as string);
  }, [savedApiKey]);

  useEffect(() => {
    if (savedBaseUrl) setBaseUrl(savedBaseUrl as string);
  }, [savedBaseUrl]);

  const handleTestConnection = async () => {
    if (!apiKey.trim() || !baseUrl.trim()) {
      toast.error('API key এবং Base URL দিন');
      return;
    }
    setTestingConnection(true);
    setConnectionStatus('idle');
    try {
      const url = `${baseUrl.trim().replace(/\/$/, '')}/models`;
      const res = await fetch(url, {
        headers: { 'Authorization': `Bearer ${apiKey.trim()}` },
      });
      if (res.ok) {
        setConnectionStatus('success');
        toast.success('Connection successful! ✅');
      } else {
        setConnectionStatus('error');
        toast.error(`Connection failed: ${res.status} ${res.statusText}`);
      }
    } catch (err: any) {
      setConnectionStatus('error');
      toast.error(`Connection error: ${err.message}`);
    } finally {
      setTestingConnection(false);
    }
  };

  const handleSaveProvider = async () => {
    if (!apiKey.trim() || !baseUrl.trim()) {
      toast.error('API key এবং Base URL দিন');
      return;
    }
    setSavingProvider(true);
    try {
      await Promise.all([
        new Promise((resolve, reject) =>
          saveAppSetting.mutate(
            { key: 'openai_api_key', value: apiKey.trim() },
            { onSuccess: resolve, onError: reject }
          )
        ),
        new Promise((resolve, reject) =>
          saveAppSetting.mutate(
            { key: 'openai_base_url', value: baseUrl.trim().replace(/\/$/, '') },
            { onSuccess: resolve, onError: reject }
          )
        ),
      ]);
      toast.success('AI Provider configuration saved! সব edge function এখন এই key ব্যবহার করবে।');
    } catch (err: any) {
      toast.error(`Save failed: ${err.message}`);
    } finally {
      setSavingProvider(false);
    }
  };

  const syncToN8n = async (url: string, name: string, prompt: string) => {
    try {
      await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ aiName: name, instructions: prompt }),
      });
      toast.success(t('aiSettings.webhookSynced'));
    } catch {
      toast.error(t('aiSettings.webhookError'));
    }
  };

  const handleSave = async () => {
    // Save webhook URL to app_settings
    if (webhookUrl) {
      saveAppSetting.mutate({ key: 'n8n_webhook_url', value: webhookUrl });
    }

    // Save AI settings to Supabase
    saveSettings.mutate({ aiName, instructions }, {
      onSuccess: async () => {
        toast.success(t('aiSettings.saved'));
        // Sync to n8n webhook
        if (webhookUrl.trim()) {
          await syncToN8n(webhookUrl.trim(), aiName, instructions);
        } else {
          toast.info(t('aiSettings.noWebhook'));
        }
      },
      onError: () => toast.error(t('aiSettings.errorSaving')),
    });
  };

  if (isLoading || webhookLoading || apiKeyLoading || baseUrlLoading) {
    return <div className="mx-auto max-w-2xl space-y-6"><Skeleton className="h-8 w-48" /><Skeleton className="h-64 w-full" /></div>;
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-bold text-foreground">{t('aiSettings.title')}</h1>
        <p className="text-sm text-muted-foreground">{t('aiSettings.subtitle')}</p>
      </div>

      {/* AI Provider Configuration */}
      <Card className="border-primary/20">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <KeyRound className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">AI Provider Configuration</CardTitle>
              <p className="text-xs text-muted-foreground mt-1">
                OpenAI-compatible API key এবং Base URL। সব edge function এই value ব্যবহার করবে।
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="baseUrl">Base URL</Label>
            <Input
              id="baseUrl"
              value={baseUrl}
              onChange={e => { setBaseUrl(e.target.value); setConnectionStatus('idle'); }}
              placeholder="https://api.openai.com/v1"
            />
            <p className="text-xs text-muted-foreground">
              যেকোনো OpenAI-compatible endpoint (OpenAI, inmetech, Together AI, ইত্যাদি)
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="apiKey">API Key</Label>
            <div className="relative">
              <Input
                id="apiKey"
                type={showApiKey ? 'text' : 'password'}
                value={apiKey}
                onChange={e => { setApiKey(e.target.value); setConnectionStatus('idle'); }}
                placeholder="sk-... বা imt-..."
                className="pr-10 font-mono text-sm"
              />
              <button
                type="button"
                onClick={() => setShowApiKey(s => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label="Toggle visibility"
              >
                {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <p className="text-xs text-muted-foreground">
              🔒 Database এ store হবে। যেকোনো সময় change করতে পারবেন।
            </p>
          </div>

          {connectionStatus === 'success' && (
            <div className="flex items-center gap-2 rounded-md border border-green-500/30 bg-green-500/10 px-3 py-2 text-sm text-green-700 dark:text-green-400">
              <CheckCircle2 className="h-4 w-4" />
              Connection successful — সব ঠিকঠাক কাজ করছে
            </div>
          )}
          {connectionStatus === 'error' && (
            <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              <XCircle className="h-4 w-4" />
              Connection failed — API key বা URL check করুন
            </div>
          )}

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleTestConnection}
              disabled={testingConnection || !apiKey || !baseUrl}
              className="flex-1"
            >
              {testingConnection ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Testing...</>
              ) : (
                'Test Connection'
              )}
            </Button>
            <Button
              onClick={handleSaveProvider}
              disabled={savingProvider || !apiKey || !baseUrl}
              className="flex-1"
            >
              {savingProvider ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</>
              ) : (
                'Save & Apply'
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Bot className="h-5 w-5 text-primary" />
            </div>
            <div><CardTitle className="text-base">{t('aiSettings.behaviorConfig')}</CardTitle></div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="aiName">{t('aiSettings.aiName')}</Label>
            <Input id="aiName" value={aiName} onChange={e => setAiName(e.target.value)} />
            <p className="text-xs text-muted-foreground">{t('aiSettings.aiNameHint')}</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="instructions">{t('aiSettings.howReply')}</Label>
            <Textarea id="instructions" value={instructions} onChange={e => setInstructions(e.target.value)} rows={10}
              placeholder="You are a helpful assistant for [business name]. Reply in Bengali. Be friendly and professional…" className="resize-none" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Webhook className="h-5 w-5 text-primary" />
            </div>
            <div><CardTitle className="text-base">{t('aiSettings.webhookUrl')}</CardTitle></div>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          <Label htmlFor="webhookUrl">{t('aiSettings.webhookUrl')}</Label>
          <Input id="webhookUrl" value={webhookUrl} onChange={e => setWebhookUrl(e.target.value)}
            placeholder="https://your-n8n.app/webhook/xxxxx" />
          <p className="text-xs text-muted-foreground">{t('aiSettings.webhookUrlHint')}</p>
        </CardContent>
      </Card>

      <Button onClick={handleSave} disabled={saveSettings.isPending} className="w-full">
        {saveSettings.isPending ? '...' : t('aiSettings.save')}
      </Button>
    </div>
  );
};

export default AISettingsPage;
