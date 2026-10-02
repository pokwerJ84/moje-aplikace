import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Technický slovník",
  description: "Česky, anglicky a japonsky v rómadži.",
  other: {
    "codex-preview": "development",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="cs">
      <body className="antialiased">{children}</body>
    </html>
  );
}
