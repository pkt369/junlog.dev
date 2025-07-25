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
      id: "1",
      title: {
        ko: "기본 로그인 구현 with Jwt token",
        en: "Implement Default Login with Jwt token",
      },
      excerpt: {
        ko: "어떻게 로그인을 구현하고 Jwt 로 통신하는지에 대해 알아보겠습니다.",
        en: "Let's learn how to implement login logic using JWT.",
      },
      date: "2025-04-28",
      category: {
        ko: "Backend",
        en: "Backend",
      },
      tags: ["Jwt", "login", "spring boot", "react", "typescript", "java"],
      slug: "default-login-with-jwt",
    },
    {
      id: "2",
      title: {
        ko: "Service vs Repository: Service 에서 어떤것을 사용해야 될까?",
        en: "Service vs Repository: What Should You Use Inside?",
      },
      excerpt: {
        ko: "Service에서 Service 와 Repository 둘 중 어떤 것을 호출해서 사용하는 게 좋은 구조인지 알아봅시다.",
        en: "Let’s explore whether it’s better to call another Service or a Repository within a Service.",
      },
      date: "2025-05-11",
      category: {
        ko: "Backend",
        en: "Backend",
      },
      tags: ["structure", "spring boot", "service", "repository", "java"],
      slug: "service-vs-repository",
    },
    {
      id: "3",
      title: {
        ko: "Ubunutu 에 Netdata 세팅하고 슬랙에 메세지 보내기",
        en: "Setting Up Netdata on Ubuntu with Slack",
      },
      excerpt: {
        ko: "Netdata 에서 메모리와 CPU 모니터링을 하고 임계점에 올 경우 Slack 으로 메세지 보내는 방법에 대해 알아보겠습니다.",
        en: "Monitor memory and CPU with Netdata and send alerts to Slack when usage exceeds limits.",
      },
      date: "2025-06-13",
      category: {
        ko: "Infra",
        en: "Infra",
      },
      tags: ["Infra", "Netdata", "Slack", "Memory", "CPU", "Ubuntu"],
      slug: "setting-up-netdata",
    },
    {
      id: "4",
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
      id: "5",
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
      id: "6",
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
