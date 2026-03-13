'use client';

import { useUIStore } from '@/lib/store';

export default function ActiveUsers() {
  const activeUsers = useUIStore((state) => state.activeUsers);

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
