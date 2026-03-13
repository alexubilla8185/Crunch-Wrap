import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';

export default async function SharedInsightPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  
  // 1. Fetch link and validate expiration
  const { data: link, error: linkError } = await supabase
    .from('shared_links')
    .select('insight_id, expires_at')
    .eq('id', id)
    .single();

  if (linkError || !link) notFound();

  // Check if expired
  if (link.expires_at && new Date(link.expires_at) < new Date()) {
    return (
      <div className="max-w-3xl mx-auto p-12 font-sans text-center">
        <h1 className="font-serif text-4xl mb-4">Expired</h1>
        <p className="text-gray-600 dark:text-gray-300">This intelligence briefing has expired or does not exist.</p>
      </div>
    );
  }

  // 2. Fetch associated insight
  const { data: insight, error: insightError } = await supabase
    .from('insights')
    .select('title, intelligence')
    .eq('id', link.insight_id)
    .single();

  if (insightError || !insight) notFound();

  return (
    <div className="max-w-3xl mx-auto p-12 font-sans bg-background text-foreground min-h-screen">
      <h1 className="font-serif text-4xl mb-8">{insight.title}</h1>
      <div className="space-y-8">
        <section>
          <h2 className="font-serif text-xl mb-4">Summary</h2>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed">{insight.intelligence.summary}</p>
        </section>
        <section>
          <h2 className="font-serif text-xl mb-4">Highlights</h2>
          <ul className="list-disc pl-5 space-y-2">
            {insight.intelligence.highlights.map((h: string, i: number) => <li key={i}>{h}</li>)}
          </ul>
        </section>
        <section>
          <h2 className="font-serif text-xl mb-4">Action Items</h2>
          <ul className="list-disc pl-5 space-y-2">
            {insight.intelligence.action_items.map((a: string, i: number) => <li key={i}>{a}</li>)}
          </ul>
        </section>
      </div>
    </div>
  );
}
