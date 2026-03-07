import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { getAllLocalInsights, getAllUploadingOrAnalyzingInsights, saveInsight } from '@/lib/storage/localDbService';
import { useUIStore } from '@/lib/store';

export function useImportOrchestrator() {
  const isSyncing = useRef(false);
  const { showToast } = useUIStore();
  const router = useRouter();

  useEffect(() => {
    const recoverStuckInsights = async () => {
      try {
        const syncingInsights = await getAllUploadingOrAnalyzingInsights();
        const now = new Date().getTime();
        const FIVE_MINUTES = 5 * 60 * 1000;

        for (const insight of syncingInsights) {
          const updatedAt = new Date(insight.updated_at).getTime();
          if (now - updatedAt > FIVE_MINUTES) {
            console.log(`Recovering stuck insight: ${insight.id}`);
            await saveInsight({
              ...insight,
              processing_status: 'local',
              updated_at: new Date().toISOString(),
            });
          }
        }
      } catch (error) {
        console.error('Failed to recover stuck insights:', error);
      }
    };

    recoverStuckInsights();

    const syncPendingInsights = async () => {
      // Concurrency protection: skip if already syncing
      if (isSyncing.current) return;

      try {
        isSyncing.current = true;
        
        const pendingInsights = await getAllLocalInsights();
        
        if (!pendingInsights || pendingInsights.length === 0) {
          isSyncing.current = false;
          return;
        }

        const nowTime = Date.now();
        const readyInsights = pendingInsights.filter(insight => {
          if (!insight.next_retry_at) return true;
          return new Date(insight.next_retry_at).getTime() <= nowTime;
        });

        if (readyInsights.length === 0) {
          isSyncing.current = false;
          return;
        }

        // Process one insight at a time to avoid overwhelming the network
        for (const insight of readyInsights) {
          try {
            // 1. Mark as uploading locally to prevent duplicate uploads
            const uploadingInsight = { ...insight, processing_status: 'uploading' as const };
            await saveInsight(uploadingInsight);

            // Navigate to dashboard immediately upon starting processing
            router.push('/dashboard/files');

            // 2. Prepare content for API
            let base64Data = '';
            let isText = false;

            if (insight.raw_content instanceof Blob || insight.raw_content instanceof File) {
              const mimeType = insight.raw_content.type || 'application/octet-stream';
              
              if (mimeType.startsWith('text/')) {
                 base64Data = await insight.raw_content.text();
                 isText = true;
              } else {
                 // Convert blob to base64
                 base64Data = await new Promise<string>((resolve, reject) => {
                   const reader = new FileReader();
                   reader.onloadend = () => {
                     const base64 = (reader.result as string).split(',')[1];
                     resolve(base64);
                   };
                   reader.onerror = reject;
                   reader.readAsDataURL(insight.raw_content as Blob);
                 });
              }
            } else {
              base64Data = String(insight.raw_content);
              isText = true;
            }

            // Strict Validation: Ensure content is not empty
            if (!base64Data || base64Data.trim().length === 0) {
              console.warn(`Insight ${insight.id} has empty content. Marking as failed.`);
              await saveInsight({
                ...uploadingInsight,
                processing_status: 'failed',
                updated_at: new Date().toISOString(),
              });
              continue;
            }

            // 3. Mark as analyzing
            const analyzingInsight = { ...uploadingInsight, processing_status: 'analyzing' as const };
            await saveInsight(analyzingInsight);

            // 4. Send to API Route
            const response = await fetch('/api/analyze', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ 
                audioUrl: base64Data, 
                isDeepAnalysisEnabled: false // Defaulting to false for background sync
              }),
            });

            if (!response.ok) throw new Error('Analysis failed');
            const parsedIntelligence = await response.json();

            // 5. Success: Update local DB status to completed and save the AI intelligence
            const completedInsight = {
              ...analyzingInsight,
              processing_status: 'completed' as const,
              updated_at: new Date().toISOString(),
              intelligence: parsedIntelligence,
            };
            
            await saveInsight(completedInsight);
            console.log(`Successfully imported insight: ${insight.id}`);
            showToast('Import analyzed & completed', 'success');

          } catch (error) {
            console.error(`Failed to import insight ${insight.id}:`, error);
            
            // 6. Failure: Implement exponential backoff
            const currentRetryCount = insight.retry_count || 0;
            const MAX_RETRIES = 5;

            if (currentRetryCount >= MAX_RETRIES) {
              console.warn(`Insight ${insight.id} exceeded max retries. Marking as failed.`);
              await saveInsight({
                ...insight,
                processing_status: 'failed',
                updated_at: new Date().toISOString(),
              });
            } else {
              const nextRetryCount = currentRetryCount + 1;
              // Exponential backoff: 5s, 10s, 20s, 40s, 80s
              const delayMs = Math.pow(2, currentRetryCount) * 5000;
              const nextRetryAt = new Date(Date.now() + delayMs).toISOString();

              await saveInsight({
                ...insight,
                processing_status: 'local',
                retry_count: nextRetryCount,
                next_retry_at: nextRetryAt,
                updated_at: new Date().toISOString(),
              });
            }
          }
        }
      } catch (error) {
        console.error('Fatal error in sync orchestrator loop:', error);
      } finally {
        isSyncing.current = false;
      }
    };

    // Run the sync loop every 5 seconds
    const intervalId = setInterval(syncPendingInsights, 5000);

    // Initial run
    syncPendingInsights();

    return () => {
      clearInterval(intervalId);
    };
  }, [showToast, router]);
}
