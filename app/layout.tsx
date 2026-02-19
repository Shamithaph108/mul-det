import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Financial Forensics Engine — RIFT 2026",
  description: "Graph-based money muling detection system. Upload transaction CSV to expose hidden fraud rings.",
  keywords: ["fraud detection", "money muling", "graph analysis", "financial crime", "RIFT 2026"],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body>{children}</body>
    </html>
  );
}
