'use client';

import React, { useState, useRef, useEffect } from 'react';
import { X, Send, Sparkles } from 'lucide-react';
import { useDocumentChat } from '@/hooks/useDocumentChat';

interface ChatDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  documentContext: string;
}

export function ChatDrawer({ isOpen, onClose, documentContext }: ChatDrawerProps) {
  const { messages, isLoading, sendMessage } = useDocumentChat(documentContext);
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isLoading, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim() && !isLoading) {
      sendMessage(inputValue);
      setInputValue('');
    }
  };

  const suggestedPrompts = [
    "Summarize the key decisions",
    "What are the action items?",
  ];

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-background/50 backdrop-blur-sm z-40 sm:hidden"
          onClick={onClose}
        />
      )}
      
      {/* Drawer */}
      <div 
        className={`fixed top-0 right-0 h-full w-full sm:w-96 bg-surface border-l border-black/5 dark:border-white/5 shadow-2xl transform transition-transform duration-300 ease-in-out z-50 flex flex-col [&::-webkit-scrollbar]:hidden ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4">
          <h2 className="font-serif text-xl tracking-tight">Document Assistant</h2>
          <button 
            onClick={onClose}
            className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/5 text-gray-500 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Message Feed */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 [&::-webkit-scrollbar]:hidden">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center space-y-6">
              <Sparkles className="w-12 h-12 text-primary/50" />
              <div className="space-y-2">
                <p className="font-medium">Ask me anything about this file.</p>
                <div className="flex flex-wrap justify-center gap-2 pt-2">
                  {suggestedPrompts.map((prompt) => (
                    <button
                      key={prompt}
                      onClick={() => sendMessage(prompt)}
                      className="rounded-full border border-black/10 dark:border-white/10 text-xs px-3 py-1.5 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            messages.map((msg, idx) => (
              <div 
                key={idx} 
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div 
                  className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm ${
                    msg.role === 'user' 
                      ? 'rounded-tr-sm bg-blue-500/10 text-blue-800 dark:bg-blue-400/10 dark:text-blue-200' 
                      : 'rounded-tl-sm bg-black/5 dark:bg-white/5 text-foreground/90'
                  }`}
                >
                  {msg.role === 'model' && <Sparkles className="w-3 h-3 inline mr-2 text-primary" />}
                  <p className="inline leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                </div>
              </div>
            ))
          )}
          {isLoading && (
            <div className="flex justify-start">
              <div className="max-w-[85%] rounded-2xl rounded-tl-sm px-4 py-3 bg-black/5 dark:bg-white/5 text-foreground/90">
                <div className="flex space-x-1 items-center h-5">
                  <div className="w-1.5 h-1.5 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-1.5 h-1.5 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-1.5 h-1.5 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <form onSubmit={handleSubmit} className="rounded-full bg-black/5 dark:bg-white/5 px-4 py-2 mx-4 mb-4 flex items-center gap-2">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Ask a question..."
            disabled={isLoading}
            className="flex-1 bg-transparent text-sm focus:outline-none disabled:opacity-50 placeholder:text-gray-400 dark:placeholder:text-gray-500"
          />
          <button
            type="submit"
            disabled={!inputValue.trim() || isLoading}
            className="w-8 h-8 rounded-full bg-primary text-primary-foreground disabled:opacity-50 hover:scale-105 transition-transform flex items-center justify-center flex-shrink-0"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </>
  );
}
