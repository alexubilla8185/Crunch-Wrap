import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: Request) {
  try {
    const { fileName, contentType } = await req.json();
    const supabase = await createClient();

    // Authenticate user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Generate unique file path
    const filePath = `${user.id}/${Date.now()}-${fileName}`;

    // Create signed upload URL
    const { data, error } = await supabase.storage
      .from('meetings')
      .createSignedUploadUrl(filePath);

    if (error) {
      console.error("SUPABASE STORAGE ERROR:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ signedUrl: data.signedUrl, path: data.path });
  } catch (error) {
    console.error('Unexpected error in signed-url route:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
