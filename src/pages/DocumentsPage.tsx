import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Save, FileText, Sparkles, CheckCircle2, AlertCircle, Loader2, Clock } from 'lucide-react';
import { toast } from 'sonner';

type EmbedStatus = 'pending' | 'processing' | 'ready' | 'error';

interface DocumentRow {
  id: string;
  content: string;
  updated_at: string;
  embed_status?: EmbedStatus;
  embed_error?: string | null;
  embedded_at?: string | null;
  chunk_count?: number;
}

function EmbedBadge({ status, error, chunkCount }: { status?: EmbedStatus; error?: string | null; chunkCount?: number }) {
  if (status === 'ready') {
    return (
      <Badge variant="secondary" className="gap-1 bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20">
        <CheckCircle2 className="h-3 w-3" />
        Ready{chunkCount ? ` · ${chunkCount} chunks` : ''}
      </Badge>
    );
  }
  if (status === 'processing') {
    return <Badge variant="secondary" className="gap-1"><Loader2 className="h-3 w-3 animate-spin" />Embedding...</Badge>;
  }
  if (status === 'error') {
    return <Badge variant="destructive" className="gap-1" title={error || ''}><AlertCircle className="h-3 w-3" />Error</Badge>;
  }
  return <Badge variant="outline" className="gap-1"><Clock className="h-3 w-3" />Pending</Badge>;
}

const DocumentsPage = () => {
  const qc = useQueryClient();
  const [content, setContent] = useState('');
  const [loaded, setLoaded] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['documents'],
    refetchInterval: 5000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('documents' as any)
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return (data || null) as unknown as DocumentRow | null;
    },
  });

  useEffect(() => {
    if (!loaded && !isLoading) {
      setContent(data?.content ?? '');
      setLoaded(true);
    }
  }, [data, isLoading, loaded]);

  const triggerEmbed = async (documentId: string) => {
    try {
      await supabase.functions.invoke('embed-document', { body: { document_id: documentId } });
    } catch (e) {
      console.warn('embed-document trigger failed:', e);
    }
  };

  const saveMutation = useMutation({
    mutationFn: async (text: string) => {
      if (data?.id) {
        const { error } = await supabase
          .from('documents' as any)
          .update({ content: text, updated_at: new Date().toISOString() })
          .eq('id', data.id);
        if (error) throw error;
        return data.id;
      } else {
        const { data: inserted, error } = await supabase
          .from('documents' as any)
          .insert({ content: text })
          .select('id')
          .single();
        if (error) throw error;
        return (inserted as any).id as string;
      }
    },
    onSuccess: (docId) => {
      qc.invalidateQueries({ queryKey: ['documents'] });
      toast.success('Document saved. Embedding in background...');
      if (docId) triggerEmbed(docId);
    },
    onError: (e: any) => toast.error(e?.message || 'Failed to save'),
  });

  const reEmbedMutation = useMutation({
    mutationFn: async () => {
      if (!data?.id) throw new Error('Save the document first');
      const { data: res, error } = await supabase.functions.invoke('embed-document', {
        body: { document_id: data.id },
      });
      if (error) throw error;
      return res;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['documents'] });
      toast.success('Re-embedding triggered');
    },
    onError: (e: any) => toast.error(e?.message || 'Failed to re-embed'),
  });

  return (
    <div className="space-y-4 h-full flex flex-col">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          <h1 className="text-xl font-bold text-foreground">Documents</h1>
          {data && <EmbedBadge status={data.embed_status} error={data.embed_error} chunkCount={data.chunk_count} />}
        </div>
        <div className="flex gap-2">
          {data?.id && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => reEmbedMutation.mutate()}
              disabled={reEmbedMutation.isPending}
            >
              {reEmbedMutation.isPending ? (
                <><Loader2 className="h-4 w-4 mr-1 animate-spin" />Embedding...</>
              ) : (
                <><Sparkles className="h-4 w-4 mr-1" />Re-embed</>
              )}
            </Button>
          )}
          <Button
            size="sm"
            onClick={() => saveMutation.mutate(content)}
            disabled={saveMutation.isPending || isLoading}
          >
            <Save className="h-4 w-4 mr-1" />
            {saveMutation.isPending ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </div>

      <Card className="flex-1 flex flex-col p-4 min-h-[600px]">
        {isLoading ? (
          <Skeleton className="flex-1 w-full min-h-[500px]" />
        ) : (
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Write or paste your content here. Save করার পর automatically chunk হয়ে embed হবে — n8n এর Vector Search এই data পাবে।"
            className="flex-1 w-full min-h-[500px] resize-none border-0 focus-visible:ring-0 focus-visible:ring-offset-0 p-0 text-sm leading-relaxed font-mono bg-transparent"
          />
        )}
      </Card>

      {data?.embed_error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <strong>Embedding error:</strong> {data.embed_error}
        </div>
      )}
    </div>
  );
};

export default DocumentsPage;
