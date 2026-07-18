import { Given, When, Then } from '@cucumber/cucumber';
import axios from 'axios';
import * as assert from 'assert';

const API_URL = 'http://localhost:3000/api/health';

let successCount = 0;
let failedCount = 0;
let status429 = false;

Given('the API is running locally', async function () {
  try {
    const response = await axios.get(API_URL);
    assert.strictEqual(response.status, 200, 'API is not running or healthy');
  } catch {
    assert.fail(
      `Cannot reach API at ${API_URL}. Ensure it is running with 'npm run start:dev'`,
    );
  }
});

When(
  'I send {int} requests to the health endpoint concurrently',
  async function (requestCount: number) {
    successCount = 0;
    failedCount = 0;
    status429 = false;

    // We send them sequentially to ensure the rate limiter increments deterministically
    // without race conditions from massive immediate concurrency, matching the old Python script.
    for (let i = 0; i < requestCount; i++) {
      try {
        const response = await axios.get(API_URL);
        if (response.status === 200) successCount++;
      } catch (error) {
        if (axios.isAxiosError(error) && error.response) {
          if (error.response.status === 429) {
            status429 = true;
            failedCount++;
          } else {
            console.error(`Unexpected status code: ${error.response.status}`);
          }
        } else {
          console.error('Request failed:', error);
        }
      }
    }
  },
);

Then(
  'exactly {int} requests should succeed',
  function (expectedSuccess: number) {
    assert.strictEqual(successCount, expectedSuccess);
  },
);

Then(
  'the remaining {int} requests should fail with a 429 Too Many Requests status',
  function (expectedFailed: number) {
    assert.strictEqual(failedCount, expectedFailed);
    assert.strictEqual(status429, true);
  },
);
