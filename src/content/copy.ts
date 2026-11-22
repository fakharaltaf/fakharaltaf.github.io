// The copy deck. Every visible string on the site lives here, so text can change without touching
// components. Demo-specific strings get added in the stage that builds each demo.
// Rules: no employer names, no invented facts, no lorem. Anything unknown is a TODO comment, never shown.

export const site = {
  url: 'https://fakharaltaf.github.io/',
  title: 'Fakhar Altaf — automating literally everything',
  description:
    'Software engineer in Lahore. Backend on AWS Lambda, PMS integrations, and now ML. I automate my way out of every job I get, then they give me a new one.',
  plainTitle: 'Fakhar Altaf — the short version',
  ogAlt:
    'A constellation of six projects joined by the skills they share, with the name Fakhar Altaf.',
  plainDescription:
    'Fakhar Altaf, software engineer in Lahore, open to relocating. Projects, stack, and how to reach me, without the zooming.',
} as const

export const person = {
  name: 'Fakhar Altaf',
  role: 'Software engineer',
  location: 'Lahore, Pakistan',
  relocation: 'Open to relocating.',
  tagline: 'automating literally everything',
  oneLiner: 'I automate my way out of every job I get, then they give me a new one.',
  motto: "zoom out, it'll all make sense",
  whatIDo: [
    'I work across whatever stack the project needs.',
    'Backend: microservices on AWS Lambda.',
    'Integrations: property management system (PMS) integrations for a short-term rental platform.',
    'Before that I ran channel operations across Airbnb, Booking.com, Vrbo and Expedia, and automated most of it.',
  ],
  howIThink: 'I see architecture and workflows first. If it’s done twice, it gets a script.',
  openTo: 'Integrations, solutions engineering and full stack roles. Relocation included.',
  currently: 'Going deeper into ML.',
  links: {
    github: 'https://github.com/fakharaltaf',
    linkedin: 'https://www.linkedin.com/in/fakharaltaf/',
    email: 'fakharbinaltaf2004@gmail.com',
  },
} as const

export const skip = {
  experience: 'Skip the experience',
  backToExperience: 'Take the long way: the zoomable version',
  noscript: 'The zoomable version needs JavaScript. The plain version doesn’t:',
  noscriptLink: 'read it here',
} as const

export const loading = {
  // Shown only if the world is slow to stream in. The cursor is the loading screen.
  slow: 'Still loading. The cursor is fine, it does this.',
  verySlow: 'Your connection is taking the scenic route. The plain version is instant:',
  srBusy: 'Loading the zoomable version of the site.',
} as const

