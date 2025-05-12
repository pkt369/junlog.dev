"use client"

import { useLanguage } from "@/components/language-provider"
import { Badge } from "@/components/ui/badge"
import { formatDate } from "@/lib/utils"
import { ArrowLeft, Copy, Check } from "lucide-react"
import Link from "next/link"
import type { Post } from "@/lib/posts"
import { ShareButtons } from "@/components/share-buttons"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import remarkBreaks from "remark-breaks"
import rehypeRaw from "rehype-raw"
import rehypeSanitize from "rehype-sanitize"
import { useState, useCallback, useRef, useEffect } from "react"
import { useTheme } from "next-themes"
import LikeButton from "@/components/like-button"
import CommentList from "@/components/comments/comment-list"
import Prism from "prismjs"
import React from "react"

// 추가 언어 지원
import "prismjs/components/prism-jsx"
import "prismjs/components/prism-tsx"
import "prismjs/components/prism-typescript"
import "prismjs/components/prism-javascript"
import "prismjs/components/prism-css"
import "prismjs/components/prism-scss"
import "prismjs/components/prism-bash"
import "prismjs/components/prism-json"
import "prismjs/components/prism-markdown"
import "prismjs/components/prism-python"
import "prismjs/components/prism-java"
import "prismjs/components/prism-c"
import "prismjs/components/prism-cpp"
import "prismjs/components/prism-csharp"
import "prismjs/components/prism-go"
import "prismjs/components/prism-rust"
import "prismjs/components/prism-sql"
import "prismjs/components/prism-yaml"

// 테마 스타일
import "prismjs/themes/prism-tomorrow.css"

export default function BlogPostClient({ post }: { post: Post }) {
  const { language } = useLanguage()
  const [copied, setCopied] = useState(false)
  const copyTimeoutRef = useRef<number | null>(null)
  const { theme } = useTheme()
  const isDarkTheme = theme === "dark"

  // Prism 초기화 및 코드 블록 하이라이팅
  useEffect(() => {
    Prism.highlightAll()
  }, [post.content, language])

  const handleCopy = useCallback((codeText: string) => {
    navigator.clipboard.writeText(codeText)
    setCopied(true)

    if (copyTimeoutRef.current) {
      clearTimeout(copyTimeoutRef.current)
    }

    copyTimeoutRef.current = window.setTimeout(() => {
      setCopied(false)
    }, 2000)
  }, [])

  return (
    <article className="container mx-auto py-12 max-w-3xl">
      <Link href="/blog" className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-8">
        <ArrowLeft className="h-4 w-4" />
        <span>{language === "ko" ? "모든 글 보기" : "Back to all posts"}</span>
      </Link>

      <div className="space-y-4 mb-8">
        <div className="flex flex-wrap gap-2">
          <Badge className="mb-2">{post.category[language]}</Badge>
          {post.tags &&
            post.tags.map((tag) => (
              <Link key={tag} href={`/blog/tag/${tag}`}>
                <Badge variant="outline">{tag}</Badge>
              </Link>
            ))}
        </div>
        <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">{post.title[language]}</h1>
        <p className="text-muted-foreground">{formatDate(post.date)}</p>
      </div>

      <div className="prose dark:prose-invert max-w-none mb-8">
        <ReactMarkdown
          remarkPlugins={[remarkGfm, remarkBreaks]}
          rehypePlugins={[rehypeRaw, rehypeSanitize]}
          components={{
            // Heading styles
            h1: ({ node, ...props }) => <h1 className="text-4xl font-extrabold mt-10 mb-6 pb-2 border-b" {...props} />,
            h2: ({ node, ...props }) => (
              <h2 className="text-3xl font-bold mt-8 mb-4 pb-1 border-b border-muted" {...props} />
            ),
            h3: ({ node, ...props }) => <h3 className="text-2xl font-bold mt-6 mb-3" {...props} />,
            h4: ({ node, ...props }) => <h4 className="text-xl font-semibold mt-6 mb-3" {...props} />,
            h5: ({ node, ...props }) => <h5 className="text-lg font-semibold mt-4 mb-2" {...props} />,
            h6: ({ node, ...props }) => <h6 className="text-base font-semibold mt-4 mb-2" {...props} />,
            // Image styles
            img: ({ node, ...props }) => (
              <img className="rounded-lg mx-auto my-4 shadow-md" {...props} alt={props.alt || "Blog image"} />
            ),
            // Link styles
            a: ({ node, ...props }) => (
              <a
                className="text-primary hover:underline font-medium"
                {...props}
                target="_blank"
                rel="noopener noreferrer"
              />
            ),
            code: ({ node, inline, className, children, ...props }: any) => {
              const match = /language-(\w+)/.exec(className || "")
              const lang = match ? match[1] : ""
              const codeText = String(children).replace(/\n$/, "")

              if (inline) {
                return (
                  <code className="inline-code" {...props}>
                    {children}
                  </code>
                )
              }

              // 여기서 p 태그 안에 div가 들어가는 문제를 해결하기 위해
              // 코드 블록을 별도의 React Fragment로 감싸서 반환합니다
              return (
                <>
                  <div className="relative my-6 bg-[#2d2d2d] rounded-lg overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-2 text-gray-200">
                      <div className="text-xs font-medium">{lang}</div>
                      <button
                        onClick={() => handleCopy(codeText)}
                        className="text-gray-400 hover:text-white transition-colors"
                        aria-label="Copy code"
                      >
                        {copied ? <Check size={16} /> : <Copy size={16} />}
                      </button>
                    </div>
                    <div className="overflow-x-auto">
                      <pre className={`language-${lang || "text"} m-0 p-4 bg-[#2d2d2d] border-0`}>
                        <code className={`language-${lang || "text"} border-0`}>{codeText}</code>
                      </pre>
                    </div>
                  </div>
                </>
              )
            },
            p: ({ node, children, ...props }) => {
              // 자식 요소 중에 div나 pre가 있는지 확인
              const hasBlockElement = React.Children.toArray(children).some(
                (child) =>
                  React.isValidElement(child) &&
                  (child.type === "div" ||
                    child.type === "pre" ||
                    (typeof child.type === "function" && (child.type.name === "div" || child.type.name === "pre"))),
              )

              // 블록 요소가 있으면 div로, 없으면 p로 렌더링
              return hasBlockElement ? <div {...props}>{children}</div> : <p {...props}>{children}</p>
            },
            // List styles
            ul: ({ node, ...props }) => <ul className="list-disc pl-6 !my-2 space-y-2" {...props} />,
            ol: ({ node, ...props }) => <ol className="list-decimal pl-6 my-4 space-y-2" {...props} />,
            // Blockquote styles
            blockquote: ({ node, ...props }) => (
              <blockquote className="border-l-4 border-primary pl-4 italic my-4 text-muted-foreground" {...props} />
            ),
            // Table styles
            table: ({ node, ...props }) => (
              <div className="overflow-x-auto my-6">
                <table className="w-full border-collapse" {...props} />
              </div>
            ),
            th: ({ node, ...props }) => (
              <th className="border border-border px-4 py-2 bg-muted font-semibold text-left" {...props} />
            ),
            td: ({ node, ...props }) => <td className="border border-border px-4 py-2" {...props} />,
          }}
        >
          {post.content[language]}
        </ReactMarkdown>
      </div>

      {/* Like button */}
      <div className="flex justify-between items-center border-t pt-6 mt-8">
        <LikeButton postSlug={post.slug} />
        <ShareButtons title={post.title} slug={post.slug} />
      </div>

      {/* Comments section */}
      <CommentList postSlug={post.slug} />
    </article>
  )
}
