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
      tags: ["Architecture", "Trafic", "Java", "Spring Boot"],
      slug: "payment-system-1"
    },
    {
      id: "1",
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
      tags: ["Architecture", "Trafic", "Java", "Spring Boot", "Connection Pool", "Kafka"],
      slug: "payment-system-2"
    },
    {
      id: "2",
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
      id: "3",
      title: {
        ko: "Ubuntu 환경에서 도커로 Log Server 세팅하기",
        en: "Setting Up Log Server using Docker on Ubuntu",
      },
      excerpt: {
        ko: "Docker compose 를 이용해 Vector + Clickhouse + Grafana 조합으로 Log Sever 구축하기",
        en: "Setting Up a Log Server with Vector, Clickhouse, and Grafana using Docker Compose",
      },
      date: "2025-06-17",
      category: {
        ko: "Infra",
        en: "Infra",
      },
      tags: ["Infra", "Log", "Vector", "Clickhouse", "Grafana", "Docker", "Docker-Compose", "Ubuntu"],
      slug: "setting-up-log-server",
    },
    {
      id: "4",
      title: {
        ko: "Grafana 를 이용해 에러 발생 시 슬랙으로 메세지 받기",
        en: "Receiving Slack Notifications for Errors using Grafana",
      },
      excerpt: {
        ko: "Grafana 의 Alerting 기능을 이용해 Slack 으로 메세지 받기",
        en: "Receive Slack notifications using Grafana's Alerting feature",
      },
      date: "2025-06-18",
      category: {
        ko: "Infra",
        en: "Infra",
      },
      tags: ["Infra", "Log", "Clickhouse", "Grafana", "Slack", "Alert"],
      slug: "setting-up-grafana-slack",
    },
    {
      id: "5",
      title: {
        ko: "MeiliSearch 사용 후기: 적은 메모리로 검색 기능 구현하기",
        en: "Our MeiliSearch Experience: Building Fast Search on Low-Memory Servers",
      },
      excerpt: {
        ko: "한글을 지원하는 MeiliSearch 로 적은 메모리로 검색을 구현한 후기",
        en: "Building a Korean-Capable Search System with MeiliSearch on a Low-Memory Server",
      },
      date: "2025-07-20",
      category: {
        ko: "Backend",
        en: "Backend",
      },
      tags: ["Search", "Database", "Spring Boot", "Docker", "Java"],
      slug: "search-meilisearch",
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
