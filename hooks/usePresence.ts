import { useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useUIStore } from '@/lib/store';
import { RealtimeChannel } from '@supabase/supabase-js';

export function usePresence(userEmail: string) {
  const setActiveUsers = useUIStore((state) => state.setActiveUsers);
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    if (!userEmail) return;

    const supabase = createClient();
    const channel = supabase.channel('hub_presence', {
      config: {
        presence: {
          key: userEmail,
        },
      },
    });
    channelRef.current = channel;

    const updatePresence = () => {
      const state = channel.presenceState();
      const users: { id: string; email: string }[] = [];

      Object.values(state).forEach((presences) => {
        if (presences && presences.length > 0) {
          const user = presences[0] as any;
          if (user.email) {
            users.push({ id: user.email, email: user.email });
          }
        }
      });

      // Deduplicate users by email
      const uniqueUsers = Array.from(new Map(users.map((user) => [user.email, user])).values());
      setActiveUsers(uniqueUsers);
    };

    channel
      .on('presence', { event: 'sync' }, updatePresence)
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        console.log('User joined:', key, newPresences);
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        console.log('User left:', key, leftPresences);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ email: userEmail, online_at: new Date().toISOString() });
        }
      });

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [userEmail, setActiveUsers]);
}
