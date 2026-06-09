import type { PostMetadata } from "./posts"

type RenderRssXmlInput = {
  posts: PostMetadata[]
  siteUrl: string
}

function escapeXml(value: string): string {
  return value.replace(/[<>&'"]/g, (character) => {
    switch (character) {
      case "<":
        return "&lt;"
      case ">":
        return "&gt;"
      case "&":
        return "&amp;"
      case "'":
        return "&apos;"
      case "\"":
        return "&quot;"
      default:
        return character
    }
  })
}

function itemCategoryXml(category: string): string {
  return `<category>${escapeXml(category)}</category>`
}

export function renderRssXml({ posts, siteUrl }: RenderRssXmlInput): string {
  const escapedSiteUrl = escapeXml(siteUrl)

  return `
    <rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
      <channel>
        <title>JunLog</title>
        <link>${escapedSiteUrl}</link>
        <description>A personal development blog</description>
        <language>en</language>
        <atom:link href="${escapedSiteUrl}/rss.xml" rel="self" type="application/rss+xml"/>
        ${posts
          .map((post) => {
            const postUrl = `${siteUrl}/blog/${post.slug}`
            const escapedPostUrl = escapeXml(postUrl)
            const categories = [post.category.en, ...(post.tags || [])].map(itemCategoryXml).join("")

            return `
          <item>
            <title>${escapeXml(post.title.en)}</title>
            <link>${escapedPostUrl}</link>
            <guid>${escapedPostUrl}</guid>
            <pubDate>${new Date(post.date).toUTCString()}</pubDate>
            <description>${escapeXml(post.excerpt.en)}</description>
            ${categories}
          </item>
        `
          })
          .join("")}
      </channel>
    </rss>
  `.trim()
}
