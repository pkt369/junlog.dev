import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { LanguageProvider } from "@/components/language-provider"
import { AdminAuthProvider } from "@/hooks/use-admin-auth"
import { Toaster } from "@/components/ui/toaster"
import Navbar from "@/components/navbar"
import Footer from "@/components/footer"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "개발 블로그 | Dev Blog",
  description: "A personal development blog",
  openGraph: {
    type: "website",
    locale: "ko_KR",
    url: "https://yourblog.com",
    siteName: "JunLog",
    title: "개발 블로그 | Dev Blog",
    description: "A personal development blog about web development, programming, and technology",
    images: [
      {
        url: "https://yourblog.com/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "JunLog",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "개발 블로그 | Dev Blog",
    description: "A personal development blog about web development, programming, and technology",
    images: ["https://yourblog.com/og-image.jpg"],
    creator: "@yourusername",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="alternate" type="application/rss+xml" title="RSS Feed for JunLog" href="/rss.xml" />
      </head>
      <body className={inter.className}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <LanguageProvider>
            <AdminAuthProvider>
              <div className="flex min-h-screen flex-col">
                <Navbar />
                <main className="flex-1 container mx-auto px-4 py-8">{children}</main>
                <Footer />
              </div>
              <Toaster />
            </AdminAuthProvider>
          </LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
