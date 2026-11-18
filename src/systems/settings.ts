// Visitor settings that outlive a visit. Sound is off by default and stays off until asked.
import { create } from 'zustand'

const KEY = 'zo:settings:v1'
type Settings = { sound: boolean }

const load = (): Settings => {
  try {
    const s = JSON.parse(localStorage.getItem(KEY) ?? '{}') as Partial<Settings>
    return { sound: s.sound === true }
  } catch {
    return { sound: false }
  }
}

export const useSettings = create<Settings>(load)

useSettings.subscribe((s) => {
  try {
    localStorage.setItem(KEY, JSON.stringify(s))
  } catch {
    /* storage blocked */
  }
})
