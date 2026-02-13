import type { Metadata } from "next";
import { DM_Sans, DM_Serif_Display, Caveat } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components";

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-body",
});

const dmSerifDisplay = DM_Serif_Display({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-heading",
});

const caveat = Caveat({
  subsets: ["latin"],
  variable: "--font-handwritten",
});

export const metadata: Metadata = {
  title: "OpenMaic - your AI wingman",
  description: "talk it out to figure it out. AI-powered interview practice for builders.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className={`${dmSans.variable} ${dmSerifDisplay.variable} ${caveat.variable}`}>
      <body className="antialiased min-h-screen font-sans">
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
