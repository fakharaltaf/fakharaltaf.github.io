import { create } from 'zustand'

/**
 * Which project's demo is near the camera, whether it's been opened full screen, and which
 * projects the visitor switched to their real site (this visit only).
 */
export const useDemos = create<{
  present: string | null
  expanded: boolean
  live: Record<string, boolean>
}>(() => ({
  present: null,
  expanded: false,
  live: {},
}))

export type DemoProps = {
  /** The element the demo lives in; 3D demos render into its rectangle. */
  host: HTMLElement
  expanded: boolean
}
