'use client';

import { useState, useRef, useEffect } from 'react';
import { Play, Pause, Download, FastForward } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface AudioPlayerProps {
  audioPath: string;
}

export function AudioPlayer({ audioPath }: AudioPlayerProps) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [progress, setProgress] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);
  const supabase = createClient();

  useEffect(() => {
    const getSignedUrl = async () => {
      console.log('Generating signed URL for:', audioPath);
      const { data, error } = await supabase.storage
        .from('meetings')
        .createSignedUrl(audioPath, 3600);
      
      if (data) {
        console.log('Signed URL generated:', data.signedUrl);
        setSignedUrl(data.signedUrl);
      } else {
        console.error('Error generating signed URL:', error);
      }
    };

    getSignedUrl();
  }, [audioPath, supabase]);

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const toggleSpeed = () => {
    const rates = [1, 1.5, 2];
    const nextRate = rates[(rates.indexOf(playbackRate) + 1) % rates.length];
    setPlaybackRate(nextRate);
    if (audioRef.current) {
      audioRef.current.playbackRate = nextRate;
    }
  };

  const handleDownload = async () => {
    if (signedUrl) {
      const response = await fetch(signedUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = audioPath.split('/').pop() || 'audio.webm';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    }
  };

  if (!signedUrl) return <div className="h-16 animate-pulse bg-foreground/5 rounded-2xl" />;

  return (
    <div className="bg-foreground/5 border border-foreground/10 p-4 rounded-2xl flex items-center gap-4">
      <audio
        ref={audioRef}
        src={signedUrl}
        onTimeUpdate={() => {
          if (audioRef.current) {
            setProgress((audioRef.current.currentTime / audioRef.current.duration) * 100);
          }
        }}
        onEnded={() => setIsPlaying(false)}
      />
      
      <button onClick={togglePlay} className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:opacity-90 transition-opacity">
        {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
      </button>

      <div className="flex-1 h-1 bg-foreground/10 rounded-full overflow-hidden">
        <div className="h-full bg-primary transition-all duration-100" style={{ width: `${progress}%` }} />
      </div>

      <button onClick={toggleSpeed} className="px-3 py-1.5 rounded-lg bg-background border border-foreground/10 text-xs font-mono hover:bg-foreground/5 transition-colors">
        {playbackRate}x
      </button>

      <button onClick={handleDownload} className="w-10 h-10 rounded-full bg-background border border-foreground/10 flex items-center justify-center hover:bg-foreground/5 transition-colors">
        <Download className="w-4 h-4" />
      </button>
    </div>
  );
}