export const levels = {
  cursor: {
    name: 'Cursor',
    srHeading: 'A blinking cursor',
    srBody:
      'The site starts on one caret at the end of an empty line. Zoom out to see what it belongs to.',
  },
  line: {
    name: 'Line',
    code: "const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-')",
    caption: 'Every big thing I’ve built started as one line I got tired of typing.',
    srHeading: 'One line of code',
  },
  script: {
    name: 'Script',
    file: 'tidy.ts',
    code: [
      "import { readdir, rename } from 'node:fs/promises'",
      "import { describe } from './describe'",
      '',
      "const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-')",
      '',
      '// IMG_4821.jpg → 2025-03-14-chai-at-midnight.jpg',
      'export async function tidy(dir: string) {',
      '  for (const f of await readdir(dir)) {',
      '    const { date, title, ext } = await describe(f)',
      '    await rename(`${dir}/${f}`, `${dir}/${date}-${slug(title)}.${ext}`)',
      '  }',
      '}',
    ],
    // Simulated files the script tidies up on loop. Fake data, clearly a demo.
    files: [
      ['IMG_4821.jpg', '2025-03-14-chai-at-midnight.jpg'],
      ['Screenshot 2025-03-14 at 01.12.09.png', '2025-03-14-the-bug-at-1am.png'],
      ['final_FINAL_v3.docx', '2025-03-15-final.docx'],
      ['New Folder (7)', '2025-03-15-misc'],
      ['untitled.py', '2025-03-16-scrape-everything.py'],
      ['IMG_4822.jpg', '2025-03-16-more-chai.jpg'],
    ],
    caption: 'Done twice? It gets a script.',
    srHeading: 'A small script that renames files',
  },
  project: {
    name: 'Project',
    srHeading: 'Inside a running project',
    play: 'Play',
    code: 'Code',
    openDemo: 'Try the demo',
    closeDemo: 'Back out',
    closeHint: 'Esc',
    loadingDemo: 'Booting the demo. It’s smaller than it looks.',
    posterNote: 'Still frame. Reduced motion is on, or this device asked me to go easy.',
    expand: 'Full screen',
    collapse: 'Back to the world',
    openStar: (title: string) => `Open ${title}`,
    noDemo: 'No live demo for this one yet. The code is the demo for now.',
    viewLabel: 'What runs in this window',
    browse: {
      label: 'Browse projects',
      prev: 'Previous project',
      next: 'Next project',
      count: (i: number, n: number) => `${i} / ${n}`,
      hint: '← → or swipe',
    },
    demoShowing: 'Showing a demo',
    // TODO(fakhar): links go to the code for now; point each at its deployment or download later.
    demoReal: 'check out the real app here',
    viewDemo: 'Demo',
    viewLive: 'Real site',
    liveTitle: (title: string) => `${title}, the real site`,
    liveLoading: 'Loading the real site…',
    livePlay: (title: string) => `Play ${title} full screen`,
    liveFailed: 'It won’t open in here. The link below still works.',
    liveOpen: 'Open the real site',
    seeReal: (title: string) => `See the real ${title}`,
    stackLabel: 'Stack',
  },
  constellation: {
    name: 'Constellation',
    caption: 'Zoom out. It’ll all make sense.',
    hint: 'Grab a star. Fling it. Click it to go in.',
    thread: (skill: string, projects: readonly string[]) => `${skill}: ${projects.join(', ')}`,
    srHeading: 'Every project, connected by the skills they share',
  },
  person: {
    name: 'Person',
    pin: 'Lahore, Pakistan',
    knockHint: 'The letters are loose. Sorry.',
    openToLabel: 'Open to',
    srHeading: 'Who built all this',
  },
  outro: {
    name: 'Outro',
    lead: 'If something at your place gets done twice a day, I’d like to see it.',
    email: 'Email me',
    copyEmail: 'Copy email',
    copied: 'Copied. Paste responsibly.',
    github: 'GitHub',
    linkedin: 'LinkedIn',
    zoomBackIn: 'Zoom back in',
    srHeading: 'Contact',
  },
} as const

export const hud = {
  label: 'Zoom level',
  here: (level: string) => `You are here: ${level}`,
  flyTo: (level: string) => `Fly to ${level}`,
  backend: { webgpu: 'WebGPU', webgl2: 'WebGL2' },
  quality: ['Low (it’s fine)', 'Medium', 'High', 'Ultra (fans on)'],
  qualityLabel: 'Quality',
  qualityAuto: 'Auto',
  sound: { label: 'Sound', onShort: 'on', offShort: 'off', mute: 'Mute (M)', unmute: 'Unmute (M)' },
  nowPlaying: { title: 'The Man Who Sold the World', artist: 'David Bowie' },
  howItWorks: 'How this works',
  viewSource: 'View source',
  viewSourceLong: 'View source of this moment',
  wireframe: 'Wireframe',
  stats: {
    fps: 'fps',
    frame: 'frame',
    drawCalls: 'draw calls',
    triangles: 'triangles',
    particles: 'particles',
    backend: 'backend',
    quality: 'quality',
    automated: 'automated',
  },
  openOnGitHub: 'Open the file on GitHub',
  close: 'Close',
} as const

