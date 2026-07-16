/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access */
import { Given, When, Then } from '@cucumber/cucumber';
import axios from 'axios';
import * as assert from 'assert';

let baseUrl = '';
let response: any = null;
let lastInstrumentId: number | null = null;

Given('the API is running at {string}', async function (url: string) {
  baseUrl = url;
  try {
    const res = await axios.get(`${baseUrl}/health`, { timeout: 2000 });
    if (res.status !== 200 || res.data?.status !== 'ok') {
      throw new Error(`Health check failed. The DB or API might be down. Status: ${res.status}`);
    }
  } catch (error: any) {
    throw new Error(
      `\n\n======================================================\n` +
      ` FATAL ERROR: API IS NOT RESPONDING\n` +
      `======================================================\n` +
      `Cannot connect to the API at ${baseUrl}.\n` +
      `Make sure the server and database are running before executing blackbox tests:\n` +
      `  1. docker-compose up -d db\n` +
      `  2. npm run start:dev\n\n` +
      `Original Error: ${error.message || error.code || String(error)}\n` +
      `======================================================\n\n`
    );
  }
});

When('I search for {string}', async function (ticker: string) {
  try {
    const res = await axios.get(`${baseUrl}/instruments?q=${ticker}`);
    response = res.data;
  } catch (error: any) {
    response = error.response;
  }
});

Then(
  'the response should contain {string} as an instrument',
  function (ticker: string) {
    assert.ok(response, 'Expected a successful response');
    assert.ok(response.data, 'Expected response to have a data property');
    assert.ok(response.data.length > 0, 'Expected data array to not be empty');

    const instrument = response.data[0];
    assert.strictEqual(
      instrument.ticker,
      ticker,
      `Expected ticker to be ${ticker}, got ${instrument.ticker}`,
    );

    lastInstrumentId = instrument.id; // Save for later steps
  },
);

When('I request the portfolio for user {int}', async function (userId: number) {
  try {
    const res = await axios.get(`${baseUrl}/portfolio/${userId}`);
    response = res.data;
  } catch (error: any) {
    response = error.response;
  }
});

Then('the response should contain availableCash and positions', function () {
  assert.ok(response, 'Expected a successful response');
  assert.ok(
    'availableCash' in response,
    'Expected portfolio to have availableCash',
  );
  assert.ok('positions' in response, 'Expected portfolio to have positions');
});

When(
  'I place a limit BUY order for {string} with size {int} and price {int}',
  async function (ticker: string, size: number, price: number) {
    // We need to look up the instrument ID first if it's not set
    let instrumentId = lastInstrumentId;

    if (!instrumentId) {
      const res = await axios.get(`${baseUrl}/instruments?q=${ticker}`);
      instrumentId = res.data.data[0].id;
    }

    const payload = {
      instrumentId,
      userId: 1,
      size,
      price,
      type: 'LIMIT',
      side: 'BUY',
    };

    try {
      const res = await axios.post(`${baseUrl}/orders`, payload);
      response = res.data;
    } catch (error: any) {
      response = error.response;
    }
  },
);

Then('the order should be created successfully', function () {
  assert.ok(response, 'Expected a successful response but got an error');
  assert.ok(response.id, 'Expected response to contain the created order ID');
});

Then('the order should be created but marked as REJECTED', function () {
  assert.ok(response, 'Expected a successful response but got an error');
  assert.strictEqual(
    response.status,
    'REJECTED',
    `Expected status to be REJECTED, got ${response.status}`,
  );
});
