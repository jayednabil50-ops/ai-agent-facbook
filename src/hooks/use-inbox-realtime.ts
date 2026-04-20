import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/**
 * Subscribes to Supabase Realtime for conversations & messages tables.
 * Invalidates relevant React Query caches so the inbox stays up-to-date
 * without relying solely on polling.
 *
 * Call once at the page level (InboxPage).
 */
export function useInboxRealtime() {
  const qc = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel('inbox-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'conversations' }, () => {
        qc.invalidateQueries({ queryKey: ['conversations'] });
        qc.invalidateQueries({ queryKey: ['dashboard_summary'] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, () => {
        qc.invalidateQueries({ queryKey: ['messages'] });
        qc.invalidateQueries({ queryKey: ['conversations'] });
        qc.invalidateQueries({ queryKey: ['dashboard_summary'] });
        qc.invalidateQueries({ queryKey: ['message_trend'] });
        qc.invalidateQueries({ queryKey: ['order_status_dist'] });
      })
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [qc]);
}
