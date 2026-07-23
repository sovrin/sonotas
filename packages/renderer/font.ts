// Bravura inlined as a data-URI @font-face — an <img>-rasterized SVG can't reach
// document or external fonts. `svg{font-size:36px}` = alphaTab's musicFontSize base.
const cache = new Map<string, Promise<string>>()

export function musicFontCss(fontUrl: string): Promise<string> {
  const cached = cache.get(fontUrl)
  if (cached) return cached
  const css = loadFontCss(fontUrl).catch((err) => {
    cache.delete(fontUrl) // failures aren't cached, so the next call retries
    throw err
  })
  cache.set(fontUrl, css)
  return css
}

async function loadFontCss(fontUrl: string): Promise<string> {
  const res = await fetch(fontUrl)
  if (!res.ok) throw new Error(`font ${fontUrl}: ${res.status}`)
  const dataUrl = await blobToDataUrl(await res.blob())
  // A data-URI's MIME is generic, so the <img>-rasterized SVG needs the format()
  // hint to accept it as a font — derive it from the URL extension.
  const fmt = formatHint(fontUrl)
  const src = fmt ? `url(${dataUrl}) format('${fmt}')` : `url(${dataUrl})`
  return `@font-face{font-family:'alphaTab';src:${src};}svg{font-size:36px}text{font-family:'alphaTab',sans-serif}`
}

function formatHint(url: string): string {
  const path = url.split(/[?#]/)[0]!
  if (path.endsWith('.woff2')) return 'woff2'
  if (path.endsWith('.woff')) return 'woff'
  if (path.endsWith('.otf')) return 'opentype'
  if (path.endsWith('.ttf')) return 'truetype'
  return ''
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const fr = new FileReader()
    fr.onload = () => resolve(fr.result as string)
    fr.onerror = () => reject(fr.error)
    fr.readAsDataURL(blob)
  })
}
