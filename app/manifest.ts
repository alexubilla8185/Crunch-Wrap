import { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Crunch Wrap',
    short_name: 'Crunch Wrap',
    description: 'Your files, crunched. Your insights, wrapped.',
    start_url: '/dashboard/hub',
    display: 'standalone',
    background_color: '#0E0E0E',
    theme_color: '#0E0E0E',
    icons: [
      {
        src: '/icon', // This automatically pulls from our dynamic app/icon.tsx
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icon',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  };
}
