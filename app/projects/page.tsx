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
        </div>
        {project.site && (
          <Button size="sm" className="w-full sm:w-auto" asChild>
            <Link href={project.site} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-4 w-4 mr-2" />
              Site
            </Link>
          </Button>
        )}
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
}

const projects: Project[] = [
  {
    id: 1,
    title: {
      ko: "Smart Lineup",
      en: "Smart Lineup",
    },
    description: {
      ko: "프런트는 React, 백엔드는 Spring Boot 로 구현하였습니다.",
      en: "Frontend is implemented with React, and backend is implemented with Spring Boot.",
    },
    details: {
      ko: "상점이나 병원 등에서 줄서는 사람들을 쉽게 관리해주는 웹 애플리케이션",
      en: "A web application that helps manage people waiting in line at stores or hospitals.",
    },
    technologies: ["React", "Vite", "TypeScript", "Tailwind CSS", "Spring Boot", "PostgreSQL"],
    githubFrontend: "https://github.com/smart-lineup/api",
    githubBackend: "https://github.com/pkt369/smart-lineup-front",
    site: "https://smart-lineup.com",
  },
  {
    id: 2,
    title: {
      ko: "할 일 관리 앱",
      en: "Todo Management App",
    },
    description: {
      ko: "React와 Redux를 사용한 할 일 관리 애플리케이션",
      en: "Todo management application using React and Redux",
    },
    details: {
      ko: "사용자가 할 일을 추가, 편집, 삭제하고 완료 상태를 관리할 수 있는 애플리케이션입니다. 로컬 스토리지를 사용하여 데이터를 저장합니다.",
      en: "An application that allows users to add, edit, delete, and manage the completion status of todos. Uses local storage to persist data.",
    },
    technologies: ["React", "Redux", "JavaScript", "CSS"],
    githubFrontend: "https://github.com/username/todo-app",
    site: "https://todo.example.com",
  },
]
