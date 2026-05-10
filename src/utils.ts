export function suspend(t: number, timeoutHandleConsumer?: (handle: ReturnType<typeof setTimeout>) => void) {
  return new Promise<void>(resolve => {
    const handle = setTimeout(() => resolve(), t);
    timeoutHandleConsumer?.(handle);
  });
}
