import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { getAllLocalInsights, saveInsight, getInsight } from '@/lib/storage/localDbService';
import { useUIStore } from '@/lib/store';
import { createClient } from '@/lib/supabase/client';
import { shouldUpdateStatus } from '@/lib/utils';
import { unstable_batchedUpdates } from 'react-dom';

export function useImportOrchestrator() {
  const isSyncing = useRef(false);
  const { showToast } = useUIStore();
  const router = useRouter();
  const supabase = createClient();
  const queryClient = useQueryClient();

  useEffect(() => {
    const syncPendingInsights = async () => {
      if (isSyncing.current) return;

      try {
        isSyncing.current = true;
        
        const allInsights = await getAllLocalInsights();
        const pendingInsights = allInsights.filter(i => {
          if (i.processing_status === 'local') return true;
          if (i.processing_status === 'uploading' || i.processing_status === 'analyzing') {
            const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString();
            return i.updated_at < twoMinutesAgo;
          }
          return false;
        });
        
        if (pendingInsights.length === 0) {
          isSyncing.current = false;
          return;
        }

        console.log(`Syncing ${pendingInsights.length} pending insights...`);

        for (const insight of pendingInsights) {
          try {
            const currentCache: any = queryClient.getQueryData(['localInsight', insight.id]) || queryClient.getQueryData(['insight', insight.id]);
            if (currentCache?.processing_status === 'completed') {
                console.log(`[Sync Worker] Aborting status downgrade. Item ${insight.id} is already completed in cache.`);
                continue; // DO NOT update React Query or IndexedDB. Let the completed state live.
            }

            // 0. Mark as uploading
            const currentInsight = await getInsight(insight.id);
            if (currentInsight && shouldUpdateStatus(currentInsight.processing_status, 'uploading')) {
              await saveInsight({
                ...currentInsight,
                processing_status: 'uploading',
                updated_at: new Date().toISOString(),
              });
            }

            // 1. Upload to Supabase Storage (Only for audio)
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
              console.warn('No user session available, skipping sync.');
              return; // Return instead of failing the insight
            }

            const isDocument = typeof insight.raw_content === 'string';
            let fileName = '';
            let contentType = '';
            let mimeType = '';
            let filePath = '';

            if (isDocument) {
              fileName = `${Date.now()}-${insight.id}.md`;
              contentType = 'text/markdown';
              mimeType = 'text/markdown';
              filePath = `${user.id}/${fileName}`;
            } else {
              const blob = insight.raw_content as Blob;
              mimeType = blob.type || 'audio/webm';
              const ext = mimeType.includes('mpeg') || mimeType.includes('mp3') ? 'mp3' : 'webm';
              fileName = `${Date.now()}-${insight.id}.${ext}`;
              contentType = mimeType;
              filePath = `${user.id}/${fileName}`;

              // Get Signed Upload URL
              const { data: signedData, error: signedError } = await supabase.storage
                .from('meetings')
                .createSignedUploadUrl(filePath);
              
              if (signedError) throw signedError;

              // Upload using raw PUT request
              const uploadBlob = insight.raw_content as Blob;
              
              if (uploadBlob.size < 1000) throw new Error("Blob is corrupted or empty before upload");

              const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_DATABASE_URL;
              const finalUrl = new URL(signedData.signedUrl, supabaseUrl).toString();
              console.log('Final upload URL:', finalUrl);

              const uploadResponse = await fetch(finalUrl, {
                method: 'PUT',
                body: uploadBlob,
                headers: {
                  'Content-Type': contentType
                }
              });

              if (!uploadResponse.ok) throw new Error('Failed to upload file');
            }

            const checkCacheBeforeDb: any = queryClient.getQueryData(['localInsight', insight.id]) || queryClient.getQueryData(['insight', insight.id]);
            if (checkCacheBeforeDb?.processing_status === 'completed') {
                console.log(`[Sync Worker] Aborting status downgrade before DB insert. Item ${insight.id} is already completed in cache.`);
                continue;
            }

            // 2. Insert into Supabase DB
            const { data: dbInsight, error: dbError } = await supabase
              .from('insights')
              .insert({
                id: insight.id, // Use the original ID
                user_id: user.id,
                processing_status: 'analyzing',
                audio_url: isDocument ? null : filePath,
                summary: 'Analyzing...',
              })
              .select()
              .single();

            if (dbError) throw dbError;

            // Mark as analyzing locally
            const localInsightAnalyzing = await getInsight(insight.id);
            if (localInsightAnalyzing && shouldUpdateStatus(localInsightAnalyzing.processing_status, 'analyzing')) {
              await saveInsight({
                ...localInsightAnalyzing,
                processing_status: 'analyzing',
                updated_at: new Date().toISOString(),
              });
            }

            // 3. Navigate immediately
            router.push(`/dashboard/files/${dbInsight.id}`);

            // 4. Call API (Non-blocking)
            const apiBody: any = { 
              insightId: dbInsight.id,
              mimeType: mimeType,
              isDeepAnalysisEnabled: false
            };
            if (isDocument) {
              apiBody.textPayload = insight.raw_content;
            } else {
              apiBody.audioUrl = filePath;
            }

            fetch('/api/analyze', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(apiBody),
            }).then(async (response) => {
              if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Analysis failed');
              }

              const responseData = await response.json();
              console.log("API Payload:", responseData);
              const { intelligence, dbInsight: returnedDbInsight } = responseData;

              unstable_batchedUpdates(() => {
                // 5. Update Cache
                const updatedData = {
                  ...returnedDbInsight,
                  processing_status: 'completed',
                  title: intelligence?.title,
                  intelligence: intelligence
                };

                queryClient.setQueryData(['insight', dbInsight.id], (oldData: any) => ({ ...oldData, ...updatedData }));
                queryClient.setQueryData(['localInsight', dbInsight.id], (oldData: any) => ({ ...oldData, ...updatedData }));
                queryClient.setQueryData(['supabaseInsight', dbInsight.id], (oldData: any) => ({ ...oldData, ...updatedData }));

                queryClient.setQueriesData({ queryKey: ['insights'] }, (oldList: any[] | undefined) => {
                  if (!oldList) return oldList;
                  return oldList.map(item => item.id === dbInsight.id ? { ...item, ...updatedData } : item);
                });
                
                queryClient.setQueriesData({ queryKey: ['localInsights'] }, (oldList: any[] | undefined) => {
                  if (!oldList) return oldList;
                  return oldList.map(item => item.id === dbInsight.id ? { ...item, ...updatedData } : item);
                });
              });

              // 5. Mark as completed in local DB immediately
              const localInsight = await getInsight(insight.id);
              if (localInsight) {
                await saveInsight({
                  ...localInsight,
                  ...returnedDbInsight,
                  processing_status: 'completed',
                  intelligence: intelligence,
                  title: intelligence?.title,
                  updated_at: new Date().toISOString(),
                });
              }
            }).catch(async (error) => {
              console.error(`Failed to analyze insight ${insight.id}:`, error);
              showToast(`Analysis failed for ${insight.title}: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
              await saveInsight({
                ...insight,
                processing_status: 'failed',
                updated_at: new Date().toISOString(),
              });
            });

          } catch (error) {
            console.error(`Failed to import insight ${insight.id}:`, error);
            showToast(`Analysis failed for ${insight.title}: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
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
  }, [showToast, router, supabase, queryClient]);
}
