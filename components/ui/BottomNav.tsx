'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Folder, Settings, MessageSquare } from 'lucide-react';

export default function BottomNav() {
  const pathname = usePathname();

  const navItems = [
    { name: 'Hub', href: '/dashboard/hub', icon: Home },
    { name: 'Files', href: '/dashboard/files', icon: Folder },
    { name: 'Settings', href: '/dashboard/settings', icon: Settings },
  ];

  return (
    <nav className="flex md:hidden fixed bottom-0 w-full z-40 bg-background border-t border-border pb-safe">
      <div className="flex items-center justify-around p-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex flex-col items-center gap-1 p-2 rounded-[24px] transition-colors min-w-[64px] ${
                isActive
                  ? 'text-primary'
                  : 'text-gray-500 dark:text-gray-400 hover:text-foreground'
              }`}
            >
              <div className={`p-1.5 rounded-full ${isActive ? 'bg-primary/10' : ''}`}>
                <Icon size={24} />
              </div>
              <span className="text-[10px] font-sans font-medium">{item.name}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
