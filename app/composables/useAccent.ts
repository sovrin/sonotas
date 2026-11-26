import icon from '~~/public/favicon.svg?raw'
import { ACCENTS } from '~/utils/accents'

// The build's accent (NUXT_PUBLIC_ACCENT, see nuxt.config), '' for the amber, and the logo in it.
export function useAccent() {
  const accent = String(useRuntimeConfig().public.accent)
  const logo = accent
    ? `data:image/svg+xml,${encodeURIComponent(icon.replace('#e0a94c', ACCENTS[accent]!))}`
    : '/favicon.svg?v=4'
  return { accent, logo }
}
