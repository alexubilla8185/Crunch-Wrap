import { useState, useEffect } from 'react';

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
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          messages: updatedMessages,
          documentContext: documentContext
        }),
      });

      if (!response.ok) throw new Error('Chat analysis failed');
      const data = await response.json();

      setMessages((prev) => [...prev, { role: 'model', text: data.text || 'No response generated.' }]);
    } catch (error) {
      console.error("Chat error:", error);
      setMessages((prev) => [...prev, { role: 'model', text: "Sorry, I encountered an error while processing your request." }]);
    } finally {
      setIsLoading(false);
    }
  };

  return { messages, isLoading, sendMessage };
}
