// Discrete world state that React UI cares about. Per-frame values live in zoom.ts instead.
import { create } from 'zustand'
import type { LevelId } from './levels.ts'

export type Backend = 'webgpu' | 'webgl2'

type WorldState = {
  level: LevelId
  backend: Backend | null
  ready: boolean
  failed: boolean
  reducedMotion: boolean
}

export const useWorld = create<WorldState>(() => ({
  level: 'cursor',
  backend: null,
  ready: false,
  failed: false,
  reducedMotion:
    typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches,
}))
