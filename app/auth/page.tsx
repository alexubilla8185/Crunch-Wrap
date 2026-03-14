'use client';

import { GoogleSignInButton } from '@/components/auth/GoogleSignInButton';
import { CrunchWrapLogo } from '@/components/CrunchWrapLogo';
import { useRouter } from 'next/navigation';

export default function AuthPage() {
  const router = useRouter();

  const handleBypass = () => {
    document.cookie = "crunch_dev_bypass=true; path=/; max-age=86400; SameSite=None; Secure";
    router.refresh();
    router.push('/dashboard/hub');
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-6 bg-background text-foreground">
      <div className="bg-surface rounded-[32px] p-8 md:p-12 shadow-sm max-w-md w-full mx-auto border border-black/5 dark:border-white/5 text-center">
        <div className="flex justify-center mb-6">
          <CrunchWrapLogo />
        </div>
        <h1 className="font-serif text-3xl tracking-tight text-foreground">Crunch Wrap</h1>
        <p className="mt-2 text-gray-500 dark:text-gray-400 font-sans text-sm">Your files, crunched. Your insights, wrapped.</p>
        <div className="mt-10">
          <GoogleSignInButton />
          {process.env.NODE_ENV === 'development' && (
            <button
              onClick={handleBypass}
              className="w-full rounded-full py-3 text-sm font-mono text-gray-500 hover:bg-black/5 dark:hover:bg-white/5 transition-all mt-4 border border-dashed border-gray-300 dark:border-gray-700"
            >
              Sandbox Bypass (Dev Only)
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
