import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import Sidebar from '@/components/ui/Sidebar';
import BottomNav from '@/components/ui/BottomNav';
import ImportOrchestrator from '@/components/ImportOrchestrator';
import PresenceInitializer from '@/components/PresenceInitializer';
import InsightSubscriptionInitializer from '@/components/InsightSubscriptionInitializer';
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
    <div className="flex w-full bg-background text-foreground overflow-x-hidden flex min-h-screen items-start">
      <InsightSubscriptionInitializer />
      <ImportOrchestrator />
      <PresenceInitializer email={userEmail} />
      <Sidebar email={userEmail} />
      
      <main className="flex-1 flex flex-col pb-20 md:pb-0 relative md:p-4">
        <div className="flex-1 bg-surface md:rounded-[32px] md:shadow-m3 flex flex-col">
          {children}
        </div>
      </main>

      <BottomNav />
      <Toast />
    </div>
  );
}
