import { getPostsByTag, getAllTags } from "@/lib/posts"
import TagPageClient from "./TagPageClient"

export async function generateStaticParams() {
  const tags = await getAllTags()
  return tags.map((tag) => ({ tag }))
}

export default async function TagPage({ params }: { params: Promise<{ tag: string }> }) {
  const { tag } = await params
  const posts = await getPostsByTag(tag)

  return <TagPageClient tag={tag} posts={posts} />
}
