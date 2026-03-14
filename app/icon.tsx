import { ImageResponse } from 'next/og';

export const size = {
  width: 512,
  height: 512,
};
export const contentType = 'image/png';

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'transparent',
        }}
      >
        <svg viewBox="0 0 200 200" width="200" height="200" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ color: '#2563EB' }}>
          <path d="M100 20 L170 55 L170 145 L100 180 L30 145 L30 55 Z" stroke="currentColor" strokeWidth="12" strokeLinecap="round" strokeLinejoin="round" fill="currentColor" fillOpacity="0.1"/>
          <path d="M100 100 L140 70 M100 100 L140 130 M100 100 L60 70 M100 100 L60 130" stroke="currentColor" strokeWidth="12" strokeLinecap="round"/>
          <circle cx="100" cy="100" r="15" fill="currentColor" />
          <polygon points="145,50 160,45 155,60" fill="currentColor" />
          <polygon points="40,150 55,145 50,160" fill="currentColor" />
        </svg>
      </div>
    ),
    { ...size }
  );
}
