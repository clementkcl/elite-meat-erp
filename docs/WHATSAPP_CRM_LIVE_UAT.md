# WhatsApp CRM Live UAT

This checklist is for Task 16: proving the Phase 1 WhatsApp CRM with real Meta WhatsApp Cloud API traffic and real devices.

Do not paste access tokens, app secrets, customer private messages, or phone screenshots with sensitive data into this file. Store screenshots in `docs/qa-evidence/whatsapp-crm-live-uat/` with sensitive details masked where needed.

## Current Run Status

- Date: 2026-06-24
- Status: Task 19 live execution attempted, not accepted yet
- Reason: Codex session cannot complete real-device UAT without live Meta app access, loaded WhatsApp/Supabase server credentials in the deployment/runtime, confirmed `whatsapp_accounts.phone_number_id` rows, and tester phones.
- Code readiness: Covered by `scripts/whatsapp-crm-live-uat-readiness.mjs` and the existing WhatsApp CRM coverage scripts.
- Latest evidence note: `docs/qa-evidence/whatsapp-crm-live-uat/task-19-attempt-2026-06-24.md`

## Required Live Setup

1. Deploy the current CRM build to a public HTTPS URL. The webhook path `/api/whatsapp/webhook` must be reachable by Meta without Vercel Authentication or any browser-only protection.
2. Configure server-only environment variables in the deployment:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `WHATSAPP_ACCESS_TOKEN` or legacy `WHATSAPP_CLOUD_API_TOKEN` / `WHATSAPP_TOKEN`
   - `WHATSAPP_GRAPH_API_VERSION` or legacy `WHATSAPP_CLOUD_API_VERSION`
   - `WHATSAPP_VERIFY_TOKEN` or legacy `WHATSAPP_WEBHOOK_VERIFY_TOKEN` / `VERIFY_TOKEN`
   - `WHATSAPP_APP_SECRET` is recommended for webhook signature verification.
   - Optional local readiness helper: `WHATSAPP_CRM_DEPLOYMENT_URL` can be set to the public deployment URL so `node scripts\whatsapp-crm-live-uat-readiness.mjs` checks whether the webhook path is publicly reachable using a fake verify token.
3. In Meta Developer settings, set the WhatsApp webhook callback URL to:
   - `<deployment-url>/api/whatsapp/webhook`
4. Use the same verify token value in Meta and the deployment environment.
5. Subscribe the webhook to WhatsApp message and status events.
6. Confirm each company WhatsApp number exists in `whatsapp_accounts` with the correct `phone_number_id`.
7. Confirm CRM users and roles are seeded for owner/admin/staff testing.

Optional mapping check:

- Set `WHATSAPP_EXPECTED_PHONE_NUMBER_IDS` to the comma-separated Meta `phone_number_id` values expected for UAT.
- Run `node scripts\whatsapp-crm-account-mapping-readiness.mjs` in the live/staging runtime.
- The script reports counts and masked IDs only; it does not print Supabase keys, customer phone numbers, or private messages.

Optional webhook challenge check:

- Set `WHATSAPP_CRM_DEPLOYMENT_URL` and the same verify token env used by the deployment, such as `WHATSAPP_VERIFY_TOKEN`.
- Run `node scripts\whatsapp-crm-webhook-challenge-check.mjs` before entering the Meta dashboard value.
- The script expects the real token to echo a one-time challenge and a fake token to return route-level `403 Forbidden`; it does not print the verify token.

Optional duplicate replay check:

- Run the mapping and challenge checks first.
- Set `WHATSAPP_UAT_PHONE_NUMBER_ID` to the Meta `phone_number_id` being tested and `WHATSAPP_UAT_CUSTOMER_PHONE` to a tester phone number approved for UAT.
- Ensure `WHATSAPP_APP_SECRET` matches the deployment webhook app secret.
- Run `node scripts\whatsapp-crm-duplicate-webhook-replay.mjs`.
- The script posts the same signed synthetic webhook payload twice and expects the second payload to be skipped as a duplicate. It may create one synthetic UAT customer/message in the target CRM database.

Optional media/location replay check:

