import { readPixel } from './color.js';
import { buffersEqual, type DisplayConfig, type FrameBuffer } from './types.js';

/** 入力色 → 基準色への係数 */
const DOT_BASE_SCALE = 0.9;
/** 基準色 → 外側塗り色への係数 */
const DOT_OUTER_SCALE = 0.9;
/** 内側正方形の一辺 (ドットサイズ比) */
const DOT_INNER_RATIO = 0.75;
/** 内側正方形の境界ぼかし (0=くっきり, 1=外周までフェード) */
const DOT_INNER_EDGE_FEATHER = 0.2;
/** 上→中央の影の強さ (0=なし, 1=黒) */
const DOT_TOP_SHADOW_DARKEN = 0.4;

/** FrameBuffer を Canvas に描画 (描画専用レイヤー) */
export class CanvasRenderer {
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private readonly config: DisplayConfig;
  private lastBuffer: FrameBuffer | null = null;
  private dotSize = 1;

  constructor(canvas: HTMLCanvasElement, config: DisplayConfig) {
    this.canvas = canvas;
    this.config = config;
    const ctx = canvas.getContext('2d', {
      alpha: false,
      desynchronized: true,
    });
    if (!ctx) throw new Error('Canvas 2D context unavailable');
    this.ctx = ctx;
    this.resize();
  }

  get displayConfig(): DisplayConfig {
    return this.config;
  }

  resize(): void {
    const { width, height, dotGap } = this.config;
    const padding = dotGap * 2;
    const cssW = window.innerWidth;
    this.dotSize = (cssW - padding * 2 - (width - 1) * dotGap) / width;

    const matrixW = width * this.dotSize + (width - 1) * dotGap;
    const matrixH = height * this.dotSize + (height - 1) * dotGap;
    const cssH = matrixH + padding * 2;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = Math.round(cssW * dpr);
    this.canvas.height = Math.round(cssH * dpr);
    this.canvas.style.width = `${cssW}px`;
    this.canvas.style.height = `${cssH}px`;

    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.lastBuffer = null;
  }

  render(buffer: FrameBuffer, force = false): boolean {
    if (!force && this.lastBuffer && buffersEqual(this.lastBuffer, buffer)) {
      return false;
    }

    const { dotGap, backgroundColor, dotRadiusRatio } = this.config;
    const { width, height, pixels } = buffer;
    const dotSize = this.dotSize;
    const matrixW = width * dotSize + (width - 1) * dotGap;
    const matrixH = height * dotSize + (height - 1) * dotGap;
    const padding = dotGap * 2;
    const radius = dotSize * dotRadiusRatio;
    const cssW = window.innerWidth;
    const cssH = matrixH + padding * 2;

    const ctx = this.ctx;
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, cssW, cssH);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const [r, g, b, a] = readPixel(pixels, width, x, y);
        if (a === 0) continue;

