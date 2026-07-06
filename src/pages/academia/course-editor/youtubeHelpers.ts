// ─── YouTube helpers ──────────────────────────────────────────────────────────

export function extractYouTubeId(raw: string): string | null {
  const s = raw.trim();
  const patterns = [
    /[?&]v=([a-zA-Z0-9_-]{11})/,          // watch?v=
    /youtu\.be\/([a-zA-Z0-9_-]{11})/,      // youtu.be/
    /embed\/([a-zA-Z0-9_-]{11})/,          // /embed/
    /shorts\/([a-zA-Z0-9_-]{11})/,         // /shorts/
  ];
  for (const re of patterns) {
    const m = s.match(re);
    if (m) return m[1];
  }
  // Bare 11-char video ID
  if (/^[a-zA-Z0-9_-]{11}$/.test(s)) return s;
  return null;
}

export function normalizeYouTubeUrl(raw: string): string {
  const id = extractYouTubeId(raw);
  return id ? `https://www.youtube.com/watch?v=${id}` : raw.trim();
}

export function youTubeThumbnail(raw: string): string | null {
  const id = extractYouTubeId(raw);
  return id ? `https://img.youtube.com/vi/${id}/mqdefault.jpg` : null;
}
