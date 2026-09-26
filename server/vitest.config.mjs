import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['tests/**/*.test.js'],
    globalSetup: ['./tests/global-setup.mjs'],
    testTimeout: 60000,
    hookTimeout: 60000,
    // Un seul worker : le serveur de test est partagé par fichier via setup global.
    pool: 'forks',
    poolOptions: { forks: { singleFork: true } },
    sequence: { shuffle: false },
  },
})
