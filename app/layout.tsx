import type { Metadata } from 'next';
import localFont from 'next/font/local';
import './globals.css';
import { ThemeProvider } from '@/components';

const bodyFont = localFont({
  src: './fonts/GeistVF.woff',
  variable: '--font-body',
  weight: '100 900',
});

const displayFont = localFont({
  src: './fonts/GeistVF.woff',
  variable: '--font-display',
  weight: '100 900',
});

const monoFont = localFont({
  src: './fonts/GeistMonoVF.woff',
  variable: '--font-mono',
  weight: '100 900',
});

export const metadata: Metadata = {
  title: 'openmAIc | Talk Your Work Into Focus',
  description: 'Voice-first interview practice for builders with AI-generated prompts, transcription, and media exports.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning className={`${bodyFont.variable} ${displayFont.variable} ${monoFont.variable}`}>
      <body>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
