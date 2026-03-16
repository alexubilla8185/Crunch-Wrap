'use client';

import { useRef, useState, useMemo } from 'react';
import { UploadCloud, Mic, Square, FileText, Activity, Zap, AlertCircle, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useFileDrop } from '@/hooks/useFileDrop';
import { useAudioRecorder } from '@/hooks/useAudioRecorder';
import { RecordModal } from '@/components/ui/RecordModal';
import { GoogleDrivePicker } from '@/components/ui/GoogleDrivePicker';
import { TactileButton } from '@/components/ui/TactileButton';
import { getAllInsights } from '@/lib/storage/localDbService';
import { Insight } from '@/lib/schemas';
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { shouldUpdateStatus } from '@/lib/utils';

export default function HubPage() {
  const { isDragging, onDragEnter, onDragOver, onDragLeave, onDrop, handleFileInput } = useFileDrop();
  const { isRecording, recordingTime, startMicRecording, startScreenAudioRecording, stopRecording } = useAudioRecorder();
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  const { data: localInsights = [] } = useQuery({
    queryKey: ['localInsights'],
    queryFn: async () => {
      const data = await getAllInsights();
      return data;
    }
  });

  const { data: supabaseInsights = [] } = useQuery({
    queryKey: ['insights'],
    queryFn: async () => {
      const { data, error } = await supabase.from('insights').select('*');
      if (error) throw error;
      return data;
    }
  });

  const insights = useMemo(() => {
    const mergedMap = new Map<string, Insight>();

    supabaseInsights.forEach(remote => {
      mergedMap.set(remote.id, remote as Insight);
    });

    localInsights.forEach(local => {
      if (mergedMap.has(local.id)) {
        const remote = mergedMap.get(local.id)!;
        const finalStatus = shouldUpdateStatus(local.processing_status, remote.processing_status)
          ? remote.processing_status
          : local.processing_status;
        
        mergedMap.set(local.id, {
          ...local,
          ...remote,
          title: remote.title || local.title,
          processing_status: finalStatus || local.processing_status,
        } as Insight);
      } else {
        mergedMap.set(local.id, local as Insight);
      }
    });

    return Array.from(mergedMap.values()).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [localInsights, supabaseInsights]);

  const metrics = useMemo(() => {
    let actionPipeline = 0;
    let intelligenceDensity = 0;

    insights.forEach(insight => {
      actionPipeline += insight.intelligence?.action_items?.length || 0;
      intelligenceDensity += (insight.intelligence?.highlights?.length || 0) + (insight.intelligence?.topics?.length || 0);
    });

    return {
      knowledgeVault: insights.length,
      actionPipeline,
      intelligenceDensity
    };
  }, [insights]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <div className="flex-1 flex flex-col p-4 sm:p-6 md:p-8 max-w-6xl mx-auto w-full gap-8 pb-12">
      <header>
        <h1 className="text-3xl md:text-4xl font-serif font-medium tracking-tight mb-2">
          Overview
        </h1>
        <p className="text-foreground/70 font-sans text-sm md:text-base">
          Drop files, audio, and notes to generate instant AI summaries.
        </p>
      </header>

      {/* The Expressive Dropzone (Top Section) */}
      <div className="w-full">
        <div
          onDragEnter={onDragEnter}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`w-full py-12 px-6 md:px-12 rounded-[32px] transition-transform duration-300 hover:scale-[1.01] flex flex-col md:flex-row items-center justify-between gap-6 group relative cursor-pointer overflow-hidden !outline-none focus:!outline-none focus-visible:!outline-none focus-visible:!ring-0 focus:!ring-0 border-2 ${
            isDragging
              ? 'bg-primary/10 border-primary/50 scale-[1.01]'
              : 'bg-surface border-border hover:bg-foreground/5'
          }`}
        >
          <input
            type="file"
            multiple
            className="hidden"
            ref={fileInputRef}
            onChange={handleFileInput}
          />
          <div className="flex items-center gap-6 relative z-10">
            <div
              className={`w-16 h-16 rounded-full bg-background flex items-center justify-center transition-transform shadow-sm shrink-0 ${
                isDragging
                  ? 'scale-110 text-primary'
                  : 'group-hover:scale-110 text-foreground/50 group-hover:text-primary'
              }`}
            >
              <UploadCloud className="w-7 h-7" />
            </div>
            <div className="text-left">
              <h2 className="text-xl font-serif font-medium mb-1 text-foreground">
                {isDragging ? 'Drop to Save Locally' : 'Drop Intelligence Here'}
              </h2>
              <p className="text-sm font-sans text-foreground/70 max-w-sm">
                Markdown, TXT, or Native Audio.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 justify-center z-10 shrink-0">
            <div onClick={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()}>
              <GoogleDrivePicker />
            </div>
            {isRecording ? (
              <TactileButton
                onClick={(e) => {
                  e.stopPropagation();
                  stopRecording();
                }}
                className="flex items-center gap-3 px-6 py-3 rounded-full bg-red-500 text-white hover:bg-red-600 transition-colors animate-pulse shadow-md"
              >
                <Square className="w-4 h-4 fill-current" />
                <span className="font-mono font-medium">{formatTime(recordingTime)}</span>
              </TactileButton>
            ) : (
              <TactileButton
                onClick={(e) => {
                  e.stopPropagation();
                  setIsRecordModalOpen(true);
                }}
                className="flex items-center gap-3 px-6 py-3 rounded-full bg-background text-foreground hover:bg-foreground/5 transition-colors shadow-sm cursor-pointer"
              >
                <Mic className="w-4 h-4" />
                <span className="font-sans font-medium text-sm">Smart Record</span>
              </TactileButton>
            )}
          </div>
        </div>
      </div>

      <RecordModal
        isOpen={isRecordModalOpen}
        onClose={() => setIsRecordModalOpen(false)}
        onStartMic={startMicRecording}
        onStartScreen={startScreenAudioRecording}
      />

      {/* M3 Metric Cards (Middle Section) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
        <div className="bg-primary/10 text-primary rounded-[24px] p-6 shadow-sm flex flex-col justify-center relative overflow-hidden group border border-primary/20">
          <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
            <FileText className="w-16 h-16" />
          </div>
          <p className="text-sm font-medium mb-2 relative z-10 opacity-80">Knowledge Vault</p>
          <p className="text-4xl font-serif relative z-10">{metrics.knowledgeVault}</p>
        </div>
        <div className="bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-[24px] p-6 shadow-sm flex flex-col justify-center relative overflow-hidden group border border-blue-500/20">
          <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
            <Activity className="w-16 h-16" />
          </div>
          <p className="text-sm font-medium mb-2 relative z-10 opacity-80">Action Pipeline</p>
          <p className="text-4xl font-serif relative z-10">{metrics.actionPipeline}</p>
        </div>
        <div className="bg-purple-500/10 text-purple-600 dark:text-purple-400 rounded-[24px] p-6 shadow-sm flex flex-col justify-center relative overflow-hidden group border border-purple-500/20">
          <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
            <Zap className="w-16 h-16" />
          </div>
          <p className="text-sm font-medium mb-2 relative z-10 opacity-80">Intelligence Density</p>
          <p className="text-4xl font-serif relative z-10">{metrics.intelligenceDensity}</p>
        </div>
      </div>

      {/* The Active Matrix (Bottom Section) */}
      <div className="flex-1 flex flex-col w-full outline-none focus:outline-none ring-0 focus-visible:ring-0">
        <h2 className="font-serif text-2xl mb-6">Recent Insights</h2>
        
        {insights.length === 0 ? (
          <div className="py-12 text-center border border-dashed border-border rounded-[24px] bg-foreground/5">
            <p className="text-foreground/70 font-sans text-sm">
              No files yet. Import a document or record audio to begin.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out">
            {insights.slice(0, 6).map((insight) => (
              <Link 
                key={insight.id}
                href={`/dashboard/files/${insight.id}`}
                className="bg-surface rounded-[24px] p-6 shadow-sm hover:shadow-md transition-all hover:-translate-y-1 flex flex-col gap-2 group border border-transparent hover:border-border"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="text-xs text-foreground/70 font-medium tracking-wide uppercase">
                    {new Date(insight.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>
                  {insight.processing_status === 'failed' && <AlertCircle className="w-4 h-4 text-red-500" />}
                  {(insight.processing_status === 'analyzing' || insight.processing_status === 'uploading') && <Loader2 className="w-4 h-4 text-primary animate-spin" />}
                </div>
                <h3 className="font-serif text-lg font-medium truncate group-hover:text-primary transition-colors">
                  {insight.title || 'Untitled Document'}
                </h3>
                <p className="text-sm text-foreground/70 line-clamp-2 mt-2 leading-relaxed">
                  {insight.intelligence?.summary || 'Processing intelligence...'}
                </p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
