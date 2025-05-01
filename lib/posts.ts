import fs from "fs"
import path from "path"
import matter from "gray-matter"

// 서버 사이드에서만 실행되는 코드
const postsDirectory = process.cwd() + "/posts"

export type PostMetadata = {
  id: string
  title: {
    ko: string
    en: string
  }
  excerpt: {
    ko: string
    en: string
  }
  date: string
  category: {
    ko: string
    en: string
  }
  tags: string[]
  slug: string
}

export type Post = PostMetadata & {
  content: {
    ko: string
    en: string
  }
}

// 더미 데이터 - 클라이언트 사이드에서 사용
const dummyPosts: PostMetadata[] = [
  {
    id: "1",
    title: {
      ko: "React 18의 새로운 기능",
      en: "New Features in React 18",
    },
    excerpt: {
      ko: "React 18에서 추가된 새로운 기능과 개선 사항에 대해 알아봅니다.",
      en: "Learn about the new features and improvements in React 18.",
    },
    date: "2025-03-15",
    category: {
      ko: "프론트엔드",
      en: "Frontend",
    },
    tags: ["React", "JavaScript", "Frontend"],
    slug: "new-features-react-18",
  },
  {
    id: "2",
    title: {
      ko: "Next.js로 정적 블로그 만들기",
      en: "Creating a Static Blog with Next.js",
    },
    excerpt: {
      ko: "Next.js를 사용하여 정적 블로그를 만드는 방법을 단계별로 알아봅니다.",
      en: "Step-by-step guide to creating a static blog using Next.js.",
    },
    date: "2025-03-10",
    category: {
      ko: "튜토리얼",
      en: "Tutorial",
    },
    tags: ["Next.js", "React", "Blog"],
    slug: "static-blog-nextjs",
  },
]

// 서버 사이드에서 실행되는 함수
export async function getSortedPostsData(): Promise<PostMetadata[]> {
  // 서버 사이드에서만 실행
  if (typeof window === "undefined") {
    try {
      // posts 디렉토리가 존재하는지 확인
      if (!fs.existsSync(postsDirectory)) {
        console.warn(`Posts directory not found: ${postsDirectory}. Using dummy data.`)
        return dummyPosts
      }

      // Get file names under /posts
      const fileNames = fs.readdirSync(postsDirectory)
      const allPostsData = fileNames.map((fileName) => {
        // Remove ".md" from file name to get id
        const id = fileName.replace(/\.md$/, "")

        // Read markdown file as string
        const fullPath = path.join(postsDirectory, fileName)
        const fileContents = fs.readFileSync(fullPath, "utf8")

        // Use gray-matter to parse the post metadata section
        const matterResult = matter(fileContents)

        // Combine the data with the id
        return {
          id,
          ...(matterResult.data as Omit<PostMetadata, "id">),
        }
      })

      // Sort posts by date
      return allPostsData.sort((a, b) => {
        if (a.date < b.date) {
          return 1
        } else {
          return -1
        }
      })
    } catch (error) {
      console.error("Error reading posts:", error)
      return dummyPosts
    }
  } else {
    // 클라이언트 사이드에서는 더미 데이터 반환
    return dummyPosts
  }
}

// 서버 사이드에서 실행되는 함수
export async function getAllPostIds() {
  if (typeof window === "undefined") {
    try {
      if (!fs.existsSync(postsDirectory)) {
        return dummyPosts.map((post) => ({
          params: { slug: post.slug },
        }))
      }

      const fileNames = fs.readdirSync(postsDirectory)
      return fileNames.map((fileName) => {
        return {
          params: {
            slug: fileName.replace(/\.md$/, ""),
          },
        }
      })
    } catch (error) {
      console.error("Error getting post IDs:", error)
      return dummyPosts.map((post) => ({
        params: { slug: post.slug },
      }))
    }
  } else {
    return dummyPosts.map((post) => ({
      params: { slug: post.slug },
    }))
  }
}

// 서버 사이드에서 실행되는 함수
export async function getPostData(slug: string): Promise<Post> {
  if (typeof window === "undefined") {
    try {
      if (!fs.existsSync(postsDirectory)) {
        const dummyPost = dummyPosts.find((p) => p.slug === slug)
        if (!dummyPost) {
          throw new Error(`Post not found: ${slug}`)
        }

        return {
          ...dummyPost,
          content: {
            ko: "이것은 더미 콘텐츠입니다. 실제 마크다운 파일이 없습니다.",
            en: "This is dummy content. No actual markdown file exists.",
          },
        }
      }

      const fullPath = path.join(postsDirectory, `${slug}.md`)
      const fileContents = fs.readFileSync(fullPath, "utf8")

      // Use gray-matter to parse the post metadata section
      const matterResult = matter(fileContents)

      // Split content into Korean and English sections
      const contentSections = matterResult.content.split("---language-separator---")

      // 마크다운 텍스트를 그대로 반환 (HTML로 변환하지 않음)
      const koContent = contentSections[0] || ""
      const enContent = contentSections[1] || ""

      // Combine the data with the id and content
      return {
        id: slug,
        ...(matterResult.data as Omit<PostMetadata, "id">),
        content: {
          ko: koContent,
          en: enContent,
        },
      }
    } catch (error) {
      console.error(`Error getting post data for ${slug}:`, error)

      // 에러 발생 시 더미 데이터 반환
      const dummyPost = dummyPosts.find((p) => p.slug === slug)
      if (!dummyPost) {
        throw new Error(`Post not found: ${slug}`)
      }

      return {
        ...dummyPost,
        content: {
          ko: "이것은 더미 콘텐츠입니다. 실제 마크다운 파일이 없거나 읽는 중 오류가 발생했습니다.",
          en: "This is dummy content. No actual markdown file exists or an error occurred while reading it.",
        },
      }
    }
  } else {
    // 클라이언트 사이드에서는 더미 데이터 반환
    const dummyPost = dummyPosts.find((p) => p.slug === slug)
    if (!dummyPost) {
      throw new Error(`Post not found: ${slug}`)
    }

    return {
      ...dummyPost,
      content: {
        ko: "이것은 더미 콘텐츠입니다. 클라이언트 사이드에서는 실제 콘텐츠를 가져올 수 없습니다.",
        en: "This is dummy content. Cannot fetch actual content on the client side.",
      },
    }
  }
}

export async function getAllTags(): Promise<string[]> {
  const posts = await (typeof window === "undefined" ? getSortedPostsData() : dummyPosts);
  const allTags = posts.flatMap((post) => post.tags || []);
  return [...new Set(allTags)];
}

export async function getPostsByTag(tag: string): Promise<PostMetadata[]> {
  const posts = await (typeof window === "undefined" ? getSortedPostsData() : dummyPosts);
  return posts.filter((post) => post.tags && post.tags.includes(tag));
}
