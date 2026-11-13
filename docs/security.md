# Security

## Secrets never reach the browser

| Secret                         | Where it lives                         | Who uses it                                |
| ------------------------------ | -------------------------------------- | ------------------------------------------ |
| SchedulingApi JWT of the admin | encrypted session cookie (`httpOnly`)  | the BFF, server side                       |
| WebhookRelay admin key         | `WEBHOOK_RELAY_ADMIN_KEY` (server env) | the BFF, only after an admin session check |
| Session key                    | `SESSION_SECRET`                       | sealing/unsealing the cookie               |
| Webhook secret                 | `WEBHOOK_SECRET`                       | verifying incoming webhooks                |
| Database URL                   | `DATABASE_URL`                         | Drizzle, server side                       |

- No variable has the `NEXT_PUBLIC_` prefix, so none is inlined into client bundles.
- Modules that read them import `server-only`: a Client Component importing one breaks the build.
- The environment is validated with Zod when the server boots (`instrumentation.ts`).

## Session

- After `POST /api/auth/login` and `GET /api/auth/me` (role must be `Admin`), the API's JWT and the admin's
  display data are **encrypted** into a JWE (A256GCM, key = SHA-256 of `SESSION_SECRET`): the browser
  stores a token it cannot read.
- Cookie: `httpOnly` (no JavaScript access, so an XSS cannot steal it), `Secure` in production,
  `SameSite=Lax`, `Path=/`, expires with the JWT.
- Checks: `proxy.ts` only redirects visitors without a cookie (optimistic); `requireAdmin()` decrypts and
  checks expiry and role in every read and every Server Action; the API validates the JWT again. A 401
  from the API clears the cookie and sends the user to the login page.
- After login, `next` is only followed when it is a same-site path (no open redirect).

## CSRF

- Writes are Server Actions: always `POST`, and Next.js rejects an action whose `Origin` does not match
  the host.
- `SameSite=Lax` keeps the session cookie off cross-site POSTs anyway.
- The one state-changing `GET` is `/auth/signout` (a redirect target after a 401). A malicious page could
  sign an admin out; nothing else. The sign-out button itself is a Server Action.

## Rate limiting behind a BFF

The SchedulingApi limits logins per IP, but behind the BFF every login comes from Vercel's IPs: its limit
would block everyone at once or protect no one. The BFF therefore limits failed sign-ins **per visitor**:
5 failures in a sliding 15-minute window, counted in Postgres (serverless instances do not share
memory). The visitor IP comes from `x-real-ip` / `x-forwarded-for`, which Vercel's edge sets (a value
sent by the client is overwritten), and is stored only as an HMAC.

## Incoming webhooks

`POST /api/webhooks/webhook-relay` is public; the signature is the authentication.

1. Raw body (the HMAC covers the exact bytes), at most 256 KB.
2. `standardwebhooks` verification: HMAC-SHA256 of `id.timestamp.body`, constant-time comparison, any of
   the `v1,` signatures (secret rotation), timestamp within 5 minutes (a captured request cannot be
   replayed later because the timestamp is signed).
3. JSON parsed and validated only after verification.
4. Stored with `ON CONFLICT (webhook_id) DO NOTHING`: at-least-once redeliveries are acknowledged, not duplicated.

## Demo mode (`DEMO_MODE=true`)

The SchedulingApi demo credentials are public, so anyone can sign in to the public demo. The relay admin
key is not public, but the dashboard holds it: without limits, any visitor could use the dashboard to
make the relay send requests anywhere. In demo mode:

- relay subscriptions are read-only (no create, no pause/resume);
- only `dead` deliveries of the dashboard's **own** subscription (`RELAY_SUBSCRIPTION_ID`) can be
  replayed, and they can only reach the dashboard itself;
- SchedulingApi actions keep working: the API itself is public with those credentials.

The rules live in `src/lib/demo.ts` and are enforced **in the Server Actions**, against the delivery as
the relay reports it at that moment. Hiding the buttons is only UX.

## Headers

`X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy:
strict-origin-when-cross-origin`, a restrictive `Permissions-Policy`, and no `X-Powered-By`.
`robots.txt` disallows indexing.