        const px = padding + x * (dotSize + dotGap);
        const py = padding + y * (dotSize + dotGap);
        this.drawDot(px, py, dotSize, radius, r, g, b, a / 255);
      }
    }

    if (
      !this.lastBuffer ||
      this.lastBuffer.width !== buffer.width ||
      this.lastBuffer.height !== buffer.height
    ) {
      this.lastBuffer = {
        width: buffer.width,
        height: buffer.height,
        pixels: new Uint8ClampedArray(buffer.pixels),
      };
    } else {
      this.lastBuffer.pixels.set(buffer.pixels);
    }

    return true;
  }

  private drawDot(
    px: number,
    py: number,
    dotSize: number,
    radius: number,
    r: number,
    g: number,
    b: number,
    a: number,
  ): void {
    const ctx = this.ctx;
    const cx = px + dotSize / 2;
    const cy = py + dotSize / 2;

    // ① 最大値を若干抑える
    const baseR = r * DOT_BASE_SCALE;
    const baseG = g * DOT_BASE_SCALE;
    const baseB = b * DOT_BASE_SCALE;

    // ② 暗めにして全体を塗る
    const outerR = baseR * DOT_OUTER_SCALE;
    const outerG = baseG * DOT_OUTER_SCALE;
    const outerB = baseB * DOT_OUTER_SCALE;
    ctx.fillStyle = `rgba(${Math.round(outerR)}, ${Math.round(outerG)}, ${Math.round(outerB)}, ${a})`;
    ctx.beginPath();
    ctx.roundRect(px, py, dotSize, dotSize, radius);
    ctx.fill();

    // ③ 内側の小さい正方形を塗る（境界は外側色へフェード）
    const innerSize = dotSize * DOT_INNER_RATIO;
    const innerX = px + (dotSize - innerSize) / 2;
    const innerY = py + (dotSize - innerSize) / 2;
    const baseColor = `rgba(${Math.round(baseR)}, ${Math.round(baseG)}, ${Math.round(baseB)}, ${a})`;
    const outerColor = `rgba(${Math.round(outerR)}, ${Math.round(outerG)}, ${Math.round(outerB)}, ${a})`;

    this.fillFeatheredRect(
      innerX,
      innerY,
      innerSize,
      baseColor,
      outerColor,
      DOT_INNER_EDGE_FEATHER,
    );

    // ④ 上→中央へ影
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(px, py, dotSize, dotSize, radius);
    ctx.clip();

    const shade = Math.round(255 * (1 - DOT_TOP_SHADOW_DARKEN));
    const topGrad = ctx.createLinearGradient(cx, py, cx, cy);
    topGrad.addColorStop(0, `rgb(${shade}, ${shade}, ${shade})`);
    topGrad.addColorStop(1, 'rgb(255, 255, 255)');
    ctx.globalCompositeOperation = 'multiply';
    ctx.fillStyle = topGrad;
    ctx.fillRect(px, py, dotSize, dotSize);
    ctx.restore();
  }

  /** 正方形の境界をぼかして塗る (辺は直線のまま、角だけ小さく処理) */
  private fillFeatheredRect(
    x: number,
    y: number,
    size: number,
    baseColor: string,
    outerColor: string,
    feather: number,
  ): void {
    const ctx = this.ctx;
    if (feather <= 0) {
      ctx.fillStyle = baseColor;
      ctx.fillRect(x, y, size, size);
      return;
    }

    const f = (size / 2) * feather;
    if (f < 0.5) {
      ctx.fillStyle = baseColor;
      ctx.fillRect(x, y, size, size);
      return;
    }

    const cx = x + size / 2;
    const cy = y + size / 2;
    const core = size - 2 * f;
    const edgeSpan = core > 0 ? core : size;
    const edgeX = core > 0 ? x + f : x;
    const edgeY = core > 0 ? y + f : y;

    ctx.fillStyle = baseColor;
    if (core > 0) {
      ctx.fillRect(x + f, y + f, core, core);
    }

    const topGrad = ctx.createLinearGradient(cx, y, cx, y + f);
    topGrad.addColorStop(0, outerColor);
    topGrad.addColorStop(1, baseColor);
    ctx.fillStyle = topGrad;
    ctx.fillRect(edgeX, y, edgeSpan, f);

    const bottomGrad = ctx.createLinearGradient(cx, y + size - f, cx, y + size);
    bottomGrad.addColorStop(0, baseColor);
    bottomGrad.addColorStop(1, outerColor);
    ctx.fillStyle = bottomGrad;
    ctx.fillRect(edgeX, y + size - f, edgeSpan, f);

    const leftGrad = ctx.createLinearGradient(x, cy, x + f, cy);
    leftGrad.addColorStop(0, outerColor);
    leftGrad.addColorStop(1, baseColor);
    ctx.fillStyle = leftGrad;
    ctx.fillRect(x, edgeY, f, edgeSpan);

    const rightGrad = ctx.createLinearGradient(x + size - f, cy, x + size, cy);
    rightGrad.addColorStop(0, baseColor);
    rightGrad.addColorStop(1, outerColor);
    ctx.fillStyle = rightGrad;
    ctx.fillRect(x + size - f, edgeY, f, edgeSpan);

    this.fillFeatheredCorner(x, y, x, y, f, baseColor, outerColor);
    this.fillFeatheredCorner(x + size, y, x + size - f, y, f, baseColor, outerColor);
    this.fillFeatheredCorner(x, y + size, x, y + size - f, f, baseColor, outerColor);
    this.fillFeatheredCorner(
      x + size,
      y + size,
      x + size - f,
      y + size - f,
      f,
      baseColor,
      outerColor,
    );
  }

  private fillFeatheredCorner(
    cornerX: number,
    cornerY: number,
    rectX: number,
    rectY: number,
    f: number,
    baseColor: string,
    outerColor: string,
  ): void {
    const ctx = this.ctx;
    const grad = ctx.createRadialGradient(
      cornerX,
      cornerY,
      0,
      cornerX,
      cornerY,
      f * Math.SQRT2,
    );
    grad.addColorStop(0, outerColor);
    grad.addColorStop(1, baseColor);
    ctx.fillStyle = grad;
    ctx.fillRect(rectX, rectY, f, f);
  }

  invalidate(): void {
    this.lastBuffer = null;
  }
}
