# feature-flags Specification

## Purpose
Control capability availability through OpenFeature and prove flag behavior in tests and documentation.
## Requirements
### Requirement: Feature flags through OpenFeature
The platform SHALL evaluate feature flags through the OpenFeature API, with the provider chosen by configuration, so a capability or behavior can be switched on or off without a code change.

#### Scenario: Flag off
- **WHEN** a capability is gated by a flag and the flag evaluates to off
- **THEN** the capability is not served and the response is the documented not-found or unavailable error

#### Scenario: Flag on
- **WHEN** the flag evaluates to on
- **THEN** the capability is served normally

### Requirement: Feature flags are documented and tested
Each flag SHALL be documented with its key, default and effect, and its on and off behavior SHALL be covered by an end-to-end scenario that is generated into the documentation.

#### Scenario: Flag documented
- **WHEN** the documentation is built
- **THEN** every flag has a page with a generated on and off step
