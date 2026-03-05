'use client';

import { useRef, useEffect, useState } from 'react';
import { UploadCloud, Mic, Square } from 'lucide-react';
import Link from 'next/link';
import { useFileDrop } from '@/hooks/useFileDrop';
import { useMicrophone } from '@/hooks/useMicrophone';
import { TactileButton } from '@/components/ui/TactileButton';
import { getAllInsights } from '@/lib/storage/localDbService';
import { Insight } from '@/lib/schemas';

export default function HubPage() {
  const { isDragging, onDragEnter, onDragOver, onDragLeave, onDrop, handleFileInput } = useFileDrop();
  const { isRecording, recordingTime, startRecording, stopRecording } = useMicrophone();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [insights, setInsights] = useState<Insight[]>([]);

  useEffect(() => {
    const fetchInsights = async () => {
      try {
        const data = await getAllInsights();
        setInsights(data);
      } catch (error) {
        console.error('Failed to fetch insights:', error);
      }
    };
    fetchInsights();
  }, []);

  const allActionItems = insights.flatMap(insight => {
    const items = insight.intelligence?.action_items || [];
    return items.map(task => ({
      task,
      insightId: insight.id,
      insightTitle: insight.title || 'Untitled Document'
    }));
  });

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <div className="flex-1 flex flex-col p-6 md:p-12 max-w-5xl mx-auto w-full gap-8 pb-12 overflow-y-auto">
      <header>
        <h1 className="text-3xl md:text-4xl font-serif font-medium tracking-tight mb-2">
          Intelligence Hub
        </h1>
        <p className="text-foreground/60 font-sans text-sm md:text-base">
          Tactical Command Center. Drop files, audio, and notes to begin import.
        </p>
      </header>

      {/* The Intake (Top 30%) */}
      <div className="w-full">
        <div
          onDragEnter={onDragEnter}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`w-full py-8 px-6 md:px-12 rounded-3xl border-2 border-dashed transition-all flex flex-col md:flex-row items-center justify-between gap-6 group relative cursor-pointer ${
            isDragging
              ? 'border-primary bg-primary/10 scale-[1.01]'
              : 'border-foreground/10 bg-primary/5 hover:bg-primary/10 hover:border-primary/20'
          }`}
        >
          <input
            type="file"
            multiple
            className="hidden"
            ref={fileInputRef}
            onChange={handleFileInput}
          />
          <div className="flex items-center gap-6">
            <div
              className={`w-14 h-14 rounded-full bg-background border flex items-center justify-center transition-transform shadow-sm shrink-0 ${
                isDragging
                  ? 'border-primary scale-110'
                  : 'border-foreground/10 group-hover:scale-110'
              }`}
            >
              <UploadCloud className="w-6 h-6 text-primary opacity-80" />
            </div>
            <div className="text-left">
              <h2 className="text-lg font-serif font-medium mb-1">
                {isDragging ? 'Drop to Save Locally' : 'Drop Intelligence Here'}
              </h2>
              <p className="text-xs font-mono text-foreground/50 max-w-sm">
                Markdown, TXT, or Native Audio.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-center z-10 shrink-0">
            {isRecording ? (
              <TactileButton
                onClick={(e) => {
                  e.stopPropagation();
                  stopRecording();
                }}
                className="flex items-center gap-3 px-6 py-3 rounded-full bg-red-500/10 border border-red-500/20 text-red-500 hover:bg-red-500/20 hover:opacity-100 animate-pulse"
              >
                <Square className="w-4 h-4 fill-current" />
                <span className="font-mono font-medium">{formatTime(recordingTime)}</span>
              </TactileButton>
            ) : (
              <TactileButton
                onClick={(e) => {
                  e.stopPropagation();
                  startRecording();
                }}
                className="flex items-center gap-3 px-6 py-3 rounded-full bg-background border border-foreground/10 text-foreground hover:bg-foreground/5 hover:border-foreground/20 hover:opacity-100 shadow-sm cursor-pointer"
              >
                <Mic className="w-4 h-4" />
                <span className="font-sans font-medium text-sm">Record Voice Note</span>
              </TactileButton>
            )}
          </div>
        </div>
      </div>

      {/* The Pulse (Middle Divider) */}
      <div className="w-full border-b border-foreground/10 pb-2">
        <p className="font-mono text-[10px] md:text-xs uppercase text-foreground/50 tracking-widest">
          INTELLIGENCE PULSE // {insights.length} IMPORTS PROCESSED // {allActionItems.length} ACTION ITEMS DETECTED
        </p>
      </div>

      {/* The Action Matrix (Bottom 70%) */}
      <div className="flex-1 flex flex-col">
        <h2 className="font-serif text-2xl mb-6">Active Matrix</h2>
        
        {allActionItems.length === 0 ? (
          <div className="py-12 text-center border border-dashed border-foreground/10 rounded-2xl bg-foreground/5">
            <p className="text-foreground/50 font-sans text-sm">
              No active intelligence detected. Import a document to begin.
            </p>
          </div>
        ) : (
          <div className="flex flex-col">
            {allActionItems.map((item, index) => (
              <div 
                key={`${item.insightId}-${index}`} 
                className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-foreground/5 py-4 hover:bg-foreground/5 px-2 -mx-2 rounded-lg transition-colors"
              >
                <p className="text-sm font-sans text-foreground/90 leading-relaxed flex-1">
                  {item.task}
                </p>
                <Link 
                  href={`/dashboard/files/${item.insightId}`}
                  className="shrink-0 inline-flex items-center"
                >
                  <span className="bg-primary/5 text-primary hover:bg-primary/10 transition-colors text-xs px-3 py-1.5 rounded-md font-medium truncate max-w-[200px]">
                    {item.insightTitle}
                  </span>
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
