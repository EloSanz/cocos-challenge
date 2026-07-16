// tsarch's `toPassAsync` matcher is async, but its jest type augmentation is
// not recognized as Thenable by the linter, so `await` on it is flagged as a
// false positive. Disabled at file level since every assertion here uses it.
/* eslint-disable @typescript-eslint/await-thenable */
import 'tsarch/dist/jest';
import { filesOfProject } from 'tsarch';

describe('Clean Architecture Boundaries', () => {
  // Architecture tests analyze the whole AST, so they need a bit more time
  jest.setTimeout(60000);

  it('controllers should not depend on entities (use DTOs instead)', async () => {
    const rule = filesOfProject()
      .inFolder('src')
      .matchingPattern('.*\\.controller\\.ts$')
      .shouldNot()
      .dependOnFiles()
      .matchingPattern('.*\\.entity\\.ts$');

    await expect(rule).toPassAsync();
  });

  it('controllers should not depend directly on repositories', async () => {
    const rule = filesOfProject()
      .inFolder('src')
      .matchingPattern('.*\\.controller\\.ts$')
      .shouldNot()
      .dependOnFiles()
      .matchingPattern('.*\\.repository\\.ts$');

    await expect(rule).toPassAsync();
  });

  it('services should not depend on controllers', async () => {
    const rule = filesOfProject()
      .inFolder('src')
      .matchingPattern('.*\\.service\\.ts$')
      .shouldNot()
      .dependOnFiles()
      .matchingPattern('.*\\.controller\\.ts$');

    await expect(rule).toPassAsync();
  });

  it('domain logic (services/interfaces) should not depend on transport adapters (filters)', async () => {
    const rule = filesOfProject()
      .inFolder('src')
      .matchingPattern('.*(service\\.ts|interface\\.ts)$')
      .shouldNot()
      .dependOnFiles()
      .matchingPattern('.*\\.filter\\.ts$');

    await expect(rule).toPassAsync();
  });

  it('services and service interfaces should not depend on transport DTOs', async () => {
    const rule = filesOfProject()
      .inFolder('src')
      .matchingPattern('.*(service\\.impl\\.ts|service\\.interface\\.ts)$')
      .shouldNot()
      .dependOnFiles()
      .matchingPattern('.*\\.dto\\.ts$');

    await expect(rule).toPassAsync();
  });
});
