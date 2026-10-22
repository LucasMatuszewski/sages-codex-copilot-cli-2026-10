import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: 'unit',
          include: ['server/**/*.spec.ts', 'shared/**/*.spec.ts'],
          exclude: ['**/*.integration.spec.ts'],
          isolate: true,
        },
      },
      {
        test: {
          name: 'integration',
          include: ['server/**/*.integration.spec.ts'],
          pool: 'forks',
        },
      },
    ],
  },
})
