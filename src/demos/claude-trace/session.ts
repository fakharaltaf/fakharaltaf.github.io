// A simulated agent session for the demo: an agent fixing a real-looking bug in tidy.ts
// (the script from Level 2). Token numbers are simulated too, and the UI says so.
export type Ev =
  | { kind: 'user' | 'assistant'; text: string; tokens: [number, number] }
  | { kind: 'tool'; name: string; args: string; result: string; tokens: [number, number] }
  | { kind: 'edit'; path: string; before: string; after: string; tokens: [number, number] }

export const SESSION: Ev[] = [
  {
    kind: 'user',
    text: 'tidy.ts turns "IMG 4821.JPG" into "img-4821-jpg.jpg". The extension is ending up in the slug.',
    tokens: [1840, 0],
  },
  { kind: 'assistant', text: 'Reading the script first.', tokens: [0, 38] },
  {
    kind: 'tool',
    name: 'Read',
    args: 'tidy.ts',
    result: '12 lines · rename() builds `${date}-${slug(title)}.${ext}`',
    tokens: [2210, 12],
  },
  {
    kind: 'tool',
    name: 'Grep',
    args: '"title" in describe.ts',
    result: 'describe.ts:7  title: file.name',
    tokens: [640, 9],
  },
  {
    kind: 'assistant',
    text: 'describe() returns the whole file name as the title, extension included. Stripping it there.',
    tokens: [0, 112],
  },
  {
    kind: 'edit',
    path: 'describe.ts',
    before: 'title: file.name,',
    after: 'title: file.name.replace(/\\.[^.]+$/, ""),',
    tokens: [380, 96],
  },
  {
    kind: 'tool',
    name: 'Bash',
    args: 'npm test -- tidy',
    result: '✓ renames IMG_4821.jpg\n✓ keeps the extension once\n2 passed',
    tokens: [910, 14],
  },
  {
    kind: 'assistant',
    text: 'Fixed. "IMG 4821.JPG" now becomes "2025-03-14-img-4821.jpg".',
    tokens: [0, 61],
  },
]

/** Word-level diff (LCS over words). Small inputs only, which is all this demo has. */
export function wordDiff(a: string, b: string): { text: string; op: 'same' | 'del' | 'add' }[] {
  const A = a.split(/(\s+)/)
  const B = b.split(/(\s+)/)
  const dp = Array.from({ length: A.length + 1 }, () => new Array<number>(B.length + 1).fill(0))
  for (let i = A.length - 1; i >= 0; i--)
    for (let j = B.length - 1; j >= 0; j--)
      dp[i]![j] = A[i] === B[j] ? dp[i + 1]![j + 1]! + 1 : Math.max(dp[i + 1]![j]!, dp[i]![j + 1]!)
  const out: { text: string; op: 'same' | 'del' | 'add' }[] = []
  let i = 0
  let j = 0
  while (i < A.length && j < B.length) {
    if (A[i] === B[j]) {
      out.push({ text: A[i++]!, op: 'same' })
      j++
    } else if (dp[i + 1]![j]! >= dp[i]![j + 1]!) out.push({ text: A[i++]!, op: 'del' })
    else out.push({ text: B[j++]!, op: 'add' })
  }
  while (i < A.length) out.push({ text: A[i++]!, op: 'del' })
  while (j < B.length) out.push({ text: B[j++]!, op: 'add' })
  return out.filter((p) => p.text !== '')
}
