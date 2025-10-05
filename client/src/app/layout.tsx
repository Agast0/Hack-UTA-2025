import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { GlobalClickSound } from "@/components/layout/global-click-sound";
import { RoastSfxObserver } from "@/components/layout/roast-sfx-observer";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "BugZooka - AI-Powered Bug Hunting",
  description: "Your AI-powered bug hunting companion for automated security testing",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Toggle html data attribute based on persisted UI store in a client effect
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Providers>
          <GlobalClickSound />
          <RoastSfxObserver />
          {children}
        </Providers>
      </body>
    </html>
  );
}
