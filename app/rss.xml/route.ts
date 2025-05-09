import { getSortedPostsData } from "@/lib/posts"
import { NextResponse } from "next/server"

export async function GET() {
  const posts = await getSortedPostsData()
  const siteUrl = process.env.SITE_URL || "https://junlog.dev"

  const rssXml = `
    <rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
      <channel>
        <title>JunLog</title>
        <link>${siteUrl}</link>
        <description>A personal development blog</description>
        <language>en</language>
        <atom:link href="${siteUrl}/rss.xml" rel="self" type="application/rss+xml"/>
        ${posts
          .map(
            (post) => `
          <item>
            <title>${post.title.en}</title>
            <link>${siteUrl}/blog/${post.slug}</link>
            <guid>${siteUrl}/blog/${post.slug}</guid>
            <pubDate>${new Date(post.date).toUTCString()}</pubDate>
            <description>${post.excerpt.en}</description>
            <category>${post.category.en}</category>
            ${post.tags ? post.tags.map((tag) => `<category>${tag}</category>`).join("") : ""}
          </item>
        `,
          )
          .join("")}
      </channel>
    </rss>
  `.trim()

  return new NextResponse(rssXml, {
    headers: {
      "Content-Type": "application/xml",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  })
}
