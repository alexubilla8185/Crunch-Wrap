'use client';

import ReactMarkdown from 'react-markdown';

export default function MarkdownRenderer({ children }: { children: string }) {
  return (
    <div className="prose prose-neutral dark:prose-invert prose-p:leading-relaxed prose-pre:bg-foreground/5 prose-pre:text-foreground">
      <ReactMarkdown>
        {children}
      </ReactMarkdown>
    </div>
  );
}
