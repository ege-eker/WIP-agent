export interface ProgressEvent {
  message: string;
  details?: Record<string, any>;
}

export class ProgressChannel {
  private queue: ProgressEvent[] = [];
  private resolvers: Array<(event: ProgressEvent | null) => void> = [];
  private closed = false;

  push(event: ProgressEvent): void {
    if (this.closed) return;

    if (this.resolvers.length > 0) {
      const resolver = this.resolvers.shift()!;
      resolver(event);
    } else {
      this.queue.push(event);
    }
  }

  async next(): Promise<ProgressEvent | null> {
    if (this.queue.length > 0) {
      return this.queue.shift()!;
    }

    if (this.closed) {
      return null;
    }

    return new Promise((resolve) => {
      this.resolvers.push(resolve);
    });
  }

  close(): void {
    this.closed = true;
    for (const resolver of this.resolvers) {
      resolver(null);
    }
    this.resolvers = [];
  }

  drain(): ProgressEvent[] {
    const events = [...this.queue];
    this.queue = [];
    return events;
  }
}
