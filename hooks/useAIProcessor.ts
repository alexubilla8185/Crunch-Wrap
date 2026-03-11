import { useAudioStore } from '@/lib/audioStore';
import { useUIStore } from '@/lib/store';
import { saveInsight } from '@/lib/storage/localDbService';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';

export function useAIProcessor() {
  const { setLocalSaveStatus } = useAudioStore();
  const { showToast } = useUIStore();
  const router = useRouter();
  const queryClient = useQueryClient();

  const processAudio = async (audioUrl: string, isDeepAnalysisEnabled: boolean) => {
    setLocalSaveStatus('saving'); // Reusing status for "Analyzing"
    showToast('Analyzing Activity...', 'info');
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        body: JSON.stringify({ audioUrl, isDeepAnalysisEnabled }),
      });
      const data = await res.json();
      
      const now = new Date().toISOString();
      const insightId = crypto.randomUUID();

      // Update Cache
      queryClient.setQueryData(['insight', insightId], (oldData: any) => ({
        ...oldData,
        processing_status: 'completed',
        title: data.title || 'Audio Analysis',
        intelligence: data
      }));
      queryClient.setQueriesData({ queryKey: ['insights'] }, (oldList: any[] | undefined) => {
        if (!oldList) return oldList;
        return oldList.map(item => item.id === insightId ? { ...item, processing_status: 'completed', title: data.title || 'Audio Analysis' } : item);
      });
      
      await saveInsight({
        id: insightId,
        title: data.title || 'Audio Analysis',
        raw_content: data.summary,
        processing_status: 'completed',
        intelligence: data,
        created_at: now,
        updated_at: now,
      });
      
      showToast('Analysis complete', 'success');
      router.push(`/dashboard/files/${insightId}`);
    } catch (e) {
      showToast('Analysis failed', 'error');
    } finally {
      setLocalSaveStatus('idle');
    }
  };
  return { processAudio };
}
