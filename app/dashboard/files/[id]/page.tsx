'use client';

import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getInsight, deleteInsight } from '@/lib/storage/localDbService';
import { Insight } from '@/lib/schemas';
import { ArrowLeft, FileText, Mic, MessageSquare, Trash, ChevronDown } from 'lucide-react';
import { TactileButton } from '@/components/ui/TactileButton';
import { ChatDrawer } from '@/components/ui/ChatDrawer';
import { useUIStore } from '@/lib/store';
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { AudioPlayer } from '@/components/dashboard/AudioPlayer';

export default function InsightDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const id = resolvedParams.id;
  const router = useRouter();
  const { showToast } = useUIStore();
  const supabase = createClient();
  
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isRawTextOpen, setIsRawTextOpen] = useState(false);

  const [isRetrying, setIsRetrying] = useState(false);

  const { data: localInsight, isLoading: isLocalLoading } = useQuery({
    queryKey: ['localInsight', id],
    queryFn: () => getInsight(id),
    enabled: !!id,
  });

  const { data: supabaseInsight, isLoading: isSupabaseLoading } = useQuery({
    queryKey: ['supabaseInsight', id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from('insights')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!id && localInsight?.processing_status !== 'local' && localInsight?.processing_status !== 'uploading',
  });

  const insight = localInsight ? {
    ...localInsight,
    ...supabaseInsight,
    title: supabaseInsight?.title || localInsight.title || 'Untitled Insight',
    processing_status: supabaseInsight?.processing_status || localInsight.processing_status || 'local',
  } as Insight : null;

  const isLoading = isLocalLoading || (isSupabaseLoading && !supabaseInsight);

  const isTimedOut = insight?.processing_status === 'analyzing' && 
    insight?.updated_at && 
    (Date.now() - new Date(insight.updated_at).getTime() > 10 * 60 * 1000);

  const handleRetry = async () => {
    const dbInsight = insight as any;
    if (!insight || !dbInsight.audio_url) return;
    setIsRetrying(true);
    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          insightId: insight.id,
          audioUrl: dbInsight.audio_url,
          mimeType: insight.raw_content instanceof Blob ? insight.raw_content.type : 'audio/webm',
          isDeepAnalysisEnabled: false
        }),
      });

      if (!response.ok) {
        throw new Error('Retry failed');
      }
      showToast('Analysis restarted', 'success');
    } catch (error) {
      console.error('Retry error:', error);
      showToast('Failed to restart analysis', 'error');
    } finally {
      setIsRetrying(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <span className="font-mono text-sm text-foreground/50 animate-pulse">Loading intelligence...</span>
      </div>
    );
  }

  if (!insight) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
        <h2 className="text-2xl font-serif font-medium mb-2">Insight Not Found</h2>
        <p className="text-foreground/60 mb-6">The intelligence you are looking for does not exist or has been deleted.</p>
        <Link
          href="/dashboard/files"
          className="flex items-center gap-2 px-6 py-3 rounded-full bg-primary text-primary-foreground hover:opacity-90 transition-opacity font-medium text-sm focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Library
        </Link>
      </div>
    );
  }

  const isAudio = insight.raw_content instanceof Blob && insight.raw_content.type.startsWith('audio/') || 
                  insight.title.toLowerCase().includes('audio') || 
                  insight.title.toLowerCase().includes('voice');

  // Parse intelligence if it's a string (from Supabase)
  const intelligence = typeof insight.intelligence === 'string' 
    ? JSON.parse(insight.intelligence) 
    : insight.intelligence || {};

  // Aggressively map variables from either the top-level Supabase columns or the intelligence JSON
  const dbInsight = insight as any;
  const summary = dbInsight.summary || intelligence.summary;
  const sentiment = dbInsight.sentiment || intelligence.sentiment;
  const readingTime = dbInsight.reading_time || intelligence.reading_time;

  let topics = dbInsight.topics || intelligence.topics;
  if (typeof topics === 'string') {
    try { topics = JSON.parse(topics); } catch { topics = []; }
  }

  let highlights = dbInsight.highlights || intelligence.highlights;
  if (typeof highlights === 'string') {
    try { highlights = JSON.parse(highlights); } catch { highlights = []; }
  }

  let actionItems = dbInsight.action_items || intelligence.action_items;
  if (typeof actionItems === 'string') {
    try { actionItems = JSON.parse(actionItems); } catch { actionItems = []; }
  }

  const isAudioFile = dbInsight.audio_url && !dbInsight.audio_url.endsWith('.md') && !dbInsight.audio_url.endsWith('.txt');

  const handleDelete = async () => {
    await deleteInsight(id);
    showToast('Import deleted', 'info');
    router.push('/dashboard/files');
  };

  return (
    <div className="flex-1 flex flex-col p-6 md:p-12 max-w-4xl mx-auto w-full">
      <div className="mb-8 flex items-center justify-between">
        <Link
          href="/dashboard/files"
          className="inline-flex items-center gap-2 text-sm font-mono text-foreground/60 hover:text-foreground transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Library
        </Link>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setShowDeleteModal(true)}
            className="px-4 py-2 rounded-xl text-sm font-mono border transition-all text-red-500 hover:bg-red-500/10 border-red-500/20 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            aria-label="Delete this intelligence"
          >
            <div className="flex items-center gap-2">
              <Trash className="w-4 h-4" /> Delete
            </div>
          </button>
          <TactileButton 
            onClick={() => setIsChatOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-primary text-primary-foreground hover:opacity-90 transition-opacity font-medium text-sm focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            aria-label="Ask Document Assistant"
          >
            <MessageSquare className="w-4 h-4" /> Ask Assistant
          </TactileButton>
        </div>
      </div>

      <header className="mb-12">
        {isAudioFile && (
          <div className="mb-8">
            <AudioPlayer audioPath={dbInsight.audio_url} />
          </div>
        )}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-primary/5 border border-foreground/10 flex items-center justify-center">
            {isAudio ? <Mic className="w-5 h-5 text-primary" /> : <FileText className="w-5 h-5 text-primary" />}
          </div>
          <span className="font-mono text-xs text-foreground/50 uppercase tracking-wider">
            {new Date(insight.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
          </span>
        </div>
        <h1 className="text-3xl md:text-5xl font-serif font-medium tracking-tight leading-tight mb-4">
          {insight.title}
        </h1>
        
        {(sentiment || readingTime || (topics && topics.length > 0)) && (
          <div className="flex flex-col gap-4">
            <div className="font-mono text-xs text-foreground/50 uppercase tracking-wider">
              {sentiment && <span>{sentiment}</span>}
              {sentiment && readingTime && <span> · </span>}
              {readingTime && <span>{readingTime}</span>}
            </div>
            
            {topics && Array.isArray(topics) && topics.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {topics.map((topic: string, i: number) => (
                  <span key={i} className="bg-primary/10 text-primary uppercase text-xs px-3 py-1 rounded-full font-medium tracking-wider">
                    {topic}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
      </header>

      <div className="space-y-12">
        {/* Summary Section */}
        <section>
          <h2 className="text-xs font-mono text-foreground/50 uppercase tracking-wider mb-4">AI Summary</h2>
          {summary && summary !== 'Analyzing...' ? (
            <div className="p-6 md:p-8 rounded-3xl bg-primary/5 border border-foreground/10 space-y-8">
              <p className="font-serif text-lg md:text-xl leading-relaxed text-foreground/90">
                {summary}
              </p>
              
              {highlights && Array.isArray(highlights) && highlights.length > 0 && (
                <div>
                  <h3 className="text-xs font-mono text-foreground/50 uppercase tracking-wider mb-3">Highlights</h3>
                  <ul className="list-disc list-inside space-y-2 text-foreground/80">
                    {highlights.map((highlight: string, i: number) => (
                      <li key={i} className="leading-relaxed">{highlight}</li>
                    ))}
                  </ul>
                </div>
              )}
              
              {actionItems && Array.isArray(actionItems) && actionItems.length > 0 && (
                <div>
                  <h3 className="text-xs font-mono text-foreground/50 uppercase tracking-wider mb-3">Action Items</h3>
                  <ul className="space-y-3">
                    {actionItems.map((item: string, i: number) => (
                      <li key={i} className="flex items-start gap-3 text-foreground/80">
                        <input type="checkbox" disabled className="mt-1.5 rounded border-foreground/20 text-primary focus:ring-primary" />
                        <span className="leading-relaxed">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : insight.processing_status === 'failed' || isTimedOut ? (
            <div className="p-6 rounded-2xl border border-dashed border-red-500/20 bg-red-500/5 flex flex-col items-center justify-center text-center gap-4">
              <span className="font-mono text-sm text-red-500/80">
                Analysis failed or timed out.
              </span>
              <button 
                onClick={handleRetry}
                disabled={isRetrying}
                className="px-4 py-2 rounded-full bg-red-500 text-white text-sm font-medium hover:bg-red-600 transition-colors disabled:opacity-50"
              >
                {isRetrying ? 'Retrying...' : 'Retry Analysis'}
              </button>
            </div>
          ) : (
            <div className="p-6 md:p-8 rounded-3xl bg-primary/5 border border-foreground/10 space-y-8">
              <div className="space-y-3">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded-md animate-pulse w-full"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded-md animate-pulse w-11/12"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded-md animate-pulse w-4/5"></div>
              </div>
              
              <div>
                <h3 className="text-xs font-mono text-foreground/50 uppercase tracking-wider mb-3">Highlights</h3>
                <div className="space-y-3">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded-md animate-pulse w-3/4"></div>
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded-md animate-pulse w-5/6"></div>
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded-md animate-pulse w-2/3"></div>
                </div>
              </div>
              
              <div>
                <h3 className="text-xs font-mono text-foreground/50 uppercase tracking-wider mb-3">Action Items</h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-4 h-4 rounded bg-gray-200 dark:bg-gray-700 animate-pulse"></div>
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded-md animate-pulse w-1/2"></div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-4 h-4 rounded bg-gray-200 dark:bg-gray-700 animate-pulse"></div>
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded-md animate-pulse w-2/3"></div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Raw Content Section */}
        {insight.raw_content && typeof insight.raw_content === 'string' && (
          <section>
            <button 
              onClick={() => setIsRawTextOpen(!isRawTextOpen)}
              className="flex items-center gap-2 text-xs font-mono text-foreground/50 uppercase tracking-wider mb-4 hover:text-foreground transition-colors"
            >
              Raw Document Transcript
              <ChevronDown className={`w-4 h-4 transition-transform ${isRawTextOpen ? 'rotate-180' : ''}`} />
            </button>
            {isRawTextOpen && (
              <div className="p-6 rounded-2xl bg-background border border-foreground/10 overflow-x-auto animate-in fade-in slide-in-from-top-2 duration-300">
                <pre className="font-mono text-xs md:text-sm text-foreground/70 whitespace-pre-wrap break-words">
                  {insight.raw_content}
                </pre>
              </div>
            )}
          </section>
        )}

        {/* Telemetry Footer */}
        {insight.intelligence?.metadata && (
          <div className="text-xs text-gray-500 font-mono flex gap-4 mt-8 pt-4 border-t border-gray-200 dark:border-gray-800">
            <span>Model: {insight.intelligence.metadata.model}</span>
            <span>|</span>
            <span>Latency: {insight.intelligence.metadata.duration}</span>
          </div>
        )}
      </div>

      <ChatDrawer 
        isOpen={isChatOpen} 
        onClose={() => setIsChatOpen(false)} 
        documentContext={typeof insight.raw_content === 'string' ? insight.raw_content : summary || ''} 
      />

      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-background p-6 shadow-2xl border border-foreground/10">
            <h2 className="font-serif text-xl mb-4">Delete Intelligence?</h2>
            <p className="text-foreground/60 mb-6">This action cannot be undone.</p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
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

