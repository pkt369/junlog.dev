import { getPostData, getAllPostIds } from "@/lib/posts"
import BlogPostClient from "./BlogPostClient"

export async function generateStaticParams() {
  const paths = await getAllPostIds()
  return paths.map((p) => ({
    slug: p.params.slug,
  }))
}

export default async function BlogPostPage({ params }: { params: { slug: string } }) {
  const { slug } = params
  const post = await getPostData(slug)

  return <BlogPostClient post={post} />
}
