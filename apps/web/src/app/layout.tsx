import { BRAND } from '@forja/core';
import type { Metadata, Viewport } from 'next';
import { Barlow, Barlow_Condensed } from 'next/font/google';
import Script from 'next/script';
import './globals.css';

const body = Barlow({ subsets: ['latin'], weight: ['400', '500', '600', '700'], variable: '--font-body' });
const display = Barlow_Condensed({
  subsets: ['latin'],
  weight: ['600', '700', '800'],
  variable: '--font-display-face',
});

export const metadata: Metadata = {
  title: { default: BRAND.name, template: `%s · ${BRAND.name}` },
  description: BRAND.tagline,
  // iPhone: nome e modo tela cheia ao adicionar à tela inicial (ícone em app/apple-icon.png).
  appleWebApp: { capable: true, title: BRAND.shortName, statusBarStyle: 'black' },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#0b0b0c',
};

// Aplica tema e cor de destaque salvos antes da pintura (evita "piscar").
const prefsScript = `try{var t=localStorage.getItem('forja:theme');if(t==='light')document.documentElement.dataset.theme='light';var a=localStorage.getItem('forja:accent');if(a&&/^#[0-9a-f]{6}$/i.test(a))document.documentElement.style.setProperty('--accent',a)}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${body.variable} ${display.variable}`} suppressHydrationWarning>
      <body className="min-h-dvh">
        <Script id="forja-prefs" strategy="beforeInteractive">
          {prefsScript}
        </Script>
        {children}
      </body>
    </html>
  );
}
