"use client"

import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { useLanguage } from "@/components/language-provider"
import { formatDate } from "@/lib/utils"
import type { PostMetadata } from "@/lib/posts"

export function BlogCard({ post }: { post: PostMetadata }) {
  const { language } = useLanguage()

  return (
    <Link href={`/blog/${post.slug}`}>
      <Card className="h-full overflow-hidden transition-all hover:shadow-md">
        <CardHeader className="p-4">
          <Badge className="w-fit mb-2">{post.category[language]}</Badge>
          <h3 className="text-xl font-bold">{post.title[language]}</h3>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <p className="text-muted-foreground">{post.excerpt[language]}</p>
        </CardContent>
        <CardFooter className="p-4 pt-0 text-sm text-muted-foreground">{formatDate(post.date)}</CardFooter>
      </Card>
    </Link>
  )
}
