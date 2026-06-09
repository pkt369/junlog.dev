import { getPostData, getAllPostIds } from "@/lib/posts"
import { buildPostMetadata } from "@/lib/seo"
import BlogPostClient from "./BlogPostClient"

export async function generateStaticParams() {
  const paths = await getAllPostIds()
  return paths.map((p) => ({
    slug: p.params.slug,
  }))
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const post = await getPostData(slug)

  return buildPostMetadata(post)
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const post = await getPostData(slug)

  return <BlogPostClient post={post} />
}
