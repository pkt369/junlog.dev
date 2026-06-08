"use client"

import { BlogCard } from "@/components/blog-card"
import { useTranslation } from "@/components/language-provider"
import { Button } from "@/components/ui/button"
import Link from "next/link"

function TranslatedText({ id }: { id: string }) {
  const { t } = useTranslation()
  return <>{t(id)}</>
}

export default function Home() {
  return (
    <div className="space-y-12">
      <HeroSection />
      <FeaturedPosts />
    </div>
  )
}

function HeroSection() {
  return (
    <section className="py-12 md:py-24">
      <div className="container px-4 md:px-6">
        <div className="flex flex-col items-center space-y-4 text-center">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl lg:text-6xl/none">
              <TranslatedText id="hero.title" />
            </h1>
            <p className="mx-auto max-w-[700px] text-muted-foreground md:text-xl">
              <TranslatedText id="hero.subtitle" />
            </p>
          </div>
          <div className="space-x-4">
            <Link href="/blog">
              <Button>
                <TranslatedText id="hero.cta" />
              </Button>
            </Link>
            <Link href="/about">
              <Button variant="outline">
                <TranslatedText id="hero.about" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}

function FeaturedPosts() {
  const posts = [
    {
      id: "0",
      title: {
        ko: "RAG 적용 후기: 캐릭터 장기기억 구현하기",
        en: "RAG Experience: Building Long-Term Memory for Characters",
      },
      excerpt: {
        ko: "RAG를 활용해 캐릭터가 이전 대화를 기억하도록 구현한 과정과 시행착오를 정리했습니다.",
        en: "A practical write-up on using RAG to help characters remember previous conversations.",
      },
      date: "2026-06-05",
      category: {
        ko: "Backend",
        en: "Backend",
      },
      tags: ["RAG", "LLM", "AI", "Embedding", "Vector Search"],
      slug: "long-term-memory",
    },
    {
      id: "1",
      title: {
        ko: "AWS SSM 가이드",
        en: "AWS Systems Manager (SSM) Guide",
      },
      excerpt: {
        ko: "SSH 없이 EC2에 안전하게 접속하는 AWS SSM 설정 가이드",
        en: "A practical guide to accessing EC2 securely without SSH using AWS SSM",
      },
      date: "2026-05-21",
      category: {
        ko: "Infra",
        en: "Infra",
      },
      tags: ["Infra", "AWS", "SSM", "Systems Manager", "SSH"],
      slug: "aws-ssm",
    },
    {
      id: "2",
      title: {
        ko: "CloudFront + S3 Signed Cookie 환경에서 CORS 에러 완벽 해결하기",
        en: "Solving CORS Errors in CloudFront + S3 with Signed Cookies",
      },
      excerpt: {
        ko: "CloudFront 의 Signed Cookie 방식을 채택했을때 발생한 CORS 트러블 슈팅에 대해서 얘기해보겠습니다.",
        en: "I will discuss the CORS troubleshooting process encountered when adopting CloudFront Signed Cookies.",
      },
      date: "2026-01-13",
      category: {
        ko: "Infra",
        en: "Infra",
      },
      tags: ["Infra", "Backend", "AWS", "S3", "Bucket", "CloudFront", "Caching", "CORS", "Signed Cookie"],
      slug: "cloudfront-cors",
    },
    {
      id: "3",
      title: {
        ko: "초당 2,000건 트랜잭션을 견디는 결제 시스템 만들기 (3)",
        en: "Handling 2,000 TPS: Payment System (Part 3)"
      },
      excerpt: {
        ko: "컨슈머 처리 최적화: 빠른 결제를 위한 커넥션 풀 & 샤딩",
        en: "Optimizing Consumer Processing: Connection Pooling & Sharding for Faster Checkout"
      },
      date: "2025-10-03",
      category: {
        ko: "Backend",
        en: "Backend",
      },
      tags: ["Architecture", "Traffic", "Java", "Spring Boot", "Connection Pool", "Kafka", "Sharding"],
      slug: "payment-system-3"
    },
    {
      id: "4",
      title: {
        ko: "초당 2,000건 트랜잭션을 견디는 결제 시스템 만들기 (2)",
        en: "Handling 2,000 TPS: Payment System (Part 2)"
      },
      excerpt: {
        ko: "모든 TPS 안정적으로 받기 위해 어떻게 개선할 수 있는지 시스템 아키텍처 개선으로 알아보겠습니다.",
        en: "Let’s explore how to improve the system architecture to handle all TPS stably."
      },
      date: "2025-08-27",
      category: {
        ko: "Backend",
        en: "Backend"
      },
      tags: ["Architecture", "Traffic", "Java", "Spring Boot", "Connection Pool", "Kafka", "Asynchronous"],
      slug: "payment-system-2"
    },
    {
      id: "5",
      title: {
        ko: "초당 2,000건 트랜잭션을 견디는 결제 시스템 만들기 (1)",
        en: "Handling 2,000 TPS: Payment System (Part 1)"
      },
      excerpt: {
        ko: "아직 최적화 전 상태에서 시스템이 얼마나 트래픽을 견디는지 테스트하고, 왜 아키텍처를 공부해야 하는지 알아보겠습니다.",
        en: "We will test how much traffic the system can handle in its unoptimized state and explore why studying the architecture is important."
      },
      date: "2025-08-23",
      category: {
        ko: "Backend",
        en: "Backend",
      },
      tags: ["Architecture", "Traffic", "Java", "Spring Boot"],
      slug: "payment-system-1"
    },
  ]

  return (
    <section className="py-12">
      <div className="container px-4 md:px-6">
        <div className="flex flex-col items-start gap-4">
          <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">
            <TranslatedText id="featured.title" />
          </h2>
          <p className="max-w-[700px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
            <TranslatedText id="featured.subtitle" />
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
          {posts.map((post) => (
            <BlogCard key={post.id} post={post} />
          ))}
        </div>
        <div className="flex justify-center mt-8">
          <Link href="/blog">
            <Button variant="outline">
              <TranslatedText id="featured.viewAll" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  )
}
