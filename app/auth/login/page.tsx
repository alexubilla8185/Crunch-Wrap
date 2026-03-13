'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { LoginSchema, type LoginInput } from '@/lib/schemas';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(LoginSchema),
  });

  const onSubmit = async (data: LoginInput) => {
    setIsLoading(true);
    setError(null);

    try {
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });

      if (authError) {
        setError(authError.message);
        setIsLoading(false);
        return;
      }

      router.push('/dashboard/hub');
      router.refresh();
    } catch (err) {
      setError('An unexpected error occurred.');
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center p-4 bg-background text-foreground">
      <div className="w-full max-w-md p-8 rounded-[32px] border border-black/10 dark:border-white/10 bg-primary/5">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-serif font-medium tracking-tight mb-2">
            Crunch Wrap
          </h1>
          <p className="text-sm opacity-70 font-mono">
            Your files, crunched. Your insights, wrapped.
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {error && (
            <div className="p-3 rounded-[24px] bg-red-500/10 border border-red-500/20 text-red-500 text-sm font-mono text-center">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <label className="block text-xs font-mono uppercase tracking-wider opacity-70">
              Email
            </label>
            <input
              {...register('email')}
              type="email"
              className="w-full px-4 py-3 rounded-full bg-background border border-black/10 dark:border-white/10 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-sans"
              placeholder="agent@crispybacon.io"
              disabled={isLoading}
            />
            {errors.email && (
              <p className="text-xs text-red-500 font-mono mt-1 px-2">
                {errors.email.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-mono uppercase tracking-wider opacity-70">
              Password
            </label>
            <input
              {...register('password')}
              type="password"
              className="w-full px-4 py-3 rounded-full bg-background border border-black/10 dark:border-white/10 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-sans"
              placeholder="••••••••"
              disabled={isLoading}
            />
            {errors.password && (
              <p className="text-xs text-red-500 font-mono mt-1 px-2">
                {errors.password.message}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-4 rounded-full bg-primary text-background font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center mt-8"
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                Authenticating...
              </span>
            ) : (
              'Enter Hub'
            )}
          </button>

          <hr className="border-black/10 dark:border-white/10 my-6" />

          <button
            type="button"
            onClick={() => {
              // Set cookie with comprehensive attributes for cross-origin iframe support
              document.cookie = "crispy_dev_bypass=true; path=/; max-age=31536000; SameSite=None; Secure";
              
              // Force reload to ensure middleware sees the new cookie
              window.location.href = '/dashboard/hub';
            }}
            className="w-full py-4 rounded-full border border-primary/50 text-primary font-medium hover:bg-primary/10 transition-colors flex items-center justify-center"
          >
            Developer Sandbox Bypass
          </button>
        </form>
      </div>
    </main>
  );
}
