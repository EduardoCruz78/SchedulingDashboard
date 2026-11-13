# 0003. Server Components for reads, Server Actions for writes, no client data cache

- Status: accepted
- Date: 2026-11-13

## Context

An admin dashboard must not show stale data, must work with slow (cold-starting) APIs, and should not
ship a client-side data layer it does not need. Next.js 16 enables Cache Components by default: content
is prerendered unless it reads request data, and caching is opt-in with `use cache`.

## Decision

- Reads happen in Server Components inside `<Suspense>`; nothing from the APIs uses `use cache`.
- Writes are Server Actions that re-check the session, call the API and `refresh()` the route.
- Filters and pagination live in the URL (`searchParams`), read by the Server Component.
- Client state only where it is real: forms (`useActionState`), dialogs, optimistic switches
  (`useOptimistic`) and the live feed (polling).
- No TanStack Query: the server already is the data layer, and there is no cache to synchronize.

## Consequences

- The static shell (navigation, headings, skeletons) is instant; data streams per section, so one slow
  API does not block the page.
- Every navigation fetches fresh data. For an admin tool that is the point; a public, high-traffic page
  would instead cache with tags and `updateTag`.
- Reading the clock or cookies must happen inside Suspense (`connection()`), which the dev overlay and
  the build enforce.
