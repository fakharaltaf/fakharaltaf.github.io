import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'
import { site } from './build/site.ts'

export default defineConfig({
  base: '/',
  plugins: [react(), site()],
  build: { target: 'es2022' },
  test: { include: ['tests/unit/**/*.test.ts'] },
})
