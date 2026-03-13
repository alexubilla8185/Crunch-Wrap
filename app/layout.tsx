import type {Metadata} from 'next';
import {Newsreader, Geist_Mono} from 'next/font/google';
import QueryProvider from '@/components/providers/QueryProvider';
import ThemeProvider from '@/components/ThemeProvider';
import './globals.css'; // Global styles

const newsreader = Newsreader({
  subsets: ['latin'],
  variable: '--font-newsreader',
  display: 'swap',
});

const geistMono = Geist_Mono({
  subsets: ['latin'],
  variable: '--font-geist-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL('https://crispy-bacon-v2.netlify.app'),
  title: {
    template: '%s | Crunch Wrap',
    default: 'Crunch Wrap',
  },
  description: "Your files, crunched. Your insights, wrapped. Lightning-fast AI audio transcription and file analysis.",
  applicationName: "Crunch Wrap",
  openGraph: {
    title: "Crunch Wrap",
    description: "Your files, crunched. Your insights, wrapped. Lightning-fast AI audio transcription and file analysis.",
    url: process.env.NEXT_PUBLIC_APP_URL || 'https://crispybacon.ai',
    siteName: "Crunch Wrap",
  },
  twitter: {
    card: 'summary_large_image',
    title: "Crunch Wrap",
    description: "Your files, crunched. Your insights, wrapped. Lightning-fast AI audio transcription and file analysis.",
  },
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en" className={`${newsreader.variable} ${geistMono.variable}`}>
      <body className="antialiased selection:bg-primary/30" suppressHydrationWarning>
        <ThemeProvider>
          <QueryProvider>
            {children}
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
