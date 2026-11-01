/*
 * One toast for the whole app. Capture results already use it; anything else that wants a toast with Undo sends a
 * notice here. The toast host calls `settle` once the notice has gone (timed out, dismissed or replaced), and `undo`
 * if the person pressed Undo or ⌘Z while it was showing. Exactly one of the two runs for each notice.
 */
export type Notice = { text: string; undo?: () => void; settle?: () => void };

const listeners = new Set<(notice: Notice) => void>();

export function onNotice(listener: (notice: Notice) => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

/** Show a notice. With no toast host mounted it settles at once, so nothing waits on a toast nobody can see. */
export function notify(notice: Notice) {
  if (!listeners.size) { notice.settle?.(); return; }
  listeners.forEach(listener => listener(notice));
}
