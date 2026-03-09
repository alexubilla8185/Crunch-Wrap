import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { getAllLocalInsights, saveInsight } from '@/lib/storage/localDbService';
import { useUIStore } from '@/lib/store';
import { createClient } from '@/lib/supabase/client';

export function useImportOrchestrator() {
  const isSyncing = useRef(false);
  const { showToast } = useUIStore();
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const syncPendingInsights = async () => {
      if (isSyncing.current) return;

      try {
        isSyncing.current = true;
        
        const pendingInsights = await getAllLocalInsights();
        
        if (!pendingInsights || pendingInsights.length === 0) {
          isSyncing.current = false;
          return;
        }

        for (const insight of pendingInsights) {
          // Skip if already failed to prevent infinite retries
          if (insight.processing_status === 'failed') continue;

          try {
            // 1. Upload to Supabase Storage
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('No user');

            const fileName = `${Date.now()}-${insight.id}.webm`;
            const filePath = `${user.id}/${fileName}`;
            
            const { error: uploadError } = await supabase.storage
              .from('meetings')
              .upload(filePath, insight.raw_content as Blob);

            if (uploadError) throw uploadError;

            // 2. Insert into Supabase DB
            const { data: dbInsight, error: dbError } = await supabase
              .from('insights')
              .insert({
                user_id: user.id,
                processing_status: 'analyzing',
                audio_url: filePath,
                summary: 'Analyzing...',
              })
              .select()
              .single();

            if (dbError) throw dbError;

            // 3. Navigate immediately
            router.push(`/dashboard/files/${dbInsight.id}`);

            // 4. Call API
            const response = await fetch('/api/analyze', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ 
                insightId: dbInsight.id,
                audioUrl: filePath,
                mimeType: 'audio/webm',
                isDeepAnalysisEnabled: false
              }),
            });

            if (!response.ok) {
              const errorData = await response.json();
              throw new Error(errorData.error || 'Analysis failed');
            }

            // 5. Mark as completed in local DB
            await saveInsight({
              ...insight,
              processing_status: 'completed',
              updated_at: new Date().toISOString(),
            });

          } catch (error) {
            console.error(`Failed to import insight ${insight.id}:`, error);
            // Forcefully mark as failed to prevent any further retries
            await saveInsight({
              ...insight,
              processing_status: 'failed',
              updated_at: new Date().toISOString(),
            });
            // Break loop for this insight to stop processing
          }
        }
      } catch (error) {
        console.error('Fatal error in sync orchestrator loop:', error);
      } finally {
        isSyncing.current = false;
      }
    };

    const intervalId = setInterval(syncPendingInsights, 5000);
    syncPendingInsights();

    return () => clearInterval(intervalId);
  }, [showToast, router, supabase]);
}
