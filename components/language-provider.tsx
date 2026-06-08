"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import {
  isSupportedLanguage,
  languageStorageKey,
  resolveInitialLanguage,
  type Language,
} from "@/lib/language-preference"

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
    ko: "저는 백엔드 개발자 출신이지만 프론트엔드, 풀스택 개발에도 관심이 많습니다.",
    en: "I'm a backend developer by background, but I have a strong interest in frontend and full-stack development as well.",
  },
  "about.bio.p2": {
    ko: `새로운 기술을 배우고 실제 프로젝트에 적용하는 것을 즐기는 개발자입니다. 특히 AI 기술에 관심이 많아 다양한 AI 도구를 활용해 프로젝트를 진행하고 있으며, 단순한 사용을 넘어 동작 원리와 기술적 배경을 이해한 뒤 정확하게 활용하는 것을 지향합니다.
          개발 과정에서는 감이나 관성보다 근거를 중요하게 생각합니다. 문제를 해결할 때 먼저 충분한 근거를 찾고, 이를 바탕으로 의사결정하고 구현하는 것이 저의 개발 철학입니다.`,
    en: `I'm a developer who enjoys learning new technologies and applying them to real projects. I have a particular interest in AI technologies, and I actively use various AI tools in my projects. I strive to understand the underlying principles and technical background of these tools to use them accurately, rather than just using them superficially.
          In my development process, I prioritize evidence over intuition or inertia. When solving problems, I first seek sufficient evidence and base my decision-making and implementation on that. This is my development philosophy.`,
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
    const savedLanguage = localStorage.getItem(languageStorageKey)
    const browserLanguages = navigator.languages?.length ? navigator.languages : [navigator.language]
    const initialLanguage = resolveInitialLanguage(savedLanguage, browserLanguages)

    setLanguageState(initialLanguage)
    document.documentElement.lang = initialLanguage

    if (savedLanguage && !isSupportedLanguage(savedLanguage)) {
      localStorage.removeItem(languageStorageKey)
    }
  }, [])

  const setLanguage = (newLanguage: Language) => {
    setLanguageState(newLanguage)
    localStorage.setItem(languageStorageKey, newLanguage)
    document.documentElement.lang = newLanguage
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
