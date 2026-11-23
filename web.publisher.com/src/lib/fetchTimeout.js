/** Race a promise against a timeout so cold API calls don't hang the UI forever. */
export function withTimeout(promise, ms, message = 'Request timed out. Try again.') {
  const timeoutMs = Math.max(1_000, Number(ms) || 20_000)
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(
        () =>
          reject(
            Object.assign(new Error(message), {
              timedOut: true,
            }),
          ),
        timeoutMs,
      )
    }),
  ])
}
