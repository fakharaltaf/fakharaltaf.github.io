// How browsing treats RareMind, chosen with ?browse=b or ?browse=c while we compare.
//   (none) a: fly to RareMind's star, then its star grows into the RareMind level's frame.
//   b:        RareMind is browsed like every other project: its star and the demo, no frame.
//   c:        every project's star grows into a particle frame when you arrive.
// shortcut: a URL switch for comparing; once one is chosen, delete the others and this file.
export const BROWSE: 'a' | 'b' | 'c' = (() => {
  const v =
    typeof location === 'undefined' ? null : new URLSearchParams(location.search).get('browse')
  return v === 'b' || v === 'c' ? v : 'a'
})()

/** Version c's frame effect (drifting dots, glow); ?fx=off to compare without it. */
// shortcut: a URL switch for comparing; delete once decided.
export const FX =
  typeof location === 'undefined' || new URLSearchParams(location.search).get('fx') !== 'off'
