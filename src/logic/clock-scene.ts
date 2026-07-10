import { GLYPHS_5X3, GLYPH_HEIGHT } from '../render/fonts.js';
import type { Matrix } from '../render/matrix.js';
import type { Scene } from './scene.js';

export interface ClockOptions {
  use24Hour?: boolean;
  blinkColon?: boolean;
  leadingZero?: boolean;
  /** 表示色 (ロジック側で指定) */
  color?: string;
}

const DIGIT_ANIM_MS = 320;
const ANIM_FRAME_MS = 16;

interface DigitSlotState {
  char: string;
  from: string | null;
  animStart: number | null;
}

export class ClockScene implements Scene {
  readonly id = 'clock';

  private readonly use24Hour: boolean;
  private readonly blinkColon: boolean;
  private readonly leadingZero: boolean;
  private readonly color: string;
  private colonVisible = true;
  private readonly digitSlots = new Map<number, DigitSlotState>();

  constructor(options: ClockOptions = {}) {
    this.use24Hour = options.use24Hour ?? true;
    this.blinkColon = options.blinkColon ?? true;
    this.leadingZero = options.leadingZero ?? true;
    this.color = options.color ?? '#ffffff';
  }

  nextUpdateAt(now: number): number {
    const date = new Date(now);
    const ms = date.getMilliseconds();
    const sec = date.getSeconds();

    let next = Number.POSITIVE_INFINITY;

    if (this.hasActiveDigitAnimation(now)) {
      next = now + ANIM_FRAME_MS;
    }

    if (this.blinkColon) {
      const nextBlink = now + (500 - (now % 500));
      if (sec === 59) {
        const nextMinute = now + (1000 - ms);
        next = Math.min(next, nextBlink, nextMinute);
      } else {
        next = Math.min(next, nextBlink);
      }
    } else {
      next = Math.min(next, now + (60 - sec) * 1000 - ms);
    }

    return next;
  }

  render(matrix: Matrix, now: number): void {
    const date = new Date(now);

    if (this.blinkColon) {
      this.colonVisible = Math.floor(now / 500) % 2 === 0;
    } else {
      this.colonVisible = true;
    }

    matrix.clear();

    const { hours, minutes } = this.formatTimeParts(date);
    const hourStr = this.leadingZero
      ? String(hours).padStart(2, '0')
      : String(hours);
    const minStr = String(minutes).padStart(2, '0');
    const timeStr = `${hourStr}:${minStr}`;
    const displayStr = this.colonVisible
      ? timeStr
      : timeStr.replace(':', '¦');

    const slotY = Math.floor((matrix.height - GLYPH_HEIGHT) / 2);
    this.drawTimeWithSlots(matrix, displayStr, slotY, now);
  }

  private hasActiveDigitAnimation(now: number): boolean {
    for (const state of this.digitSlots.values()) {
      if (state.animStart !== null && now - state.animStart < DIGIT_ANIM_MS) {
        return true;
      }
    }
    return false;
  }

  private drawTimeWithSlots(
    matrix: Matrix,
    text: string,
    slotY: number,
    now: number,
  ): void {
    const spacing = 1;
    const textWidth = matrix.measureText(text, GLYPHS_5X3, spacing);
    let x = Math.floor((matrix.width - textWidth) / 2);

    for (let i = 0; i < text.length; i++) {
      const char = text[i]!;
      const glyph = GLYPHS_5X3[char];
      if (!glyph) continue;

      if (this.isDigit(char)) {
        this.drawDigitSlot(matrix, i, char, glyph, x, slotY, now);
      } else {
        matrix.drawGlyph(glyph, x, slotY, this.color);
      }

      x += glyph[0]!.length + spacing;
    }
  }

  private isDigit(char: string): boolean {
    return char >= '0' && char <= '9';
  }

  private drawDigitSlot(
    matrix: Matrix,
    index: number,
    char: string,
    glyph: readonly string[],
    x: number,
    slotY: number,
    now: number,
  ): void {
    let state = this.digitSlots.get(index);
    if (!state) {
      state = { char, from: null, animStart: null };
      this.digitSlots.set(index, state);
    } else if (state.char !== char) {
      state.from = state.char;
      state.char = char;
      state.animStart = now;
    }

    const progress =
      state.animStart === null
        ? 1
        : Math.min(1, (now - state.animStart) / DIGIT_ANIM_MS);

    if (progress >= 1) {
      state.from = null;
      state.animStart = null;
      matrix.drawGlyphInSlot(glyph, x, slotY, GLYPH_HEIGHT, 0, this.color);
      return;
    }

    const offset = progress * GLYPH_HEIGHT;

    if (state.from) {
      const fromGlyph = GLYPHS_5X3[state.from];
      if (fromGlyph) {
        matrix.drawGlyphInSlot(
          fromGlyph,
          x,
          slotY,
          GLYPH_HEIGHT,
          offset,
          this.color,
        );
      }
    }

    matrix.drawGlyphInSlot(
      glyph,
      x,
      slotY,
      GLYPH_HEIGHT,
      offset - GLYPH_HEIGHT,
      this.color,
    );
  }

  private formatTimeParts(date: Date): { hours: number; minutes: number } {
    let hours = date.getHours();
    const minutes = date.getMinutes();

    if (!this.use24Hour) {
      hours = hours % 12 || 12;
    }

    return { hours, minutes };
  }
}
