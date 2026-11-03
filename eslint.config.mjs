// @ts-check
import withNuxt from './.nuxt/eslint.config.mjs'

export default withNuxt(
  // linguitas' client and texts, as linguitas serves them: `pnpm texts` replaces them.
  { ignores: ['app/linguitas/**'] }
)
