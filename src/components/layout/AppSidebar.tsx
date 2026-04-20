import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from '@/lib/i18n';
import {
  LayoutDashboard, MessageSquare, ShoppingBag, Bot,
  Link2, Settings, AlertTriangle, BarChart2, Package, FileText,
  ChevronLeft, ChevronRight, X, Zap, LogOut
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Sheet, SheetContent } from '@/components/ui/sheet';

interface AppSidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  mobileOpen: boolean;
  onMobileClose: () => void;
}

const navItems = [
  { key: 'nav.home', icon: LayoutDashboard, path: '/' },
  { key: 'nav.inbox', icon: MessageSquare, path: '/inbox' },
  { key: 'nav.orders', icon: ShoppingBag, path: '/orders' },
  { key: 'nav.products', icon: Package, path: '/products' },
  { key: 'nav.documents', icon: FileText, path: '/documents' },
  { key: 'nav.aiSettings', icon: Bot, path: '/ai-settings' },
  { key: 'nav.connectPage', icon: Link2, path: '/connect-page' },
  { key: 'nav.settings', icon: Settings, path: '/settings' },
  { key: 'nav.errorLog', icon: AlertTriangle, path: '/error-log' },
  { key: 'nav.report', icon: BarChart2, path: '/report' },
];

const SidebarContent = ({ collapsed, onToggle, t, location, navigate, onItemClick }: any) => (
  <div className="flex h-full flex-col bg-card border-r border-border">
    {/* Header */}
    <div className="flex h-14 items-center justify-between px-4 border-b border-border">
      <div className="flex items-center gap-2 overflow-hidden">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
          <Zap className="h-4 w-4 text-primary-foreground" />
        </div>
        {!collapsed && (
          <span className="text-sm font-bold whitespace-nowrap text-foreground">
            Agentic X Flow
          </span>
        )}
      </div>
      <button
        onClick={onToggle}
        className="hidden md:flex h-6 w-6 items-center justify-center rounded-md hover:bg-muted text-muted-foreground"
      >
        {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
      </button>
    </div>

    {/* Nav */}
    <nav className="flex-1 space-y-1 p-2 overflow-y-auto">
      {navItems.map(item => {
        const isActive = location.pathname === item.path;
        return (
          <button
            key={item.path}
            onClick={() => { navigate(item.path); onItemClick?.(); }}
            className={cn(
              'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
              isActive
                ? 'bg-accent text-accent-foreground'
                : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'
            )}
          >
            <item.icon className={cn('h-5 w-5 shrink-0', isActive && 'text-primary')} />
            {!collapsed && <span>{t(item.key)}</span>}
          </button>
        );
      })}
    </nav>

    {/* Footer */}
    <div className="border-t border-border p-4 space-y-3">
      <div className="flex items-center gap-2">
        <span className="relative flex h-2.5 w-2.5">
          <span className="absolute inline-flex h-full w-full animate-pulse-dot rounded-full bg-status-delivered opacity-75" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-status-delivered" />
        </span>
        {!collapsed && (
          <span className="text-xs text-muted-foreground">{t('sidebar.connected')}</span>
        )}
      </div>
      <button
        onClick={() => {
          sessionStorage.removeItem('dashboard-authenticated');
          window.location.reload();
        }}
        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
      >
        <LogOut className="h-4 w-4 shrink-0" />
        {!collapsed && <span>Logout</span>}
      </button>
    </div>
  </div>
);

export const AppSidebar = ({ collapsed, onToggle, mobileOpen, onMobileClose }: AppSidebarProps) => {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <>
      {/* Desktop */}
      <aside
        className={cn(
          'hidden md:flex flex-col transition-all duration-300',
          collapsed ? 'w-16' : 'w-[260px]'
        )}
      >
        <SidebarContent
          collapsed={collapsed}
          onToggle={onToggle}
          t={t}
          location={location}
          navigate={navigate}
        />
      </aside>

      {/* Mobile */}
      <Sheet open={mobileOpen} onOpenChange={onMobileClose}>
        <SheetContent side="left" className="w-[260px] p-0">
          <SidebarContent
            collapsed={false}
            onToggle={onMobileClose}
            t={t}
            location={location}
            navigate={navigate}
            onItemClick={onMobileClose}
          />
        </SheetContent>
      </Sheet>
    </>
  );
};
