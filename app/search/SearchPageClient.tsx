"use client"

import { useState } from "react"
import { BlogCard } from "@/components/blog-card"
import { useTranslation } from "@/components/language-provider"
import { Input } from "@/components/ui/input"
import { SearchIcon } from "lucide-react"
import type { PostMetadata } from "@/lib/posts"

export default function SearchPageClient({ posts }: { posts: PostMetadata[] }) {
  const [searchQuery, setSearchQuery] = useState("")
  const { language } = useTranslation()

  const filteredPosts = posts.filter((post) => {
    const title = post.title[language].toLowerCase()
    const excerpt = post.excerpt[language].toLowerCase()
    const category = post.category[language].toLowerCase()
    const tags = post.tags ? post.tags.join(" ").toLowerCase() : ""
    const query = searchQuery.toLowerCase()

    return title.includes(query) || excerpt.includes(query) || category.includes(query) || tags.includes(query)
  })

  return (
    <div className="container mx-auto py-12">
      <div className="flex flex-col items-start gap-4 mb-8">
        <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">
          {language === "ko" ? "검색" : "Search"}
        </h1>
        <p className="max-w-[700px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
          {language === "ko" ? "블로그 포스트를 검색해보세요." : "Search through blog posts."}
        </p>
      </div>

      <div className="relative mb-8">
        <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder={language === "ko" ? "검색어를 입력하세요..." : "Search posts..."}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {searchQuery && (
        <p className="mb-6 text-muted-foreground">
          {language === "ko"
            ? `"${searchQuery}"에 대한 검색 결과: ${filteredPosts.length}개의 포스트를 찾았습니다`
            : `Search results for "${searchQuery}": Found ${filteredPosts.length} posts`}
        </p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredPosts.map((post) => (
          <BlogCard key={post.id} post={post} />
        ))}
      </div>

      {searchQuery && filteredPosts.length === 0 && (
        <div className="text-center py-12">
          <p className="text-xl font-medium">{language === "ko" ? "검색 결과가 없습니다" : "No results found"}</p>
          <p className="text-muted-foreground mt-2">
            {language === "ko" ? "다른 검색어로 시도해보세요" : "Try a different search term"}
          </p>
        </div>
      )}
    </div>
  )
}
