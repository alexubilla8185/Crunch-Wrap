import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { getInsight, saveInsight } from '@/lib/storage/localDbService';
import { shouldUpdateStatus } from '@/lib/utils';

export function useInsightSubscription() {
  const queryClient = useQueryClient();
  const supabase = createClient();

  useEffect(() => {
    const channel = supabase
      .channel('insights-channel')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'insights' },
        async (payload) => {
          console.log("Realtime payload received:", payload);
          const id = payload.new.id;
          const newStatus = payload.new.processing_status;
          
          const existingData: any = queryClient.getQueryData(['insight', id]);
          const currentStatus = existingData?.processing_status;

          if (!shouldUpdateStatus(currentStatus, newStatus)) {
            console.log(`Ignoring realtime update for ${id}: ${newStatus} is not >= ${currentStatus}`);
            return;
          }

          const title = payload.new.title;
          const intelligence = payload.new.intelligence;

          // Update Cache
          queryClient.setQueryData(['insight', id], (oldData: any) => ({
            ...oldData,
            ...payload.new,
            processing_status: newStatus,
            title: title || oldData?.title,
            intelligence: intelligence || oldData?.intelligence
          }));
          
          queryClient.setQueryData(['insights'], (oldList: any[] | undefined) => {
            if (!oldList) return oldList;
            return oldList.map(item => item.id === id ? { ...item, ...payload.new, processing_status: newStatus, title: title || item.title } : item);
          });

          // Update IndexedDB
          const localInsight = await getInsight(id);
          if (localInsight && shouldUpdateStatus(localInsight.processing_status, newStatus)) {
            await saveInsight({
              ...localInsight,
              ...payload.new,
              processing_status: newStatus,
              intelligence: intelligence || localInsight.intelligence,
              title: title || localInsight.title,
              updated_at: new Date().toISOString(),
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient, supabase]);
}
