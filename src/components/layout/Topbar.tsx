import { Menu, Bot, Sun, Moon, Bell, Globe } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';
import { useTheme } from '@/lib/theme';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { useAISettings, useSetGlobalAIActive } from '@/hooks/use-supabase-data';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';

interface TopbarProps {
  onMenuClick: () => void;
}

export const Topbar = ({ onMenuClick }: TopbarProps) => {
  const { t, lang, setLang } = useTranslation();
  const { theme, toggleTheme } = useTheme();
  const { data: aiSettings, isLoading: loadingAISettings } = useAISettings();
  const setGlobalAIActive = useSetGlobalAIActive();
  const aiEnabled = aiSettings?.aiActive ?? true;

  const handleAIToggle = (enabled: boolean) => {
    setGlobalAIActive.mutate(enabled, {
      onSuccess: () => {
        toast(enabled ? t('topbar.aiOn') : t('topbar.aiOff'));
      },
      onError: (error: unknown) => {
        const message = error instanceof Error ? error.message : 'Failed to update AI status';
        toast.error(message);
      },
    });
  };

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border bg-card px-4">
      <button
        onClick={onMenuClick}
        className="flex md:hidden h-9 w-9 items-center justify-center rounded-lg hover:bg-muted"
      >
        <Menu className="h-5 w-5 text-foreground" />
      </button>

      <div className="hidden md:block" />

      <div className="flex items-center gap-2">
        {/* AI Toggle */}
        <div className="flex items-center gap-2 rounded-full border border-border bg-muted/50 px-3 py-1.5">
          <Bot className="h-4 w-4 text-primary" />
          <span className="text-xs font-medium text-foreground">
            {aiEnabled ? t('topbar.aiOn') : t('topbar.aiOff')}
          </span>
          <Switch
            checked={aiEnabled}
            onCheckedChange={handleAIToggle}
            disabled={loadingAISettings || setGlobalAIActive.isPending}
            className="data-[state=checked]:bg-primary"
          />
        </div>

        {/* Theme */}
        <Button variant="ghost" size="icon" onClick={toggleTheme} className="h-9 w-9">
          {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>

        {/* Language */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-9 w-9">
              <Globe className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setLang('en')} className={lang === 'en' ? 'bg-accent' : ''}>
              English
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setLang('bn')} className={lang === 'bn' ? 'bg-accent' : ''}>
              বাংলা
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Bell */}
        <Button variant="ghost" size="icon" className="h-9 w-9">
          <Bell className="h-4 w-4" />
        </Button>

        {/* Avatar */}
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">
          N
        </div>
      </div>
    </header>
  );
};
