import { Scheduler } from './scheduler.js';
import { ClockScene } from '../logic/clock-scene.js';
import type { Scene } from '../logic/scene.js';
import { CanvasRenderer } from '../render/canvas-renderer.js';
import { Matrix } from '../render/matrix.js';
import { DEFAULT_DISPLAY_CONFIG } from '../render/types.js';

export class App {
  private readonly canvas: HTMLCanvasElement;
  private readonly renderer: CanvasRenderer;
  private readonly matrix: Matrix;
  private readonly scenes: Scene[];
  private readonly scheduler: Scheduler;
  private activeSceneIndex = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const config = DEFAULT_DISPLAY_CONFIG;
    this.renderer = new CanvasRenderer(canvas, config);
    this.matrix = new Matrix(config.width, config.height);
    this.scenes = [new ClockScene()];

    this.scheduler = new Scheduler(
      (now) => this.tick(now),
      (now) => this.activeScene.nextUpdateAt(now),
    );

    window.addEventListener('resize', this.onResize);
  }

  private get activeScene(): Scene {
    return this.scenes[this.activeSceneIndex]!;
  }

  start(): void {
    this.scheduler.start();
  }

  dispose(): void {
    this.scheduler.dispose();
    window.removeEventListener('resize', this.onResize);
  }

  /** 将来のシーン切替用 */
  setScene(id: string): boolean {
    const index = this.scenes.findIndex((s) => s.id === id);
    if (index < 0) return false;
    this.activeSceneIndex = index;
    this.scheduler.refresh();
    return true;
  }

  addScene(scene: Scene): void {
    this.scenes.push(scene);
  }

  private readonly onResize = (): void => {
    this.renderer.resize();
    this.renderer.invalidate();
    this.scheduler.refresh();
  };

  private tick(now: number): void {
    this.activeScene.render(this.matrix, now);
    this.renderer.render(this.matrix.buffer);
  }
}
