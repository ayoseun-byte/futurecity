import { defineConfig } from 'vitest/config'

/**
 * The unit tests cover the pure scenario logic (assertions, template
 * expansion, summaries) and never boot the Web3Auth-gated app, so this config
 * intentionally does not extend `vite.config.ts`.
 */
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
