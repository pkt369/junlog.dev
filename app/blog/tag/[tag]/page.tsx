import { getPostsByTag, getAllTags } from "@/lib/posts"
import { buildTagMetadata } from "@/lib/seo"
import TagPageClient from "./TagPageClient"

export async function generateStaticParams() {
  const tags = await getAllTags()
  return tags.map((tag) => ({ tag }))
}

export async function generateMetadata({ params }: { params: Promise<{ tag: string }> }) {
  const { tag } = await params

  return buildTagMetadata(decodeURIComponent(tag))
}

export default async function TagPage({ params }: { params: Promise<{ tag: string }> }) {
  const { tag } = await params
  const posts = await getPostsByTag(tag)

  return <TagPageClient tag={tag} posts={posts} />
}