export const hints = {
  idle: 'Scroll to zoom out',
  idleTouch: 'Swipe up to zoom out',
  reducedMotion: 'Reduced motion is on, so the camera steps between levels instead of flying.',
} as const

export const eggs = {
  konami: 'Fast-forward: 6×. Like a script would.',
  endingTour: 'Running the whole site by itself.',
}

export const shortcuts = {
  title: 'Shortcuts',
  close: 'Got it',
  items: [
    { keys: ['↓', 'S'], label: 'Zoom out' },
    { keys: ['↑', 'W'], label: 'Zoom in' },
    { keys: ['Enter'], label: 'Open the focused project' },
    { keys: ['Esc'], label: 'Back out' },
    { keys: ['Tab'], label: 'Next thing you can poke' },
    { keys: ['/', '`'], label: 'Terminal' },
    { keys: ['X'], label: 'Wireframe mode' },
    { keys: ['M'], label: 'Mute or unmute' },
    { keys: ['?'], label: 'This sheet' },
  ],
} as const

export const automation = {
  counter: (n: number) => `You’ve automated ${n} ${n === 1 ? 'thing' : 'things'}.`,
  toggle: (n: number) => `Automated · ${n}`,
  logHead: (n: number) => `~/automations · ${n} running`,
  stop: '^C stop',
  rerun: '↺ run',
  toggleShort: (n: number) => `Auto · ${n}`,
  switchOff: 'off',
  milestones: { 1: 'There it is.', 3: 'You’re getting it.', 5: 'I’d hire you.' } as Record<
    number,
    string
  >,
  panelLead: (action: string) => `You ${action} twice. Writing a script.`,
  panelDone: 'Done. It runs by itself now.',
  status: { typing: 'writing', running: 'running', automated: 'automated', disabled: 'off' },
  disable: 'Fine, I’ll do it myself',
  enable: 'Put the script back on',
  marker: 'auto',
  markerTooltip: 'This runs itself now.',
  welcomeBack: 'Welcome back. Your scripts kept running.',
  trayLabel: 'Things that run by themselves now',
  pausedReducedMotion: 'Paused while reduced motion is on. They’ll wait.',
  // What each automation is called in the tray.
  names: {
    openProject: 'Opening projects',
    swipeCard: 'Swiping cards',
    plantField: 'Planting fields',
    submitAnswer: 'Answering trivia',
    expandToolCall: 'Expanding tool calls',
    dragRow: 'Dragging rows',
    openTerminal: 'Opening the terminal',
    flingStar: 'Flinging stars',
  },
  ending: 'Okay, you don’t need me. But I’d still like to work with you.',
  // Past-tense phrases slotted into panelLead.
  actions: {
    openProject: 'opened a project',
    swipeCard: 'swiped a card',
    plantField: 'planted a field',
    submitAnswer: 'answered a question',
    expandToolCall: 'expanded a tool call',
    dragRow: 'dragged a row',
    openTerminal: 'opened the terminal',
    flingStar: 'flung a star',
  },
} as const

