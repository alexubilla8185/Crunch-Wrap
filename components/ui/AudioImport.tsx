'use client';

import { useRef } from 'react';
import { useAudioStore } from '@/lib/audioStore';
import { uploadAudio } from '@/lib/utils/audioUploader';
import { saveAudioLocally, getAudioLocally, deleteAudioLocally } from '@/lib/utils/localDbService';
import { useAIProcessor } from '@/hooks/useAIProcessor';
import { TactileButton } from './TactileButton';
import { Mic, Upload, Loader2, AlertCircle, RefreshCw } from 'lucide-react';

export default function AudioImport() {
  const { 
    isRecording, setIsRecording, 
    recordingDuration, setRecordingDuration,
    isUploading, setIsUploading,
    localSaveStatus, setLocalSaveStatus,
    localDraftId, setLocalDraftId,
    isDeepAnalysisEnabled, setIsDeepAnalysisEnabled,
  } = useAudioStore();

  const { processAudio: processAI } = useAIProcessor();

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const processAudio = async (blob: Blob) => {
    const id = crypto.randomUUID();
    setLocalDraftId(id);
    setLocalSaveStatus('saving');
    
    try {
      await saveAudioLocally(id, blob);
      setLocalSaveStatus('saved');
      await performUpload(id, blob);
    } catch (error) {
      console.error('Local save error:', error);
      setLocalSaveStatus('error');
    }
  };

  const performUpload = async (id: string, blob: Blob) => {
    setIsUploading(true);
    try {
      const url = await uploadAudio(blob);
      await deleteAudioLocally(id);
      setLocalDraftId(null);
      setLocalSaveStatus('idle');
      await processAI(url, isDeepAnalysisEnabled);
    } catch (error) {
      console.error('Upload error:', error);
      setLocalSaveStatus('error');
    } finally {
      setIsUploading(false);
    }
  };

  const retryUpload = async () => {
    if (!localDraftId) return;
    const blob = await getAudioLocally(localDraftId);
    if (blob) {
      await performUpload(localDraftId, blob);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await processAudio(audioBlob);
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      setRecordingDuration(0);
      timerRef.current = setInterval(() => {
        const currentDuration = useAudioStore.getState().recordingDuration;
        setRecordingDuration(currentDuration + 1);
      }, 1000);
    } catch (error) {
      console.error('Error accessing microphone:', error);
      alert('Could not access microphone. Please check permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  return (
    <div className="p-6 border border-black/10 dark:border-white/10 rounded-[24px] bg-background shadow-sm space-y-6">
      <h2 className="text-lg font-serif">Audio Import</h2>
      
      <div className="flex gap-4">
        <TactileButton 
          onClick={isRecording ? stopRecording : startRecording}
          className={`flex-1 flex items-center justify-center gap-2 ${isRecording ? 'bg-red-500 text-white' : ''}`}
        >
          <Mic size={20} />
          {isRecording ? `Stop (${recordingDuration}s)` : 'Record Live'}
        </TactileButton>
        
        <input 
          type="file" 
          accept="audio/mpeg,audio/webm" 
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (file) await processAudio(file);
          }}
          className="hidden"
          id="file-upload"
        />
        <label htmlFor="file-upload" className="flex-1">
          <div className="h-full flex items-center justify-center gap-2 border border-black/10 dark:border-white/10 rounded-[24px] cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
            <Upload size={20} />
            Import File
          </div>
        </label>
      </div>

      <div className="flex items-center gap-2 text-sm">
        <input 
          type="checkbox" 
          checked={isDeepAnalysisEnabled}
          onChange={(e) => setIsDeepAnalysisEnabled(e.target.checked)}
          id="deep-analysis"
        />
        <label htmlFor="deep-analysis">Deep Analysis (For meetings &gt; 15 mins)</label>
      </div>

      {localSaveStatus === 'saving' && (
        <div className="flex items-center justify-center gap-2 text-gray-500 dark:text-gray-400">
          <Loader2 className="animate-spin" />
          Securing locally...
        </div>
      )}

      {isUploading && (
        <div className="flex items-center justify-center gap-2 text-gray-500 dark:text-gray-400">
          <Loader2 className="animate-spin" />
          Importing to cloud...
        </div>
      )}

      {localSaveStatus === 'error' && (
        <div className="p-4 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-[24px] flex items-center gap-3 text-red-700 dark:text-red-400">
          <AlertCircle size={20} />
          <div className="flex-1">
            <p className="text-sm font-medium">Network disconnected.</p>
            <p className="text-xs">Your audio is saved securely on your device.</p>
          </div>
          <TactileButton onClick={retryUpload} className="flex items-center gap-2 text-xs">
            <RefreshCw size={14} />
            Retry Import
          </TactileButton>
        </div>
      )}
    </div>
  );
}
