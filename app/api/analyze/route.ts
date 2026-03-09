import { GoogleGenAI, Type } from "@google/genai";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { insightId, audioUrl, mimeType, isDeepAnalysisEnabled } = body;

    // Validate required fields
    if (!insightId || !audioUrl) {
      return NextResponse.json({ success: false, error: "Missing required fields in payload." }, { status: 400 });
    }

    const supabase = await createClient();
    
    // 1. Fetch the File Data
    const { data: fileBlob, error: downloadError } = await supabase.storage
      .from('meetings')
      .download(audioUrl);

    if (downloadError) {
      throw new Error(`Failed to download audio file: ${downloadError.message}`);
    }

    // 2. Convert to Base64
    const arrayBuffer = await fileBlob.arrayBuffer();
    const base64Audio = Buffer.from(arrayBuffer).toString('base64');

    // 3. Determine mimeType
    const yourMimeType = audioUrl.endsWith('.mp3') ? 'audio/mp3' : (mimeType || 'audio/webm');

    const ai = new GoogleGenAI({ apiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY! });
    
    const model = isDeepAnalysisEnabled ? "gemini-3.1-pro-preview" : "gemini-3-flash-preview";

    const response = await ai.models.generateContent({
      model,
      contents: {
        parts: [
          { text: "Analyze this audio and provide a structured summary, highlights, action items, topics, and sentiment." },
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
    return NextResponse.json({ error: error.message || "Unknown Server Error" }, { status: 500 });
  }
}
