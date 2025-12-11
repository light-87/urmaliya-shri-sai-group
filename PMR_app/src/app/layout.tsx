import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PMR Industries - Inventory & Expense Manager",
  description: "Manage inventory and expenses for PMR Industries",
  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
