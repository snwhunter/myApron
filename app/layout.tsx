import type { Metadata } from "next";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import packageJson from "../package.json";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "myApron",
  description: "Recipes, shopping, household food inventory, planning and leftovers.",
  other: { "codex-preview": "development", "myapron-version": packageJson.version },
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <div style={{position:"fixed",top:8,right:8,zIndex:9999,display:"flex",gap:6,padding:4,borderRadius:10,background:"rgba(255,255,255,.92)",boxShadow:"0 2px 12px rgba(0,0,0,.12)"}}>
          <Link href="/" style={{padding:"6px 9px",color:"#1e2820",textDecoration:"none",fontSize:12,fontWeight:700}}>Recipes</Link>
          <Link href="/household" style={{padding:"6px 9px",color:"#1e2820",textDecoration:"none",fontSize:12,fontWeight:700}}>Household</Link>
        </div>
        {children}
        <div aria-label={`myApron version ${packageJson.version}`} style={{position:"fixed",right:8,bottom:8,zIndex:9999,padding:"4px 7px",borderRadius:999,background:"rgba(30, 40, 32, 0.72)",color:"white",fontSize:11,lineHeight:1,fontFamily:"monospace",pointerEvents:"none"}}>
          v{packageJson.version}
        </div>
      </body>
    </html>
  );
}
