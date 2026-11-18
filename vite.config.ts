import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'
import { site } from './build/site.ts'

export default defineConfig({
  base: '/',
  plugins: [react(), site()],
  // One copy of three: R3F imports 'three', we import 'three/webgpu' (which includes the core).
  // R3F only touches WebGLRenderer when no gl factory is passed, and World always passes one.
  resolve: { alias: [{ find: /^three$/, replacement: 'three/webgpu' }] },
  build: { target: 'es2022' },
  test: { include: ['tests/unit/**/*.test.ts'] },
})
