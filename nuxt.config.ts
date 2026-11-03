// https://nuxt.com/docs/api/configuration/nuxt-config
import texts from './app/linguitas/texts.json'

export default defineNuxtConfig({
  modules: [
    '@nuxt/eslint'
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

  // A page per language the committed texts have (app/linguitas, see utils/i18n). One at a time:
  // the texts' language is one setting for the whole process.
  nitro: {
    prerender: {
      routes: Object.keys(texts.texts).map(lang => `/${lang}/`),
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
