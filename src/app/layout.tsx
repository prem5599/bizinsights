// src/app/layout.tsx
import type { Metadata } from "next"
import "./globals.css"
import { AuthProvider } from "@/components/providers/AuthProvider"

export const metadata: Metadata = {
  title: "BizInsights - Simple Analytics Dashboard",
  description: "Analytics dashboard for small businesses",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 antialiased">
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  )
}