export const terminal = {
  title: 'terminal',
  close: 'Close terminal',
  inputLabel: 'Command',
  autoBadge: 'auto',
  prompt: 'visitor@lahore:~$',
  banner: 'Type help. Or don’t, and guess.',
  help: [
    ['help', 'this'],
    ['ls projects', 'everything I’ve built that fits on a screen'],
    ['open <project>', 'fly to it'],
    ['whoami', 'technically, me'],
    ['zoom out / zoom in', 'the scroll wheel, typed'],
    ['theme', 'about the colours'],
    ['sound on|off', 'off by default, as it should be'],
    ['automate all', 'skip the part where you do things twice'],
    ['reset', 'delete every script, start over'],
    ['contact', 'how to reach me'],
    ['exit', 'close this'],
  ],
  open: {
    ok: (title: string) => `Flying to ${title}.`,
    missing: (arg: string) => `No project called “${arg}”. ls projects has the real list.`,
    noArg: 'Open what? Try: open raremind',
  },
  zoomOut: 'Zooming out.',
  zoomIn: 'Zooming in.',
  alreadyOut: 'Already as far out as it goes. That’s the point.',
  alreadyIn: 'Any closer and you’d be inside the cursor.',
  theme: 'The world only comes in dark. The plain version does light: /plain/',
  soundOn: 'Sound on. Low volume, promise.',
  soundOff: 'Sound off.',
  soundUsage: 'sound on, or sound off. There is no sound maybe.',
  automateAll: 'Writing scripts for everything. Lean back.',
  reset:
    'Reset. Every script deleted, every counter back to zero. You do everything by hand again.',
  sudoHire: [
    '[sudo] password for visitor: ********',
    'Checking sudoers. You’re in it.',
    'Opening email.',
  ],
  exit: 'Bye. Press / to come back.',
  unknown: [
    (c: string) => `${c}: command not found. Yet.`,
    (c: string) => `${c}? Type it again and I’ll write a script for it. (I won’t.)`,
    (c: string) => `${c}: that’s on the roadmap. The roadmap is a sticky note.`,
    () => 'Not a command. Ambitious, though.',
    (c: string) => `${c}: I don’t know that one. help does.`,
  ],
} as const

export const demos = {
  raremind: {
    label: 'Daily question',
    question: 'Name a fruit. Not an apple. Not a banana.',
    placeholder: 'Your answer',
    inputLabel: 'Your answer to the daily question',
    submit: 'Dive',
    start: 'Start the clock',
    seconds: (s: number) => `${s}s`,
    tiers: { common: 'Common', uncommon: 'Uncommon', rare: 'Rare', ultra: 'Ultra rare' },
    hit: (name: string, share: number, tier: string, metres: number) =>
      `${name}: ${share}% of players said it. ${tier}. Down ${metres} m.`,
    excluded: 'Said not an apple. Said not a banana. The submarine heard.',
    unknown: (a: string) => `“${a}” isn’t on the list. Either it’s very rare or it isn’t a fruit.`,
    duplicate: 'Already said that one. The ocean remembers.',
    empty: 'Type something. Anything. Rarer is better.',
    timeUp: 'Time. The submarine waits for no one.',
    again: 'Again',
    depthLabel: 'Depth',
    metres: (m: number) => `${m.toLocaleString('en')} m`,
    trench: 'Deeper than the Mariana Trench. Respect.',
    simulated: 'Answer shares are simulated for this demo.',
    saidLabel: 'Your answers',
  },
}

export const demosAgrarian = {
  seed: (n: number) => `seed ${n}`,
  newSeed: 'New seed',
  when: (year: number, season: string) => `Year ${year} · ${season}`,
  seasons: { spring: 'Spring', summer: 'Summer', autumn: 'Autumn', winter: 'Winter' },
  coins: (n: number) => `${n} coins`,
  hint: 'Click a tile to plant a field. Harvests do the rest.',
  hintKeys: 'Arrow keys pick a tile, Enter plants.',
  fastForward: 'Fast-forward a year',
  fastForwarding: 'Fast-forwarding',
  sameSeed: 'Same seed, same farm. Try it.',
  events: {
    barn: 'Barn built. Harvests are worth 50% more.',
    tractor: 'Tractor bought. It plants on its own now. Relatable.',
    house: 'Someone moved in. It’s a village now.',
  },
  gridLabel: 'Farm plot, 9 by 9 tiles. Arrow keys choose a tile, Enter plants a field.',
}

export const demosTrace = {
  file: '~/.agent/sessions/tidy-fix.jsonl',
  tailing: 'live tailing',
  ended: 'session ended · replaying',
  you: 'you',
  agent: 'agent',
  edit: 'edit',
  expand: (name: string) => `Show ${name} arguments and result`,
  args: 'args',
  result: 'result',
  sidebar: {
    input: 'Input tokens',
    output: 'Output tokens',
    tools: 'Tool calls',
    ratio: 'Output per input',
  },
  simulated: 'Session and token counts are simulated for this demo.',
}

