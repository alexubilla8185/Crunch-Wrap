'use client';

import { useState, useRef, useEffect } from 'react';
import { Play, Pause, Download, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface AudioPlayerProps {
  audioPath: string;
}

export function AudioPlayer({ audioPath }: AudioPlayerProps) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [progress, setProgress] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);
  const isMounted = useRef(true);
  const supabase = createClient();

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  // When signedUrl is set and we are supposed to be playing, play the audio
  useEffect(() => {
    if (signedUrl && isPlaying && audioRef.current) {
      audioRef.current.play().catch(console.error);
    }
  }, [signedUrl, isPlaying]);

  const fetchSignedUrl = async () => {
    if (!audioPath) return null;
    
    const { data, error } = await supabase.storage
      .from('meetings')
      .createSignedUrl(audioPath, 3600);
    
    if (!isMounted.current) return null;

    if (data) {
      setSignedUrl(data.signedUrl);
      return data.signedUrl;
    } else {
      console.error('Error generating signed URL:', error);
      return null;
    }
  };

  const onPlayClick = async () => {
    if (isPlaying) {
      if (audioRef.current) audioRef.current.pause();
      setIsPlaying(false);
      return;
    }

    if (signedUrl) {
      if (audioRef.current) audioRef.current.play().catch(console.error);
      setIsPlaying(true);
      return;
    }

    setIsLoading(true);
    const url = await fetchSignedUrl();
    if (!isMounted.current) return;
    setIsLoading(false);
    
    if (url) {
      setIsPlaying(true);
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
    let downloadUrl = signedUrl;
    if (!downloadUrl) {
      setIsLoading(true);
      downloadUrl = await fetchSignedUrl();
      if (!isMounted.current) return;
      setIsLoading(false);
    }

    if (downloadUrl) {
      const response = await fetch(downloadUrl);
      const blob = await response.blob();
      const objectUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = objectUrl;
      a.download = audioPath.split('/').pop() || 'audio.webm';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(objectUrl);
      document.body.removeChild(a);
    }
  };

  return (
    <div className="bg-foreground/5 border border-foreground/10 p-4 rounded-2xl flex items-center gap-4">
      {signedUrl && (
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
      )}
      
      <button 
        onClick={onPlayClick} 
        disabled={isLoading}
        className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:opacity-90 transition-opacity disabled:opacity-50"
      >
        {isLoading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : isPlaying ? (
          <Pause className="w-4 h-4" />
        ) : (
          <Play className="w-4 h-4 ml-0.5" />
        )}
      </button>

      <div className="flex-1 h-1 bg-foreground/10 rounded-full overflow-hidden">
        <div className="h-full bg-primary transition-all duration-100" style={{ width: `${progress}%` }} />
      </div>

      <button onClick={toggleSpeed} className="px-3 py-1.5 rounded-lg bg-background border border-foreground/10 text-xs font-mono hover:bg-foreground/5 transition-colors">
        {playbackRate}x
      </button>

      <button 
        onClick={handleDownload} 
        disabled={isLoading}
        className="w-10 h-10 rounded-full bg-background border border-foreground/10 flex items-center justify-center hover:bg-foreground/5 transition-colors disabled:opacity-50"
      >
        <Download className="w-4 h-4" />
      </button>
    </div>
  );
}
