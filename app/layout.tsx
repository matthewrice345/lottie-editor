import React from "react";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Lottie Editor",
  description: "Edit Lottie animations",
};

// Runs before React hydrates so we don't flash light-mode content. Reads the
// persisted theme (or falls back to system preference) and sets the `dark`
// class on <html> synchronously.
const NO_FOUC_SCRIPT = `(()=>{try{var t=localStorage.getItem('theme');if(t!=='light'&&t!=='dark'){t=window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';}if(t==='dark'){document.documentElement.classList.add('dark');}}catch(e){}})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: NO_FOUC_SCRIPT }} />
      </head>
      <body className={inter.className}>{children}</body>
    </html>
  );
}
