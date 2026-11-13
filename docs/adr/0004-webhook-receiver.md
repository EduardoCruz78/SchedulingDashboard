# 0004. Receive the relay's webhooks in the dashboard, store them, poll for the feed

- Status: accepted
- Date: 2026-11-13

## Context

The portfolio's story ends when an appointment booked in the SchedulingApi reaches a subscriber through
the WebhookRelay. The dashboard is a natural subscriber and can show it live.

## Decision

- A Route Handler verifies Standard Webhooks signatures (`standardwebhooks`, the same library the relay
  uses in its contract tests) on the raw body, with a 5-minute timestamp tolerance.
- Verified events are stored in Postgres with `webhook_id` as primary key and
  `ON CONFLICT DO NOTHING`, because delivery is at-least-once.
- The `/activity` page polls every 5 seconds (paused while the tab is hidden) instead of using
  Server-Sent Events: functions on Vercel are short-lived, and 5 seconds is live enough here.

## Consequences

- Redeliveries are acknowledged with 2xx and never duplicated; replayed or forged requests get 401.
- The feed costs one small query per open tab every 5 seconds. With many viewers, a push channel
  (SSE on a long-lived server, or a managed realtime service) would be the next step.
