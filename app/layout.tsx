import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import packageJson from "../package.json";
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
  title: "myApron",
  description: "Scan recipe cards, save recipes, and build a shopping list.",
  other: {
    "codex-preview": "development",
    "myapron-version": packageJson.version,
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
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
        {children}
        <div
          aria-label={`myApron version ${packageJson.version}`}
          style={{
            position: "fixed",
            right: 8,
            bottom: 8,
            zIndex: 9999,
            padding: "4px 7px",
            borderRadius: 999,
            background: "rgba(30, 40, 32, 0.72)",
            color: "white",
            fontSize: 11,
            lineHeight: 1,
            fontFamily: "monospace",
            pointerEvents: "none",
          }}
        >
          v{packageJson.version}
        </div>
      </body>
    </html>
  );
}
