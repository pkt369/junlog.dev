import type { MetadataRoute } from "next"
import { getAllTags, getSortedPostsData } from "@/lib/posts"
import { buildSitemapEntries } from "@/lib/seo"

export const dynamic = "force-static"

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const posts = await getSortedPostsData()
  const tags = await getAllTags()

  return buildSitemapEntries({ posts, tags })
}
