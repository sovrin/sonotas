import icon from '~~/public/favicon.svg?raw'
import accents from '~/assets/aequitas/accents.json'

// The build's accent (NUXT_PUBLIC_ACCENT, see nuxt.config), '' for the amber, and the logo in it:
// the icon is always dark, so its playhead takes the accent's dark shade.
export function useAccent() {
  const accent = String(useRuntimeConfig().public.accent)
  const logo = accent
    ? `data:image/svg+xml,${encodeURIComponent(icon.replace('#e0a94c', accents[accent as keyof typeof accents].dark))}`
    : '/favicon.svg?v=4'
  return { accent, logo }
}
