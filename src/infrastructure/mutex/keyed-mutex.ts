import { Injectable } from '@nestjs/common';
import { ResourceLockedException } from '../../common/exceptions/domain.exceptions';
import { IMutex } from '../../common/interfaces/mutex.interface';

/**
 * In-process mutex that prevents concurrent tasks sharing the same key from running.
 *
 * Used to make check-then-act sequences (e.g. balance check + order insert)
 * atomic per user. Implements Try-Lock (Fail-Fast) semantics: if the resource
 * is already locked, it immediately throws instead of queuing.
 * NOTE: this only guarantees exclusion within a single instance.
 */
@Injectable()
export class KeyedMutex implements IMutex {
  private readonly lockedKeys = new Set<string>();

  acquire(key: string): Promise<() => Promise<void>> {
    if (this.lockedKeys.has(key)) {
      return Promise.reject(new ResourceLockedException(`Resource ${key}`));
    }

    this.lockedKeys.add(key);

    return Promise.resolve(() => {
      this.lockedKeys.delete(key);
      return Promise.resolve();
    });
  }
}
