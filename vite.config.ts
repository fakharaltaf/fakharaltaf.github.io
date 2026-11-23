import react from '@vitejs/plugin-react'
import wasm from 'vite-plugin-wasm'
import { defineConfig } from 'vitest/config'
import { site } from './build/site.ts'

export default defineConfig({
  base: '/',
  // Rapier ships a real .wasm file: streamed and compiled while it downloads.
  plugins: [react(), wasm(), site()],
  // One copy of three: R3F imports 'three', we import 'three/webgpu' (which includes the core).
  // R3F only touches WebGLRenderer when no gl factory is passed, and World always passes one.
  resolve: { alias: [{ find: /^three$/, replacement: 'three/webgpu' }] },
  build: {
    target: 'es2022',
    sourcemap: true,
    // The writing pages are their own small entries: none of the 3D site loads there.
    rollupOptions: {
      input: { main: 'index.html', writing: 'writing/index.html', write: 'writing/admin/index.html' },
    },
  },
  test: { include: ['tests/unit/**/*.test.ts'] },
})
