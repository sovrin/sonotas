/** Rasterize an SVG string onto an OffscreenCanvas, injecting `css` as a `<defs>`
 * `<style>` so the (data-URI) music font is available to the `<img>` decoder. */
export async function svgToCanvas(
  svg: string,
  w: number,
  h: number,
  css: string
): Promise<OffscreenCanvas> {
  const doc = svg.replace(
    /(<svg[^>]*>)/,
    `$1<defs><style>${css}</style></defs>`
  )
  const url = URL.createObjectURL(new Blob([doc], { type: 'image/svg+xml' }))
  try {
    const img = new Image(w, h)
    img.src = url
    await img.decode()
    const oc = new OffscreenCanvas(w, h)
    oc.getContext('2d')!.drawImage(img, 0, 0, w, h)
    return oc
  } finally {
    URL.revokeObjectURL(url)
  }
}
