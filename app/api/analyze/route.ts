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
    if (fileBlob instanceof Blob) {
        const arrayBuffer = await fileBlob.arrayBuffer();
        base64Audio = Buffer.from(arrayBuffer).toString('base64');
    } else {
        // Assume it's a Buffer
        base64Audio = (fileBlob as Buffer).toString('base64');
    }
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
    
    const model = isDeepAnalysisEnabled ? "gemini-3.1-pro-preview" : "gemini-3-flash-preview";
    console.log('Calling AI model:', model);

    const response = await ai.models.generateContent({
      model,
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
            summary: { type: Type.STRING },
            highlights: { type: Type.ARRAY, items: { type: Type.STRING } },
            action_items: { type: Type.ARRAY, items: { type: Type.STRING } },
            topics: { type: Type.ARRAY, items: { type: Type.STRING } },
            sentiment: { type: Type.STRING },
          },
          required: ["summary", "highlights", "action_items", "topics", "sentiment"],
        },
        systemInstruction: "You are a top-tier analyst. Provide dense, high-signal analysis."
      }
    });
    
    console.log('AI Response received:', response.text);
    const cleanJson = response.text!.replace(/```json\n?|\n?```/g, "");
    const intelligence = JSON.parse(cleanJson);

    // Update the insights table
    const { error: updateError } = await supabase
      .from('insights')
      .update({
        processing_status: 'completed',
        summary: intelligence.summary,
        highlights: intelligence.highlights,
        action_items: intelligence.action_items,
        topics: intelligence.topics,
        sentiment: intelligence.sentiment,
        intelligence: intelligence,
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
