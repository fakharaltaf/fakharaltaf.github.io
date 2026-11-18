// Live GitHub activity for the person level: memory → localStorage (30 min) → network →
// the snapshot bundled at build time. Never throws; worst case is the snapshot.
import snapshot from 'virtual:github-snapshot'
import { type Activity, RateLimited, fetchActivity } from './githubCore.ts'

export type Sourced = Activity & {
  source: 'live' | 'cache' | 'snapshot'
  reason?: 'offline' | 'rateLimited'
}

const KEY = 'zo:gh:v1'
const TTL = 30 * 60 * 1000
let memory: Sourced | null = null
let inflight: Promise<Sourced> | null = null

export function getActivity(): Promise<Sourced> {
  if (memory && Date.now() - Date.parse(memory.fetchedAt) < TTL) return Promise.resolve(memory)
  try {
    const cached = JSON.parse(localStorage.getItem(KEY) ?? 'null') as Activity | null
    if (cached && Date.now() - Date.parse(cached.fetchedAt) < TTL)
      return Promise.resolve((memory = { ...cached, source: 'cache' }))
  } catch {
    /* storage blocked */
  }
  inflight ??= fetchActivity(AbortSignal.timeout(6000))
    .then((a) => {
      try {
        localStorage.setItem(KEY, JSON.stringify(a))
      } catch {
        /* fine */
      }
      return (memory = { ...a, source: 'live' as const })
    })
    .catch((e: unknown) => ({
      ...(snapshot as Activity),
      source: 'snapshot' as const,
      reason: e instanceof RateLimited ? ('rateLimited' as const) : ('offline' as const),
    }))
    .finally(() => (inflight = null))
  return inflight
}
