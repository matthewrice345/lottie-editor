export class History<T> {
  private past: T[] = [];
  private present: T;
  private future: T[] = [];
  private readonly cap: number;

  constructor(initial: T, cap = 50) {
    this.present = initial;
    this.cap = cap;
  }

  get current(): T {
    return this.present;
  }

  get canUndo(): boolean {
    return this.past.length > 0;
  }

  get canRedo(): boolean {
    return this.future.length > 0;
  }

  push(next: T): void {
    this.past.push(this.present);
    if (this.past.length > this.cap) this.past.shift();
    this.present = next;
    this.future = [];
  }

  undo(): T | null {
    if (!this.canUndo) return null;
    this.future.unshift(this.present);
    this.present = this.past.pop() as T;
    return this.present;
  }

  redo(): T | null {
    if (!this.canRedo) return null;
    this.past.push(this.present);
    this.present = this.future.shift() as T;
    return this.present;
  }

  reset(initial: T): void {
    this.past = [];
    this.future = [];
    this.present = initial;
  }
}
