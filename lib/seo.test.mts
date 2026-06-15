import assert from "node:assert/strict"
import test from "node:test"

import { buildPostMetadata, buildSitemapEntries, siteConfig } from "./seo.ts"
import type { PostMetadata } from "./posts.ts"

const post: PostMetadata = {
  id: "payment-system-3",
  slug: "payment-system-3",
  title: {
    ko: "초당 2,000건 트랜잭션을 견디는 결제 시스템 만들기 (3)",
    en: "Handling 2,000 TPS: Payment System (Part 3)",
  },
  excerpt: {
    ko: "컨슈머 처리 최적화",
    en: "Optimizing Consumer Processing: Connection Pooling & Sharding for Faster Checkout",
  },
  date: "2025-10-03",
  category: {
    ko: "Backend",
    en: "Backend",
  },
  tags: ["Architecture", "Connection Pool"],
}

test("builds canonical article metadata from post frontmatter", () => {
  const metadata = buildPostMetadata(post)

  assert.equal(metadata.title, "Handling 2,000 TPS: Payment System (Part 3)")
  assert.equal(metadata.description, "Optimizing Consumer Processing: Connection Pooling & Sharding for Faster Checkout")
  assert.equal(metadata.alternates?.canonical, "/blog/payment-system-3")
  assert.equal(metadata.openGraph?.url, "/blog/payment-system-3")
  assert.equal(metadata.openGraph?.type, "article")
  assert.equal(metadata.twitter?.card, "summary_large_image")
})

test("marks blog post metadata as indexable for Google", () => {
  const metadata = buildPostMetadata(post)

  assert.deepEqual(metadata.robots, {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  })
})

test("builds sitemap entries for static pages, posts, and tags", () => {
  const sitemap = buildSitemapEntries({
    posts: [post],
    tags: ["Connection Pool", "Backend"],
  })

  const urls = sitemap.map((entry) => entry.url)

  assert.ok(urls.includes(siteConfig.url))
  assert.ok(urls.includes(`${siteConfig.url}/blog/payment-system-3`))
  assert.ok(urls.includes(`${siteConfig.url}/blog/tag/Connection%20Pool`))
  assert.ok(urls.includes(`${siteConfig.url}/blog/tag/Backend`))
})
