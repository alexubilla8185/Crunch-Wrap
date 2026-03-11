import { GoogleGenAI, Type } from "@google/genai";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  const supabase = await createClient();
  let insightId: string | undefined;
  try {
    const body = await req.json();
    const data = body;
    insightId = data.insightId;
    const { audioUrl, mimeType, isDeepAnalysisEnabled } = data;

    // Validate required fields
    if (!insightId || !audioUrl) {
      return NextResponse.json({ success: false, error: "Missing required fields in payload." }, { status: 400 });
    }
    
    // 1. Fetch the File Data
    const { data: fileBlob, error: downloadError } = await supabase.storage
      .from('meetings')
      .download(audioUrl);

    if (downloadError) {
      throw new Error(`Failed to download audio file: ${downloadError.message}`);
    }

    // 2. Convert to Base64
    let base64Audio: string;
    // Supabase storage download returns a Blob in the browser, but in Node/Next.js API routes it might be a Buffer or Blob depending on the SDK version.
    // The safest way is to convert to ArrayBuffer first.
    const arrayBuffer = await (fileBlob as any).arrayBuffer();
    base64Audio = Buffer.from(arrayBuffer).toString('base64');
    
    console.log('File downloaded, size:', base64Audio.length, 'Mime:', mimeType);

    // 3. Determine mimeType
    let yourMimeType = mimeType;
    if (!yourMimeType) {
      if (audioUrl.endsWith('.mp3')) yourMimeType = 'audio/mp3';
      else if (audioUrl.endsWith('.md')) yourMimeType = 'text/markdown';
      else yourMimeType = 'audio/webm';
    }
    console.log('Using MimeType:', yourMimeType);

    const ai = new GoogleGenAI({ apiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY! });
    
    // Determine if audio is > 15 minutes (approx 15MB for compressed audio)
    const isLongAudio = base64Audio.length > 15 * 1024 * 1024 * 1.33; // 15MB * base64 overhead
    const useProModel = isDeepAnalysisEnabled || isLongAudio;
    const appliedModel = useProModel ? "gemini-3.1-pro-preview" : "gemini-3-flash-preview";
    console.log('Calling AI model:', appliedModel, 'isDeepAnalysisEnabled:', isDeepAnalysisEnabled, 'isLongAudio:', isLongAudio);

    const startTime = Date.now();
    const response = await ai.models.generateContent({
      model: appliedModel,
      contents: {
        parts: [
          { text: "Analyze this content and provide a structured summary, highlights, action items, topics, and sentiment." },
          { inlineData: { data: base64Audio, mimeType: yourMimeType } }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING, description: "A short, descriptive, contextual title for this meeting or note, max 6 words" },
            summary: { type: Type.STRING },
            highlights: { type: Type.ARRAY, items: { type: Type.STRING } },
            action_items: { type: Type.ARRAY, items: { type: Type.STRING } },
            topics: { type: Type.ARRAY, items: { type: Type.STRING } },
            sentiment: { type: Type.STRING },
            reading_time: { type: Type.STRING },
          },
          required: ["title", "summary", "highlights", "action_items", "topics", "sentiment", "reading_time"],
        },
        systemInstruction: "You are a top-tier analyst. Provide dense, high-signal analysis."
      }
    });
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    
    console.log('AI Response received:', response.text);
    const aiParsedData = JSON.parse(response.text!);
    const finalIntelligence = { ...aiParsedData, metadata: { model: appliedModel, duration: duration + 's' } };

    // Update the insights table
    const { error: updateError } = await supabase
      .from('insights')
      .update({
        processing_status: 'completed',
        title: finalIntelligence.title,
        summary: finalIntelligence.summary,
        highlights: finalIntelligence.highlights,
        action_items: finalIntelligence.action_items,
        topics: finalIntelligence.topics,
        sentiment: finalIntelligence.sentiment,
        intelligence: finalIntelligence,
        updated_at: new Date().toISOString(),
      })
      .eq('id', insightId);

    if (updateError) {
      console.error('Database update error:', updateError);
      return NextResponse.json({ success: false, error: 'Failed to update insight', details: updateError }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("CRITICAL API FAILURE:", error.message, error.stack);
    
    // Attempt to log the error to the database
    if (insightId) {
      await supabase
        .from('insights')
        .update({ 
          processing_status: 'failed', 
          summary: 'CRASH REPORT: ' + (error.message || String(error)) 
        })
        .eq('id', insightId);
    }

    return NextResponse.json({ error: error.message || "Unknown Server Error" }, { status: 500 });
  }
}
