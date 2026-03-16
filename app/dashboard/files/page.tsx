'use client';

import { useState, useMemo } from 'react';
import { getAllInsights, deleteInsight } from '@/lib/storage/localDbService';
import { Insight } from '@/lib/schemas';
import { Mic, FileText, File as FileIcon, ArrowRight, Trash, Search, LayoutGrid, List, CheckSquare, Square } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useUIStore } from '@/lib/store';
import { useInsightSubscription } from '@/hooks/useInsightSubscription';
import { checkStuckInsights } from '@/lib/utils/insightHealthCheck';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { shouldUpdateStatus } from '@/lib/utils';
import { motion, AnimatePresence } from 'motion/react';

export default function FilesPage() {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'az'>('newest');
  const [filterType, setFilterType] = useState<'all' | 'audio' | 'documents'>('all');
  const [searchQuery, setSearchQuery] = useState('');
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
      return data;
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

  const insights = useMemo(() => {
    return localInsights.map(local => {
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
  }, [localInsights, supabaseInsights]);

  const filteredInsights = useMemo(() => {
    let result = insights.filter(insight => 
      insight.title?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (filterType === 'audio') {
      result = result.filter(i => (i.raw_content instanceof Blob && i.raw_content.type.startsWith('audio/')) || i.title.toLowerCase().includes('audio') || i.title.toLowerCase().includes('voice'));
    } else if (filterType === 'documents') {
      result = result.filter(i => !( (i.raw_content instanceof Blob && i.raw_content.type.startsWith('audio/')) || i.title.toLowerCase().includes('audio') || i.title.toLowerCase().includes('voice')));
    }

    if (sortBy === 'newest') {
      result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    } else if (sortBy === 'oldest') {
      result.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    } else if (sortBy === 'az') {
      result.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
    }

    return result;
  }, [insights, searchQuery, filterType, sortBy]);

  const toggleSelection = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredInsights.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredInsights.map(i => i.id)));
    }
  };

  const handleBulkDelete = async () => {
    for (const id of selectedIds) {
      await deleteInsight(id);
    }
    
    // Aggressive Cache Management
    queryClient.setQueryData(['localInsights'], (old: any[]) => 
      old?.filter((item) => !selectedIds.has(item.id))
    );
    queryClient.setQueryData(['insights'], (old: any[]) => 
      old?.filter((item) => !selectedIds.has(item.id))
    );
    for (const id of selectedIds) {
      queryClient.removeQueries({ queryKey: ['insight', id] });
      queryClient.removeQueries({ queryKey: ['localInsight', id] });
      queryClient.removeQueries({ queryKey: ['supabaseInsight', id] });
    }

    showToast(`Deleted ${selectedIds.size} items`, 'info');
    setSelectedIds(new Set());
  };

  return (
    <div className="flex-1 flex flex-col p-4 sm:p-6 md:p-8 max-w-5xl mx-auto w-full">
      <header className="mb-8 sm:mb-12">
        <h1 className="text-3xl md:text-4xl font-serif font-medium tracking-tight mb-6">
          Intelligence Library
        </h1>
        <div className="flex flex-col gap-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-foreground/50" />
            <input
              type="text"
              placeholder="Search your insights..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-12 pl-12 pr-6 rounded-full bg-surface shadow-sm border border-transparent focus:border-primary/20 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all text-foreground"
            />
          </div>
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <button onClick={toggleSelectAll} className="flex items-center gap-2 text-sm font-medium">
                {selectedIds.size === filteredInsights.length && filteredInsights.length > 0 ? <CheckSquare className="w-5 h-5 text-primary" /> : <Square className="w-5 h-5 text-foreground/50" />}
                Select All
              </button>
              {(['all', 'audio', 'documents'] as const).map(type => (
                <button 
                  key={type}
                  onClick={() => setFilterType(type)}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${filterType === type ? 'bg-primary text-primary-foreground' : 'bg-surface hover:bg-foreground/5'}`}
                >
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <select 
                value={sortBy} 
                onChange={(e) => setSortBy(e.target.value as any)}
                className="px-4 py-1.5 rounded-full bg-surface text-sm border border-border focus:outline-none"
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="az">Alphabetical (A-Z)</option>
              </select>
              <button onClick={() => setViewMode('list')} className={`p-2 rounded-full ${viewMode === 'list' ? 'bg-surface' : ''}`}><List className="w-5 h-5" /></button>
              <button onClick={() => setViewMode('grid')} className={`p-2 rounded-full ${viewMode === 'grid' ? 'bg-surface' : ''}`}><LayoutGrid className="w-5 h-5" /></button>
            </div>
          </div>
        </div>
      </header>

      {isLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <span className="font-mono text-sm text-foreground/70 animate-pulse">Loading library...</span>
        </div>
      ) : filteredInsights.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center max-w-md mx-auto">
          <div className="w-16 h-16 mb-6 rounded-full bg-primary/5 border border-border flex items-center justify-center">
            <FileIcon className="w-8 h-8 text-foreground/70" />
          </div>
          <h2 className="text-xl font-serif font-medium mb-2">No results found</h2>
          <p className="text-sm text-foreground/70 mb-8">
            Try adjusting your search or filters.
          </p>
        </div>
      ) : (
        <div className={viewMode === 'grid' ? 'grid grid-cols-2 md:grid-cols-3 gap-4' : 'flex flex-col'}>
          {filteredInsights.map((insight) => (
            <div
              key={insight.id}
              className={`bg-surface rounded-2xl p-4 shadow-sm border ${selectedIds.has(insight.id) ? 'border-primary' : 'border-transparent'} transition-all group relative`}
            >
              <button 
                onClick={() => toggleSelection(insight.id)}
                className="absolute top-2 left-2 z-10 p-1 rounded-full bg-background/50 hover:bg-background"
              >
                {selectedIds.has(insight.id) ? <CheckSquare className="w-5 h-5 text-primary" /> : <Square className="w-5 h-5 text-foreground/50" />}
              </button>
              <div 
                onClick={() => router.push(`/dashboard/files/${insight.id}`)}
                className="cursor-pointer"
              >
                {viewMode === 'grid' ? (
                  <div className="flex flex-col gap-2">
                    <div className="w-12 h-12 rounded-full bg-background border border-border flex items-center justify-center mb-2">
                      <FileText className="w-6 h-6 text-primary" />
                    </div>
                    <h3 className="font-serif text-lg text-foreground truncate">{insight.title || 'Untitled Document'}</h3>
                    <p className="text-xs text-foreground/70">{new Date(insight.created_at).toLocaleDateString()}</p>
                  </div>
                ) : (
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-background border border-border flex items-center justify-center">
                      <FileText className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-serif text-lg text-foreground truncate">{insight.title || 'Untitled Document'}</h3>
                      <p className="text-sm text-foreground/70">{new Date(insight.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <AnimatePresence>
        {selectedIds.size > 0 && (
          <motion.div 
            initial={{ y: 100 }}
            animate={{ y: 0 }}
            exit={{ y: 100 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-surface border border-border shadow-lg rounded-full px-6 py-3 flex items-center gap-4"
          >
            <span className="font-medium">{selectedIds.size} selected</span>
            <button onClick={handleBulkDelete} className="text-red-500 font-medium flex items-center gap-2">
              <Trash className="w-4 h-4" /> Delete Selected
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
