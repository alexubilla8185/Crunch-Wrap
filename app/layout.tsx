import type {Metadata} from 'next';
import {Newsreader, Geist_Mono} from 'next/font/google';
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
  title: "Crispy Bacon | Privacy-First AI Intelligence",
  description: "Transform scattered meeting notes into instant, actionable intelligence. The privacy-first AI knowledge base built for teams that refuse to lose.",
  openGraph: {
    title: "Crispy Bacon | Privacy-First AI Intelligence",
    description: "Transform scattered meeting notes into instant, actionable intelligence. The privacy-first AI knowledge base built for teams that refuse to lose.",
    url: process.env.NEXT_PUBLIC_APP_URL || 'https://crispybacon.ai',
    siteName: "Crispy Bacon",
    images: ['/og-image.webp'],
  },
  twitter: {
    card: 'summary_large_image',
    title: "Crispy Bacon | Privacy-First AI Intelligence",
    description: "Transform scattered meeting notes into instant, actionable intelligence. The privacy-first AI knowledge base built for teams that refuse to lose.",
    images: ['/og-image.webp'],
  },
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en" className={`${newsreader.variable} ${geistMono.variable}`}>
      <body className="antialiased selection:bg-primary/30" suppressHydrationWarning>
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
