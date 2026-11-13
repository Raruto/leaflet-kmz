Feature: Native KMZ extraction
  Scenario: Stored and deflated ZIP entries retain text and embedded images
    Then native ZIP extraction preserves KML and images

  Scenario: Invalid and unsupported ZIP archives reject without hanging
    Then native ZIP extraction rejects invalid and unsupported archives
