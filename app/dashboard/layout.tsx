import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import Sidebar from '@/components/ui/Sidebar';
import BottomNav from '@/components/ui/BottomNav';
import ImportOrchestrator from '@/components/ImportOrchestrator';
import PresenceInitializer from '@/components/PresenceInitializer';
import { Toast } from '@/components/ui/Toast';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const isDevBypass = cookieStore.has('crispy_dev_bypass');

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && !isDevBypass) {
    redirect('/auth/login');
  }

  const userEmail = user?.email || 'dev@sandbox.local';

  return (
    <div className="flex h-screen w-full bg-background text-foreground overflow-hidden">
      <ImportOrchestrator />
      <PresenceInitializer email={userEmail} />
      <Sidebar email={userEmail} />
      
      <main className="flex-1 flex flex-col h-full overflow-y-auto pb-20 md:pb-0 relative">
        {children}
      </main>

      <BottomNav />
      <Toast />
    </div>
  );
}
