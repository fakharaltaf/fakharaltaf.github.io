/// <reference types="vite/client" />

declare module 'virtual:github-snapshot' {
  const snapshot: import('./systems/githubCore.ts').Activity
  export default snapshot
}
