Feature: Trading API Live Tests

  Scenario: Search for instruments
    Given the API is running at "http://localhost:3000/api"
    When I search for "GGAL"
    Then the response should contain "GGAL" as an instrument

  Scenario: Get user portfolio
    Given the API is running at "http://localhost:3000/api"
    When I request the portfolio for user 1
    Then the response should contain availableCash and positions

  Scenario: Create a funded order successfully
    Given the API is running at "http://localhost:3000/api"
    When I place a limit BUY order for "GGAL" with size 1 and price 100
    Then the order should be created successfully

  Scenario: Reject order for insufficient funds
    Given the API is running at "http://localhost:3000/api"
    When I place a limit BUY order for "GGAL" with size 1000000 and price 20000
    Then the order should be created but marked as REJECTED
