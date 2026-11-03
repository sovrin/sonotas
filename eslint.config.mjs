// @ts-check
import withNuxt from './.nuxt/eslint.config.mjs'

export default withNuxt(
  // The texts and their client, as fetched: `pnpm texts` replaces them.
  { ignores: ['app/i18n/**'] }
)
