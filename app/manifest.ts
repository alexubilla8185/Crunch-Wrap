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
        src: '/icon',
        sizes: 'any',
        type: 'image/png',
      },
    ],
  };
}
