# 0001. Backend for frontend instead of calling the APIs from the browser

- Status: accepted
- Date: 2026-11-13

## Context

The dashboard needs two credentials: the admin's JWT for the SchedulingApi and an admin API key for the
WebhookRelay. The relay key must never be in a browser. Keeping the JWT in `localStorage` exposes it to
any XSS, and calling the APIs from the browser would also need CORS on both.

## Decision

Next.js is the backend for frontend. The browser talks only to the dashboard; Server Components and
Server Actions call the APIs from the server. The JWT lives encrypted in an `httpOnly` cookie; the relay
key lives in server configuration. The BFF exposes an **allow list** of operations (one Server Action
per use case), never a generic proxy that forwards any path.

## Consequences

- No token readable by JavaScript; no CORS; the relay key cannot leak to the client.
- One extra hop per request, and the BFF must enforce authorization itself (`requireAdmin()` in every
  read and action) and its own rate limit (the API sees only the BFF's IPs).
- Demo-mode rules can be enforced in one place (see `docs/security.md`).
