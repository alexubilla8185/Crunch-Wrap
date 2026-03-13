'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { TactileButton } from '@/components/ui/TactileButton';

export function ShareModal({ insightId, onClose }: { insightId: string; onClose: () => void }) {
  const [expiration, setExpiration] = useState<'24h' | '7d' | 'never'>('24h');
  const [loading, setLoading] = useState(false);

  const handleShare = async () => {
    setLoading(true);
    const supabase = createClient();
    
    const expiresAt = expiration === 'never' ? null : 
      expiration === '24h' ? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() :
      new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    const { data, error } = await supabase
      .from('shared_links')
      .insert([{ insight_id: insightId, expires_at: expiresAt }])
      .select()
      .single();

    if (!error && data) {
      const shareUrl = `${window.location.origin}/share/${data.id}`;
      navigator.clipboard.writeText(shareUrl);
      alert('Link copied to clipboard.');
      onClose();
    } else {
      console.error('Error creating share link:', error);
      alert('Failed to create share link.');
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-black/20 flex items-center justify-center p-4 z-50">
      <div className="bg-background p-8 rounded-[32px] shadow-xl max-w-sm w-full space-y-6 border border-black/10 dark:border-white/10">
        <h2 className="font-serif text-2xl">Share Intelligence</h2>
        <select 
          value={expiration} 
          onChange={(e) => setExpiration(e.target.value as any)}
          className="w-full p-3 rounded-[24px] border border-black/10 bg-transparent"
        >
          <option value="24h">Expires in 24 Hours</option>
          <option value="7d">Expires in 7 Days</option>
          <option value="never">Never Expires</option>
        </select>
        <div className="flex gap-3">
          <TactileButton onClick={onClose} className="flex-1">Cancel</TactileButton>
          <TactileButton onClick={handleShare} disabled={loading} className="flex-1 bg-primary text-primary-foreground">
            {loading ? 'Generating...' : 'Copy Link'}
          </TactileButton>
        </div>
      </div>
    </div>
  );
}
