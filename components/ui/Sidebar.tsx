'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Folder, Settings, Moon, Sun, PanelLeftClose, PanelLeftOpen, MessageSquare } from 'lucide-react';
import { useUIStore } from '@/lib/store';

import ActiveUsers from '@/components/ui/ActiveUsers';
import { TactileButton } from '@/components/ui/TactileButton';
import { CrunchWrapLogo } from '@/components/CrunchWrapLogo';

export default function Sidebar({ email }: { email?: string }) {
  const { isSidebarOpen, toggleSidebar, theme, toggleTheme } = useUIStore();
  const pathname = usePathname();

  const navItems = [
    { name: 'Hub', href: '/dashboard/hub', icon: Home },
    { name: 'Files', href: '/dashboard/files', icon: Folder },
    { name: 'Settings', href: '/dashboard/settings', icon: Settings },
  ];

  return (
    <aside
      className={`hidden md:flex flex-col bg-background/50 backdrop-blur-sm transition-all duration-300 h-screen sticky top-0 ${
        isSidebarOpen ? 'w-64' : 'w-20'
      }`}
    >
      <div className="p-6 flex items-center justify-between h-16 overflow-hidden">
        {isSidebarOpen ? (
          <div className="flex items-center gap-2 truncate">
            <CrunchWrapLogo className="text-primary shrink-0" size={24} />
            <span className="font-serif font-medium text-lg tracking-tight truncate">
              Crunch Wrap
            </span>
          </div>
        ) : (
          <TactileButton
            onClick={toggleSidebar}
            className="flex justify-center w-full p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-colors duration-200 bg-transparent shrink-0"
            aria-label="Expand Sidebar"
          >
            <CrunchWrapLogo className="text-primary shrink-0 hover:scale-105 transition-transform" size={24} />
          </TactileButton>
        )}
        
        {isSidebarOpen && (
          <TactileButton
            onClick={toggleSidebar}
            className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-colors duration-200 text-gray-500 dark:text-gray-400 hover:text-foreground bg-transparent shrink-0"
            aria-label="Toggle Sidebar"
          >
            <PanelLeftClose size={20} />
          </TactileButton>
        )}
      </div>

      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-full transition-all duration-200 ${
                isActive
                  ? 'bg-blue-500/10 text-blue-600 dark:bg-blue-400/10 dark:text-blue-400 font-medium'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-black/5 dark:hover:bg-white/5'
              }`}
            >
              <Icon size={20} className="shrink-0" />
              {isSidebarOpen && <span className="font-sans text-sm">{item.name}</span>}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 flex flex-col gap-2">
        {isSidebarOpen && (
          <div className="mb-2 px-2">
            <ActiveUsers />
          </div>
        )}
        <TactileButton
          onClick={toggleTheme}
          className="flex items-center gap-3 px-4 py-3 rounded-full text-gray-600 dark:text-gray-400 hover:bg-black/5 dark:hover:bg-white/5 transition-colors duration-200 w-full bg-transparent"
          aria-label={theme === 'charcoal' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          {theme === 'charcoal' ? <Sun size={20} className="shrink-0" /> : <Moon size={20} className="shrink-0" />}
          {isSidebarOpen && (
            <span className="font-sans text-sm">{theme === 'charcoal' ? 'Light Mode' : 'Dark Mode'}</span>
          )}
        </TactileButton>
        {isSidebarOpen && email && (
          <div className="px-4 py-2 text-xs font-mono text-gray-500 dark:text-gray-400 truncate">
            {email}
          </div>
        )}
      </div>
    </aside>
  );
}