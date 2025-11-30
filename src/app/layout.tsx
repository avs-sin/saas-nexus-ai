import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { dark } from "@clerk/themes";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Nexus AI | Standard Fiber",
  description: "Multi-tenant B2B SaaS platform for manufacturing and warehouse operations",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider
      appearance={{
        baseTheme: dark,
        variables: {
          colorPrimary: "#f97316",
          colorBackground: "#09090b",
          colorInputBackground: "#18181b",
          colorInputText: "#fafafa",
        },
        elements: {
          formButtonPrimary: "bg-orange-500 hover:bg-orange-600",
          card: "bg-zinc-900 border-zinc-800",
          headerTitle: "text-zinc-100",
          headerSubtitle: "text-zinc-400",
          socialButtonsBlockButton: "bg-zinc-800 border-zinc-700 text-zinc-100 hover:bg-zinc-700",
          formFieldLabel: "text-zinc-300",
          formFieldInput: "bg-zinc-800 border-zinc-700 text-zinc-100",
          footerActionLink: "text-orange-500 hover:text-orange-400",
          identityPreviewText: "text-zinc-300",
          identityPreviewEditButton: "text-orange-500",
        },
      }}
    >
      <html lang="en" className="dark">
        <body
          className={`${geistSans.variable} ${geistMono.variable} antialiased bg-zinc-950 text-zinc-100`}
        >
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
