import assert from "node:assert/strict"
import test from "node:test"

import { renderRssXml } from "./rss.ts"

test("escapes XML-reserved characters in RSS item metadata", () => {
  const xml = renderRssXml({
    siteUrl: "https://junlog.dev",
    posts: [
      {
        id: "payment-system-3",
        slug: "payment-system-3",
        title: {
          ko: "컨슈머 처리 최적화",
          en: "Connection Pooling & Sharding <Fast>",
        },
        excerpt: {
          ko: "요약",
          en: `Use "pooling" & 'sharding' safely`,
        },
        date: "2025-10-03",
        category: {
          ko: "백엔드",
          en: "Backend & Infra",
        },
        tags: ["Kafka & Queue"],
      },
    ],
  })

  assert.match(xml, /Connection Pooling &amp; Sharding &lt;Fast&gt;/)
  assert.match(xml, /Use &quot;pooling&quot; &amp; &apos;sharding&apos; safely/)
  assert.match(xml, /Backend &amp; Infra/)
  assert.match(xml, /Kafka &amp; Queue/)
})
