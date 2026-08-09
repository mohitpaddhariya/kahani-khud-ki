import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Inter, Tiro_Devanagari_Hindi } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const tiro = Tiro_Devanagari_Hindi({
  weight: "400",
  subsets: ["devanagari", "latin"],
  variable: "--font-tiro",
  display: "swap",
});

export const metadata: Metadata = {
  title: "कहानी खुद की — जहाँ कहानी आपसे बात करती है",
  description:
    "The story that talks back — बच्चों के लिए एक इंटरैक्टिव, बहु-आवाज़ AI ऑडियो नाटक, जिसमें सुनने वाला ख़ुद एक किरदार है।",
};

export const viewport: Viewport = {
  themeColor: "#0B0714",
};

export default function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <html
      lang="hi"
      className={`${inter.variable} ${tiro.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
