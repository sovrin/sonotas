// sonotas' texts, from linguitas: committed in app/linguitas, so they work offline and without
// nexitas; new ones come with the next build. Each language is its own prerendered page (/en/,
// /de/), so the language comes from the address, and each its own chunk: a page loads its
// language and the source (for texts its language lacks), never the others.
import * as client from '~/linguitas/client.js'
import type { Texts } from '~/linguitas/client.js'
import meta from '~/linguitas/languages.json'

const files = import.meta.glob<Record<string, string>>('../linguitas/texts/*.json', { import: 'default' })
const texts: Texts = { version: meta.version, source: meta.source, texts: {} }

client.start(texts)
// Bumped whenever the language changes, so what t() rendered renders again.
const revision = ref(0)
client.subscribe(() => revision.value++)

/** The languages this build has a page for, the source first. */
export const languages = meta.languages
export const sourceLanguage = meta.source

export const t: typeof client.t = (key, ...params) => {
  void revision.value
  return client.t(key, ...params)
}

/** Loads the page's language and switches the texts to it; awaited before the page renders. */
export async function setLanguage(lang: string) {
  await Promise.all([meta.source, lang].map(async (l) => {
    texts.texts[l] ??= await files[`../linguitas/texts/${l}.json`]!()
  }))
  client.setLocale(lang)
}
