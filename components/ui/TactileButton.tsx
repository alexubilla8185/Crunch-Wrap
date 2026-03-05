import React from 'react';

interface TactileButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  className?: string;
}

export function TactileButton({ children, className = '', ...props }: TactileButtonProps) {
  const hasBg = className.includes('bg-');
  const defaultStyles = hasBg ? '' : 'bg-primary text-primary-foreground hover:opacity-90';

  return (
    <button
      className={`active:scale-95 transition-all duration-200 ${defaultStyles} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
