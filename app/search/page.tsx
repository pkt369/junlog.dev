import { getSortedPostsData } from "@/lib/posts"
import SearchPageClient from "./SearchPageClient"

export default async function SearchPage() {
  const posts = await getSortedPostsData()
  return <SearchPageClient posts={posts} />
}
