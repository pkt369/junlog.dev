import { HeroSection, FeaturedPosts } from "@/components/home-sections"
import { getSortedPostsData } from "@/lib/posts"

const FEATURED_POST_COUNT = 6

export default async function Home() {
  const posts = await getSortedPostsData()

  return (
    <div className="space-y-12">
      <HeroSection />
      <FeaturedPosts posts={posts.slice(0, FEATURED_POST_COUNT)} />
    </div>
  )
}
