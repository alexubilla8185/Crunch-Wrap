'use client';

import ReactMarkdown from 'react-markdown';

export default function MarkdownRenderer({ children }: { children: string }) {
  return (
    <div className="prose prose-neutral dark:prose-invert prose-p:leading-relaxed prose-pre:bg-black/5 dark:prose-pre:bg-white/5 prose-pre:text-foreground">
      <ReactMarkdown>
        {children}
      </ReactMarkdown>
    </div>
  );
}
