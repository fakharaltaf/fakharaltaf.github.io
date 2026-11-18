import { create } from 'zustand'

/** Which project's demo is near the camera, and whether it's been opened full screen. */
export const useDemos = create<{ present: string | null; expanded: boolean }>(() => ({
  present: null,
  expanded: false,
}))

export type DemoProps = {
  /** The element the demo lives in; 3D demos render into its rectangle. */
  host: HTMLElement
  expanded: boolean
}
