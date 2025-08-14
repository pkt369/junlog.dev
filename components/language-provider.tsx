"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"

type Language = "ko" | "en"

type LanguageContextType = {
  language: Language
  setLanguage: (language: Language) => void
  t: (key: string) => string
}

const translations = {
  "nav.home": {
    ko: "홈",
    en: "Home",
  },
  "nav.blog": {
    ko: "블로그",
    en: "Blog",
  },
  "nav.projects": {
    ko: "프로젝트",
    en: "Projects",
  },
  "nav.about": {
    ko: "소개",
    en: "About",
  },
  "hero.title": {
    ko: "개발자의 기록",
    en: "A Developer's Journal",
  },
  "hero.subtitle": {
    ko: "웹 개발, 프로그래밍, 그리고 기술에 관한 이야기를 공유합니다.",
    en: "Sharing stories about web development, programming, and technology.",
  },
  "hero.cta": {
    ko: "블로그 보기",
    en: "View Blog",
  },
  "hero.about": {
    ko: "소개",
    en: "About Me",
  },
  "featured.title": {
    ko: "최신 포스트",
    en: "Featured Posts",
  },
  "featured.subtitle": {
    ko: "최근에 작성한 글들을 확인해보세요.",
    en: "Check out my latest articles and tutorials.",
  },
  "featured.viewAll": {
    ko: "모든 글 보기",
    en: "View All Posts",
  },
  "footer.rights": {
    ko: "모든 권리 보유",
    en: "All rights reserved",
  },
  "about.name": {
    ko: "박세준",
    en: "Sejun Park",
  },
  "about.title": {
    ko: "소프트웨어 엔지니어",
    en: "Software Engineer",
  },
  "about.description": {
    ko: "소프트웨어 엔지니어로 일하고 있습니다.",
    en: "I'm a software engineer working in the field.",
  },
  "about.bio.title": {
    ko: "소개",
    en: "Introduction",
  },
  "about.bio.p1": {
    ko: "저는 Software Engineer 로 일하며, 풀스택 경험을 보유하고 있습니다.",
    en: "I'm a software engineer with full-stack experience.",
  },
  "about.bio.p2": {
    ko: `개발과 새로운 기술을 배우는 것을 좋아합니다. 특히 새로운 AI 써보는 것을 좋아하여 여러 프로젝트들을 여러 AI 들과 함께 진행하고 있습니다.
        또한 AI 를 이용만 하는게 아닌 항상 어떻게 동작하는지 알고 정확히 알고 사용을 하는 것을 목표로 하고 있습니다.
        
        개발을 할때는 근거를 먼저 찾고 근거에 따라 개발하는 것이 저의 개발 철학입니다.`,
    en: `I enjoy development and learning new technologies. In particular, I like exploring and using the latest AI tools in various projects. 
        Rather than just using AI, I always aim to understand how it works and ensure I fully grasp the code it generates.

        My development philosophy is to first find the rationale and then develop based on that foundation.`,
  },
  "about.skills.title": {
    ko: "기술",
    en: "Skills",
  },
  "projects.subtitle": {
    ko: "개인 프로젝트들",
    en: "Personal Projects",
  },
  "projects.viewAll": {
    ko: "모든 프로젝트 보기",
    en: "View All Projects",
  },
}
const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>("en")

  useEffect(() => {
    const savedLanguage = localStorage.getItem("language") as Language
    if (savedLanguage && (savedLanguage === "ko" || savedLanguage === "en")) {
      setLanguageState(savedLanguage)
    } else {
      localStorage.setItem("language", "en")
    }
  }, [])

  const setLanguage = (newLanguage: Language) => {
    setLanguageState(newLanguage)
    localStorage.setItem("language", newLanguage)
  }

  const t = (key: string): string => {
    if (translations[key as keyof typeof translations]) {
      return translations[key as keyof typeof translations][language]
    }
    return key
  }

  return <LanguageContext.Provider value={{ language, setLanguage, t }}>{children}</LanguageContext.Provider>
}

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (context === undefined) {
    throw new Error("useLanguage must be used within a LanguageProvider")
  }
  return context
}

export function useTranslation() {
  const { t, language } = useLanguage()
  return { t, language }
}
