import localFont from "next/font/local";

import "./globals.css";
import Header from "@/components/Header";
import ViewCanvas from "@/components/ViewCanvas";
import Footer from "@/components/Footer";
import { Analytics } from "@vercel/analytics/react"

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
    <html lang="en" className={alpino.variable}>
      <body className="overflow-x-hidden bg-[#0070B8]">
        <Header />
        <main>
          <Analytics/>
          {children}
          <ViewCanvas />
        </main>
        <Footer />
      </body>
      {/* <PrismicPreview repositoryName={repositoryName} /> */}
    </html>
  );
}
