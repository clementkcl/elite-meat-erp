# WhatsApp CRM Phase 1 UAT Readiness Summary

Date: 2026-06-24

## Final Decision

Not ready for limited internal UAT yet.

The WhatsApp CRM Phase 1 source code and local validation are ready for live UAT execution, but limited internal UAT cannot be accepted until real WhatsApp Cloud API traffic is proven with live credentials, a public Meta-reachable webhook URL, live Supabase configuration, correct WhatsApp account mappings, tester phones, and masked evidence.

## What Is Ready

- Mobile WhatsApp-style flow: customer list -> chat -> profile/order drawer.
- Tablet 2-column layout.
- Desktop 3-column layout with customer list, chat, and CRM panel.
- Owner dashboard metrics source and UI coverage.
- Role-based access coverage for owner, admin, sales, customer service, and account roles.
- WhatsApp webhook source hardening for inbound text, image, document/file, audio, location, status updates, duplicate events, unsupported message types, complaint detection, and phone-number normalization.
- WhatsApp send source flow for staff-approved manual replies and clear failed-send persistence.
- AI Suggest Reply stays approval-based inside the staff reply flow.
- Broadcast price list source flow remains owner/admin controlled.
- Simple order creation/status update source flow remains Phase 1 only.
- Live UAT helper scripts exist for account mapping, webhook challenge, duplicate replay, media/location replay, outgoing send readiness, and failed-send evidence.

## Live UAT Evidence Status

Live real-device UAT is still not completed.

Evidence file:

- `docs/qa-evidence/whatsapp-crm-live-uat/task-19-attempt-2026-06-24.md`

Current evidence states all 13 Task 19 scenarios are `Not run` because live Meta access, live server env vars, a correct public webhook deployment, verified Supabase `whatsapp_accounts.phone_number_id` rows, and tester phones were unavailable in this Codex session.

## Exact Blockers

