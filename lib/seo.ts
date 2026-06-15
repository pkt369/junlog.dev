import type { Metadata, MetadataRoute } from "next"
import type { PostMetadata } from "./posts"

const rawSiteUrl = process.env.SITE_URL || "https://junlog.dev"
const siteUrl = rawSiteUrl.replace(/\/$/, "")

export const siteConfig = {
  name: "JunLog",
  title: "JunLog",
  description: "Sejun Park's development blog about backend engineering, infrastructure, and web development.",
  url: siteUrl,
  author: "Sejun Park",
  defaultOgImage: `${siteUrl}/personal.jpg`,
  twitterCreator: "@sejun",
}

const defaultKeywords = [
  "JunLog",
  "Sejun Park",
  "Backend",
  "Infrastructure",
  "Web Development",
  "Spring Boot",
  "Next.js",
]

function absoluteUrl(path = "/"): string {
  return `${siteConfig.url}${path.startsWith("/") ? path : `/${path}`}`
}

export function buildStaticMetadata({
  title,
  description,
  path,
}: {
  title: string
  description: string
  path: string
}): Metadata {
  return {
    title,
    description,
    alternates: {
      canonical: path,
    },
    openGraph: {
      type: "website",
      locale: "ko_KR",
      url: path,
      siteName: siteConfig.name,
      title,
      description,
      images: [
        {
          url: siteConfig.defaultOgImage,
          width: 861,
          height: 861,
          alt: siteConfig.name,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [siteConfig.defaultOgImage],
      creator: siteConfig.twitterCreator,
    },
  }
}

export function buildPostMetadata(post: PostMetadata): Metadata {
  const path = `/blog/${post.slug}`
  const title = post.title.en
  const description = post.excerpt.en

  return {
    title,
    description,
    keywords: [...defaultKeywords, post.category.ko, post.category.en, post.title.ko, post.title.en, ...(post.tags || [])],
    alternates: {
      canonical: path,
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-video-preview": -1,
        "max-image-preview": "large",
        "max-snippet": -1,
      },
    },
    openGraph: {
      type: "article",
      locale: "ko_KR",
      url: path,
      siteName: siteConfig.name,
      title,
      description,
      publishedTime: new Date(post.date).toISOString(),
      authors: [siteConfig.author],
      tags: post.tags,
      images: [
        {
          url: siteConfig.defaultOgImage,
          width: 861,
          height: 861,
          alt: title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [siteConfig.defaultOgImage],
      creator: siteConfig.twitterCreator,
    },
  }
}

export function buildTagMetadata(tag: string): Metadata {
  return buildStaticMetadata({
    title: `${tag} Posts`,
    description: `Posts tagged with ${tag} on ${siteConfig.name}.`,
    path: `/blog/tag/${encodeURIComponent(tag)}`,
  })
}

export function buildSitemapEntries({
  posts,
  tags,
}: {
  posts: PostMetadata[]
  tags: string[]
}): MetadataRoute.Sitemap {
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: siteConfig.url,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: absoluteUrl("/blog"),
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: absoluteUrl("/projects"),
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: absoluteUrl("/about"),
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.7,
    },
  ]

  const postPages = posts.map((post) => ({
    url: absoluteUrl(`/blog/${post.slug}`),
    lastModified: new Date(post.date),
    changeFrequency: "monthly" as const,
    priority: 0.8,
  }))

  const tagPages = tags.map((tag) => ({
    url: absoluteUrl(`/blog/tag/${encodeURIComponent(tag)}`),
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.5,
  }))

  return [...staticPages, ...postPages, ...tagPages]
}
