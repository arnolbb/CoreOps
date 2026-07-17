import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CoreOps",
  description: "Multi-tenant business operations platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full bg-background text-foreground">
        {children}
      </body>
    </html>
  );
}
