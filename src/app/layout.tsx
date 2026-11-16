import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { StoreProvider } from "@/lib/store";
import { AppShell } from "@/components/app-shell";

// Inter: crisp, modern grotesque — the type language of the thedot.space
// reference: bold headings, high contrast, quietly confident.
const inter = Inter({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "monifes",
  description: "A kinder way to understand your spending.",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "monifes" },
};

// Pinch-zoom stays enabled — accessibility beats app-like feel.
export const viewport: Viewport = {
  themeColor: "#d1d0cc",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full">
        <StoreProvider>
          <AppShell>{children}</AppShell>
        </StoreProvider>
      </body>
    </html>
  );
}
