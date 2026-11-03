// Fetches sonotas' texts and linguitas' client into app/linguitas, to commit: the build uses
// them as they are and needs nothing else. Each language is its own file (texts/<lang>.json), so
// a page loads only its language and the source, and a diff shows which language changed.
//   pnpm texts                                     the published texts
//   LINGUITAS_TOKEN=<build token> pnpm texts --draft   the texts as they are now, for development
// LINGUITAS_URL picks another nexitas (http://localhost:3000).
import { mkdir, rm, writeFile } from 'node:fs/promises'

const served = `${process.env.LINGUITAS_URL ?? 'https://nexitas.sovrin.de'}/v1/translations`
const draft = process.argv.includes('--draft')
const token = process.env.LINGUITAS_TOKEN

async function get(url) {
  const response = await fetch(url, { headers: token ? { authorization: `Bearer ${token}` } : {} })
  // A redirect is a sign-in page, not the file.
  if (!response.ok || response.redirected) throw new Error(`${url}: ${response.status}`)
  return response.text()
}

const dir = 'app/linguitas'
const { version, source, texts } = JSON.parse(await get(`${served}/sonotas/${draft ? 'draft/' : ''}texts.json`))
await writeFile(`${dir}/client.js`, await get(`${served}/client.js`))
await writeFile(`${dir}/client.d.ts`, await get(`${served}/client.d.ts.txt`))

// Afresh, so a language dropped in linguitas leaves no file behind.
await rm(`${dir}/texts`, { recursive: true, force: true })
await mkdir(`${dir}/texts`)
const languages = [source, ...Object.keys(texts).filter(l => l !== source)]
for (const lang of languages) await writeFile(`${dir}/texts/${lang}.json`, `${JSON.stringify(texts[lang], null, 2)}\n`)
await writeFile(`${dir}/languages.json`, `${JSON.stringify({ version, source, languages }, null, 2)}\n`)
console.log(`texts: ${draft ? 'the draft' : 'published'}, ${languages.join(', ')}`)
