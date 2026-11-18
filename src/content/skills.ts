export const skills = {
  typescript: 'TypeScript',
  react: 'React',
  threejs: 'Three.js',
  python: 'Python',
  ml: 'Machine Learning',
  postgresql: 'PostgreSQL',
  supabase: 'Supabase',
  rust: 'Rust',
  nextjs: 'Next.js',
  'react-native': 'React Native',
  nodejs: 'Node.js',
  // No project lists AWS yet; it surfaces at the Person level (Lambda work), not as a thread.
  aws: 'AWS',
} as const

export type SkillId = keyof typeof skills
