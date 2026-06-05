export type Language = "ko" | "en"

export const languageStorageKey = "language"

const fallbackLanguage: Language = "en"

export function isSupportedLanguage(language: string | null | undefined): language is Language {
  return language === "ko" || language === "en"
}

function normalizeLanguage(language: string): string {
  return language.toLowerCase().split(/[-_]/)[0]
}

export function resolveInitialLanguage(
  savedLanguage: string | null | undefined,
  browserLanguages: readonly string[],
): Language {
  if (isSupportedLanguage(savedLanguage)) {
    return savedLanguage
  }

  for (const browserLanguage of browserLanguages) {
    const normalizedLanguage = normalizeLanguage(browserLanguage)
    if (isSupportedLanguage(normalizedLanguage)) {
      return normalizedLanguage
    }
  }

  return fallbackLanguage
}
