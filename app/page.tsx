"use client"

import { BlogCard } from "@/components/blog-card"
import { useTranslation } from "@/components/language-provider"
import { Button } from "@/components/ui/button"
import Link from "next/link"

function TranslatedText({ id }: { id: string }) {
  const { t } = useTranslation()
  return <>{t(id)}</>
}

export default function Home() {
  return (
    <div className="space-y-12">
      <HeroSection />
      <FeaturedPosts />
    </div>
  )
}

function HeroSection() {
  return (
    <section className="py-12 md:py-24">
      <div className="container px-4 md:px-6">
        <div className="flex flex-col items-center space-y-4 text-center">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl lg:text-6xl/none">
              <TranslatedText id="hero.title" />
            </h1>
            <p className="mx-auto max-w-[700px] text-muted-foreground md:text-xl">
              <TranslatedText id="hero.subtitle" />
            </p>
          </div>
          <div className="space-x-4">
            <Link href="/blog">
              <Button>
                <TranslatedText id="hero.cta" />
              </Button>
            </Link>
            <Link href="/about">
              <Button variant="outline">
                <TranslatedText id="hero.about" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}

function FeaturedPosts() {
  const posts = [
    {
      id: "1",
      title: {
        ko: "React 18의 새로운 기능",
        en: "New Features in React 18",
      },
      excerpt: {
        ko: "React 18에서 추가된 새로운 기능과 개선 사항에 대해 알아봅니다.",
        en: "Learn about the new features and improvements in React 18.",
      },
      date: "2025-03-15",
      category: {
        ko: "프론트엔드",
        en: "Frontend",
      },
      tags: ["React", "JavaScript", "Frontend"],
      slug: "new-features-react-18",
    },
    {
      id: "2",
      title: {
        ko: "Next.js로 정적 블로그 만들기",
        en: "Creating a Static Blog with Next.js",
      },
      excerpt: {
        ko: "Next.js를 사용하여 정적 블로그를 만드는 방법을 단계별로 알아봅니다.",
        en: "Step-by-step guide to creating a static blog using Next.js.",
      },
      date: "2025-03-10",
      category: {
        ko: "튜토리얼",
        en: "Tutorial",
      },
      tags: ["Next.js", "React", "Blog"],
      slug: "static-blog-nextjs",
    },
    {
      id: "3",
      title: {
        ko: "TypeScript 타입 시스템 마스터하기",
        en: "Mastering TypeScript's Type System",
      },
      excerpt: {
        ko: "TypeScript의 고급 타입 기능을 활용하여 더 안전한 코드를 작성하는 방법",
        en: "How to write safer code by leveraging TypeScript's advanced type features.",
      },
      date: "2025-03-05",
      category: {
        ko: "타입스크립트",
        en: "TypeScript",
      },
      tags: ["TypeScript", "JavaScript", "Programming"],
      slug: "mastering-typescript-types",
    },
  ]

  return (
    <section className="py-12">
      <div className="container px-4 md:px-6">
        <div className="flex flex-col items-start gap-4">
          <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">
            <TranslatedText id="featured.title" />
          </h2>
          <p className="max-w-[700px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
            <TranslatedText id="featured.subtitle" />
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
          {posts.map((post) => (
            <BlogCard key={post.id} post={post} />
          ))}
        </div>
        <div className="flex justify-center mt-8">
          <Link href="/blog">
            <Button variant="outline">
              <TranslatedText id="featured.viewAll" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  )
}
