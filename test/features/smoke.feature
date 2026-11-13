@smoke
Feature: Example smoke tests
  Scenario: The examples list is complete
    Then all HTML examples are listed

  Scenario: Development URLs are rewritten only in served HTML
    Then development pages use local bundles without changing example files

  Scenario Outline: An example loads without browser errors
    Then the example "<example>" loads without browser errors

    Examples:
      | example |
      | leaflet-kmz.html |
      | leaflet-kmz_gridlayer.html |
