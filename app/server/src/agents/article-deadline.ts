/** A single budget covers DNS, all redirects and the final response body. */
export async function withinArticleDeadline<T>(operation: (signal: AbortSignal, check: () => void) => Promise<T>): Promise<T> {
  const controller = new AbortController();
  const error = new Error('Article fetch timed out');
  const expiresAt = performance.now() + 8000;
  const check = () => {
    if (performance.now() >= expiresAt) controller.abort(error);
    controller.signal.throwIfAborted();
  };
  let rejectDeadline!: () => void;
  const expired = new Promise<never>((_, reject) => { rejectDeadline = () => reject(error); });
  controller.signal.addEventListener('abort', rejectDeadline, { once: true });
  const timer = setTimeout(() => controller.abort(error), 8000);
  try {
    return await Promise.race([Promise.resolve().then(() => operation(controller.signal, check)), expired]);
  } finally {
    clearTimeout(timer);
    controller.signal.removeEventListener('abort', rejectDeadline);
    controller.abort(error);
  }
}
