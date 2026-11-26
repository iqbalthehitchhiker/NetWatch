import { defineConfig, configDefaults } from 'vitest/config';

export default defineConfig({
  test: {
    exclude: [...configDefaults.exclude, 'tests/results-integration.test.js'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
    },
    environment: 'node',
    server: {
      deps: {
        inline: ['sqlite'],
      },
    },
  },
});
