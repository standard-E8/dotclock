import type { Matrix } from '../render/matrix.js';

/** マトリクスに何を描くかを決めるロジック層のインターフェース */
export interface Scene {
  readonly id: string;
  /** 次回の更新が必要な時刻 (ms)。null なら更新不要 */
  nextUpdateAt(now: number): number | null;
  /** マトリクスへフレームを合成 */
  render(matrix: Matrix, now: number): void;
}
