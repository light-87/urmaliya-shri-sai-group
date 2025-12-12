import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Urmaliya Shri Sai Group",
  description: "Inventory and Expense Management System",
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
