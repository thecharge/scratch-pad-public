# @platform/policy

`DeclarativePolicyEngine` implements the pipeline's `PolicyEngine`. It answers one question, "may this principal invoke this capability?", from the capability's `policy` block: allowed principal kinds, required scopes and any-of roles. Every listed condition must hold. The answer is an allow or deny with a typed `PolicyReason`.

Policy shares only the `Principal` type with masking. It runs before validation, so a denied caller learns nothing about the input (AIP-193: permission before existence). `visibleTo(capability, principal)` uses the same engine to filter MCP tool and skill listings.
