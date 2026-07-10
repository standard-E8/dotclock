/** RGBA フレームバッファ。alpha=0 は非表示 (描画しない) */
export interface FrameBuffer {
  readonly width: number;
  readonly height: number;
  readonly pixels: Uint8ClampedArray;
}

export interface DisplayConfig {
  width: number;
  height: number;
  /** ドット間ギャップ (CSS px) */
  dotGap: number;
  /** 画面背景 */
  backgroundColor: string;
  /** ドットの角丸半径比 (0-0.5) */
  dotRadiusRatio: number;
}

export const DEFAULT_DISPLAY_CONFIG: DisplayConfig = {
  width: 45,
  height: 8,
  dotGap: 2,
  backgroundColor: '#0a0a0a',
  dotRadiusRatio: 0,
};

export function createFrameBuffer(width: number, height: number): FrameBuffer {
  return {
    width,
    height,
    pixels: new Uint8ClampedArray(width * height * 4),
  };
}

export function clearBuffer(buffer: FrameBuffer): void {
  buffer.pixels.fill(0);
}

export function buffersEqual(a: FrameBuffer, b: FrameBuffer): boolean {
  if (a.width !== b.width || a.height !== b.height) return false;
  return a.pixels.every((v, i) => v === b.pixels[i]);
}
