import type { Metadata } from "next";
import "./globals.css";

import { Toaster } from "sonner";

import { ThemeProvider } from "@/components/theme-provider";
import { inter } from "@/lib/fonts";

export const metadata: Metadata = {
  title: "CoreX — Centro de Inteligencia Empresarial",
  description:
    "Dashboard empresarial conectado a PostgreSQL para indicadores operativos de campo.",
  icons: {
    icon: "/icon.svg",
    shortcut: "/icon.svg",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" suppressHydrationWarning className={`${inter.variable} antialiased`}>
      <body className={inter.className}>
        <ThemeProvider defaultTheme="system" storageKey="dashboard-starter-theme">
          {children}
        </ThemeProvider>
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