- Run the mapping and challenge checks first.
- Set `WHATSAPP_UAT_PHONE_NUMBER_ID` to the Meta `phone_number_id` being tested and `WHATSAPP_UAT_CUSTOMER_PHONE` to a tester phone number approved for UAT.
- Ensure `WHATSAPP_APP_SECRET` matches the deployment webhook app secret.
- Run `node scripts\whatsapp-crm-media-webhook-replay.mjs`.
- The script posts signed synthetic image, document, audio, and location webhook messages and expects them to be stored or safely identified as duplicates. It may create synthetic UAT messages in the target CRM database.

Optional outgoing-send readiness check:

- Run the mapping check first and make sure at least one tester customer exists in CRM.
- Set `WHATSAPP_UAT_CUSTOMER_ID` when you want to check a specific CRM customer for browser send UAT.
- Run `node scripts\whatsapp-crm-outgoing-send-readiness.mjs` in the live/staging runtime.
- The script verifies live env and CRM customer/account linkage only. It does not send a WhatsApp message; the actual send must still be done through the authenticated CRM UI by approved staff.

Optional failed-send evidence check:

- Run a controlled browser failure test from the CRM UI, such as a staging-only invalid tester number or intentionally revoked staging token.
- Set `WHATSAPP_UAT_CUSTOMER_ID` to narrow the check to the tested customer.
- Optionally set `WHATSAPP_UAT_FAILED_AFTER` to an ISO timestamp from just before the test.
- Run `node scripts\whatsapp-crm-failed-send-evidence.mjs` in the live/staging runtime.
- The script verifies that a failed outbound CRM message exists and stores a failed reason. It does not print message body or customer phone number.

## Live Evidence Table

| # | Scenario | Expected result | Pass/Fail | Evidence note or screenshot path | Time |
|---|---|---|---|---|---|
| 1 | Real customer sends text to company WhatsApp number | Text appears in CRM inbox and chat | Not run | Pending live device test |  |
| 2 | Staff replies from CRM | Reply reaches the real customer WhatsApp chat | Not run | Pending live device test |  |
| 3 | Customer sends image | Image message is stored and displayed safely, or clearly labelled if media preview is unavailable | Not run | Pending live device test |  |
| 4 | Customer sends file/document | File message is stored and displayed safely, or clearly labelled if download is unavailable | Not run | Pending live device test |  |
| 5 | Customer sends audio/voice note | Audio message is stored and displayed safely, or clearly labelled if playback is unavailable | Not run | Pending live device test |  |
| 6 | Customer sends location | Location message is stored and displayed safely with location label/coordinates | Not run | Pending live device test |  |
| 7 | Customer messages second company WhatsApp number | Message routes to the matching WhatsApp account/customer context | Not run | Pending live device test |  |
| 8 | Same webhook event is replayed | Duplicate CRM message is not created | Not run | Pending live duplicate webhook replay |  |
| 9 | Outgoing send fails, such as invalid number or revoked token in staging | CRM shows `failed to send` and a useful failed reason is stored | Not run | Pending controlled failure test |  |
| 10 | Customer auto-assignment | Existing customer stays assigned to previous handling staff; new customer goes to fallback/admin queue | Not run | Pending live customer test |  |
| 11 | Owner dashboard after live message | Waiting/new-message/response metrics update after incoming and outgoing activity | Not run | Pending dashboard screenshot |  |
| 12 | Mobile layout after live message | Customer list -> chat -> profile/order drawer remains usable on phone width | Not run | Pending mobile screenshot |  |
| 13 | Desktop layout after live message | 3-column customer list, chat, and CRM panel remain usable | Not run | Pending desktop screenshot |  |

## Pass Criteria

Task 16 can be accepted only after all required live scenarios above are marked Pass or have an explicit approved Phase 1 limitation. The current prepared state is not enough for acceptance because it does not prove real WhatsApp delivery.

## Known Phase 1 Limitations To Watch

- Location sending from CRM is intentionally not supported yet for live outbound sends; it should fail clearly instead of silently pretending to send.
- Media display depends on whether the app stores only WhatsApp media IDs or also implements authenticated media download. For Phase 1, safe labelling is acceptable if previews/downloads are not built.
- Staff response ranking is still attributed by outbound sender name because CRM messages do not yet store staff user id.
