// Fetch + shape my public GitHub activity. Shared by the browser (live) and the build (snapshot).
import { projects } from '../content/projects.ts'

export const GH_USER = 'fakharaltaf'
export type RepoActivity = {
  name: string
  url: string
  pushedAt: string
  pushes: number
  message?: string
}
export type Activity = { fetchedAt: string; repos: RepoActivity[] }

// Commit messages only for the portfolio's own repos: other repos may say anything.
const SHOWCASE = new Set(
  projects.map((p) => p.links.code.replace('https://github.com/', '').toLowerCase()),
)

type GhEvent = { type: string; created_at: string; repo: { name: string } }

export class RateLimited extends Error {}

async function getJson<T>(url: string, signal?: AbortSignal): Promise<T> {
  const res = await fetch(url, { signal, headers: { Accept: 'application/vnd.github+json' } })
  if (res.status === 403 || res.status === 429) throw new RateLimited(String(res.status))
  if (!res.ok) throw new Error(`GitHub ${res.status}`)
  return (await res.json()) as T
}

export async function fetchActivity(signal?: AbortSignal, limit = 3): Promise<Activity> {
  const events = await getJson<GhEvent[]>(
    `https://api.github.com/users/${GH_USER}/events/public?per_page=60`,
    signal,
  )
  const byRepo = new Map<string, RepoActivity>()
  for (const e of events) {
    if (e.type !== 'PushEvent' && e.type !== 'CreateEvent') continue
    const r = byRepo.get(e.repo.name) ?? {
      name: e.repo.name.split('/')[1] ?? e.repo.name,
      url: `https://github.com/${e.repo.name}`,
      pushedAt: e.created_at,
      pushes: 0,
    }
    if (e.created_at > r.pushedAt) r.pushedAt = e.created_at
    if (e.type === 'PushEvent') r.pushes++
    byRepo.set(e.repo.name, r)
  }
  const repos = [...byRepo.entries()]
    .sort((a, b) => b[1].pushedAt.localeCompare(a[1].pushedAt))
    .slice(0, limit)
  await Promise.all(
    repos.map(async ([full, r]) => {
      if (!SHOWCASE.has(full.toLowerCase())) return
      try {
        const [c] = await getJson<{ commit: { message: string } }[]>(
          `https://api.github.com/repos/${full}/commits?per_page=1`,
          signal,
        )
        if (c) r.message = c.commit.message.split('\n')[0]!.slice(0, 90)
      } catch {
        /* the repo still shows, just without a message */
      }
    }),
  )
  return { fetchedAt: new Date().toISOString(), repos: repos.map(([, r]) => r) }
}
