"use client"

import { useTranslation } from "@/components/language-provider"

export function TranslatedText({ id }: { id: string }) {
  const { t } = useTranslation()
  return <>{t(id)}</>
} 