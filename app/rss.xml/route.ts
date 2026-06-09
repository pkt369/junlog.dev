import { getSortedPostsData } from "@/lib/posts"
import { renderRssXml } from "@/lib/rss"
import { NextResponse } from "next/server"

export const dynamic = "force-static"

export async function GET() {
  const posts = await getSortedPostsData()
  const siteUrl = process.env.SITE_URL || "https://junlog.dev"
  const rssXml = renderRssXml({ posts, siteUrl })

  return new NextResponse(rssXml, {
    headers: {
      "Content-Type": "application/xml",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  })
}
