'use client';

import { useChat } from '@ai-sdk/react';
import { useEffect, useRef, useState } from 'react';
import { Send } from 'lucide-react';
import dynamic from 'next/dynamic';

const MarkdownRenderer = dynamic(() => import('@/components/ui/MarkdownRenderer'), {
  ssr: false,
  loading: () => <div className="animate-pulse bg-black/5 dark:bg-white/5 h-20 rounded-[24px]" />,
});

export default function ChatPage() {
  const { messages, sendMessage, status } = useChat();
  const [input, setInput] = useState('');
  const isLoading = status === 'submitted' || status === 'streaming';

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim()) return;
    
    const userMessage = { role: 'user' as const, content: input };
    setInput('');
    // @ts-ignore - sendMessage signature might vary
    await sendMessage(userMessage);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] md:h-screen relative">
      {/* Header */}
      <header className="flex-none p-4 md:p-6 border-b border-black/10 dark:border-white/10 bg-background/80 backdrop-blur-sm sticky top-0 z-10">
        <h1 className="text-xl font-serif font-medium tracking-tight">Global Chat</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 font-sans">Converse with your imported notes and files.</p>
      </header>

      {/* Message Feed */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 pb-32 md:pb-24">
        <div className="max-w-3xl mx-auto space-y-12">
          {messages.length === 0 ? (
            <div className="text-center text-gray-400 dark:text-gray-500 font-serif italic mt-20">
              What did we decide in yesterday&apos;s meeting?
            </div>
          ) : (
            messages.map((m) => (
              <div
                key={m.id}
                className={`flex flex-col ${
                  m.role === 'user' ? 'items-end' : 'items-start'
                }`}
              >
                {m.role === 'user' ? (
                  <div className="max-w-[80%] text-gray-600 dark:text-gray-300 font-sans text-base leading-relaxed px-4 py-2 border-l-2 border-black/20 dark:border-white/20">
                    {m.parts.filter((p: any) => p.type === 'text').map((p: any) => p.text).join('')}
                  </div>
                ) : (
                  <div className="w-full max-w-3xl font-serif text-lg leading-relaxed">
                    <MarkdownRenderer>{m.parts.filter((p: any) => p.type === 'text').map((p: any) => p.text).join('')}</MarkdownRenderer>
                  </div>
                )}
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area */}
      <div className="fixed bottom-16 md:bottom-0 left-0 md:left-64 right-0 p-4 bg-gradient-to-t from-background via-background to-transparent pointer-events-none">
        <div className="max-w-3xl mx-auto pointer-events-auto">
          <form
            onSubmit={handleSubmit}
            className="relative flex items-end bg-background border border-black/10 dark:border-white/10 rounded-[24px] shadow-sm focus-within:ring-1 focus-within:ring-black/20 dark:focus-within:ring-white/20 transition-all"
          >
            <textarea
              className="w-full max-h-48 min-h-[56px] bg-transparent border-none resize-none py-4 pl-4 pr-12 focus:outline-none focus:ring-0 font-sans text-base placeholder:text-gray-400 dark:placeholder:text-gray-500"
              placeholder="Ask anything..."
              value={input}
              onChange={handleInputChange}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e as any);
                }
              }}
              rows={1}
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="absolute right-2 bottom-2 p-2 rounded-[24px] text-gray-500 dark:text-gray-400 hover:text-foreground hover:bg-black/5 dark:hover:bg-white/5 disabled:opacity-50 disabled:hover:bg-transparent transition-colors"
            >
              <Send size={20} />
            </button>
          </form>
          <div className="text-center mt-2">
            <span className="text-[10px] text-gray-400 dark:text-gray-500 font-sans uppercase tracking-widest">
              AI can make mistakes. Verify important information.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
