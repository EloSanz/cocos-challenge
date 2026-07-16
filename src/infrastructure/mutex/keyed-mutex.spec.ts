import { KeyedMutex } from './keyed-mutex';
import { ResourceLockedException } from '../../common/exceptions/domain.exceptions';

describe('KeyedMutex', () => {
  let mutex: KeyedMutex;

  beforeEach(() => {
    mutex = new KeyedMutex();
  });

  it('allows acquiring a free lock', async () => {
    const release = await mutex.acquire('user:1');
    expect(release).toBeDefined();
    await release();
  });

  it('throws ResourceLockedException if the key is already locked', async () => {
    const release = await mutex.acquire('user:1');

    await expect(mutex.acquire('user:1')).rejects.toThrow(
      ResourceLockedException,
    );

    await release();
  });

  it('allows acquiring the lock again after it is released', async () => {
    const release1 = await mutex.acquire('user:1');
    await release1();

    const release2 = await mutex.acquire('user:1');
    expect(release2).toBeDefined();
    await release2();
  });

  it('lets tasks with different keys acquire locks concurrently', async () => {
    const release1 = await mutex.acquire('user:1');
    const release2 = await mutex.acquire('user:2');

    expect(release1).toBeDefined();
    expect(release2).toBeDefined();

    await release1();
    await release2();
  });
});
