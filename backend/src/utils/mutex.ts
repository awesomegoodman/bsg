import { AppError } from './errors.js';

export class Mutex {
  private tail: Promise<unknown> = Promise.resolve();
  private pending = 0;
  async run<T>(operation: () => Promise<T>): Promise<T> {
    if (this.pending >= 100)
      throw new AppError(
        503,
        'BUSY',
        'The welcome desk is busy. Please try again shortly.',
      );
    this.pending++;
    const task = this.tail.then(operation);
    this.tail = task.catch(() => undefined);
    try {
      return await task;
    } finally {
      this.pending--;
    }
  }
}
