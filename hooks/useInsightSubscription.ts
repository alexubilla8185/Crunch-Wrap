import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';

export function useInsightSubscription() {
  const queryClient = useQueryClient();
  const supabase = createClient();

  useEffect(() => {
    const channel = supabase
      .channel('insights-channel')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'insights' },
        (payload) => {
          console.log("Realtime payload received:", payload);
          if (payload.new.processing_status === 'completed') {
            queryClient.invalidateQueries({ queryKey: ['insights'] });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient, supabase]);
}
