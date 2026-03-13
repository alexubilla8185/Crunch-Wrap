'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useUIStore } from '@/lib/store';
import { clearAllInsights, getAllInsights } from '@/lib/storage/localDbService';
import { TactileButton } from '@/components/ui/TactileButton';
import { BrainCircuit, Database, User, LogOut, Trash2, Palette, Download } from 'lucide-react';

export default function SettingsPage() {
  const router = useRouter();
  const supabase = createClient();
  const { aiPreferences, setAIPreferences, theme, toggleTheme } = useUIStore();
  
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [isClearing, setIsClearing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [showClearModal, setShowClearModal] = useState(false);
  const { showToast } = useUIStore();

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserEmail(user.email ?? null);
      }
    };
    fetchUser();
  }, [supabase.auth]);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await supabase.auth.signOut();
      router.push('/auth/login');
    } catch (error) {
      console.error('Error logging out:', error);
      setIsLoggingOut(false);
    }
  };

  const handleClearCache = async () => {
    setIsClearing(true);
    try {
      await clearAllInsights();
      // Add a small delay to make the interaction feel substantial
      await new Promise((resolve) => setTimeout(resolve, 600));
      showToast('Local cache wiped', 'info');
      setShowClearModal(false);
    } catch (error) {
      console.error('Failed to clear cache:', error);
      showToast('Failed to clear cache', 'error');
    } finally {
      setIsClearing(false);
    }
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const insights = await getAllInsights();
      
      let markdownString = '';
      
      for (const insight of insights) {
        markdownString += `# ${insight.title}\n\n`;
        
        const date = new Date(insight.created_at).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        });
        
        const sentiment = insight.intelligence?.sentiment || 'N/A';
        const readingTime = insight.intelligence?.reading_time || 'N/A';
        
        markdownString += `**Date:** ${date} | **Sentiment:** ${sentiment} | **Reading Time:** ${readingTime}\n\n`;
        
        if (insight.intelligence?.summary) {
          markdownString += `## Executive Summary\n\n${insight.intelligence.summary}\n\n`;
        }
        
        if (insight.intelligence?.highlights && insight.intelligence.highlights.length > 0) {
          markdownString += `## Core Highlights\n\n`;
          for (const highlight of insight.intelligence.highlights) {
            markdownString += `- ${highlight}\n`;
          }
          markdownString += `\n`;
        }
        
        if (insight.intelligence?.action_items && insight.intelligence.action_items.length > 0) {
          markdownString += `## Action Items\n\n`;
          for (const action_item of insight.intelligence.action_items) {
            markdownString += `- [ ] ${action_item}\n`;
          }
          markdownString += `\n`;
        }
        
        markdownString += `---\n\n`;
      }
      
      const blob = new Blob([markdownString], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = 'intelligence-export.md';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      
      URL.revokeObjectURL(url);
      
      showToast('Data exported successfully', 'success');
    } catch (error) {
      console.error('Failed to export data:', error);
      showToast('Failed to export data', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col p-6 md:p-12 max-w-4xl mx-auto w-full">
      <header className="mb-12">
        <h1 className="text-3xl md:text-4xl font-serif font-medium tracking-tight mb-2">
          Settings
        </h1>
        <p className="text-gray-500 dark:text-gray-400 font-sans text-sm md:text-base">
          Configure intelligence, storage, and account preferences.
        </p>
      </header>

      <div className="space-y-6">
        {/* Aesthetics Section */}
        <section className="bg-surface rounded-3xl p-6 md:p-8 shadow-sm flex flex-col gap-6">
          <div className="flex items-center gap-3 border-b border-black/5 dark:border-white/5 pb-4">
            <Palette className="w-6 h-6 text-primary" />
            <h2 className="font-serif text-xl tracking-tight text-foreground">Aesthetics</h2>
          </div>
          
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="font-medium">Theme Selection</p>
              <p className="text-sm text-gray-500">Select your preferred visual environment.</p>
            </div>
            <div className="flex p-1 bg-background rounded-full border border-black/10 dark:border-white/10 w-fit">
              <button
                onClick={() => theme !== 'sandstone' && toggleTheme()}
                className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${
                  theme === 'sandstone'
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-gray-500 dark:text-gray-400 hover:text-foreground'
                }`}
              >
                Sandstone
              </button>
              <button
                onClick={() => theme !== 'charcoal' && toggleTheme()}
                className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${
                  theme === 'charcoal'
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-gray-500 dark:text-gray-400 hover:text-foreground'
                }`}
              >
                Charcoal
              </button>
            </div>
          </div>
        </section>

        {/* Intelligence Section */}
        <section className="bg-surface rounded-3xl p-6 md:p-8 shadow-sm flex flex-col gap-6">
          <div className="flex items-center gap-3 border-b border-black/5 dark:border-white/5 pb-4">
            <BrainCircuit className="w-6 h-6 text-primary" />
            <h2 className="font-serif text-xl tracking-tight text-foreground">Intelligence</h2>
          </div>
          
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="font-medium">Model Selection</p>
              <p className="text-sm text-gray-500">Flash for speed, Pro for deep analysis.</p>
            </div>
            <div className="flex p-1 bg-background rounded-full border border-black/10 dark:border-white/10 w-fit">
              <button
                onClick={() => setAIPreferences({ model: 'flash' })}
                className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${
                  aiPreferences.model === 'flash'
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-gray-500 dark:text-gray-400 hover:text-foreground'
                }`}
              >
                Flash
              </button>
              <button
                onClick={() => setAIPreferences({ model: 'pro' })}
                className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${
                  aiPreferences.model === 'pro'
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-gray-500 dark:text-gray-400 hover:text-foreground'
                }`}
              >
                Pro
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between py-2">
            <div>
              <p className="font-medium">Response Tone</p>
              <p className="text-sm text-gray-500">Direct or detailed summaries.</p>
            </div>
            <div className="flex p-1 bg-background rounded-full border border-black/10 dark:border-white/10 w-fit">
              <button
                onClick={() => setAIPreferences({ tone: 'direct' })}
                className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${
                  aiPreferences.tone === 'direct'
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-gray-500 dark:text-gray-400 hover:text-foreground'
                }`}
              >
                Direct
              </button>
              <button
                onClick={() => setAIPreferences({ tone: 'detailed' })}
                className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${
                  aiPreferences.tone === 'detailed'
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-gray-500 dark:text-gray-400 hover:text-foreground'
                }`}
              >
                Detailed
              </button>
            </div>
          </div>
        </section>

        {/* Data Ownership Section */}
        <section className="bg-surface rounded-3xl p-6 md:p-8 shadow-sm flex flex-col gap-6">
          <div className="flex items-center gap-3 border-b border-black/5 dark:border-white/5 pb-4">
            <Download className="w-6 h-6 text-primary" />
            <h2 className="font-serif text-xl tracking-tight text-foreground">Data Ownership</h2>
          </div>
          
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="font-medium">Export Intelligence</p>
              <p className="text-sm text-gray-500">Download a backup of all notes as Markdown.</p>
            </div>
            <button
              onClick={handleExport}
              disabled={isExporting}
              className="px-6 py-3 rounded-full bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 transition-colors font-medium text-sm"
            >
              {isExporting ? 'Exporting...' : 'Export All (.md)'}
            </button>
          </div>
        </section>

        {/* Local Storage Section */}
        <section className="bg-surface rounded-3xl p-6 md:p-8 shadow-sm flex flex-col gap-6">
          <div className="flex items-center gap-3 border-b border-black/5 dark:border-white/5 pb-4">
            <Database className="w-6 h-6 text-primary" />
            <h2 className="font-serif text-xl tracking-tight text-foreground">Local Storage</h2>
          </div>
          
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="font-medium">Clear Local Cache</p>
              <p className="text-sm text-gray-500">Permanently destroy all local intelligence.</p>
            </div>
            <button
              onClick={() => setShowClearModal(true)}
              disabled={isClearing}
              className="px-6 py-3 rounded-full text-red-600 bg-red-500/10 hover:bg-red-500/20 transition-colors font-medium text-sm"
            >
              {isClearing ? 'Clearing...' : 'Clear Cache'}
            </button>
          </div>
        </section>

        {/* Account Section */}
        <section className="bg-surface rounded-3xl p-6 md:p-8 shadow-sm flex flex-col gap-6">
          <div className="flex items-center gap-3 border-b border-black/5 dark:border-white/5 pb-4">
            <User className="w-6 h-6 text-primary" />
            <h2 className="font-serif text-xl tracking-tight text-foreground">Account</h2>
          </div>
          
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="font-medium">Signed in as</p>
              <p className="text-sm text-gray-500 font-mono">{userEmail || 'Loading...'}</p>
            </div>
            <button
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="px-6 py-3 rounded-full text-red-600 bg-red-500/10 hover:bg-red-500/20 transition-colors font-medium text-sm"
            >
              {isLoggingOut ? 'Logging out...' : 'Log Out'}
            </button>
          </div>
        </section>
      </div>

      {showClearModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-[32px] bg-background p-6 shadow-2xl border border-black/10 dark:border-white/10">
            <h2 className="font-serif text-xl mb-4">Wipe Local Database?</h2>
            <p className="text-gray-500 dark:text-gray-400 mb-6">This will permanently destroy all local intelligence and audio files. This cannot be undone.</p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowClearModal(false)}
                disabled={isClearing}
                className="px-4 py-2 rounded-full text-sm font-medium hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleClearCache}
                disabled={isClearing}
                className="px-4 py-2 rounded-full text-sm font-medium bg-red-500 text-white hover:bg-red-600 transition-colors"
              >
                {isClearing ? 'Wiping...' : 'Confirm Wipe'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
