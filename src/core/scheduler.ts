/** 省電力の更新スケジューラ (タブ非表示時は停止) */
export type TickCallback = (now: number) => void;

export class Scheduler {
  private timerId: ReturnType<typeof setTimeout> | null = null;
  private running = false;
  private visible = !document.hidden;
  private nextAt = 0;
  private readonly onTick: TickCallback;
  private readonly getNextUpdate: (now: number) => number | null;

  constructor(
    onTick: TickCallback,
    getNextUpdate: (now: number) => number | null,
  ) {
    this.onTick = onTick;
    this.getNextUpdate = getNextUpdate;

    document.addEventListener('visibilitychange', this.onVisibilityChange);
    window.addEventListener('pagehide', this.onPageHide);
    window.addEventListener('pageshow', this.onPageShow);
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.scheduleNext(Date.now(), true);
  }

  stop(): void {
    this.running = false;
    if (this.timerId !== null) {
      clearTimeout(this.timerId);
      this.timerId = null;
    }
  }

  dispose(): void {
    this.stop();
    document.removeEventListener('visibilitychange', this.onVisibilityChange);
    window.removeEventListener('pagehide', this.onPageHide);
    window.removeEventListener('pageshow', this.onPageShow);
  }

  /** 即時再描画 (リサイズ等) */
  refresh(): void {
    if (!this.running) return;
    if (this.timerId !== null) {
      clearTimeout(this.timerId);
      this.timerId = null;
    }
    this.scheduleNext(Date.now(), true);
  }

  private readonly onVisibilityChange = (): void => {
    this.visible = !document.hidden;
    if (this.visible && this.running) {
      this.refresh();
    } else if (!this.visible && this.timerId !== null) {
      clearTimeout(this.timerId);
      this.timerId = null;
    }
  };

  private readonly onPageHide = (): void => {
    this.visible = false;
    if (this.timerId !== null) {
      clearTimeout(this.timerId);
      this.timerId = null;
    }
  };

  private readonly onPageShow = (): void => {
    this.visible = true;
    if (this.running) this.refresh();
  };

  private scheduleNext(now: number, immediate: boolean): void {
    if (!this.running || !this.visible) return;

    const delay = immediate ? 0 : Math.max(0, this.nextAt - now);

    this.timerId = setTimeout(() => {
      this.timerId = null;
      const tickNow = Date.now();
      this.onTick(tickNow);

      const next = this.getNextUpdate(tickNow);
      if (next === null) return;

      this.nextAt = next;
      this.scheduleNext(tickNow, false);
    }, delay);

    if (immediate) {
      const next = this.getNextUpdate(now);
      this.nextAt = next ?? now + 1000;
    }
  }
}
