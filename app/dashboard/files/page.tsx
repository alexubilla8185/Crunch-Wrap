'use client';

import { useState } from 'react';
import { getAllInsights, deleteInsight } from '@/lib/storage/localDbService';
import { Insight } from '@/lib/schemas';
import { Mic, FileText, File as FileIcon, ArrowRight, Trash, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useUIStore } from '@/lib/store';
import { useInsightSubscription } from '@/hooks/useInsightSubscription';
import { checkStuckInsights } from '@/lib/utils/insightHealthCheck';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { shouldUpdateStatus } from '@/lib/utils';

export default function FilesPage() {
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const { showToast } = useUIStore();
  const router = useRouter();
  const supabase = createClient();
  const queryClient = useQueryClient();

  useInsightSubscription();

  const { data: localInsights = [], isLoading: isLocalLoading } = useQuery({
    queryKey: ['localInsights'],
    queryFn: async () => {
      await checkStuckInsights();
      const data = await getAllInsights();
      return data.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }
  });

  const { data: supabaseInsights = [], isLoading: isSupabaseLoading } = useQuery({
    queryKey: ['insights'],
    queryFn: async () => {
      const { data, error } = await supabase.from('insights').select('*');
      if (error) throw error;
      return data;
    }
  });

  const isLoading = isLocalLoading || isSupabaseLoading;

  const insights = localInsights.map(local => {
    const remote = supabaseInsights.find(r => r.id === local.id);
    const finalStatus = shouldUpdateStatus(local.processing_status, remote?.processing_status)
      ? remote?.processing_status
      : local.processing_status;
    return {
      ...local,
      ...remote,
      title: remote?.title || local.title,
      processing_status: finalStatus || local.processing_status,
    } as Insight;
  });

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getIcon = (insight: Insight) => {
    if (insight.raw_content instanceof Blob && insight.raw_content.type.startsWith('audio/')) {
      return <Mic className="w-4 h-4 text-foreground/60" />;
    }
    if (insight.title.toLowerCase().includes('audio') || insight.title.toLowerCase().includes('voice')) {
      return <Mic className="w-4 h-4 text-foreground/60" />;
    }
    return <FileText className="w-4 h-4 text-foreground/60" />;
  };

  const getStatusIndicator = (status: Insight['processing_status']) => {
    switch (status) {
      case 'local':
        return (
          <div className="flex items-center gap-2">
            <span className="block w-2 h-2 rounded-full bg-yellow-500" />
            <span className="hidden sm:inline text-xs text-foreground/50 uppercase tracking-wider">Local</span>
          </div>
        );
      case 'uploading':
        return (
          <div className="flex items-center gap-2">
            <span className="block w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
            <span className="hidden sm:inline text-xs text-foreground/50 uppercase tracking-wider">Uploading</span>
          </div>
        );
      case 'analyzing':
        return (
          <div className="flex items-center gap-2">
            <span className="block w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
            <span className="hidden sm:inline text-xs text-foreground/50 uppercase tracking-wider">Synthesizing Activity...</span>
          </div>
        );
      case 'completed':
        return (
          <div className="flex items-center gap-2">
            <span className="block w-2 h-2 rounded-full bg-green-500" />
            <span className="hidden sm:inline text-xs text-foreground/50 uppercase tracking-wider">Completed</span>
          </div>
        );
      case 'failed':
        return (
          <div className="flex items-center gap-2">
            <span className="block w-2 h-2 rounded-full bg-red-500" />
            <span className="hidden sm:inline text-xs text-foreground/50 uppercase tracking-wider">Failed</span>
          </div>
        );
      default:
        return null;
    }
  };

  const handleDelete = async () => {
    if (itemToDelete) {
      await deleteInsight(itemToDelete);
      
      // Aggressive Cache Management
      queryClient.setQueryData(['localInsights'], (old: any[]) => 
        old?.filter((item) => item.id !== itemToDelete)
      );
      queryClient.setQueryData(['insights'], (old: any[]) => 
        old?.filter((item) => item.id !== itemToDelete)
      );
      queryClient.removeQueries({ queryKey: ['insight', itemToDelete] });
      queryClient.removeQueries({ queryKey: ['localInsight', itemToDelete] });
      queryClient.removeQueries({ queryKey: ['supabaseInsight', itemToDelete] });

      showToast('Import deleted', 'info');
      setItemToDelete(null);
    }
  };

  return (
    <div className="flex-1 flex flex-col p-4 sm:p-6 md:p-8 max-w-5xl mx-auto w-full">
      <header className="mb-8 sm:mb-12">
        <h1 className="text-3xl md:text-4xl font-serif font-medium tracking-tight mb-2">
          Intelligence Library
        </h1>
        <p className="text-foreground/60 font-sans text-sm md:text-base">
          {isLoading ? 'Loading...' : `${insights.length} file${insights.length === 1 ? '' : 's'} indexed locally.`}
        </p>
      </header>

      {isLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <span className="font-mono text-sm text-foreground/50 animate-pulse">Loading library...</span>
        </div>
      ) : insights.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center max-w-md mx-auto">
          <div className="w-16 h-16 mb-6 rounded-full bg-primary/5 border border-foreground/10 flex items-center justify-center">
            <FileIcon className="w-8 h-8 text-foreground/40" />
          </div>
          <h2 className="text-xl font-serif font-medium mb-2">Your library is empty</h2>
          <p className="text-sm text-foreground/60 mb-8">
            You haven&apos;t imported any intelligence yet. Drop a file or record a voice note in the Hub to get started.
          </p>
          <Link
            href="/dashboard/hub"
            className="flex items-center gap-2 px-6 py-3 rounded-full bg-primary text-primary-foreground hover:opacity-90 transition-opacity font-medium text-sm focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            Go to Hub <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto pr-0 md:pr-4 -mr-0 md:-mr-4">
          <div className="flex flex-col">
            {/* Table Header */}
            <div className="hidden md:grid grid-cols-12 gap-4 px-4 py-3 border-b border-foreground/10 text-xs font-mono text-foreground/50 uppercase tracking-wider mb-2">
              <div className="col-span-6 lg:col-span-7">Title</div>
              <div className="col-span-3 lg:col-span-3">Date</div>
              <div className="col-span-3 lg:col-span-2 text-right">Status</div>
            </div>

            {/* List */}
            <div className="flex flex-col">
              {insights.map((insight) => (
                <div
                  onClick={() => router.push(`/dashboard/files/${insight.id}`)}
                  key={insight.id}
                  className="group grid grid-cols-1 md:grid-cols-12 gap-4 px-4 py-4 md:py-3 border-b border-foreground/5 hover:bg-foreground/5 transition-colors items-center cursor-pointer"
                >
                  <div className="col-span-1 md:col-span-6 lg:col-span-7 flex items-center gap-3 overflow-hidden min-w-0">
                    <div className="shrink-0 w-8 h-8 rounded-full bg-background border border-foreground/10 flex items-center justify-center group-hover:border-foreground/20 transition-colors">
                      {getIcon(insight)}
                    </div>
                    <span className="font-serif text-base md:text-sm truncate min-w-0">
                      {insight.title}
                    </span>
                  </div>
                  
                  <div className="col-span-1 md:col-span-3 lg:col-span-3 font-mono text-xs text-foreground/60">
                    {formatDate(insight.created_at)}
                  </div>
                  
                  <div className="col-span-1 md:col-span-3 lg:col-span-2 flex flex-row items-center justify-between md:justify-end gap-2 font-mono">
                    {getStatusIndicator(insight.processing_status)}
                    <button
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); setItemToDelete(insight.id); }}
                      className="min-h-[44px] min-w-[44px] flex items-center justify-center text-foreground/40 hover:text-red-500 hover:bg-red-500/10 rounded-full transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                      aria-label="Delete file"
                    >
                      <Trash className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {itemToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-background p-6 shadow-2xl border border-foreground/10">
            <h2 className="font-serif text-xl mb-4">Delete Intelligence?</h2>
            <p className="text-foreground/60 mb-6">This action cannot be undone.</p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setItemToDelete(null)}
                className="px-4 py-2 rounded-xl text-sm font-medium hover:bg-foreground/5 transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                aria-label="Cancel"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 rounded-xl text-sm font-medium bg-red-500 text-white hover:bg-red-600 transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
