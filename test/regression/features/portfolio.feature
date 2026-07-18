Feature: Portfolio API

  Scenario: Get user portfolio
    Given the API is running at "http://127.0.0.1:3000/api"
    When I request the portfolio for user 1
    Then the response should contain availableCash and positions
