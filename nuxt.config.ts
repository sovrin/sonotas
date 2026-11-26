// https://nuxt.com/docs/api/configuration/nuxt-config
import { languages } from './app/i18n/languages.json'
import accents from './app/assets/aequitas/accents.json'

const accent = process.env.NUXT_PUBLIC_ACCENT ?? ''
if (accent && !(accent in accents)) {
  throw new Error(`NUXT_PUBLIC_ACCENT=${accent}: use one of ${Object.keys(accents).join(', ')}, or leave it empty for the amber`)
}

export default defineNuxtConfig({
  modules: [
    '@nuxt/eslint',
    '@vueuse/nuxt'
  ],

  devtools: {
    enabled: true
  },

  // aequitas is vendored from its dist/ (`pnpm aequitas:sync` refreshes it);
  // main.css is unlayered, so it wins over aequitas' @layer ae.* rules.
  css: [
    '~/assets/aequitas/aequitas.css',
    '~/assets/aequitas/aequitas.icons.css',
    '~/assets/css/main.css'
  ],

  // <collatas-form> is the feedback form, a web component loaded from collatas (AppHelp).
  vue: {
    compilerOptions: {
      isCustomElement: tag => tag === 'collatas-form'
    }
  },

  // The address the site is served at, for link previews (they need absolute URLs). The pages
  // are prerendered, so it is set at build time: NUXT_PUBLIC_SITE_URL=https://… pnpm generate.
  // Unset, the pages leave out og:url and the preview image.
  // The accent is one of aequitas' named accents (its accents.json), say to tell a staging
  // site apart; unset, it is the amber.
  runtimeConfig: {
    public: { siteUrl: '', accent: '' }
  },

  // The renderer package ships raw .ts and pulls browser-only deps
  // (alphaTab, mediabunny/WebCodecs); Nuxt must transpile it, and it is only
  // ever imported dynamically on the client (see useSonotas).
  build: {
    transpile: ['renderer']
  },

  routeRules: {
    '/': { prerender: true }
  },

  compatibilityDate: '2026-06-30',

  // A page per language the committed texts have (app/i18n, see utils/i18n). One at a time:
  // the texts' language is one setting for the whole process.
  nitro: {
    prerender: {
      routes: languages.map(lang => `/${lang}/`),
      concurrency: 1
    }
  },

  eslint: {
    config: {
      stylistic: {
        commaDangle: 'never',
        braceStyle: '1tbs'
      }
    }
  }
})
