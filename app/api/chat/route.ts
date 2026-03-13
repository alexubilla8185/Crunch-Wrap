import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";

export const runtime = 'edge';

export async function POST(req: Request) {
  try {
    const { messages, documentContext } = await req.json();

    if (!documentContext) {
      return NextResponse.json({ error: 'documentContext is required' }, { status: 400 });
    }

    const ai = new GoogleGenAI({ apiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY! });

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
    console.error("Chat API error:", error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
