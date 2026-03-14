'use client';

import { useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useUIStore } from '@/lib/store';
import { RealtimeChannel } from '@supabase/supabase-js';

export default function ActiveUsers({ documentId }: { documentId?: string }) {
  const activeUsers = useUIStore((state) => state.activeUsers);
  const setActiveUsers = useUIStore((state) => state.setActiveUsers);
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    const supabase = createClient();
    const channelName = documentId ? `room-${documentId}` : 'global-room';
    
    const initPresence = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) return;

      const channel = supabase.channel(channelName, {
        config: {
          presence: {
            key: user.email,
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

        const uniqueUsers = Array.from(new Map(users.map((user) => [user.email, user])).values());
        setActiveUsers(uniqueUsers);
      };

      channel
        .on('presence', { event: 'sync' }, updatePresence)
        .subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
            await channel.track({ email: user.email, online_at: new Date().toISOString() });
          }
        });
    };
    
    initPresence();
    
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [documentId, setActiveUsers]);

  if (activeUsers.length === 0) return null;

  return (
    <div className="flex items-center -space-x-2 overflow-hidden py-1">
      {activeUsers.map((user) => (
        <div
          key={user.id}
          className="relative inline-flex h-8 w-8 items-center justify-center rounded-full border-2 border-background bg-primary/10 text-xs font-medium text-primary ring-offset-background transition-all hover:z-10 hover:scale-110"
          title={user.email}
        >
          <span className="font-mono">{user.email.charAt(0).toUpperCase()}</span>
          <span className="absolute bottom-0 right-0 block h-2 w-2 rounded-full bg-green-500 ring-2 ring-background animate-pulse" />
        </div>
      ))}
      {activeUsers.length > 0 && (
        <div className="ml-4 text-xs text-gray-400 dark:text-gray-500 font-mono">
          {activeUsers.length} online
        </div>
      )}
    </div>
  );
}
