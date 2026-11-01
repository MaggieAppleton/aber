export type EditPatch = Record<string, unknown>;
export type EditOperation = { fields: string[]; save: () => Promise<unknown> };
type Entry = { patch: EditPatch; commands:Record<string,string>; failed: boolean; timer?: ReturnType<typeof setTimeout>; running?: Promise<void> };

/** Retains desired fields until each corresponding operation is acknowledged. */
export class EditQueue {
  private entries = new Map<string, Entry>();
  constructor(private options: { operations: (key: string, patch: EditPatch, commands:Record<string,string>) => EditOperation[]; changed: (key: string) => void; delay?: number }) {}

  overlay(key: string): EditPatch { return this.entries.get(key)?.patch ?? {}; }
  failedCount() { return [...this.entries.values()].filter(entry => entry.failed).length; }

  set(key: string, patch: EditPatch) {
    const entry = this.entries.get(key) ?? { patch: {}, commands:{}, failed: false };
    for(const field of Object.keys(patch))entry.commands[field]=crypto.randomUUID();
    entry.patch = { ...entry.patch, ...patch }; entry.failed = false;
    this.entries.set(key, entry); this.cancelTimer(entry);
    entry.timer = setTimeout(() => { void this.flushOne(key); }, this.options.delay ?? 600);
    this.options.changed(key);
  }

  async flush(key?: string) {
    await Promise.all((key ? [key] : [...this.entries.keys()]).map(item => this.flushOne(item)));
  }

  async retryFailed() {
    await Promise.all([...this.entries].filter(([, entry]) => entry.failed).map(([key]) => this.flushOne(key)));
  }

  private cancelTimer(entry: Entry) { clearTimeout(entry.timer); entry.timer = undefined; }

  private acknowledge(entry: Entry, commands:Record<string,string>, fields: string[]) {
    // A newer value remains dirty even if the earlier request just succeeded.
    for (const field of fields) if (entry.commands[field] === commands[field]) {delete entry.patch[field];delete entry.commands[field];}
  }

  private flushOne(key: string): Promise<void> {
    const entry = this.entries.get(key);
    if (!entry) return Promise.resolve();
    if (entry.running) return entry.running;
    this.cancelTimer(entry); entry.failed = false;
    const save = async () => {
      try {
        while (Object.keys(entry.patch).length) {
          const snapshot = { ...entry.patch },commands={...entry.commands},operations = this.options.operations(key, snapshot,commands);
          for (const operation of operations) {
            await operation.save();
            this.acknowledge(entry, commands, operation.fields);
            this.options.changed(key);
          }
          const stored = new Set(operations.flatMap(operation => operation.fields));
          this.acknowledge(entry, commands, Object.keys(snapshot).filter(field => !stored.has(field)));
        }
      } catch {
        // The persistence adapter reports the error. Retain fields for a user retry.
        entry.failed = true; this.cancelTimer(entry);
      } finally {
        entry.running = undefined;
        if (!Object.keys(entry.patch).length) { this.cancelTimer(entry); this.entries.delete(key); }
        this.options.changed(key);
      }
    };
    entry.running = Promise.resolve().then(save);
    return entry.running;
  }
}
