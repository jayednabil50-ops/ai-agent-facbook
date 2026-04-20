import { useState, useEffect } from 'react';
import { useTranslation } from '@/lib/i18n';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Copy, Star, Send } from 'lucide-react';
import { toast } from 'sonner';
import {
  useAppSetting, useSaveAppSetting, useTeam, useInviteTeam,
  useInvoices, useReviews
} from '@/hooks/use-supabase-data';

const SettingsPage = () => {
  const { t } = useTranslation();

  // Profile
  const { data: profileData, isLoading: loadingProfile } = useAppSetting('profile');
  const [profile, setProfile] = useState({ name: '', email: '', phone: '' });
  useEffect(() => { if (profileData) setProfile(profileData); }, [profileData]);

  // Notifications
  const { data: notifsData, isLoading: loadingNotifs } = useAppSetting('notifications');
  const [notifs, setNotifs] = useState({ emailAlerts: true, errorAlerts: true, dailySummary: false });
  useEffect(() => { if (notifsData) setNotifs(notifsData); }, [notifsData]);

  // Webhook
  const { data: webhookData } = useAppSetting('webhook');
  const webhook = webhookData || { messageWebhook: '', errorWebhook: '' };

  const saveSetting = useSaveAppSetting();

  // Team
  const { data: team = [], isLoading: loadingTeam } = useTeam();
  const inviteTeam = useInviteTeam();
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('Viewer');

  // Invoices
  const { data: invoices = [], isLoading: loadingInvoices } = useInvoices();

  // Reviews
  const { data: reviews = [], isLoading: loadingReviews } = useReviews();

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied');
  };

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-foreground">{t('settings.title')}</h1>
      <Tabs defaultValue="profile">
        <TabsList className="flex-wrap">
          <TabsTrigger value="profile">{t('settings.profile')}</TabsTrigger>
          <TabsTrigger value="webhook">{t('settings.webhook')}</TabsTrigger>
          <TabsTrigger value="billing">{t('settings.billing')}</TabsTrigger>
          <TabsTrigger value="team">{t('settings.team')}</TabsTrigger>
          <TabsTrigger value="notifications">{t('settings.notifications')}</TabsTrigger>
          <TabsTrigger value="reviews">{t('settings.reviews')}</TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <Card>
            <CardContent className="space-y-4 pt-6">
              {loadingProfile ? <Skeleton className="h-32 w-full" /> : <>
                <div className="space-y-2">
                  <Label>{t('settings.fullName')}</Label>
                  <Input value={profile.name} onChange={e => setProfile({ ...profile, name: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>{t('settings.email')}</Label>
                  <Input value={profile.email} readOnly className="bg-muted/50" />
                </div>
                <div className="space-y-2">
                  <Label>{t('settings.phone')}</Label>
                  <Input value={profile.phone} onChange={e => setProfile({ ...profile, phone: e.target.value })} />
                </div>
                <Button onClick={() => saveSetting.mutate({ key: 'profile', value: profile }, {
                  onSuccess: () => toast.success(t('settings.profileSaved'))
                })}>{t('settings.save')}</Button>
              </>}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="webhook">
          <Card>
            <CardContent className="space-y-4 pt-6">
              <div className="space-y-2">
                <Label>{t('settings.messageWebhook')}</Label>
                <div className="flex gap-2">
                  <Input value={webhook.messageWebhook || 'Not configured'} readOnly className="font-mono text-xs" />
                  <Button variant="outline" size="icon" onClick={() => copyToClipboard(webhook.messageWebhook)}><Copy className="h-4 w-4" /></Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label>{t('settings.errorWebhook')}</Label>
                <div className="flex gap-2">
                  <Input value={webhook.errorWebhook || 'Not configured'} readOnly className="font-mono text-xs" />
                  <Button variant="outline" size="icon" onClick={() => copyToClipboard(webhook.errorWebhook)}><Copy className="h-4 w-4" /></Button>
                </div>
              </div>
              <Button variant="outline" onClick={() => toast.success('Webhook test sent')}>{t('settings.testWebhook')}</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="billing">
          <Card>
            <CardContent className="space-y-4 pt-6">
              <div className="flex items-center gap-3">
                <span className="text-sm text-muted-foreground">{t('settings.currentPlan')}</span>
                <Badge className="bg-primary text-primary-foreground">Pro</Badge>
              </div>
              {loadingInvoices ? <Skeleton className="h-32 w-full" /> : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('orders.date')}</TableHead>
                      <TableHead>{t('orders.amount')}</TableHead>
                      <TableHead>{t('orders.statusLabel')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoices.map(inv => (
                      <TableRow key={inv.id}>
                        <TableCell>{inv.date}</TableCell>
                        <TableCell>৳{inv.amount.toLocaleString()}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={inv.status === 'Paid' ? 'text-status-delivered' : 'text-status-pending'}>{inv.status}</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="team">
          <Card>
            <CardContent className="space-y-4 pt-6">
              {loadingTeam ? <Skeleton className="h-32 w-full" /> : team.map(m => (
                <div key={m.id} className="flex items-center gap-3 rounded-lg border border-border p-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">{m.name.charAt(0)}</div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">{m.name}</p>
                    <p className="text-xs text-muted-foreground">{m.email}</p>
                  </div>
                  <Badge variant="secondary">{m.role}</Badge>
                </div>
              ))}
              <div className="flex gap-2 pt-4">
                <Input value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} placeholder="Email" className="flex-1" />
                <Select value={inviteRole} onValueChange={setInviteRole}>
                  <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Admin">Admin</SelectItem>
                    <SelectItem value="Editor">Editor</SelectItem>
                    <SelectItem value="Viewer">Viewer</SelectItem>
                  </SelectContent>
                </Select>
                <Button onClick={() => {
                  inviteTeam.mutate({ email: inviteEmail, role: inviteRole }, {
                    onSuccess: () => { toast.success('Invite sent'); setInviteEmail(''); }
                  });
                }} disabled={inviteTeam.isPending}>
                  <Send className="h-4 w-4 mr-1" /> {t('settings.inviteMember')}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications">
          <Card>
            <CardContent className="space-y-4 pt-6">
              {loadingNotifs ? <Skeleton className="h-32 w-full" /> : <>
                {[
                  { key: 'emailAlerts', label: t('settings.emailAlerts') },
                  { key: 'errorAlerts', label: t('settings.errorAlerts') },
                  { key: 'dailySummary', label: t('settings.dailySummary') },
                ].map(item => (
                  <div key={item.key} className="flex items-center justify-between rounded-lg border border-border p-3">
                    <span className="text-sm text-foreground">{item.label}</span>
                    <Switch checked={notifs[item.key as keyof typeof notifs]}
                      onCheckedChange={v => setNotifs(prev => ({ ...prev, [item.key]: v }))}
                      className="data-[state=checked]:bg-primary" />
                  </div>
                ))}
                <Button onClick={() => saveSetting.mutate({ key: 'notifications', value: notifs }, {
                  onSuccess: () => toast.success('Notifications saved')
                })}>{t('settings.save')}</Button>
              </>}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reviews">
          <div className="space-y-4">
            {loadingReviews ? Array.from({ length: 2 }).map((_, i) => (
              <Card key={i}><CardContent className="p-4"><Skeleton className="h-16 w-full" /></CardContent></Card>
            )) : reviews.map(review => (
              <Card key={review.id}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">{review.customerName.charAt(0)}</div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-foreground">{review.customerName}</span>
                        <span className="text-xs text-muted-foreground">{review.date}</span>
                      </div>
                      <div className="flex gap-0.5 my-1">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star key={i} className={`h-3.5 w-3.5 ${i < review.rating ? 'fill-primary text-primary' : 'text-muted'}`} />
                        ))}
                      </div>
                      <p className="text-sm text-muted-foreground">{review.comment}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SettingsPage;
