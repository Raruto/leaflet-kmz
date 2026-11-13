Feature: GroundOverlay compatibility

  @issue-22
  Scenario Outline: GroundOverlay images align with Web Mercator for Leaflet "<version>"
    Then a GroundOverlay image is reprojected for Leaflet "<version>"

    Examples:
      | version      |
      | 1.9.4        |
      | 2.0.0-beta.3 |
