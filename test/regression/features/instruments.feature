Feature: Instruments API

  Scenario: Search for instruments
    Given the API is running at "http://127.0.0.1:3000/api"
    When I search for "GGAL"
    Then the response should contain "GGAL" as an instrument
