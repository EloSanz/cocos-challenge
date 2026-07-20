# Stress & Rate Limit Testing

This package contains automated tests to verify the resilience, rate-limiting, and stability of the Cocos Challenge API under load. 
These tests are written in **Cucumber (Behavior-Driven Development)** to provide human-readable scenarios.

## Prerequisites

Because these tests hit the API directly over HTTP, the API **must be running** before you execute them.

1. Start your local development server in a separate terminal:
   ```bash
   npm run start:dev
   ```

2. (Optional but recommended) Ensure your database is running if your application requires it:
   ```bash
   docker-compose up -d db
   ```

## Running the Tests

Once the API is running at `http://localhost:3000`, run the stress tests using the pre-configured npm script:

```bash
npm run test:stress
```

### What does this script do?
It invokes `cucumber-js` with the `stress` profile defined in `test/cucumber.js`. This profile restricts the test runner to only look inside `test/stress/features/` and uses `test/stress/features/step_definitions/` to execute the steps.

## Modifying the Rate Limit Tests
If the API rate limits change (e.g., from 100 req/min to 50 req/min), you must update the scenarios in `rate-limit.feature` to match the new behavior.
