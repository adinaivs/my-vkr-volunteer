import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import "leaflet/dist/leaflet.css";
import { ToastProvider } from "./components/ToastContainer";
import AnnouncementBanner from "./components/AnnouncementBanner";
import { AnnouncementProvider } from "./contexts/AnnouncementContext";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ВолонтёрКР",
  description: "Платформа для волонтёров и организаторов социальных проектов в Кыргызстане",
  icons: {
    icon: '/logo.png',
    apple: '/logo.png',
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
      <body className="min-h-full flex flex-col">
        <AnnouncementProvider>
          <ToastProvider>
            {children}
          </ToastProvider>
        </AnnouncementProvider>
      </body>
    </html>
  );
}
