// The site's own address without a trailing slash, or '' when the build wasn't given one
// (NUXT_PUBLIC_SITE_URL, see nuxt.config).
export function useSiteUrl(): string {
  return String(useRuntimeConfig().public.siteUrl).replace(/\/+$/, '')
}
