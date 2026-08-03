import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Script from "next/script";
import Navbar from "@/components/layout/Navbar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AnimeKun — Discover, Organize & Experience Anime",
  description:
    "AnimeKun is a modern anime platform combining discovery, AI recommendations, quizzes, and personalization into one experience.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
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
