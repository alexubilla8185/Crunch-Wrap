import { GoogleSignInButton } from '@/components/auth/GoogleSignInButton';

export default function AuthPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-6 bg-background text-foreground">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-serif font-medium text-foreground">Crunch Wrap</h1>
          <p className="mt-2 text-gray-500 dark:text-gray-400 font-sans text-sm">Your files, crunched. Your insights, wrapped.</p>
        </div>
        <GoogleSignInButton />
      </div>
    </div>
  );
}
