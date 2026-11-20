// Two openings to compare, chosen with ?v=c (the default is b).
//   b: the line types itself in particles out of nothing, up to the caret.
//   c: the particles start as the background and fly into the line as it's typed.
// shortcut: a URL switch for comparing; once one is chosen, delete the other branch and this file.
export const FIELD_START =
  typeof location !== 'undefined' && new URLSearchParams(location.search).get('v') === 'c'
