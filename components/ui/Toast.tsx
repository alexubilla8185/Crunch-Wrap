'use client';

import { useUIStore } from '@/lib/store';

export function Toast() {
  const { toast } = useUIStore();

  if (!toast.message) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 animate-in slide-in-from-bottom-5 fade-in duration-300">
      <div className="bg-foreground text-background font-mono text-xs px-4 py-3 rounded-full shadow-lg transition-transform">
        {toast.message}
      </div>
    </div>
  );
}
