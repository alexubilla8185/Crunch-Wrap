import { useState, useEffect } from 'react';
import { GoogleGenAI } from "@google/genai";

export type Message = {
  role: 'user' | 'model';
  text: string;
};

export function useDocumentChat(documentContext: string) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!documentContext) return;
    setMessages([]); // Reset messages when context changes
  }, [documentContext]);

  const sendMessage = async (userText: string) => {
    if (!userText.trim()) return;

    const newUserMessage: Message = { role: 'user', text: userText };
    const updatedMessages = [...messages, newUserMessage];
    setMessages(updatedMessages);
    setIsLoading(true);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY! });
      
      const prompt = `Context: ${documentContext}\n\nMessages: ${updatedMessages.map(m => `${m.role}: ${m.text}`).join('\n')}`;
      
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
      });

      setMessages((prev) => [...prev, { role: 'model', text: response.text || '' }]);
    } catch (error) {
      console.error("Chat error:", error);
      setMessages((prev) => [...prev, { role: 'model', text: "Sorry, I encountered an error while processing your request." }]);
    } finally {
      setIsLoading(false);
    }
  };

  return { messages, isLoading, sendMessage };
}
