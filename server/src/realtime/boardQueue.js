// Per-board FIFO task queue (SAD §3.6 "Serialisation"): one task at a time per board.
export class BoardQueues {
  constructor() {
    this.tails = new Map();
  }

  /** Runs fn after every previously queued task of the board; resolves with fn's result. */
  run(boardId, fn) {
    const key = String(boardId);
    const prev = this.tails.get(key) || Promise.resolve();
    const result = prev.then(fn, fn);
    const tail = result.then(
      () => undefined,
      () => undefined,
    );
    this.tails.set(key, tail);
    tail.then(() => {
      if (this.tails.get(key) === tail) this.tails.delete(key);
    });
    return result;
  }

  /** Resolves when every task queued so far (for all boards) has finished. */
  async idle() {
    while (this.tails.size) await Promise.all([...this.tails.values()]);
  }
}
