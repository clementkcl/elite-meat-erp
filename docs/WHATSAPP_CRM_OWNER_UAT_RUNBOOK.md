# WhatsApp CRM Owner UAT Runbook

Date: 2026-06-24

Use this runbook when owner/admin is ready to run live WhatsApp Cloud API UAT with real tester phones. It does not replace `docs/WHATSAPP_CRM_LIVE_UAT.md`; it gives the execution order and stop conditions for the live session.

Do not paste access tokens, app secrets, Supabase service-role keys, customer phone numbers, or private message content into docs, screenshots, chat, or commits.

## Current Decision

Code readiness is complete enough for live UAT execution.

Limited internal UAT is not accepted yet because real WhatsApp traffic, public webhook access, WhatsApp account mapping, and masked evidence are still missing.

## People Needed

- Owner/admin with access to the deployed app, Meta Developer dashboard, and Supabase.
- Sales or customer service staff account to send CRM replies.
- At least two tester phones: one for the main WhatsApp number and one for the second-number routing check.
- Account staff account for read-only visibility checks if included in the UAT session.

## Preconditions

- Current CRM build is deployed to the correct public HTTPS URL.
- `/api/whatsapp/webhook` is reachable by Meta without Vercel Authentication or any browser-only protection.
- Deployment environment variables are configured:
  - `WHATSAPP_VERIFY_TOKEN`
  - `WHATSAPP_APP_SECRET`
  - `WHATSAPP_ACCESS_TOKEN`
  - `WHATSAPP_GRAPH_API_VERSION`
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`
- Meta app has WhatsApp webhook access.
- Meta webhook callback URL is set to `<deployment-url>/api/whatsapp/webhook`.
- Every tested Meta `phone_number_id` exists in `whatsapp_accounts`.
- Tester phones are approved for the Meta app or live number being tested.
- Screenshots can be masked before saving under `docs/qa-evidence/whatsapp-crm-live-uat/`.

## Stop Conditions

Stop the live UAT session and fix setup before continuing if any of these fail:

- Public webhook path cannot be reached.
- Real verify token challenge does not echo the challenge.
- Fake verify token does not fail with route-level `403 Forbidden`.
- `whatsapp_accounts.phone_number_id` mapping is missing for a tested company number.
- CRM cannot load for owner/admin and staff accounts.
- A real customer text does not create or update a CRM conversation.

## Execution Order

1. Confirm deployment URL and environment variables.
2. Run `node scripts\whatsapp-crm-live-uat-readiness.mjs`.
3. Run `node scripts\whatsapp-crm-account-mapping-readiness.mjs`.
4. Run `node scripts\whatsapp-crm-webhook-challenge-check.mjs`.
5. In Meta, set webhook callback to `<deployment-url>/api/whatsapp/webhook`.
6. Complete the Meta webhook challenge.
7. Run `node scripts\whatsapp-crm-duplicate-webhook-replay.mjs`.
8. Run `node scripts\whatsapp-crm-media-webhook-replay.mjs`.
9. Run `node scripts\whatsapp-crm-outgoing-send-readiness.mjs`.
10. Log in as staff and send a real CRM reply to a tester phone.
11. Trigger one controlled failed-send test in staging or an approved safe live setup.
12. Run `node scripts\whatsapp-crm-failed-send-evidence.mjs`.
13. Complete the evidence table in `docs/WHATSAPP_CRM_LIVE_UAT.md`.
14. Save masked screenshots and notes under `docs/qa-evidence/whatsapp-crm-live-uat/`.

## Live Scenario Checklist

| # | Scenario | Pass/Fail | Evidence |
|---|---|---|---|
| 1 | Real tester sends text to company WhatsApp number and it appears in CRM |  |  |
| 2 | Staff replies from CRM and tester receives the WhatsApp reply |  |  |
| 3 | Tester sends image and CRM handles it safely |  |  |
| 4 | Tester sends document/file and CRM handles it safely |  |  |
| 5 | Tester sends voice/audio and CRM handles it safely |  |  |
| 6 | Tester sends location and CRM handles it safely |  |  |
| 7 | Tester sends to second company number and CRM routes to correct account |  |  |
| 8 | Duplicate webhook replay does not create duplicate CRM messages |  |  |
| 9 | Failed outgoing message shows clear failed state |  |  |
| 10 | Existing customer keeps previous staff assignment; new customer uses fallback/admin queue |  |  |
| 11 | Owner dashboard updates after live message activity |  |  |
| 12 | Mobile flow remains customer list -> chat -> profile/order drawer |  |  |
| 13 | Desktop layout remains customer list, chat, and CRM panel |  |  |

## Evidence Rules

- Mask customer phone numbers.
- Mask private message content.
- Do not capture access tokens, app secrets, Supabase keys, Meta app secrets, or browser password managers.
- Use short notes when screenshots would expose sensitive information.
- For failed scenarios, record expected result, actual result, suspected cause, and whether it is an approved Phase 1 limitation.

## Phase 1 Limits That Can Be Accepted

- Media messages may show safe placeholders unless secure WhatsApp media download and storage has been added.
- CRM outbound location sending is not part of Phase 1 and should fail clearly if attempted.
- Staff ranking uses outbound sender name because CRM messages do not yet store staff user id.
- Full chatbot, quotation, invoice, payment gateway, and ERP sync are not part of Phase 1.

## Final Decision Rule

Mark WhatsApp CRM Phase 1 as ready for limited internal UAT only when all 13 live scenarios pass or have an explicitly approved Phase 1 limitation, and the evidence is saved with sensitive information masked.
