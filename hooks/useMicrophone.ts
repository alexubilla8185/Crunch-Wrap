import { useState, useRef, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { saveInsight } from '@/lib/storage/localDbService';
import type { Insight } from '@/lib/schemas';
import { useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { useUIStore } from '@/lib/store';
import { unstable_batchedUpdates } from 'react-dom';

function encodeWAV(samples: Float32Array, sampleRate: number): Blob {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);

  const writeString = (view: DataView, offset: number, string: string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };

  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + samples.length * 2, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(view, 36, 'data');
  view.setUint32(40, samples.length * 2, true);

  let offset = 44;
  for (let i = 0; i < samples.length; i++, offset += 2) {
    let s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
  }

  return new Blob([view], { type: 'audio/wav' });
}

export function useMicrophone() {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const router = useRouter();
  const queryClient = useQueryClient();
  const supabase = createClient();
  const { showToast } = useUIStore();

  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const workletNodeRef = useRef<AudioWorkletNode | null>(null);
  const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const audioChunksRef = useRef<Float32Array[]>([]);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const cleanup = useCallback(() => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }

    if (workletNodeRef.current) {
      workletNodeRef.current.disconnect();
      workletNodeRef.current = null;
    }

    if (sourceNodeRef.current) {
      sourceNodeRef.current.disconnect();
      sourceNodeRef.current = null;
    }

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }

    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
  }, []);

  const startRecording = useCallback(async () => {
    try {
      audioChunksRef.current = [];
      setRecordingTime(0);

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      mediaStreamRef.current = stream;
      
      // Use 16kHz for optimal speech recognition compatibility
      const audioContext = new AudioContext({ sampleRate: 16000 });
      audioContextRef.current = audioContext;

      await audioContext.audioWorklet.addModule('/audio-processor.js');

      const source = audioContext.createMediaStreamSource(stream);
      sourceNodeRef.current = source;

      const workletNode = new AudioWorkletNode(audioContext, 'audio-processor');
      workletNodeRef.current = workletNode;

      workletNode.port.onmessage = (event: MessageEvent<Float32Array>) => {
        audioChunksRef.current.push(event.data);
      };

      source.connect(workletNode);
      // Connect to destination but output silence from processor to keep it alive
      workletNode.connect(audioContext.destination);

      setIsRecording(true);

      timerIntervalRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (error) {
      console.error('Failed to start recording:', error);
      cleanup();
    }
  }, [cleanup]);

  const stopRecording = useCallback(async () => {
    setIsRecording(false);
    
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }

    const sampleRate = audioContextRef.current?.sampleRate || 16000;
    
    // Calculate total length before cleanup
    const totalLength = audioChunksRef.current.reduce((acc, chunk) => acc + chunk.length, 0);
    
    if (totalLength === 0) {
      cleanup();
      return;
    }

    const combinedChunks = new Float32Array(totalLength);
    
    let offset = 0;
    for (const chunk of audioChunksRef.current) {
      combinedChunks.set(chunk, offset);
      offset += chunk.length;
    }

    cleanup();

    const wavBlob = encodeWAV(combinedChunks, sampleRate);
    const now = new Date().toISOString();
    const id = crypto.randomUUID();

    const newInsight: Insight = {
      id,
      title: `Voice Note - ${new Date().toLocaleString()}`,
      raw_content: wavBlob,
      processing_status: 'uploading',
      created_at: now,
      updated_at: now,
    };

    try {
      await saveInsight(newInsight);
      
      // Update cache for optimistic UI
      queryClient.setQueryData(['localInsight', id], newInsight);
      queryClient.setQueryData(['insight', id], newInsight);
      queryClient.setQueriesData({ queryKey: ['insights'] }, (oldList: any[] | undefined) => {
        if (!oldList) return [newInsight];
        return [newInsight, ...oldList];
      });
      queryClient.setQueriesData({ queryKey: ['localInsights'] }, (oldList: any[] | undefined) => {
        if (!oldList) return [newInsight];
        return [newInsight, ...oldList];
      });

      console.log('Successfully saved voice note locally:', id);
      router.push(`/dashboard/files/${id}`);

      // --- FOREGROUND PIPELINE ---
      (async () => {
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) throw new Error('No user session available');

          const mimeType = 'audio/wav';
          const fileName = `${Date.now()}-${id}.wav`;
          const filePath = `${user.id}/${fileName}`;

          // Get Signed Upload URL
          const { data: signedData, error: signedError } = await supabase.storage
            .from('meetings')
            .createSignedUploadUrl(filePath);
          
          if (signedError) throw signedError;

          // Upload using raw PUT request
          if (wavBlob.size < 1000) throw new Error("Blob is corrupted or empty before upload");

          const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_DATABASE_URL;
          const finalUrl = new URL(signedData.signedUrl, supabaseUrl!).toString();

          const uploadResponse = await fetch(finalUrl, {
            method: 'PUT',
            body: wavBlob,
            headers: { 'Content-Type': mimeType }
          });

          if (!uploadResponse.ok) throw new Error('Failed to upload file');

          // Insert into Supabase DB
          const { data: dbInsight, error: dbError } = await supabase
            .from('insights')
            .insert({
              id: id,
              user_id: user.id,
              processing_status: 'analyzing',
              audio_url: filePath,
              summary: 'Analyzing...',
            })
            .select()
            .single();

          if (dbError) throw dbError;

          // Mark as analyzing locally
          const analyzingInsight = {
            ...newInsight,
            processing_status: 'analyzing' as const,
            updated_at: new Date().toISOString(),
          };
          await saveInsight(analyzingInsight);
          
          // Update cache for analyzing state
          queryClient.setQueryData(['localInsight', id], analyzingInsight);
          queryClient.setQueryData(['insight', id], analyzingInsight);
          queryClient.setQueriesData({ queryKey: ['insights'] }, (oldList: any[] | undefined) => {
            if (!oldList) return oldList;
            return oldList.map(item => item.id === id ? { ...item, processing_status: 'analyzing' } : item);
          });
          queryClient.setQueriesData({ queryKey: ['localInsights'] }, (oldList: any[] | undefined) => {
            if (!oldList) return oldList;
            return oldList.map(item => item.id === id ? { ...item, processing_status: 'analyzing' } : item);
          });

          // Call API
          const apiBody: any = { 
            insightId: dbInsight.id,
            mimeType: mimeType,
            isDeepAnalysisEnabled: false,
            audioUrl: filePath
          };

          const response = await fetch('/api/analyze', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(apiBody),
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Analysis failed');
          }

          const responseData = await response.json();
          console.log("API Payload:", responseData);
          const { intelligence, dbInsight: returnedDbInsight } = responseData;

          unstable_batchedUpdates(() => {
            // Update Cache
            const updatedData = {
              ...returnedDbInsight,
              processing_status: 'completed',
              title: intelligence?.title,
              intelligence: intelligence
            };

            queryClient.setQueryData(['insight', id], (oldData: any) => ({ ...oldData, ...updatedData }));
            queryClient.setQueryData(['localInsight', id], (oldData: any) => ({ ...oldData, ...updatedData }));
            queryClient.setQueryData(['supabaseInsight', id], (oldData: any) => ({ ...oldData, ...updatedData }));

            queryClient.setQueriesData({ queryKey: ['insights'] }, (oldList: any[] | undefined) => {
              if (!oldList) return oldList;
              return oldList.map(item => item.id === id ? { ...item, ...updatedData } : item);
            });
            
            queryClient.setQueriesData({ queryKey: ['localInsights'] }, (oldList: any[] | undefined) => {
              if (!oldList) return oldList;
              return oldList.map(item => item.id === id ? { ...item, ...updatedData } : item);
            });
          });

          // Mark as completed in local DB
          await saveInsight({
            ...newInsight,
            ...returnedDbInsight,
            processing_status: 'completed',
            intelligence: intelligence,
            title: intelligence?.title,
            updated_at: new Date().toISOString(),
          });

        } catch (error) {
          console.error(`Foreground processing failed for voice note ${id}:`, error);
          // Fallback to local status so the background worker can pick it up if needed
        }
      })();

    } catch (error) {
      console.error('Failed to save voice note:', error);
      showToast('Failed to save voice note', 'error');
    }

    audioChunksRef.current = [];
    setRecordingTime(0);
  }, [cleanup, router, queryClient, supabase, showToast]);

  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  return {
    isRecording,
    recordingTime,
    startRecording,
    stopRecording,
  };
}
