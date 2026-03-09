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
        
        const allInsights = await getAllLocalInsights();
        const pendingInsights = allInsights.filter(i => i.processing_status === 'local');
        
        if (pendingInsights.length === 0) {
          isSyncing.current = false;
          return;
        }

        console.log(`Syncing ${pendingInsights.length} pending insights...`);

        for (const insight of pendingInsights) {
          try {
            // 0. Mark as uploading
            await saveInsight({
              ...insight,
              processing_status: 'uploading',
              updated_at: new Date().toISOString(),
            });

            // 1. Upload to Supabase Storage
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
              console.warn('No user session available, skipping sync.');
              return; // Return instead of failing the insight
            }

            const isDocument = typeof insight.raw_content === 'string';
            let fileName = '';
            let contentType = '';
            let mimeType = '';

            if (isDocument) {
              fileName = `${Date.now()}-${insight.id}.md`;
              contentType = 'text/markdown';
              mimeType = 'text/markdown';
            } else {
              const blob = insight.raw_content as Blob;
              mimeType = blob.type || 'audio/webm';
              const ext = mimeType.includes('mpeg') || mimeType.includes('mp3') ? 'mp3' : 'webm';
              fileName = `${Date.now()}-${insight.id}.${ext}`;
              contentType = mimeType;
            }

            const filePath = `${user.id}/${fileName}`;
            
            // 1. Get Signed Upload URL
            const { data: signedData, error: signedError } = await supabase.storage
              .from('meetings')
              .createSignedUploadUrl(filePath);
            
            if (signedError) throw signedError;

            // 2. Upload using raw PUT request
            const blob = isDocument ? new Blob([insight.raw_content as string], { type: 'text/markdown' }) : (insight.raw_content as Blob);
            
            if (blob.size < 1000) throw new Error("Blob is corrupted or empty before upload");

            const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_DATABASE_URL;
            const finalUrl = new URL(signedData.signedUrl, supabaseUrl).toString();
            console.log('Final upload URL:', finalUrl);

            const uploadResponse = await fetch(finalUrl, {
              method: 'PUT',
              body: blob,
              headers: {
                'Content-Type': contentType
              }
            });

            if (!uploadResponse.ok) throw new Error('Failed to upload file');

            // 2. Insert into Supabase DB
            const { data: dbInsight, error: dbError } = await supabase
              .from('insights')
              .insert({
                id: insight.id, // Use the original ID
                user_id: user.id,
                processing_status: 'analyzing',
                audio_url: filePath,
                summary: 'Analyzing...',
              })
              .select()
              .single();

            if (dbError) throw dbError;

            // Mark as analyzing locally
            await saveInsight({
              ...insight,
              processing_status: 'analyzing',
              updated_at: new Date().toISOString(),
            });

            // 3. Navigate immediately
            router.push(`/dashboard/files/${dbInsight.id}`);

            // 4. Call API
            const response = await fetch('/api/analyze', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ 
                insightId: dbInsight.id,
                audioUrl: filePath,
                mimeType: mimeType,
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
  }, [showToast, router, supabase]);
}
