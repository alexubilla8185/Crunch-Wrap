import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { getInsight, saveInsight } from '@/lib/storage/localDbService';

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
          if (payload.new.processing_status === 'completed') {
            const id = payload.new.id;
            const title = payload.new.title;
            const intelligence = payload.new.intelligence;

            // Update Cache
            queryClient.setQueryData(['insight', id], (oldData: any) => ({
              ...oldData,
              processing_status: 'completed',
              title: title || oldData?.title,
              intelligence: intelligence
            }));
            queryClient.setQueriesData({ queryKey: ['insights'] }, (oldList: any[] | undefined) => {
              if (!oldList) return oldList;
              return oldList.map(item => item.id === id ? { ...item, processing_status: 'completed', title: title } : item);
            });

            // Update IndexedDB
            const localInsight = await getInsight(id);
            if (localInsight) {
              await saveInsight({
                ...localInsight,
                processing_status: 'completed',
                intelligence: intelligence,
                title: title,
                updated_at: new Date().toISOString(),
              });
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient, supabase]);
}