export const demosMonitoring = {
  people: (n: number) => `Tracking ${n} ${n === 1 ? 'person' : 'people'}`,
  slider: 'People in the room',
  attention: 'attention',
  yawn: 'yawn',
  legend: 'Box: stable ID · line: gaze · axes: head pose · bar: attention',
  synthetic: 'Synthetic faces, no camera. Nobody real was tracked in the making of this demo.',
  srSummary: (n: number, flagged: number) =>
    `${n} synthetic people tracked, ${flagged} flagged for yawning.`,
}

export const demosSvype = {
  pass: 'Pass',
  like: 'Interested',
  match: (n: number) => `${n}% match`,
  hint: 'Drag a card, flick it. Too gentle and it comes back.',
  hintKeys: 'Left and right arrows work too.',
  summaryTitle: 'Your matches',
  summaryEmpty: 'No matches. Picky. Respect.',
  again: 'Shuffle the stack',
  simulated: 'Jobs and match scores are simulated for this demo.',
}

export const demosLna = {
  table: 'Learning needs',
  cols: { competency: 'Competency', trainees: 'Trainees', level: 'Level' },
  engine: 'Rules engine',
  drop: 'Drag rows here',
  send: (c: string) => `Send ${c} to the rules engine`,
  fired: 'Rule fired',
  outcome: 'Recommendation',
  reset: 'Put them back',
  hint: 'Drag a row into the engine, or press its arrow.',
  simulated: 'Sample rows, simplified rules.',
}

export const github = {
  heading: 'Lately on GitHub',
  loading: 'Asking GitHub what I’ve been up to.',
  offline: 'GitHub isn’t answering. Here’s a snapshot from build day.',
  rateLimited: 'GitHub says I’ve asked too many times. Showing the snapshot.',
  empty: 'Nothing public lately. Probably a private repo. Or sleep.',
  /** Static pages can't say "today": "40 pushes · last on 18 Nov 2026". */
  pushedOn: (pushes: number, iso: string) =>
    `${pushes} ${pushes === 1 ? 'push' : 'pushes'} · last on ${new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`,
  /** "40 pushes · 2 days ago", for the live site. */
  pushed: (pushes: number, iso: string, now = Date.now()) => {
    const days = Math.floor((now - Date.parse(iso)) / 86_400_000)
    const when =
      days <= 0
        ? 'today'
        : days === 1
          ? 'yesterday'
          : days < 14
            ? `${days} days ago`
            : `${Math.round(days / 7)} weeks ago`
    return `${pushes} ${pushes === 1 ? 'push' : 'pushes'} · ${when}`
  },
} as const

export const errors = {
  noWebgl: 'This browser can’t draw the 3D world. The plain version has everything:',
  demoCrash: (title: string) =>
    `The ${title} demo fell over. Here’s a still frame while I pretend that didn’t happen.`,
  generic: 'Something broke. Not the first time, won’t be the last.',
} as const

export const notFound = {
  title: 'Not found — Fakhar Altaf',
  line: 'This line hasn’t been written yet.',
  home: 'Back to the cursor',
  plain: 'Or the plain version',
} as const

export const plain = {
  skipToContent: 'Skip to content',
  sections: {
    what: 'What I do',
    open: 'Open to',
    projects: 'Projects',
    contact: 'Contact',
  },
  currentlyLabel: 'Currently',
  emailLabel: 'Email',
  play: 'Play',
  code: 'Code',
  shotAlt: (title: string) => `Still frame of the ${title} demo`,
  buildStamp: (size: string, date: string, commit: string) =>
    `${size} of JS · built ${date} · ${commit}`,
} as const
