"use client"

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useTranslation } from "@/components/language-provider"
import { Github, ExternalLink } from "lucide-react"
import Link from "next/link"

export default function ProjectsPage() {
  return (
    <div className="container mx-auto py-12">
      <div className="flex flex-col items-start gap-4 mb-8">
        <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">
          <TranslatedText id="nav.projects" />
        </h1>
        <p className="max-w-[700px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
          <TranslatedText id="projects.subtitle" />
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {projects.map((project) => (
          <ProjectCard key={project.id} project={project} />
        ))}
      </div>
    </div>
  )
}

function ProjectCard({ project }: { project: Project }) {
  const { language } = useLanguage()

  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <div className="flex flex-wrap gap-2 mb-2">
          {project.technologies.map((tech) => (
            <Badge key={tech} variant="secondary">
              {tech}
            </Badge>
          ))}
        </div>
        <CardTitle>{project.title[language]}</CardTitle>
        <CardDescription>{project.description[language]}</CardDescription>
      </CardHeader>
      <CardContent className="flex-grow">
        <p className="text-muted-foreground">{project.details[language]}</p>
      </CardContent>
      <CardFooter className="flex flex-col sm:flex-row gap-2 sm:gap-4">
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          {project.githubFrontend && (
            <Button variant="outline" size="sm" className="flex-grow sm:flex-grow-0" asChild>
              <Link href={project.githubFrontend} target="_blank" rel="noopener noreferrer">
                <Github className="h-4 w-4 mr-2" /> FE
              </Link>
            </Button>
          )}
          {project.githubBackend && (
            <Button variant="outline" size="sm" className="flex-grow sm:flex-grow-0" asChild>
              <Link href={project.githubBackend} target="_blank" rel="noopener noreferrer">
                <Github className="h-4 w-4 mr-2" /> BE
              </Link>
            </Button>
          )}
          {project.site && (
            <Button size="sm" className="flex-grow sm:flex-grow-0" asChild>
              <Link href={project.site} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4 mr-2" />
                {project.siteLabel?.[language] ?? "Site"}
              </Link>
            </Button>
          )}
          {project.googlePlay && (
            <Button size="sm" className="flex-grow sm:flex-grow-0" asChild>
              <Link href={project.googlePlay} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4 mr-2" />
                Google Play
              </Link>
            </Button>
          )}
        </div>
      </CardFooter>
    </Card>
  )
}

function TranslatedText({ id }: { id: string }) {
  const { t } = useTranslation()
  return <>{t(id)}</>
}

function useLanguage() {
  const { language } = useTranslation()
  return { language }
}

// Add these translations to your language-provider.tsx
// "projects.subtitle": {
//   ko: "제가 작업한 프로젝트들을 확인해보세요.",
//   en: "Check out some of my recent projects.",
// },

type Project = {
  id: number
  title: {
    ko: string
    en: string
  }
  description: {
    ko: string
    en: string
  }
  details: {
    ko: string
    en: string
  }
  technologies: string[]
  githubFrontend?: string
  githubBackend?: string
  site?: string
  siteLabel?: {
    ko: string
    en: string
  }
  googlePlay?: string
}

const projects: Project[] = [
  {
    id: 1,
    title: {
      ko: "Junlog dev",
      en: "Junlog dev",
    },
    description: {
      ko: "개인 테크 블로그",
      en: "Personal tech blog",
    },
    details: {
      ko: "V0 를 이용해 만든 서버리스 블로그입니다.",
      en: "A serverless blog built with V0.",
    },
    technologies: ["React", "NextJs", "Postgresql"],
    githubFrontend: "https://github.com/pkt369/junlog.dev",
    site: "https://junlog.dev",
  },
  {
    id: 2,
    title: {
      ko: "TripKit - Packing List",
      en: "TripKit - Packing List",
    },
    description: {
      ko: "여행 짐 체크리스트 앱",
      en: "Travel packing checklist app",
    },
    details: {
      ko: "여행 전 필요한 준비물을 체크하고 빠뜨린 물건 없이 짐을 챙길 수 있도록 도와주는 모바일 앱입니다.",
      en: "A mobile app that helps users prepare packing checklists and avoid forgetting items before a trip.",
    },
    technologies: ["iOS", "Android", "iPadOS", "Travel", "App Store", "Google Play"],
    site: "https://apps.apple.com/us/app/tripkit-packing-list/id6769991684",
    siteLabel: {
      ko: "App Store",
      en: "App Store",
    },
    googlePlay: "https://play.google.com/store/apps/details?id=app.datasurfing.tripkit",
  },
  {
    id: 3,
    title: {
      ko: "Coslog - Costume Planner",
      en: "Coslog - Costume Planner",
    },
    description: {
      ko: "의상과 코스프레 플래너 앱",
      en: "Costume and cosplay planner app",
    },
    details: {
      ko: "의상 준비 과정과 코스프레 계획을 정리하고 관리할 수 있도록 만든 모바일 앱입니다.",
      en: "A mobile app for organizing costume preparation and managing cosplay plans.",
    },
    technologies: ["iOS", "Android", "iPadOS", "Productivity", "App Store", "Google Play"],
    site: "https://apps.apple.com/us/app/coslog-costume-planner/id6758619186",
    siteLabel: {
      ko: "App Store",
      en: "App Store",
    },
    googlePlay: "https://play.google.com/store/apps/details?id=app.datasurfing.coslog",
  },
  {
    id: 4,
    title: {
      ko: "Color Mate – Color Picker",
      en: "Color Mate – Color Picker",
    },
    description: {
      ko: "사진에서 색상을 추출하는 컬러 피커 앱",
      en: "Color picker app for extracting colors from photos",
    },
    details: {
      ko: "사진에서 색상을 추출하고 컬러 정보를 확인할 수 있도록 만든 모바일 그래픽 디자인 도구 앱입니다.",
      en: "A mobile graphics and design utility app for extracting colors from photos and checking color information.",
    },
    technologies: ["iOS", "Android", "iPadOS", "Graphics & Design", "App Store", "Google Play"],
    site: "https://apps.apple.com/us/app/color-mate-color-picker/id6755136433",
    siteLabel: {
      ko: "App Store",
      en: "App Store",
    },
    googlePlay: "https://play.google.com/store/apps/details?id=app.datasurfing.colormate",
  },
  {
    id: 5,
    title: {
      ko: "DogWalk - Track your walks",
      en: "DogWalk - Track your walks",
    },
    description: {
      ko: "반려견 산책 기록 앱",
      en: "Dog walking tracker app",
    },
    details: {
      ko: "반려견과의 산책 기록을 남기고 산책 활동을 관리할 수 있도록 만든 iOS 앱입니다.",
      en: "An iOS app for recording walks with pets and managing walking activity.",
    },
    technologies: ["iOS", "Lifestyle", "Location", "App Store"],
    site: "https://apps.apple.com/us/app/dogwalk-track-your-walks/id6753666182",
    siteLabel: {
      ko: "App Store",
      en: "App Store",
    },
  },
]
