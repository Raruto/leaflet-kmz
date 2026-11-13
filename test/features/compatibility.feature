Feature: KML and KMZ compatibility
  Scenario Outline: KML and KMZ layers work with supported Leaflet versions
    Then the "<bundle>" KMZ bundle loads KML and KMZ with Leaflet "<version>"

    Examples:
      | bundle   | version      |
      | readable | 1.9.4        |
      | minified | 1.9.4        |
      | readable | 2.0.0-beta.3 |
      | minified | 2.0.0-beta.3 |
