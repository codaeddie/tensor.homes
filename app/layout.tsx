/**
 * Root layout for tensor.homes.
 *
 * Wraps the entire application with:
 * - ClerkProvider for authentication
 * - Analytics for Vercel Analytics tracking
 * - Global fonts (Geist Sans and Geist Mono)
 * - Global CSS styles
 */

import { Analytics } from "@vercel/analytics/next";
import { ClerkProvider } from "@clerk/nextjs";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "tensor.homes - Collaborative Drawing Platform",
  description: "Create, edit, and share interactive drawings with tldraw",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body
          className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        >
          {children}
          <Analytics />
        </body>
      </html>
    </ClerkProvider>
  );
}
