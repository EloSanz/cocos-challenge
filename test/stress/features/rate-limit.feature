Feature: Rate Limiting
  In order to protect the API from abuse
  As a system administrator
  I want to restrict the number of requests a client can make in a given timeframe

  Scenario: Hitting the health endpoint beyond the rate limit
    Given the API is running locally
    When I send 105 requests to the health endpoint concurrently
    Then at least some requests should fail with a 429 Too Many Requests status
