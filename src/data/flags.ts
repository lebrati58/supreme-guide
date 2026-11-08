/** Detect whether the platform renders regional-indicator flag emoji (Windows shows letters). */
export function supportsFlagEmoji(): boolean {
  try {
    const c = document.createElement('canvas');
    c.width = c.height = 20;
    const ctx = c.getContext('2d', { willReadFrequently: true });
    if (!ctx) return false;
    ctx.font = '16px sans-serif';
    ctx.textBaseline = 'top';
    ctx.fillText('\u{1F1EB}\u{1F1F7}', 0, 0); // 🇫🇷
    const d = ctx.getImageData(0, 0, 20, 20).data;
    // A flag renders in colour; letter fallbacks are monochrome.
    for (let i = 0; i < d.length; i += 4) if (d[i + 3] > 0 && (Math.abs(d[i] - d[i + 1]) > 30 || Math.abs(d[i + 1] - d[i + 2]) > 30)) return true;
    return false;
  } catch { return false; }
}
