import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LeetSync - Automate LeetCode to GitHub Synchronization",
  description: "Automatically sync your accepted LeetCode solutions into your GitHub repository.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="bg-slate-950 text-slate-100 antialiased min-h-screen">
        {children}
      </body>
    </html>
  );
}
