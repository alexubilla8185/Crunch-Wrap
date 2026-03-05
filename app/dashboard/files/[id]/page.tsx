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

export default function InsightDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const id = resolvedParams.id;
  const router = useRouter();
  const { showToast } = useUIStore();
  
  const [insight, setInsight] = useState<Insight | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isRawTextOpen, setIsRawTextOpen] = useState(false);

  useEffect(() => {
    const fetchInsight = async () => {
      try {
        if (id) {
          const data = await getInsight(id);
          setInsight(data || null);
        }
      } catch (error) {
        console.error('Failed to fetch insight:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchInsight();
  }, [id]);

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
        
        {insight.intelligence && (
          <div className="flex flex-col gap-4">
            <div className="font-mono text-xs text-foreground/50 uppercase tracking-wider">
              {insight.intelligence.sentiment} · {insight.intelligence.reading_time}
            </div>
            
            {insight.intelligence.topics && insight.intelligence.topics.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {insight.intelligence.topics.map((topic, i) => (
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
          {insight.intelligence?.summary ? (
            <div className="p-6 md:p-8 rounded-3xl bg-primary/5 border border-foreground/10 space-y-8">
              <p className="font-serif text-lg md:text-xl leading-relaxed text-foreground/90">
                {insight.intelligence.summary}
              </p>
              
              {insight.intelligence?.highlights && insight.intelligence.highlights.length > 0 && (
                <div>
                  <h3 className="text-xs font-mono text-foreground/50 uppercase tracking-wider mb-3">Highlights</h3>
                  <ul className="list-disc list-inside space-y-2 text-foreground/80">
                    {insight.intelligence.highlights.map((highlight, i) => (
                      <li key={i} className="leading-relaxed">{highlight}</li>
                    ))}
                  </ul>
                </div>
              )}
              
              {insight.intelligence?.action_items && insight.intelligence.action_items.length > 0 && (
                <div>
                  <h3 className="text-xs font-mono text-foreground/50 uppercase tracking-wider mb-3">Action Items</h3>
                  <ul className="space-y-3">
                    {insight.intelligence.action_items.map((item, i) => (
                      <li key={i} className="flex items-start gap-3 text-foreground/80">
                        <input type="checkbox" disabled className="mt-1.5 rounded border-foreground/20 text-primary focus:ring-primary" />
                        <span className="leading-relaxed">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <div className="p-6 rounded-2xl border border-dashed border-foreground/20 flex items-center justify-center">
              <span className="font-mono text-sm text-foreground/50">
                {insight.processing_status === 'failed' ? 'Analysis failed.' : 'Analysis is being generated...'}
              </span>
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
      </div>

      <ChatDrawer 
        isOpen={isChatOpen} 
        onClose={() => setIsChatOpen(false)} 
        documentContext={typeof insight.raw_content === 'string' ? insight.raw_content : insight.intelligence?.summary || ''} 
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