- Correct deployed CRM project/URL is not confirmed.
- Inspected deployment `frozen-pork-whatsapp-ba3gy1txy-elite-meat-s-projects.vercel.app` is protected by Vercel Authentication, so Meta cannot reach the webhook URL.
- Authenticated Vercel check previously reached a deployment that returned `Cannot GET /api/whatsapp/webhook`, while the current local build does include `/api/whatsapp/webhook`; this suggests the inspected deployment is stale, wrong, or not the current CRM build.
- Live deployment env vars are not confirmed: `WHATSAPP_VERIFY_TOKEN`, `WHATSAPP_APP_SECRET`, `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_GRAPH_API_VERSION`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY`.
- Live Supabase `whatsapp_accounts.phone_number_id` mapping is not verified.
- Meta dashboard webhook challenge is not verified.
- Real incoming/outgoing WhatsApp phone tests are not executed.
- Masked mobile/desktop screenshots or notes for real device UAT are not captured.

## Key Files

- `app/api/whatsapp/webhook/route.ts`
- `app/api/whatsapp/send/route.ts`
- `app/api/whatsapp/ai-suggest/route.ts`
- `app/api/whatsapp/broadcasts/route.ts`
- `app/api/whatsapp/customer-profile/route.ts`
- `app/api/whatsapp/orders/route.ts`
- `components/whatsapp-crm/whatsapp-crm-page.tsx`
- `components/whatsapp-crm/whatsapp-crm-inbox.tsx`
- `lib/whatsapp-crm/cloud-api.ts`
- `lib/whatsapp-crm/webhook.ts`
- `lib/whatsapp-crm/send.ts`
- `lib/whatsapp-crm/dashboard.ts`
- `lib/whatsapp-crm/ai-suggestions.ts`
- `lib/whatsapp-crm/assignments.ts`
- `lib/whatsapp-crm/broadcasts.ts`
- `lib/whatsapp-crm/customers.ts`
- `lib/whatsapp-crm/data.ts`
- `lib/whatsapp-crm/notifications.ts`
- `lib/whatsapp-crm/orders.ts`
- `lib/whatsapp-crm/types.ts`
- `supabase/migrations/202606240003_whatsapp_crm_phase1.sql`
- `docs/WHATSAPP_CRM_LIVE_UAT.md`

## Live UAT Helper Scripts

- `scripts/whatsapp-crm-live-uat-readiness.mjs`
- `scripts/whatsapp-crm-account-mapping-readiness.mjs`
- `scripts/whatsapp-crm-webhook-challenge-check.mjs`
- `scripts/whatsapp-crm-duplicate-webhook-replay.mjs`
- `scripts/whatsapp-crm-media-webhook-replay.mjs`
- `scripts/whatsapp-crm-outgoing-send-readiness.mjs`
- `scripts/whatsapp-crm-failed-send-evidence.mjs`

Recommended live/staging order:

1. Deploy the current CRM build to the correct public URL.
2. Configure live env vars without committing secrets.
3. Run `node scripts\whatsapp-crm-live-uat-readiness.mjs`.
4. Run `node scripts\whatsapp-crm-account-mapping-readiness.mjs`.
5. Run `node scripts\whatsapp-crm-webhook-challenge-check.mjs`.
6. Configure Meta webhook callback to `<deployment-url>/api/whatsapp/webhook`.
7. Run `node scripts\whatsapp-crm-duplicate-webhook-replay.mjs`.
8. Run `node scripts\whatsapp-crm-media-webhook-replay.mjs`.
9. Run `node scripts\whatsapp-crm-outgoing-send-readiness.mjs`.
10. Perform real browser CRM reply test with authorized staff.
11. Run `node scripts\whatsapp-crm-failed-send-evidence.mjs` after a controlled failed-send test.
12. Complete the real-phone evidence table in `docs/WHATSAPP_CRM_LIVE_UAT.md`.

## Phase 1 Limitations

- Staff response ranking currently attributes outbound messages by sender name because CRM messages do not yet store staff user id.
- Media messages may use placeholders unless full secure WhatsApp media download/storage is implemented.
- Location sending from CRM is intentionally unsupported for live outbound sends and should fail clearly.
- Full chatbot, quotation, invoice, payment gateway, and ERP sync are not part of Phase 1.

## Secret Handling

- `.env`, `.env.local`, and `.vercel` are ignored.
- No live access token, app secret, service-role key, customer phone number, or private message was added to this summary.
- `.env.example` contains placeholder/template values only.

## Validation

Final Task 20 validation passed:

- All WhatsApp CRM coverage scripts passed:
  - `whatsapp-crm-ai-suggestion-coverage.mjs`
  - `whatsapp-crm-assignment-coverage.mjs`
  - `whatsapp-crm-auth-coverage.mjs`
  - `whatsapp-crm-broadcast-coverage.mjs`
  - `whatsapp-crm-chat-screen-coverage.mjs`
  - `whatsapp-crm-cloud-api-coverage.mjs`
  - `whatsapp-crm-desktop-layout-coverage.mjs`
  - `whatsapp-crm-mobile-inbox-coverage.mjs`
  - `whatsapp-crm-notification-coverage.mjs`
  - `whatsapp-crm-order-coverage.mjs`
  - `whatsapp-crm-owner-dashboard-coverage.mjs`
  - `whatsapp-crm-profile-coverage.mjs`
  - `whatsapp-crm-send-coverage.mjs`
  - `whatsapp-crm-webhook-coverage.mjs`
- Live helper scripts passed safe local mode:
  - `whatsapp-crm-live-uat-readiness.mjs`
  - `whatsapp-crm-account-mapping-readiness.mjs`
  - `whatsapp-crm-webhook-challenge-check.mjs`
  - `whatsapp-crm-duplicate-webhook-replay.mjs`
  - `whatsapp-crm-media-webhook-replay.mjs`
  - `whatsapp-crm-outgoing-send-readiness.mjs`
  - `whatsapp-crm-failed-send-evidence.mjs`
- `npm.cmd run lint` - passed.
- `npm.cmd run typecheck` - passed.
- `npm.cmd run build` - passed.
- `npm.cmd run smoke` - passed.

## Next Action

Owner/admin should provide or configure the correct public deployment and live credentials, then execute the live helper scripts and the real-phone checklist in `docs/WHATSAPP_CRM_LIVE_UAT.md`. After all 13 scenarios have Pass evidence or an approved Phase 1 limitation, the CRM can be reconsidered for limited internal UAT acceptance.
