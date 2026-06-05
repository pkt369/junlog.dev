import assert from "node:assert/strict"
import test from "node:test"

import { languageStorageKey, resolveInitialLanguage } from "./language-preference.ts"

test("stores explicit language choices in the language key", () => {
  assert.equal(languageStorageKey, "language")
})

test("uses a saved supported language before browser languages", () => {
  assert.equal(resolveInitialLanguage("en", ["ko-KR"]), "en")
  assert.equal(resolveInitialLanguage("ko", ["en-US"]), "ko")
})

test("uses the first supported browser language when there is no saved language", () => {
  assert.equal(resolveInitialLanguage(null, ["ko-KR", "en-US"]), "ko")
  assert.equal(resolveInitialLanguage(null, ["fr-FR", "en-US"]), "en")
})

test("falls back to English when saved and browser languages are unsupported", () => {
  assert.equal(resolveInitialLanguage("ja", ["fr-FR", "de-DE"]), "en")
  assert.equal(resolveInitialLanguage(null, []), "en")
})
