import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import type React from "react";
import { isE2EE } from "@/lib/crypto.ts";

const geistSans = Geist({
    variable: "--font-geist-sans",
    subsets: ["latin"],
});

const geistMono = Geist_Mono({
    variable: "--font-geist-mono",
    subsets: ["latin"],
});

export const metadata: Metadata = {
    title: isE2EE() ? "SyncPad - Instant cross-device sync" : "localhost",
    description: "Zero-friction, browser-based scratchpad for instant text and file synchronization across devices.",
};

// biome-ignore lint/style/noDefaultExport: default export is required for Next.js root layout.
export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en" className="transition-colors duration-200">
            <body className={`${geistSans.variable} ${geistMono.variable} antialiased bg-orange-50 dark:bg-stone-900`}>
                {children}
            </body>
        </html>
    );
}
