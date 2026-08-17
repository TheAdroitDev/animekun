import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Script from "next/script";
import Navbar from "@/components/layout/Navbar";

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
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var theme = localStorage.getItem('theme');
                  if (theme === 'dark' || (!theme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                    document.documentElement.setAttribute('data-theme', 'dark');
                  } else {
                    document.documentElement.setAttribute('data-theme', 'light');
                  }
                } catch(e) {}
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
        <Navbar />
        <main className="page-content">{children}</main>
      </body>
    </html>
  );
}
