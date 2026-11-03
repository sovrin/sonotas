// Fetches sonotas' texts and linguitas' client into app/linguitas, to commit: the build uses
// them as they are and needs nothing else.
//   pnpm texts                                     the published texts
//   LINGUITAS_TOKEN=<build token> pnpm texts --draft   the texts as they are now, for development
// LINGUITAS_URL picks another nexitas (http://localhost:3000).
import { writeFile } from 'node:fs/promises'

const served = `${process.env.LINGUITAS_URL ?? 'https://nexitas.sovrin.de'}/v1/translations`
const draft = process.argv.includes('--draft')
const token = process.env.LINGUITAS_TOKEN

async function get(url) {
  const response = await fetch(url, { headers: token ? { authorization: `Bearer ${token}` } : {} })
  // A redirect is a sign-in page, not the file.
  if (!response.ok || response.redirected) throw new Error(`${url}: ${response.status}`)
  return response.text()
}

const files = {
  'texts.json': await get(`${served}/sonotas/${draft ? 'draft/' : ''}texts.json`),
  'client.js': await get(`${served}/client.js`),
  'client.d.ts': await get(`${served}/client.d.ts.txt`)
}
const { texts } = JSON.parse(files['texts.json'])
for (const [name, text] of Object.entries(files)) await writeFile(`app/linguitas/${name}`, text)
console.log(`texts: ${draft ? 'the draft' : 'published'}, ${Object.keys(texts).join(', ')}`)
