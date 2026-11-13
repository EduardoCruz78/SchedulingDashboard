# 0002. Typed clients generated from versioned OpenAPI contracts

- Status: accepted
- Date: 2026-11-13

## Context

The dashboard consumes two APIs that evolve independently. Hand-written response types drift silently:
the compiler trusts them even when the API changed.

## Decision

- Keep copies of both contracts in `openapi/` (versioned in Git), refreshed with `npm run api:download`.
- Generate TypeScript types with `openapi-typescript` and call the APIs with `openapi-fetch`, so paths,
  parameters, bodies and responses are checked at compile time.
- CI regenerates the types and fails when they differ from the committed ones.
- A weekly workflow downloads the live contracts, regenerates the types and runs the typecheck: a
  breaking change in a deployed API shows up as a compile error at the exact call site.

## Consequences

- Generating the types surfaced two real contract bugs, fixed upstream with tests: the SchedulingApi
  described its enums as integers while sending strings (SchedulingApi#4), and the WebhookRelay document
  had a dangling `$ref` (WebhookRelay#1).
- The contracts must describe the wire format accurately; both APIs now have tests that pin it.
