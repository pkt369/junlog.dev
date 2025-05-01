"use client"

import { BlogCard } from "@/components/blog-card"
import { useTranslation } from "@/components/language-provider"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import type { PostMetadata } from "@/lib/posts"

interface TagPageClientProps {
  tag: string
  posts: PostMetadata[]
}

export default function TagPageClient({ tag, posts }: TagPageClientProps) {
  const { language } = useTranslation()

  return (
    <div className="container mx-auto py-12">
      <Link href="/blog" className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-8">
        <ArrowLeft className="h-4 w-4" />
        <LanguageAwareText ko="모든 글 보기" en="Back to all posts" />
      </Link>

      <div className="flex flex-col items-start gap-4 mb-8">
        <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">
          <LanguageAwareText ko={`태그: ${tag}`} en={`Tag: ${tag}`} />
        </h1>
        <p className="text-muted-foreground">
          <LanguageAwareText ko={`${posts.length}개의 포스트를 찾았습니다`} en={`Found ${posts.length} posts`} />
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {posts.map((post) => (
          <BlogCard key={post.id} post={post} />
        ))}
      </div>
    </div>
  )
}

function LanguageAwareText({ ko, en }: { ko: string; en: string }) {
  const { language } = useLanguage()
  return <>{language === "ko" ? ko : en}</>
}

function useLanguage() {
  const { language } = useTranslation()
  return { language }
}
