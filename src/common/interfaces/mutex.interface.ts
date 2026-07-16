export const IMutexToken = 'IMutex';

export interface IMutex {
  /**
   * Acquires a lock for the given key.
   * Throws if the lock cannot be acquired (fail-fast try-lock semantics).
   * Returns a release function that MUST be awaited in a `finally` block.
   */
  acquire(key: string): Promise<() => void | Promise<void>>;
}
