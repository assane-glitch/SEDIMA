import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "SEDIMA", template: "%s · SEDIMA" },
  description: "Gestion de projets SEDIMA",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "SEDIMA" },
  icons: { icon: "/icons/favicon-32.png", apple: "/icons/icon-192.png" },
};

export const viewport: Viewport = {
  themeColor: "#e01818",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
