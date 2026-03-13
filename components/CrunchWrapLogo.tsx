import React from 'react';
export const CrunchWrapLogo = ({ className = 'text-blue-600', size = 24 }: { className?: string, size?: number }) => (
  <svg viewBox="0 0 200 200" width={size} height={size} className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M100 20 L170 55 L170 145 L100 180 L30 145 L30 55 Z" stroke="currentColor" strokeWidth="12" strokeLinecap="round" strokeLinejoin="round" fill="currentColor" fillOpacity="0.1"/>
    <path d="M100 100 L140 70 M100 100 L140 130 M100 100 L60 70 M100 100 L60 130" stroke="currentColor" strokeWidth="12" strokeLinecap="round"/>
    <circle cx="100" cy="100" r="15" fill="currentColor" />
    <polygon points="145,50 160,45 155,60" fill="currentColor" />
    <polygon points="40,150 55,145 50,160" fill="currentColor" />
  </svg>
);
