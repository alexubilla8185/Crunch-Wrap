'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useUIStore } from '@/lib/store';
import { saveInsight } from '@/lib/storage/localDbService';
import { Insight } from '@/lib/schemas';
import { createClient } from '@/lib/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { unstable_batchedUpdates } from 'react-dom';
import { useRouter } from 'next/navigation';

declare global {
  interface Window {
    gapi: any;
    google: any;
  }
}

const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_API_KEY;
const DISCOVERY_DOCS = ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'];
const SCOPES = 'https://www.googleapis.com/auth/drive.readonly';

export function GoogleDrivePicker() {
  const [isPickerLoaded, setIsPickerLoaded] = useState(false);
  const tokenClientRef = useRef<any>(null);
  const { showToast } = useUIStore();
  const queryClient = useQueryClient();
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    if (!CLIENT_ID || !API_KEY) {
      console.warn('Google Drive Picker requires NEXT_PUBLIC_GOOGLE_CLIENT_ID and NEXT_PUBLIC_GOOGLE_API_KEY');
      return;
    }

    let isMounted = true;

    const loadScripts = () => {
      if (!document.querySelector('script[src="https://apis.google.com/js/api.js"]')) {
        const gapiScript = document.createElement('script');
        gapiScript.src = 'https://apis.google.com/js/api.js';
        gapiScript.async = true;
        gapiScript.defer = true;
        gapiScript.onload = () => {
          if (isMounted && window.gapi) {
            window.gapi.load('picker', () => {
              if (isMounted) setIsPickerLoaded(true);
            });
          }
        };
        document.body.appendChild(gapiScript);
      } else if (window.gapi) {
        window.gapi.load('picker', () => {
          if (isMounted) setIsPickerLoaded(true);
        });
      }

      if (!document.querySelector('script[src="https://accounts.google.com/gsi/client"]')) {
        const gsiScript = document.createElement('script');
        gsiScript.src = 'https://accounts.google.com/gsi/client';
        gsiScript.async = true;
        gsiScript.defer = true;
        gsiScript.onload = () => {
          if (isMounted && window.google?.accounts?.oauth2) {
            tokenClientRef.current = window.google.accounts.oauth2.initTokenClient({
              client_id: CLIENT_ID,
              scope: SCOPES,
              callback: () => {}, // Callback handled in the picker flow
            });
          }
        };
        document.body.appendChild(gsiScript);
      } else if (window.google?.accounts?.oauth2) {
        tokenClientRef.current = window.google.accounts.oauth2.initTokenClient({
          client_id: CLIENT_ID,
          scope: SCOPES,
          callback: () => {}, // Callback handled in the picker flow
        });
      }
    };

    loadScripts();

    return () => {
      isMounted = false;
    };
  }, []);

  const pickerCallback = useCallback((accessToken: string) => async (data: any) => {
    if (data.action === window.google.picker.Action.PICKED) {
      const file = data.docs[0];
      const fileId = file.id;
      const fileName = file.name;
      const mimeType = file.mimeType;

      showToast(`Importing ${fileName}...`, 'info');

      try {
        let content: string | Blob;
        let finalMimeType = mimeType;

        if (mimeType === 'application/vnd.google-apps.document') {
          const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}/export?mimeType=text/plain`, {
            headers: { Authorization: `Bearer ${accessToken}` }
          });
          content = await response.text();
          finalMimeType = 'text/plain';
        } else {
          const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
            headers: { Authorization: `Bearer ${accessToken}` }
          });
          content = await response.blob();
        }

        // --- Ingestion Pipeline (similar to useFileDrop) ---
        const now = new Date().toISOString();
        const id = crypto.randomUUID();
        
        const newInsight: Insight = {
          id,
          title: fileName,
          raw_content: content,
          processing_status: 'uploading',
          created_at: now,
          updated_at: now,
        };

        await saveInsight(newInsight);
        
        unstable_batchedUpdates(() => {
          queryClient.setQueryData(['localInsight', id], newInsight);
          queryClient.setQueryData(['insight', id], newInsight);
          queryClient.setQueriesData({ queryKey: ['insights'] }, (oldList: any[] | undefined) => {
            if (!oldList) return [newInsight];
            return [newInsight, ...oldList];
          });
        });

        router.push(`/dashboard/files/${id}`);

        // Foreground pipeline for Supabase upload
        (async () => {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) throw new Error('No user session');

          let filePath = '';
          if (typeof content === 'string') {
            filePath = `${user.id}/${Date.now()}-${id}.md`;
            // Upload text content as file
            await supabase.storage.from('meetings').upload(filePath, content, { contentType: 'text/markdown' });
          } else {
            const blob = content as Blob;
            filePath = `${user.id}/${Date.now()}-${id}`;
            await supabase.storage.from('meetings').upload(filePath, blob, { contentType: blob.type });
          }

          const { data: dbInsight } = await supabase
            .from('insights')
            .insert({
              id,
              user_id: user.id,
              processing_status: 'analyzing',
              audio_url: typeof content === 'string' ? null : filePath,
              summary: 'Analyzing...',
            })
            .select()
            .single();

          // Call API
          const apiBody: any = { 
            insightId: dbInsight.id,
            mimeType: finalMimeType,
            isDeepAnalysisEnabled: false
          };
          if (typeof content === 'string') {
            apiBody.textPayload = content;
          } else {
            apiBody.audioUrl = filePath;
          }

          await fetch('/api/analyze', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(apiBody),
          });
          
          showToast('Import complete', 'success');
        })();

      } catch (error) {
        console.error('Import failed:', error);
        showToast('Import failed', 'error');
      }
    }
  }, [queryClient, router, showToast, supabase]);

  const handleDriveClick = useCallback(() => {
    if (!isPickerLoaded || !tokenClientRef.current) return;

    tokenClientRef.current.callback = async (resp: any) => {
      if (resp.error !== undefined) {
        throw resp;
      }
      const accessToken = resp.access_token;
      
      const view = new window.google.picker.DocsView(window.google.picker.ViewId.DOCS);
      view.setMimeTypes('application/vnd.google-apps.document,text/plain,text/markdown,audio/mpeg,audio/wav,audio/m4a');

      const picker = new window.google.picker.PickerBuilder()
        .addView(view)
        .setOAuthToken(accessToken)
        .setDeveloperKey(process.env.NEXT_PUBLIC_GOOGLE_API_KEY)
        .setCallback(pickerCallback(accessToken))
        .build();
      picker.setVisible(true);
    };

    tokenClientRef.current.requestAccessToken({ prompt: '' });
  }, [isPickerLoaded, pickerCallback]);

  return (
    <button
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleDriveClick(); }}
      className="px-4 py-2 rounded-full border border-border hover:bg-foreground/5 transition-colors font-medium text-sm text-foreground"
    >
      Import from Drive
    </button>
  );
}
