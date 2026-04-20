import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { I18nProvider } from "@/lib/i18n";
import { ThemeProvider } from "@/lib/theme";
import { AppLayout } from "@/components/layout/AppLayout";
import { PasswordGate, isAuthenticated } from "@/components/PasswordGate";
import HomePage from "@/pages/HomePage";
import InboxPage from "@/pages/InboxPage";
import OrdersPage from "@/pages/OrdersPage";
import ProductsPage from "@/pages/ProductsPage";
import DocumentsPage from "@/pages/DocumentsPage";
import AISettingsPage from "@/pages/AISettingsPage";
import ConnectPage from "@/pages/ConnectPage";
import SettingsPage from "@/pages/SettingsPage";
import ErrorLogPage from "@/pages/ErrorLogPage";
import ReportPage from "@/pages/ReportPage";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30000,
      refetchInterval: 30000,
    },
  },
});

const App = () => {
  const [authed, setAuthed] = useState(isAuthenticated());

  if (!authed) {
    return (
      <ThemeProvider>
        <PasswordGate onSuccess={() => setAuthed(true)} />
      </ThemeProvider>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <I18nProvider>
          <TooltipProvider>
            <Sonner />
            <BrowserRouter>
              <Routes>
                <Route path="/" element={<AppLayout />}>
                  <Route index element={<HomePage />} />
                  <Route path="inbox" element={<InboxPage />} />
                  <Route path="orders" element={<OrdersPage />} />
                  <Route path="products" element={<ProductsPage />} />
                  <Route path="documents" element={<DocumentsPage />} />
                  <Route path="ai-settings" element={<AISettingsPage />} />
                  <Route path="connect-page" element={<ConnectPage />} />
                  <Route path="settings" element={<SettingsPage />} />
                  <Route path="error-log" element={<ErrorLogPage />} />
                  <Route path="report" element={<ReportPage />} />
                </Route>
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </TooltipProvider>
        </I18nProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

export default App;
