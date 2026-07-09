# Task 19 WhatsApp CRM Live UAT Attempt

Date: 2026-06-24

Status: Not accepted. Real-device UAT was not executed because the live WhatsApp/Supabase runtime prerequisites are not fully available in this Codex session.

Deployment context reviewed:

- Vercel team: `elite-meat-s-projects`
- Inspected likely project: `frozen-pork-whatsapp-bot`
- Latest inspected production deployment: `frozen-pork-whatsapp-ba3gy1txy-elite-meat-s-projects.vercel.app`
- Vercel deployment listing on 2026-06-24 shows the newest first-page production deployment for `frozen-pork-whatsapp-bot` is about 14 days old, so the current ERP CRM build is not proven deployed there.
- Local readiness check result: source readiness passed, live credential setup incomplete

Secret handling:

- No access tokens, app secrets, service-role keys, customer phone numbers, or private messages were printed or committed.
- No screenshots with customer data were captured because real phone UAT did not run.

Blocking prerequisites:

- Exact CRM deployment env names are not confirmed/configured in the inspected production env: `WHATSAPP_VERIFY_TOKEN`, `WHATSAPP_APP_SECRET`, `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_GRAPH_API_VERSION`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.
- Local runtime only exposes `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` among the required Task 19 live env groups.
- Public access to the inspected deployment webhook path is blocked by Vercel Authentication, so Meta cannot verify the callback URL as-is.
- The readiness helper now supports `WHATSAPP_CRM_DEPLOYMENT_URL`; when pointed at the inspected Vercel URL, it reports `blocked by deployment authentication; Meta webhook verification cannot reach this URL`.
- Authenticated `vercel curl` reached the inspected deployment through a generated protection bypass token, but the deployment returned `Cannot GET /api/whatsapp/webhook`; this workspace does contain `app/api/whatsapp/webhook/route.ts`, so the live URL appears stale, pointed at the wrong project/deployment, or not redeployed with the CRM webhook route.
- Account mapping can now be checked with `node scripts\whatsapp-crm-account-mapping-readiness.mjs` after live Supabase service-role env is available; locally it does not check rows because `SUPABASE_SERVICE_ROLE_KEY` is not configured.
- Real webhook challenge readiness can now be checked with `node scripts\whatsapp-crm-webhook-challenge-check.mjs` after a public deployment URL and verify token are available; locally it does not run because those env values are not configured.
- Duplicate webhook idempotency can now be checked with `node scripts\whatsapp-crm-duplicate-webhook-replay.mjs` after a public deployment URL, app secret, UAT phone-number ID, and approved tester phone are available; locally it does not post because those env values are not configured.
- Synthetic media/location webhook handling can now be checked with `node scripts\whatsapp-crm-media-webhook-replay.mjs` after a public deployment URL, app secret, UAT phone-number ID, and approved tester phone are available; locally it does not post because those env values are not configured.
- Outgoing send readiness can now be checked with `node scripts\whatsapp-crm-outgoing-send-readiness.mjs` after live Supabase service-role env and WhatsApp token are available; locally it does not check rows because `SUPABASE_SERVICE_ROLE_KEY` is not configured.
- Failed-send evidence can now be checked with `node scripts\whatsapp-crm-failed-send-evidence.mjs` after a controlled browser failure test; locally it does not check rows because `SUPABASE_SERVICE_ROLE_KEY` is not configured.
- Meta app dashboard access and webhook configuration could not be operated from this session.
- Real tester phones and company WhatsApp device flow were not available to Codex.
- The `whatsapp_accounts.phone_number_id` mapping in the target Supabase database was not verified live.

## Scenario Results

| # | Scenario | Expected result | Result | Evidence / notes |
|---|---|---|---|---|
| 1 | Real customer sends text to company WhatsApp number | Text appears in CRM inbox and chat | Not run | Blocked by missing live WhatsApp webhook/env/device access |
| 2 | Staff replies from CRM | Customer receives reply in WhatsApp | Not run | Blocked by missing live access token/runtime env and tester phone |
| 3 | Customer sends image | CRM handles image safely | Not run | Blocked by missing live phone/webhook test |
| 4 | Customer sends document/file | CRM handles file safely | Not run | Blocked by missing live phone/webhook test |
| 5 | Customer sends voice/audio | CRM handles audio safely | Not run | Blocked by missing live phone/webhook test |
| 6 | Customer sends location | CRM handles location safely | Not run | Blocked by missing live phone/webhook test |
| 7 | Customer messages second WhatsApp number | Correct account routing | Not run | Blocked by missing second-number live routing test and Supabase account mapping verification |
| 8 | Duplicate webhook payload replay | No duplicate CRM message | Not run | Source hardening exists; live/staging replay was not possible without configured webhook target and payload |
| 9 | Failed outgoing message | CRM shows clear failed state | Not run | Source coverage exists; controlled live failure was not executed |
| 10 | Customer auto-assignment | Previous staff/fallback assignment works | Not run | Source coverage exists; live message assignment was not executed |
| 11 | Owner dashboard after real message | Metrics update after live activity | Not run | Source coverage exists; live message activity was not executed |
| 12 | Mobile layout after live message | Mobile flow remains usable | Not run | Source coverage exists; real phone screenshot was not captured |
| 13 | Desktop layout after live message | Desktop 3-column layout remains usable | Not run | Source coverage exists; live desktop screenshot was not captured |

## Conclusion

The live UAT checklist remains open. WhatsApp CRM cannot be marked ready for limited internal UAT until the correct current CRM deployment is publicly reachable at `/api/whatsapp/webhook`, deployment env vars are configured, Meta webhook verification succeeds, phone-number mapping is verified, and the real-device scenarios above are rerun with masked screenshots/notes.
