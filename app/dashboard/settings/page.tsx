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
        <p className="text-foreground/60 font-sans text-sm md:text-base">
          Configure intelligence, storage, and account preferences.
        </p>
      </header>

      <div className="space-y-8">
        {/* Aesthetics Section */}
        <section className="p-6 md:p-8 rounded-3xl bg-primary/5 border border-foreground/10">
          <div className="flex items-center gap-3 mb-6">
            <Palette className="w-6 h-6 text-primary" />
            <h2 className="text-xl font-serif font-medium">Aesthetics</h2>
          </div>
          
          <div>
            <h3 className="text-sm font-medium mb-3">Theme Selection</h3>
            <div className="flex p-1 bg-background rounded-full border border-foreground/10 w-fit">
              <button
                onClick={() => theme !== 'sandstone' && toggleTheme()}
                className={`px-6 py-2 rounded-full text-sm font-medium transition-all focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
                  theme === 'sandstone'
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-foreground/60 hover:text-foreground'
                }`}
              >
                Sandstone (Light)
              </button>
              <button
                onClick={() => theme !== 'charcoal' && toggleTheme()}
                className={`px-6 py-2 rounded-full text-sm font-medium transition-all focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
                  theme === 'charcoal'
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-foreground/60 hover:text-foreground'
                }`}
              >
                Charcoal (Dark)
              </button>
            </div>
            <p className="text-xs text-foreground/50 mt-3 max-w-xs">
              Select your preferred visual environment.
            </p>
          </div>
        </section>

        {/* Data Ownership Section */}
        <section className="p-6 md:p-8 rounded-3xl bg-primary/5 border border-foreground/10">
          <div className="flex items-center gap-3 mb-6">
            <Download className="w-6 h-6 text-primary" />
            <h2 className="text-xl font-serif font-medium">Data Ownership</h2>
          </div>
          
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="max-w-md">
              <p className="text-sm text-foreground/70 mb-2">
                Download a complete backup of all your notes and action items as a portable Markdown file.
              </p>
            </div>
            
            <TactileButton
              onClick={handleExport}
              disabled={isExporting}
              className="flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-background border border-foreground/10 text-foreground hover:bg-foreground/5 transition-colors shrink-0 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              <Download className="w-4 h-4" />
              <span className="font-sans font-medium text-sm">
                {isExporting ? 'Exporting...' : 'Export All Intelligence (.md)'}
              </span>
            </TactileButton>
          </div>
        </section>

        {/* Intelligence Section */}
        <section className="p-6 md:p-8 rounded-3xl bg-primary/5 border border-foreground/10">
          <div className="flex items-center gap-3 mb-6">
            <BrainCircuit className="w-6 h-6 text-primary" />
            <h2 className="text-xl font-serif font-medium">Intelligence</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-sm font-medium mb-3">Model Selection</h3>
              <div className="flex p-1 bg-background rounded-full border border-foreground/10 w-fit">
                <button
                  onClick={() => setAIPreferences({ model: 'flash' })}
                  className={`px-6 py-2 rounded-full text-sm font-medium transition-all focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
                    aiPreferences.model === 'flash'
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-foreground/60 hover:text-foreground'
                  }`}
                >
                  Flash (Fast)
                </button>
                <button
                  onClick={() => setAIPreferences({ model: 'pro' })}
                  className={`px-6 py-2 rounded-full text-sm font-medium transition-all focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
                    aiPreferences.model === 'pro'
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-foreground/60 hover:text-foreground'
                  }`}
                >
                  Pro (Deep)
                </button>
              </div>
              <p className="text-xs text-foreground/50 mt-3 max-w-xs">
                Flash is optimized for speed and daily tasks. Pro uses advanced reasoning for complex analysis.
              </p>
            </div>

            <div>
              <h3 className="text-sm font-medium mb-3">Response Tone</h3>
              <div className="flex p-1 bg-background rounded-full border border-foreground/10 w-fit">
                <button
                  onClick={() => setAIPreferences({ tone: 'direct' })}
                  className={`px-6 py-2 rounded-full text-sm font-medium transition-all focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
                    aiPreferences.tone === 'direct'
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-foreground/60 hover:text-foreground'
                  }`}
                >
                  Direct
                </button>
                <button
                  onClick={() => setAIPreferences({ tone: 'detailed' })}
                  className={`px-6 py-2 rounded-full text-sm font-medium transition-all focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
                    aiPreferences.tone === 'detailed'
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-foreground/60 hover:text-foreground'
                  }`}
                >
                  Detailed
                </button>
              </div>
              <p className="text-xs text-foreground/50 mt-3 max-w-xs">
                Direct provides concise, actionable summaries. Detailed includes expansive context and nuance.
              </p>
            </div>
          </div>
        </section>

        {/* Local Storage Section */}
        <section className="p-6 md:p-8 rounded-3xl bg-primary/5 border border-foreground/10">
          <div className="flex items-center gap-3 mb-6">
            <Database className="w-6 h-6 text-primary" />
            <h2 className="text-xl font-serif font-medium">Local Storage</h2>
          </div>
          
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="max-w-md">
              <p className="text-sm text-foreground/70 mb-4">
                Crispy Bacon uses a Local-First architecture. Your data is processed and stored on your device before importing, ensuring maximum privacy and offline capability.
              </p>
              <div className="flex items-center gap-2">
                <span className="text-xs text-foreground/50 uppercase tracking-wider font-semibold">Local Database Size:</span>
                <span className="font-mono text-sm font-medium">24.5 MB</span>
              </div>
            </div>
            
            <TactileButton
              onClick={() => setShowClearModal(true)}
              disabled={isClearing}
              className="flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-background border border-foreground/10 text-foreground hover:bg-red-500/10 hover:text-red-500 hover:border-red-500/20 transition-colors shrink-0 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              <Trash2 className="w-4 h-4" />
              <span className="font-sans font-medium text-sm">
                {isClearing ? 'Clearing...' : 'Clear Local Cache'}
              </span>
            </TactileButton>
          </div>
        </section>

        {/* Account Section */}
        <section className="p-6 md:p-8 rounded-3xl bg-primary/5 border border-foreground/10">
          <div className="flex items-center gap-3 mb-6">
            <User className="w-6 h-6 text-primary" />
            <h2 className="text-xl font-serif font-medium">Account</h2>
          </div>
          
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <p className="text-xs text-foreground/50 uppercase tracking-wider font-semibold mb-1">Signed in as</p>
              <p className="font-mono text-sm font-medium">{userEmail || 'Loading...'}</p>
            </div>
            
            <TactileButton
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-background border border-foreground/10 text-foreground hover:bg-foreground/5 transition-colors shrink-0 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              <LogOut className="w-4 h-4" />
              <span className="font-sans font-medium text-sm">
                {isLoggingOut ? 'Logging out...' : 'Log Out'}
              </span>
            </TactileButton>
          </div>
        </section>
      </div>

      {showClearModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-background p-6 shadow-2xl border border-foreground/10">
            <h2 className="font-serif text-xl mb-4">Wipe Local Database?</h2>
            <p className="text-foreground/60 mb-6">This will permanently destroy all local intelligence and audio files. This cannot be undone.</p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowClearModal(false)}
                disabled={isClearing}
                className="px-4 py-2 rounded-xl text-sm font-medium hover:bg-foreground/5 transition-colors disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                aria-label="Cancel"
              >
                Cancel
              </button>
              <button
                onClick={handleClearCache}
                disabled={isClearing}
                className="px-4 py-2 rounded-xl text-sm font-medium bg-red-500 text-white hover:bg-red-600 transition-colors disabled:opacity-50 flex items-center gap-2 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none focus-visible:ring-offset-2 focus-visible:ring-offset-background"
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
