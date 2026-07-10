import { parseCssColor, readPixel, writePixel } from './color.js';
import { clearBuffer, createFrameBuffer, type FrameBuffer } from './types.js';

/** 論理マトリクスへの描画操作 (色はロジック側が指定) */
export class Matrix {
  readonly buffer: FrameBuffer;

  constructor(width: number, height: number) {
    this.buffer = createFrameBuffer(width, height);
  }

  get width(): number {
    return this.buffer.width;
  }

  get height(): number {
    return this.buffer.height;
  }

  clear(): void {
    clearBuffer(this.buffer);
  }

  set(x: number, y: number, color: string): void {
    if (x < 0 || y < 0 || x >= this.width || y >= this.height) return;
    const [r, g, b, a] = parseCssColor(color);
    writePixel(this.buffer.pixels, this.width, x, y, r, g, b, a);
  }

  get(x: number, y: number): string | null {
    if (x < 0 || y < 0 || x >= this.width || y >= this.height) return null;
    const [r, g, b, a] = readPixel(this.buffer.pixels, this.width, x, y);
    if (a === 0) return null;
    return `rgba(${r},${g},${b},${a / 255})`;
  }

  isOn(x: number, y: number): boolean {
    if (x < 0 || y < 0 || x >= this.width || y >= this.height) return false;
    return this.buffer.pixels[(y * this.width + x) * 4 + 3]! > 0;
  }

  drawGlyph(glyph: readonly string[], x: number, y: number, color: string): void {
    for (let row = 0; row < glyph.length; row++) {
      const line = glyph[row]!;
      for (let col = 0; col < line.length; col++) {
        if (line[col] === '#') {
          this.set(x + col, y + row, color);
        }
      }
    }
  }

  /** スロット内にクリップしてグリフを描画 (yOffset で縦位置をずらす) */
  drawGlyphInSlot(
    glyph: readonly string[],
    x: number,
    slotY: number,
    slotHeight: number,
    yOffset: number,
    color: string,
  ): void {
    const slotBottom = slotY + slotHeight;
    for (let row = 0; row < glyph.length; row++) {
      const screenY = Math.round(slotY + yOffset + row);
      if (screenY < slotY || screenY >= slotBottom) continue;
      const line = glyph[row]!;
      for (let col = 0; col < line.length; col++) {
        if (line[col] === '#') {
          this.set(x + col, screenY, color);
        }
      }
    }
  }

  drawText(
    text: string,
    glyphs: Readonly<Record<string, readonly string[]>>,
    x: number,
    y: number,
    color: string,
    spacing = 1,
  ): number {
    let cursor = x;
    for (const char of text) {
      const glyph = glyphs[char];
      if (!glyph) continue;
      this.drawGlyph(glyph, cursor, y, color);
      cursor += glyph[0]!.length + spacing;
    }
    return cursor - x - spacing;
  }

  measureText(
    text: string,
    glyphs: Readonly<Record<string, readonly string[]>>,
    spacing = 1,
  ): number {
    let width = 0;
    for (let i = 0; i < text.length; i++) {
      const glyph = glyphs[text[i]!];
      if (!glyph) continue;
      width += glyph[0]!.length;
      if (i < text.length - 1) width += spacing;
    }
    return width;
  }

  drawTextCentered(
    text: string,
    glyphs: Readonly<Record<string, readonly string[]>>,
    y: number,
    color: string,
    spacing = 1,
  ): void {
    const textWidth = this.measureText(text, glyphs, spacing);
    const x = Math.floor((this.width - textWidth) / 2);
    this.drawText(text, glyphs, x, y, color, spacing);
  }

  clone(): Matrix {
    const copy = new Matrix(this.width, this.height);
    copy.buffer.pixels.set(this.buffer.pixels);
    return copy;
  }
}
