import { BlogCard } from "@/components/blog-card"
import { getSortedPostsData, getAllTags } from "@/lib/posts"
import Link from "next/link"

export default async function BlogPage() {
  const posts = await getSortedPostsData()
  const allTags = await getAllTags()

  return (
    <div className="container mx-auto py-12">
      <div className="flex flex-col items-start gap-4 mb-8">
        <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">Blog</h1>
        <p className="max-w-[700px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
          Let’s check the blogs that were recently published.
        </p>
      </div>

      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Tags</h2>
        <div className="flex flex-wrap gap-2">
          {allTags.map((tag) => (
            <Link
              key={tag}
              href={`/blog/tag/${tag}`}
              className="rounded-md bg-muted px-3 py-1 text-sm hover:bg-primary hover:text-primary-foreground transition-colors"
            >
              {tag}
            </Link>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {posts.map((post) => (
          <BlogCard key={post.id} post={post} />
        ))}
      </div>
    </div>
  )
}
