import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Analytics } from "@vercel/analytics/next"
import { SpeedInsights } from '@vercel/speed-insights/next';
import Script from "next/script";

import "./globals.css";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { WelcomeCelebration } from "@/modules/auth/components/WelcomeCelebration";
import { FeedbackWidget } from "@/components/feedback";
import { QueryProvider } from "@/providers/query-provider";


const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});


export const metadata: Metadata = {
  title: "AnimeKun | Discover, Organize & Experience Anime",
  description:
    "AnimeKun is a modern anime platform combining discovery, AI recommendations, quizzes, and personalization into one experience.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning data-scroll-behavior="smooth">
      <head>
        {/*
          Blocking script: sets the theme BEFORE first paint (no flash).
          Single source of truth for the initial theme. "light"/"dark" are
          explicit choices (Navbar toggle); anything else ("system", missing,
          legacy values) follows the OS preference.
        */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var t = localStorage.getItem('theme');
                  var dark = t === 'dark' || (t !== 'light' && window.matchMedia('(prefers-color-scheme: dark)').matches);
                  var root = document.documentElement;
                  root.setAttribute('data-theme', dark ? 'dark' : 'light');
                  root.style.colorScheme = dark ? 'dark' : 'light';
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body className={`${inter.variable}`}>
        <Script
          defer
          src="https://cloud.umami.is/script.js"
          data-website-id="0b1a8b08-63d1-42d8-a0f0-7d797044d5b6"
        />
        <QueryProvider>
          <Navbar />
          <main className="page-content">{children}</main>
          <Footer />
          <WelcomeCelebration />
          <FeedbackWidget />
        </QueryProvider>
         <SpeedInsights />
        <Analytics />
      </body>
    </html>
  );
}

