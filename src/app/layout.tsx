// src/app/layout.tsx
import type { Metadata } from "next"
import "./globals.css"
import { AuthProvider } from "@/components/providers/AuthProvider"
import { ClientOnly } from "@/components/providers/ClientOnly"

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
    <html lang="en" suppressHydrationWarning>
      <body 
        className="min-h-screen bg-slate-50 antialiased" 
        suppressHydrationWarning
      >
        <ClientOnly>
          <AuthProvider>
            {children}
          </AuthProvider>
        </ClientOnly>
      </body>
    </html>
  )
}