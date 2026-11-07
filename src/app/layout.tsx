import localFont from "next/font/local";
import { JetBrains_Mono } from "next/font/google";

import "./globals.css";
import Header from "@/components/Header";
import ViewCanvas from "@/components/ViewCanvas";
import Footer from "@/components/Footer";
import Experience from "@/components/Experience";
import { Analytics } from "@vercel/analytics/react"
import type { Metadata } from "next";

const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono", display: "swap" });

export const metadata: Metadata = {
  title: "Red Bull: The Drop (unofficial concept)",
  description: "Unofficial design concept for a Red Bull virtual experience. Not affiliated with Red Bull GmbH.",
  robots: { index: false, follow: false },
};

const alpino = localFont({
  src: "../../public/fonts/Bull-Bold.woff2",
  display: "swap",
  weight: "100 900",
  variable: "--font-alpino",
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${alpino.variable} ${mono.variable}`}>
      <body className="overflow-x-hidden bg-carbon">
        <Experience />
        <Header />
        <main>
          <Analytics/>
          {children}
          <ViewCanvas />
        </main>
        <Footer />
      </body>
    </html>
  );
}
