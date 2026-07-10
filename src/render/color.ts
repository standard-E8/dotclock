const cache = new Map<string, [number, number, number, number]>();

/** CSS 色文字列を RGBA に変換 (キャッシュ付き) */
export function parseCssColor(color: string): [number, number, number, number] {
  const hit = cache.get(color);
  if (hit) return hit;

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return [255, 255, 255, 255];

  ctx.fillStyle = '#000000';
  ctx.fillStyle = color;
  const normalized = ctx.fillStyle;

  if (normalized.startsWith('#')) {
    const hex = normalized.slice(1);
    const rgba: [number, number, number, number] = [
      parseInt(hex.slice(0, 2), 16),
      parseInt(hex.slice(2, 4), 16),
      parseInt(hex.slice(4, 6), 16),
      255,
    ];
    cache.set(color, rgba);
    return rgba;
  }

  const fallback: [number, number, number, number] = [255, 255, 255, 255];
  cache.set(color, fallback);
  return fallback;
}

export function writePixel(
  pixels: Uint8ClampedArray,
  width: number,
  x: number,
  y: number,
  r: number,
  g: number,
  b: number,
  a: number,
): void {
  const i = (y * width + x) * 4;
  pixels[i] = r;
  pixels[i + 1] = g;
  pixels[i + 2] = b;
  pixels[i + 3] = a;
}

export function readPixel(
  pixels: Uint8ClampedArray,
  width: number,
  x: number,
  y: number,
): [number, number, number, number] {
  const i = (y * width + x) * 4;
  return [pixels[i]!, pixels[i + 1]!, pixels[i + 2]!, pixels[i + 3]!];
}
