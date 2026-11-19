// Two looks for the opening, chosen with ?v=a or ?v=b while we compare them.
//   a: the line and the script are crisp text; particles form on the way to the project.
//   b: one set of particles throughout: the line types itself in particles, the script gathers
//      around it, and the same particles become the project, the galaxy and the rest.
// shortcut: a URL switch for comparing; once one is chosen, delete the other branch and this file.
export const ALL_PARTICLES =
  typeof location === 'undefined' || new URLSearchParams(location.search).get('v') !== 'a'
