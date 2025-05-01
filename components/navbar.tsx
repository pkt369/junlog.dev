"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ModeToggle } from "@/components/mode-toggle"
import { LanguageToggle } from "@/components/language-toggle"
import { useTranslation } from "@/components/language-provider"
import { cn } from "@/lib/utils"
import { Menu, X, Search, Rss } from "lucide-react"

export default function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const pathname = usePathname()
  const { t } = useTranslation()

  const routes = [
    {
      href: "/",
      label: "nav.home",
      active: pathname === "/",
    },
    {
      href: "/blog",
      label: "nav.blog",
      active: pathname === "/blog" || pathname.startsWith("/blog/"),
    },
    {
      href: "/projects",
      label: "nav.projects",
      active: pathname === "/projects",
    },
    {
      href: "/about",
      label: "nav.about",
      active: pathname === "/about",
    },
  ]

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background backdrop-blur supports-[backdrop-filter]:bg-[hsl(var(--background))]/60">
      <div className="container flex flex-col py-3 md:py-0 md:h-16 md:flex-row md:items-center md:justify-between">
        {/* 로고와 제목 - 모든 화면 크기에서 상단에 표시 */}
        <div className="flex items-center justify-between w-full md:w-auto">
          <Link href="/" className="font-bold text-xl">
            DevBlog
          </Link>
          <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setIsMenuOpen(!isMenuOpen)}>
            {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>

        {/* 네비게이션 링크 - 중간 크기 이상에서만 표시 */}
        <nav className="hidden md:flex gap-6 ml-6">
          {routes.map((route) => (
            <Link
              key={route.href}
              href={route.href}
              className={cn(
                "text-sm font-medium transition-colors hover:text-primary",
                route.active ? "text-foreground" : "text-muted-foreground",
              )}
            >
              {t(route.label)}
            </Link>
          ))}
        </nav>

        {/* 버튼들 - 중간 크기 이상에서는 오른쪽에, 작은 화면에서는 아래에 표시 */}
        <div className="flex items-center justify-end gap-2 mt-3 md:mt-0">
          <Link href="/search">
            <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
              <Search className="h-5 w-5" />
              <span className="sr-only">Search</span>
            </Button>
          </Link>
          <Link href="/rss.xml" target="_blank">
            <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
              <Rss className="h-5 w-5" />
              <span className="sr-only">RSS Feed</span>
            </Button>
          </Link>
          <LanguageToggle />
          <ModeToggle />
        </div>
      </div>

      {/* 모바일 메뉴 */}
      {isMenuOpen && (
        <div className="container md:hidden py-4">
          <nav className="flex flex-col gap-4">
            {routes.map((route) => (
              <Link
                key={route.href}
                href={route.href}
                className={cn(
                  "text-sm font-medium transition-colors hover:text-primary p-2",
                  route.active ? "text-foreground bg-secondary rounded-md" : "text-muted-foreground",
                )}
                onClick={() => setIsMenuOpen(false)}
              >
                {t(route.label)}
              </Link>
            ))}
            <Link
              href="/search"
              className="text-sm font-medium transition-colors hover:text-primary p-2 text-muted-foreground"
              onClick={() => setIsMenuOpen(false)}
            >
              <Search className="h-4 w-4 inline mr-2" />
              {t("nav.search")}
            </Link>
          </nav>
        </div>
      )}
    </header>
  )
}
