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
  /** The four boxes along the bottom of the project's frame: [part, tech, what it does]. */
  modules: readonly (readonly [string, string, string])[]
  /** A small real file from the repo, shown in the frame's script box (RareMind's is tidy.ts). */
  script?: { file: string; code: readonly string[] }
  /** A deployed site that can run inside the demo window. Same origin, so its saves carry over. */
  live?: { url: string; note: string }
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
    modules: [
      ['ocean', 'Three.js', 'the dive, drawn live'],
      ['client', 'React', 'the daily questions'],
      ['api', 'Fastify', 'rarer answers score more'],
      ['db', 'PostgreSQL', 'every answer, counted'],
    ],
    links: {
      play: 'https://fakharaltaf.github.io/raremind/',
      code: 'https://github.com/fakharaltaf/raremind',
    },
    live: {
      url: 'https://fakharaltaf.github.io/raremind/',
      // TODO(fakhar): update once the API is deployed and dives are open.
      note: 'The real site. Daily dives open once its server is up.',
    },
  },
  {
    id: 'agrarian',
    title: 'Agrarian',
    description:
      'A browser strategy game, from one field to a farming empire, on a deterministic simulation engine.',
    stack: ['TypeScript', 'React', 'Three.js'],
    skills: ['typescript', 'react', 'threejs'],
    modules: [
      ['engine', 'TypeScript', 'a deterministic simulation'],
      ['interface', 'React', 'fields, markets, mills'],
      ['world', 'Three.js', 'the farm in 3D'],
      ['saves', 'browser', 'your farm waits for you'],
    ],
    script: {
      file: 'scripts/playthrough.mjs',
      code: [
        '// Real-action balancing trace; never grants cash, goods, unlocks or population.',
        '// Usage: node scripts/playthrough.mjs output.json [balanced|volume|town|city] [ticks] [source-root]',
        "const [output,mode='balanced',limit='9000',root=process.cwd()]=process.argv.slice(2);",
        "if(!output)throw new Error('Pass an evidence output path.');",
      ],
    },
    links: {
      play: 'https://fakharaltaf.github.io/agrarian/',
      code: 'https://github.com/fakharaltaf/agrarian',
    },
    live: {
      url: 'https://fakharaltaf.github.io/agrarian/',
      note: 'Your farm saves here and is waiting on the real site.',
    },
  },
  {
    id: 'claude-trace',
    title: 'Claude Trace',
    description:
      'Desktop, web and terminal viewer for AI coding agent session logs, with live tailing and efficiency analysis.',
    stack: ['Rust', 'React', 'Tauri', 'Python'],
    skills: ['rust', 'react', 'python'],
    modules: [
      // TODO(fakhar): check which part Python does; "analysis" is a guess.
      ['desktop', 'Tauri · Rust', 'reads agent session logs'],
      ['web', 'React', 'the viewer in a browser'],
      ['terminal', '', 'tails a session live'],
      ['analysis', 'Python', 'efficiency stats'],
    ],
    script: {
      file: 'bin/wait-for-backend.mjs',
      code: [
        'const url = "http://127.0.0.1:11423/api/settings";',
        'const timeout = 120_000;',
        'const interval = 500;',
        'const start = Date.now();',
        '',
        'process.stdout.write("Waiting for backend");',
      ],
    },
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
    modules: [
      ['tracking', 'Python', 'up to 30 people at once'],
      ['models', 'ONNX Runtime', 'in real time'],
      ['pose', '', 'gaze and head pose'],
      ['signals', '', 'attentiveness and yawns'],
    ],
    script: {
      file: 'tests/quick_test.py',
      code: [
        '# Model path',
        'model_path = Path("models/retinaface_resnet50.onnx")',
        '',
        'print(f"\\n1. Checking model file...")',
        'if not model_path.exists():',
        '    print(f"   ❌ Model not found: {model_path}")',
      ],
    },
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
    modules: [
      // TODO(fakhar): check the split between the app and the web side.
      ['app', 'React Native', 'swipe on jobs'],
      ['web', 'Next.js', 'the same, in a browser'],
      ['data', 'Supabase', 'jobs, people, matches'],
      ['matching', 'AI', 'does the matching'],
    ],
    script: {
      file: 'app/api/onboarding/chat/route.ts',
      code: [
        'const finishOnboardingTool = tool({',
        '  description: "Mark the user\'s career onboarding as complete and save their summarized profile details.",',
        '  inputSchema: z.object({',
        '    career_goals: z.string().describe("A summary of the user\'s career aspirations."),',
        '    interests: z.string().describe("Key professional and personal interests."),',
      ],
    },
    links: { code: 'https://github.com/fakharaltaf/Svype-Prototype' },
  },
  {
    id: 'lna-bot',
    title: 'LNA Bot',
    description:
      'Turns learning needs analysis reports into training delivery recommendations through configurable business rules.',
    stack: ['Python', 'Streamlit'],
    skills: ['python'],
    modules: [
      ['input', 'Python', 'reads LNA reports'],
      ['rules', '', 'configurable business rules'],
      ['output', '', 'training recommendations'],
      ['app', 'Streamlit', 'where it all runs'],
    ],
    script: {
      file: 'start_app.py',
      code: [
        'try:',
        '    import streamlit',
        '    import plotly',
        '    import pandas',
        '    print(f"✅ Dependencies verified (Streamlit {streamlit.__version__})")',
        'except ImportError as e:',
      ],
    },
    links: { code: 'https://github.com/fakharaltaf/LNA-Report-Parser' },
  },
]
