// Live numbers for the "How this works" overlay. Written by the render step, read by the UI.
export const stats = {
  fps: 0,
  frameMs: 0,
  /** Ring buffer of recent frame times for the graph. */
  history: new Float32Array(120),
  head: 0,
  drawCalls: 0,
  triangles: 0,
  particles: 0,
  wireframe: false,
}

export function pushFrame(ms: number) {
  stats.frameMs = ms
  stats.history[stats.head] = ms
  stats.head = (stats.head + 1) % stats.history.length
  stats.fps = stats.fps * 0.92 + (1000 / Math.max(1, ms)) * 0.08
}
