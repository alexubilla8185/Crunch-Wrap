import { ImageResponse } from 'next/og';

export const alt = 'Crunch Wrap';
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = 'image/png';

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: 'linear-gradient(to bottom right, #0f172a, #1e3a8a)',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
        }}
      >
        <svg viewBox="0 0 200 200" width="160" height="160" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ color: '#60a5fa', marginBottom: '40px' }}>
          <path d="M100 20 L170 55 L170 145 L100 180 L30 145 L30 55 Z" stroke="currentColor" strokeWidth="12" strokeLinecap="round" strokeLinejoin="round" fill="currentColor" fillOpacity="0.1"/>
          <path d="M100 100 L140 70 M100 100 L140 130 M100 100 L60 70 M100 100 L60 130" stroke="currentColor" strokeWidth="12" strokeLinecap="round"/>
          <circle cx="100" cy="100" r="15" fill="currentColor" />
          <polygon points="145,50 160,45 155,60" fill="currentColor" />
          <polygon points="40,150 55,145 50,160" fill="currentColor" />
        </svg>
        <div
          style={{
            fontSize: 80,
            fontWeight: 'bold',
            marginBottom: 20,
            letterSpacing: '-0.02em',
          }}
        >
          Crunch Wrap
        </div>
        <div
          style={{
            fontSize: 36,
            color: '#94a3b8',
            fontWeight: 'normal',
          }}
        >
          Your files, crunched. Your insights, wrapped.
        </div>
      </div>
    ),
    { ...size }
  );
}
