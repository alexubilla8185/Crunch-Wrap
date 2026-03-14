import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";

export const runtime = 'edge';

export async function POST(req: Request) {
  try {
    const { messages, documentContext } = await req.json();

    if (!documentContext) {
      return NextResponse.json({ error: 'documentContext is required' }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || process.env.API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'AI API Key is missing from environment variables.' }, { status: 401 });
    }

    const ai = new GoogleGenAI({ apiKey });

    const systemInstruction = "You are a highly intelligent document assistant. Use the following context to answer the user's questions accurately. If the answer is not in the context, say so. CONTEXT: \n\n" + documentContext;

    const chat = ai.chats.create({
      model: "gemini-3-flash-preview",
      config: {
        systemInstruction: systemInstruction,
      },
    });

    // The last message is the new user message
    const userMessage = messages[messages.length - 1].text;

    const response = await chat.sendMessage({ message: userMessage });

    return NextResponse.json({ text: response.text });
  } catch (error) {
    console.error("Chat API Error:", error);
    return NextResponse.json(
      { error: "Failed to process chat request.", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
