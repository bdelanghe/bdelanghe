Feature: Brand voice
  Canonical Bounded Systems copy. Quoted strings must exist in content/strings.json
  (the content tool checks both directions). @tags scope a scenario to surface types;
  a surface claims tags in its content/surface.json. Untagged = applies everywhere.

  Scenario: The org name is exact
    Then surfaces present the name "Bounded Systems"

  @marketing
  Scenario: The tagline is consistent
    Then surfaces present the tagline "Bounded authority for AI agents"

  @marketing
  Scenario: The one-line description is consistent
    Then surfaces present the description "Capability security for AI agents — authority drawn at the door, not the process or container. Every claim graded against the running code."

  @thesis
  Scenario: The thesis is stated
    Then surfaces present the thesis "Draw the boundary at the door — a scope-bounded set of capabilities an agent acts through, not the process, not the container."
