import { getSortedPostsData } from "@/lib/posts"
import { buildStaticMetadata } from "@/lib/seo"
import SearchPageClient from "./SearchPageClient"

export const metadata = buildStaticMetadata({
  title: "Search",
  description: "Search JunLog posts by title, summary, category, and tags.",
  path: "/search",
})

export default async function SearchPage() {
  const posts = await getSortedPostsData()
  return <SearchPageClient posts={posts} />
}
