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

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://ai-graveyard.v2ai.org";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  applicationName: "AI Graveyard",
  title: {
    default: "AI Graveyard",
    template: "%s | AI Graveyard",
  },
  description:
    "Open-source remains of AI products that died on the way to product-market fit.",
  keywords: [
    "AI Graveyard",
    "open source",
    "AI products",
    "product-market fit",
    "startup archive",
  ],
  authors: [{ name: "AI Graveyard", url: "https://github.com/ai-graveyard" }],
  creator: "AI Graveyard",
  publisher: "AI Graveyard",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "AI Graveyard",
    description:
      "A pixel garden for AI products that missed product-market fit and came back as public code.",
    siteName: "AI Graveyard",
    type: "website",
    locale: "en_US",
    alternateLocale: ["zh_CN"],
  },
  twitter: {
    card: "summary_large_image",
    title: "AI Graveyard",
    description:
      "A pixel garden for AI products that missed product-market fit and came back as public code.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
