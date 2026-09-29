// The event log is how the engine talks to the UI. Engine functions resolve synchronously and
// append events here; the UI drains the log and animates it. Nothing in the engine waits on
// the UI, so rule order can never depend on animation timing.

export function emit(c, type, data = {}) {
  c.log.push({ type, ...data });
}

/** Removes and returns every event emitted since the last drain. */
export function drain(c) {
  const events = c.log;
  c.log = [];
  return events;
}
