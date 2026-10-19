// Anonymous usage counts go to censitas: what happens (a page view, an export,
// a file format), never who did it: no cookie, no storage, no identifier. The
// tracker loads in the background; until it has, or if it never does, track()
// does nothing. Events and their prop values must be listed for sonotas in
// censitas, or they are refused.
const TRACKER = 'https://censitas.sovrin.de/v1/track.js?site=sonotas'

let send: (event: string, props?: Record<string, string>) => void = () => {}

export function loadTracker() {
  // Dev builds would count as real use.
  if (import.meta.dev || !import.meta.client) return
  import(/* @vite-ignore */ TRACKER).then(m => (send = m.track), () => {})
}

export function track(event: string, props?: Record<string, string>) {
  send(event, props)
}

/** A length in seconds as a censitas bucket, e.g. 127 → '1-3min'. */
export function lengthBucket(seconds: number) {
  const m = seconds / 60
  return m < 1 ? '0-1min' : m < 3 ? '1-3min' : m < 5 ? '3-5min' : m < 10 ? '5-10min' : '10min+'
}

/** How long an export took, as a censitas bucket. */
export function tookBucket(seconds: number) {
  return seconds < 30 ? '0-30s' : seconds < 120 ? '30s-2min' : seconds < 600 ? '2-10min' : '10min+'
}

const FORMATS = ['gp', 'gpx', 'gp3', 'gp4', 'gp5', 'musicxml', 'mxl']

/** A file's format from its name: its extension, .xml as MusicXML, else 'other'. */
export function fileFormat(name: string) {
  const ext = name.match(/\.(\w+)$/)?.[1]?.toLowerCase() ?? ''
  const format = ext === 'xml' ? 'musicxml' : ext
  return FORMATS.includes(format) ? format : 'other'
}
