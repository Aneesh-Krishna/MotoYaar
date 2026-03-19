import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { Providers } from "@/components/Providers";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "MotoYaar — Your Garage, Organized",
  description:
    "Digital garage for Indian vehicle owners. Track documents, expenses, trips and connect with enthusiasts.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "MotoYaar",
  },
  formatDetection: { telephone: false },
  openGraph: {
    type: "website",
    title: "MotoYaar",
    description: "Your garage, organized.",
  },
};

export const viewport: Viewport = {
  themeColor: "#F97316",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body><Providers>{children}</Providers></body>
    </html>
  );
}