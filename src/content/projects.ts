import type { SkillId } from './skills.ts'

export type Project = {
  id: string // also the URL hash
  title: string
  /** Short name where space is tight (star labels). Defaults to the title. */
  short?: string
  description: string
  stack: readonly string[]
  // Constellation threads. Only skills implied by the stated stack, never guessed.
  skills: readonly SkillId[]
  links: { play?: string; code: string }
}

// Order matters: the camera lands on the first project at Level 3.
export const projects: readonly Project[] = [
  {
    id: 'raremind',
    title: 'RareMind',
    description:
      'Daily trivia where rarer correct answers score more, and every answer sends a research submarine deeper down an ocean column.',
    stack: ['React', 'TypeScript', 'Fastify', 'PostgreSQL', 'Three.js'],
    skills: ['typescript', 'react', 'threejs', 'postgresql', 'nodejs'],
    links: {
      play: 'https://fakharaltaf.github.io/raremind/',
      code: 'https://github.com/fakharaltaf/raremind',
    },
  },
  {
    id: 'agrarian',
    title: 'Agrarian',
    description:
      'A browser strategy game, from one field to a farming empire, on a deterministic simulation engine.',
    stack: ['TypeScript', 'React', 'Three.js'],
    skills: ['typescript', 'react', 'threejs'],
    links: {
      play: 'https://fakharaltaf.github.io/agrarian/',
      code: 'https://github.com/fakharaltaf/agrarian',
    },
  },
  {
    id: 'claude-trace',
    title: 'Claude Trace',
    description:
      'Desktop, web and terminal viewer for AI coding agent session logs, with live tailing and efficiency analysis.',
    stack: ['Rust', 'React', 'Tauri', 'Python'],
    skills: ['rust', 'react', 'python'],
    links: { code: 'https://github.com/fakharaltaf/claude-trace' },
  },
  {
    id: 'monitoring',
    title: 'Multi-person facial and behavioural monitoring',
    short: 'Behaviour monitoring',
    description:
      'Real-time tracking of up to 30 people with gaze, head pose, attentiveness and yawn detection.',
    stack: ['Python', 'ONNX Runtime'],
    skills: ['python', 'ml'],
    links: {
      code: 'https://github.com/fakharaltaf/Multi-person_Facial-Behavioral_Monitoring-System',
    },
  },
  {
    id: 'svype',
    title: 'Svype',
    description: 'Swipe on jobs, AI does the matching. My final year project.',
    stack: ['Next.js', 'TypeScript', 'Supabase', 'React Native'],
    // TODO(fakhar): does the matching use an ML model you built? If yes, add 'ml' to link it to the monitoring star.
    skills: ['nextjs', 'typescript', 'supabase', 'react-native', 'react'],
    links: { code: 'https://github.com/fakharaltaf/Svype-Prototype' },
  },
  {
    id: 'lna-bot',
    title: 'LNA Bot',
    description:
      'Turns learning needs analysis reports into training delivery recommendations through configurable business rules.',
    stack: ['Python', 'Streamlit'],
    skills: ['python'],
    links: { code: 'https://github.com/fakharaltaf/LNA-Report-Parser' },
  },
]
