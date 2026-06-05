import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import "leaflet/dist/leaflet.css";
import { ToastProvider } from "./components/ToastContainer";
import AnnouncementBanner from "./components/AnnouncementBanner";
import { AnnouncementProvider } from "./contexts/AnnouncementContext";
import ServiceWorkerRegister from "./components/ServiceWorkerRegister";

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
  applicationName: "ВолонтёрКР",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "ВолонтёрКР",
  },
  icons: {
    icon: '/logo.png',
    apple: '/icons/apple-icon-180.png',
  },
};

export const viewport: Viewport = {
  themeColor: "#16a34a",
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
        <ServiceWorkerRegister />
        <AnnouncementProvider>
          <ToastProvider>
            {children}
          </ToastProvider>
        </AnnouncementProvider>
      </body>
    </html>
  );
}
