# Stock QA Evidence Log

Last updated: 2026-06-23

Use this file to record real Supabase, RLS, device, and workflow evidence before calling the Stock module ready for internal pilot use. Do not mark a row as passed from demo-mode data only.

Use `docs/STOCK_COMPLETION_AUDIT.md` to compare local automated evidence with the manual evidence still required.

## Test Run Details

| Field | Evidence |
| --- | --- |
| Tester | TODO |
| Date | TODO |
| Branch / commit | TODO |
| App URL | TODO |
| Supabase project | TODO |
| Migration range applied | TODO |
| Seed status | TODO |
| `npm.cmd run smoke` | TODO |
| `npm.cmd run lint` | TODO |
| `npm.cmd run typecheck` | TODO |
| `npm.cmd run build` | TODO |

## 2026-06-23 Stock Mobile QA Refresh

Scope:

- Stock module mobile QA preparation only.
- No app feature changes, migrations, Supabase SQL, seed, deployment, camera permission, printer action, or production data change was performed in this pass.
- Real 390px phone/browser QA could not be completed from this Codex environment, so the physical-device checks remain owner/manual QA.

Local checks completed:

- `npm.cmd run smoke` - passed.
- `npm.cmd run lint` - passed.
- `npm.cmd run typecheck` - passed.
- `npm.cmd run build` - passed.

Prepared / source-guarded QA coverage:

- Stock home six worker buttons.
- Inbound session setup, continuous scanning UI, saved count, saved total weight, and previous scan display.
- Duplicate barcode blocked warning.
- No-weight barcode blocked warning and label-generation guidance.
- Label generation, print/PDF fallback, and stock-unit label reprint.
- Outbound by order and direct outbound worker flows.
- Damage/spoilage request copy and approval-only behavior.
- Transfer and receive-transfer wrong-location block copy.
- Stock take progress and unknown-barcode exception copy.
- Online-only scanner blocking message: `Connection lost. Please reconnect before scanning.`

Manual QA still required:

- Sign in on Vercel or local app as a real Stock worker and test around 390px width.
- Test real phone camera permission, rear-camera behavior, scanner close/stream stop, and manual barcode fallback.
- Test Bluetooth label printer path and PDF fallback output.
- Test live Supabase/RLS-backed stock workflows and fill the acceptance evidence rows below.

## 2026-06-23 Stock Mobile QA Preparation

Environment:

- Local app was already responding on `http://127.0.0.1:3000`.
- Browser automation could not be launched from this Codex Windows sandbox. The node/browser runner failed with: `CreateProcessAsUserW failed: 5`.
- Real phone camera and Bluetooth label printer testing were not possible from this session.
- No live Supabase migration, seed, production data change, or deploy was run.

Prepared evidence:

| Mobile QA item | Source / automation evidence | Manual owner QA still required |
| --- | --- | --- |
| Stock home buttons | `scripts/stock-mobile-ux-coverage.mjs` checks the six worker buttons: Inbound, Outbound, Transfer, Receive, Return / Damage, Stock Take. | Open `/stock` at about 390px as a general worker and confirm tap targets and no horizontal scrolling. |
| Inbound session | Source guard checks recent templates, product search, larger Stock workflow inputs, finish session, session lock wording, saved count, saved weight, previous scan, and 390px layout markers. | Inbound 2-3 real test barcodes and confirm item + brand + origin + location lock after first saved scan. |
| Continuous scanning UI | Source guard checks continuous scanner copy, full-width large scan button on phone widths, larger manual fallback input, large scanner close buttons, wrapped long barcode display, accessible success/warning/error announcements, success vibration, worker-friendly camera errors, and session counters. | On a phone, scan multiple barcodes without restarting the scanner and confirm the scanner stays ready. |
| Duplicate warning | Source guard checks `Duplicate barcode. Inbound is blocked.`, the red blocked/error session list, and duplicate prevention remains in server-side stock actions. | Scan the same test barcode twice and confirm a short red warning and no second stock unit. |
| No-weight warning | Source guard checks `No weight found. Generate an internal label, print it, then attach it.` | Scan a no-weight barcode and confirm save is blocked until label generation. |
| Label generation | Source guard checks generated label/reprint copy, phone-width print/PDF action labels, full-width touch targets, Code 128 SVG barcode rendering, and numeric label expectations. | Enter a weight, generate the internal label, confirm stock auto-saves, print/PDF the 50mm x 30mm label, and scan the printed Code 128 barcode back into the app. |
| Label reprint | Source guard checks stock-unit detail has `Print label`, `PDF fallback`, and uses the same full-width mobile print controls and Code 128 barcode renderer without a reason field. | Open `/stock/units/[id]` on a phone and reprint without entering a reason, then scan the reprinted barcode. |
| Outbound by order | Source guard checks order selection, `Select order first.`, substitution warning, no typed reason copy, and announced red blocked panels for missing/blocked/wrong-destination barcodes. | Select a ready order, scan matching and substitute barcodes, and confirm warnings are readable at 390px. |
| Direct outbound | Source guard checks Sales, Processing, Transfer, Sample/Testing, Damage/Spoilage, and Return Supplier mobile copy. | Confirm direct Sales has no customer field, Sample/Testing has no photo, and remarks are still required. |
| Damage/spoilage request | Source guard checks photo-required approval-only copy and stock action checks preserve approval flow. | Submit a damage request with photo/reference and verify stock is not deducted until approval. |
| Transfer | Source guard checks transfer mobile copy, stock-location wording, active-location transfer migration, larger Stock form touch targets, and role/scope coverage checks server-side access guards. | Select destination stock location, scan one barcode, confirm `TRANSFER_PENDING`, and confirm wrong-location receive is still blocked at 390px width. |
| Receive-transfer wrong-location block | Smoke coverage checks strict wrong-location receive-transfer blocking. | Receive at the wrong location and confirm `Wrong location. This barcode must be received at [destination location].` |
| Stock take progress | Source guard checks barcode progress and weight progress copy. | Start a session and confirm scanned count/weight progress is readable at 390px. |
| Unknown barcode exception | Source guard checks unknown-barcode exception copy and stock-take exception scripts. | Scan an unknown barcode and confirm it is recorded as exception, not active stock. |
| Online-only connection message | Source guard checks the shared alert message `Connection lost. Please reconnect before scanning.`, alert semantics, and online-status guards. | Turn off internet on a phone and confirm inbound, outbound, transfer, receive-transfer, return/damage, and stock-take scans are blocked. |

Conclusion:

- Local source and smoke coverage are prepared for the requested Stock mobile QA items.
- Real 390px authenticated browser/device evidence is still required because browser automation and physical devices were unavailable in this session.
- The owner should use `docs/STOCK_TEST_LIST_FOR_OWNER.md` and `docs/STOCK_REMOTE_QA_VERCEL.md` to capture screenshots/video notes from Vercel or local app.

## 2026-06-23 Codex Mobile QA Run

Scope:

- Stock module only.
- Requested 390px mobile checks were prepared and source-guarded locally.
- No live Supabase migration, seed, production data change, deployment, camera permission approval, or printer action was performed.

What was checked locally:

- `/stock` route responds locally.
- Stock mobile source coverage includes the six worker home buttons, worker-hidden finance/report/settings content, inbound scan context, continuous scanning UI, duplicate/no-weight messages, label generation/reprint copy, outbound order/direct modes, damage/spoilage approval-only messaging, transfer/receive-transfer wording, stock-take progress/exception wording, and online-only scan blocking.
- Scanner and Stock form source coverage include large phone-width scan/manual controls, worker-friendly camera errors, accessible success/warning/error announcements, stream cleanup, close controls, continuous scan hooks, recent scan list hooks, and wrapped long-barcode display.
- Existing owner QA docs include manual steps for phone camera and Bluetooth/PDF label testing.

Browser/device limitation:

- Local browser automation could not launch from the Windows sandbox. The runtime returned `CreateProcessAsUserW failed: 5`.
- Real authenticated 390px visual QA, phone camera QA, laptop camera QA, Bluetooth label printer QA, and live Supabase RLS/workflow QA remain manual owner checks.

Command results for this run:

- `node scripts\stock-mobile-ux-coverage.mjs` - passed.
- `node scripts\stock-scanner-coverage.mjs` - passed.
- `node scripts\stock-owner-qa-doc-coverage.mjs` - passed.
- Later Stock scanner accessibility re-run:
  - `node scripts\stock-scanner-coverage.mjs` - passed.
  - `node scripts\stock-mobile-ux-coverage.mjs` - passed.
  - `npm.cmd run smoke` - failed before the Stock chain on an Orders smoke assertion: `Order data must expose scope options and only offer active stock items for new order lines`.
  - `npm.cmd run lint` - passed with existing non-Stock warnings in `components/delivery/manager-delivery-dashboard.tsx` and `lib/orders/data.ts`.
  - `npm.cmd run typecheck` - failed in `lib/orders/data.ts` on order status/manual-reason typing.
  - `npm.cmd run build` - compiled successfully, then failed during TypeScript for the same `lib/orders/data.ts` status typing issue.
- Later inbound duplicate blocked-state re-run:
  - `node scripts\stock-mobile-ux-coverage.mjs` - passed.
  - `node scripts\stock-scanner-coverage.mjs` - passed.
  - `npm.cmd run smoke` - failed before the Stock chain on the same Orders smoke assertion.
  - `npm.cmd run lint` - passed with one existing non-Stock warning in `lib/orders/data.ts`.
  - `npm.cmd run typecheck` - failed in `lib/orders/data.ts` on order status/manual-reason typing.
  - `npm.cmd run build` - failed before typecheck on an Orders syntax error in `lib/orders/actions.ts`: `Nullish coalescing operator(??) requires parens when mixing with logical operators`.
- Later Stock form feedback announcement re-run:
  - `node scripts\stock-mobile-ux-coverage.mjs` - passed.
  - `node scripts\stock-scanner-coverage.mjs` - passed.
  - `npm.cmd run smoke` - failed before the Stock chain on an Orders assertion: `Order action missing: addCustomerOrderItemAction`.
  - `npm.cmd run lint` - passed with one existing non-Stock warning in `lib/orders/data.ts`.
  - `npm.cmd run typecheck` - failed in Orders files because exported order actions are missing, `??` is mixed with `||` in `lib/orders/actions.ts`, and `lib/orders/data.ts` has status/manual-reason typing errors.
  - `npm.cmd run build` - failed before typecheck on the same Orders syntax error in `lib/orders/actions.ts`: `Nullish coalescing operator(??) requires parens when mixing with logical operators`.
- Later shared offline alert re-run:
  - `node scripts\stock-scanner-coverage.mjs` - passed.
  - `node scripts\stock-mobile-ux-coverage.mjs` - passed.
  - `npm.cmd run smoke` - failed before the Stock chain on the same Orders assertion: `Order action missing: addCustomerOrderItemAction`.
  - `npm.cmd run lint` - passed with existing non-Stock warnings in `lib/delivery/actions.ts`.
  - `npm.cmd run typecheck` - failed in non-Stock files: `lib/orders/actions.ts` mixes `??` with `||`, and `lib/orders/data.ts` has linked-delivery proof-status typing errors.
  - `npm.cmd run build` - failed before typecheck on the same Orders syntax error in `lib/orders/actions.ts`: `Nullish coalescing operator(??) requires parens when mixing with logical operators`.
- Later outbound blocked-alert re-run:
  - `node scripts\stock-mobile-ux-coverage.mjs` - passed.
  - `node scripts\stock-scanner-coverage.mjs` - passed.
  - `npm.cmd run smoke` - failed before the Stock chain on a non-Stock Orders assertion: `Orders data loader must only use demo fallback when Supabase is not configured and surface real query errors`.
  - `npm.cmd run lint` - passed.
  - `npm.cmd run typecheck` - passed.
  - `npm.cmd run build` - passed.
- Later Stock workflow input touch-target re-run:
  - `node scripts\stock-mobile-ux-coverage.mjs` - passed.
  - `node scripts\stock-scanner-coverage.mjs` - passed.
  - `npm.cmd run smoke` - passed after updating stale Stock coverage checks to the current blocked duplicate/session wording.
  - `npm.cmd run lint` - passed.
  - `npm.cmd run typecheck` - passed.
  - `npm.cmd run build` - passed.
- Later 390px browser attempt:
  - Local `/stock` returned HTTP 200.
  - In-app browser automation could not launch from the Windows sandbox and returned `CreateProcessAsUserW failed: 5`.
  - No live Supabase data, camera permission, or printer action was touched.
  - Real authenticated 390px visual QA remains manual owner/device QA.
  - `npm.cmd run smoke` - passed.
  - `npm.cmd run lint` - passed.
  - `npm.cmd run typecheck` - passed.
  - `npm.cmd run build` - passed.
- Later Stock label mobile print/reprint touch-target re-run:
  - `node scripts\stock-label-coverage.mjs` - passed.
  - `node scripts\stock-mobile-ux-coverage.mjs` - passed.
  - `npm.cmd run smoke` - passed.
  - `npm.cmd run lint` - passed.
  - `npm.cmd run typecheck` - passed.
  - `npm.cmd run build` - passed.
  - No live Supabase data, camera permission, Bluetooth printer action, PDF output, migration, seed, deployment, or production data was touched.
  - Real phone Bluetooth print-sheet and PDF-save QA remains manual owner/device QA.
- Later Stock Code 128 label rendering pass:
  - Replaced decorative label stripe art with local Code 128 SVG barcode rendering for label preview, print, PDF fallback, and stock-unit reprint.
  - `node scripts\stock-label-coverage.mjs` - passed.
  - `npx.cmd tsc --noEmit --pretty false` - passed.
  - `npm.cmd run smoke` - passed.
  - `npm.cmd run lint` - passed.
  - `npm.cmd run typecheck` - passed.
  - `npm.cmd run build` - passed.
  - Real printed-label scanner readability still needs owner/device QA with the actual label printer and scanner/camera.

Current QA status by requested item:

| Requested mobile QA item | Codex local status | Owner/manual status |
| --- | --- | --- |
| Stock home buttons | Source guarded | Test on `/stock` at 390px as a worker |
| Inbound session | Source guarded | Test real session with migrated Supabase data |
| Continuous scanning UI | Source guarded | Test phone camera/manual fallback |
| Duplicate warning | Source guarded | Scan same barcode twice |
| No-weight warning | Source guarded | Scan no-weight barcode and confirm label guidance |
| Label generation | Source guarded | Generate label, confirm stock auto-save, print/PDF, and scan the printed Code 128 barcode |
| Label reprint | Source guarded | Reprint from `/stock/units/[id]` and scan the reprinted barcode |
| Outbound by order | Source guarded | Test ready order with matching/substitute barcodes |
| Direct outbound | Source guarded | Test Sales, Processing, Transfer, Sample/Testing, Damage/Spoilage, Return Supplier |
| Damage/spoilage request | Source guarded | Confirm request only, no immediate deduction |
| Transfer | Source guarded | Confirm `TRANSFER_PENDING` and no immediate location change |
| Receive-transfer wrong-location block | Source guarded | Confirm exact wrong-location message |
| Stock take progress | Source guarded | Confirm count and weight progress |
| Unknown barcode exception | Source guarded | Confirm exception is recorded, not immediately stocked |
| Online-only connection message | Source guarded | Turn off internet and confirm scan/save blocking |

## Acceptance Test Evidence

| # | Test | Status | User / role | Route | Database evidence | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Inbound scan works | TODO | TODO | `/stock/inbound` | `stock_units`, `stock_movements`, `barcode_scan_logs`, `audit_logs` | Confirm barcode stock unit is created atomically with correct item, brand, origin, weight, location, and inbound date. |
| 2 | Duplicate barcode blocked | TODO | TODO | `/stock/inbound` | No second `stock_units` row; failed scan log if available | Confirm staff sees a clear duplicate warning, manual save is disabled, and camera auto-save does not submit the known duplicate. |
| 3 | Barcode weight rule saved/reused | TODO | TODO | `/stock/inbound` | `barcode_weight_rules` by item + brand + origin | Confirm rule save is atomic with successful inbound, and GS1 `3102`/`3103`, position rules, fixed-weight fallback, and manual confirmation behavior. |
| 4 | Barcode label printing works | TODO | TODO | `/stock/inbound`, `/stock/units/[id]` | Unique numeric generated barcode | Confirm 50mm x 30mm label PDF/print with company, product, weight, and machine-readable Code 128 barcode. |
| 5 | Order-based outbound works | TODO | TODO | `/stock/outbound` | `stock_outbound_batches`, `stock_outbound_batch_lines`, movements, scan logs | Confirm multiple items under one order, warning-only requested/scanned differences, and substitution recording. |
| 6 | Transfer/receive works | TODO | TODO | `/stock/transfer`, `/stock/receive-transfer` | Unit status/location, `stock_movements`, `barcode_scan_logs`, `audit_logs` | Confirm transfer and receive are atomic, scanned-out transfer becomes `TRANSFER_PENDING`, cannot be cancelled, and location changes only after receive scan. |
| 7 | Damage/spoilage approval works | TODO | TODO | `/stock/outbound` or stock request surface | Damage request, photo path, manager review, director approval, `OUTBOUND_SPOILED` | Confirm reasons: expired, broken packaging, smell, wrong temperature, customer rejected, or other. |
| 8 | Stock take approval works | TODO | TODO | `/stock/stock-take` | Scoped session, scanned lines, missing-barcode variance lines, manager signature, director signature, adjustment movement | Confirm lock applies only to selected item + brand in selected location and missing expected barcodes are adjusted out only after director approval. |
| 9 | No-barcode-to-barcode flow works | TODO | TODO | `/stock/no-barcode-inbound`, `/stock/inbound` | Generated numeric barcode then normal barcode inbound | Confirm loose no-barcode inbound is not used for new MVP stock. |
| 10 | Reports/export work | TODO | TODO | `/stock/reports` | CSV file, print/PDF-ready view, WhatsApp summary | Confirm reports include stock balance, inbound age by item + brand + location, stock take variance, damage/spoilage, and supplier return. |
| 11 | Role/outlet isolation works | TODO | TODO | Stock routes | RLS allowed/denied rows | Confirm non-admin users see only assigned outlet/location; admin/director can see all allowed views. |
| 12 | Mobile scanner works | TODO | TODO | Scanner routes | Device screenshots/video notes | Confirm phone-width 390px, large scan button, manual fallback, recent scan list, permission message, success vibrate/beep where supported, continuous scan on inbound/outbound/stock-take, and stream stop on close. |
| 13 | Automated tests exist | TODO | Local terminal | N/A | Command output | Confirm smoke route, barcode regression, stock acceptance coverage, stock state-transition coverage, stock migration safety, stock role/scope coverage, stock scanner coverage, stock RLS policy coverage, stock seed coverage, stock security/no-service-role coverage, stock item-master coverage, stock label coverage, stock-take warning coverage, and stock report coverage scripts all run. |

## Outbound Workflow Evidence

| Scenario | Status | Evidence |
| --- | --- | --- |
| Order-based outbound scans multiple barcodes continuously, then confirms once | TODO | TODO |
| Order-based outbound allows different items under the same order | TODO | TODO |
| Requested/scanned quantity or weight mismatch shows warning but can continue | TODO | TODO |
| Substitution keeps original ordered item and records substituted scanned item | TODO | TODO |
| Direct outbound supports `SALES`, `TRANSFER`, and `PROCESSING` | TODO | TODO |
| Damage/spoilage uses staff request, manager review, director approval, and photo | TODO | TODO |
| Return supplier uses request and approval workflow before deduction | TODO | TODO |
| Missing barcode is blocked | TODO | TODO; confirm the pre-confirm missing-barcode warning is visible and the server action still blocks if submitted |
| Duplicate barcode in a batch is blocked | TODO | TODO |
| Already-outbounded barcode is blocked | TODO | TODO |
| Wrong-status barcode is blocked | TODO | TODO; confirm the pre-confirm blocked-scan warning is visible and the server action still blocks if submitted |
| Wrong-location barcode is blocked | TODO | TODO |

## Transfer Evidence

| Scenario | Status | Evidence |
| --- | --- | --- |
| Transfer outbound sets `TRANSFER_PENDING` | TODO | TODO |
| Destination receive scan changes location | TODO | TODO |
| Transfer not received after 3 days shows alert | TODO | TODO |
| Transfer cannot be cancelled after scanned out | TODO | TODO |
| Normal return atomically restores `IN_STOCK` with movement, scan-log, and audit-log rows | TODO | TODO |

## Damage And Return Evidence

| Scenario | Status | Evidence |
| --- | --- | --- |
| Damage request requires photo | TODO | TODO |
| Manager review is required before director approval | TODO | TODO |
| Damage and return-supplier approvals reject wrong status or wrong location | TODO | TODO |
| Director approval deducts stock and writes movement | TODO | TODO |
| Customer return after sale goes to `INSPECTION` first, cannot be outbounded, then atomic manager/admin release changes it to `IN_STOCK` with movement, scan-log, and audit-log rows | TODO | TODO |
| Failed delivery return automatically restores linked barcode stock to `IN_STOCK` | TODO | TODO |
| No-barcode failed delivery return is not used for MVP | TODO | TODO |

## Stock Take Evidence

| Scenario | Status | Evidence |
| --- | --- | --- |
| Manager creates stock take session by location and item + brand | TODO | TODO |
| Open stock take blocks inbound/outbound only for selected item + brand in that location | TODO | TODO |
| Barcode-only count is enforced; manual count entry is disabled | TODO | TODO |
| Empty stock take session cannot be submitted | TODO | TODO |
| Empty stock take session cannot be reviewed or approved | TODO | TODO |
| Missing expected barcode in a reviewed stock take becomes variance and `ADJUSTED_OUT` only after director approval | TODO | TODO |
| Staff submit count for manager review | TODO | TODO |
| Manager signature is recorded | TODO | TODO |
| Director signature is recorded | TODO | TODO |
| System applies `STOCK_TAKE_ADJUSTMENT` only after director approval | TODO | TODO |

## RLS / Scope Evidence

| User | Role | Outlet | Stock location | Expected access | Actual result |
| --- | --- | --- | --- | --- | --- |
| TODO | Stock worker | TODO | TODO | Own stock only | TODO |
| TODO | Stock worker | Other outlet | Other location | Denied | TODO |
| TODO | Manager | Own outlet | Own location | Manage own scope | TODO |
| TODO | Admin | All | All | All operational/admin access | TODO |
| TODO | Director | All | All | View/approve, no routine operation | TODO |

## Phone Scanner Evidence

| Device / browser | Route | Camera permission | Rear camera preferred | Manual fallback | Recent scan list | Stream stopped on close | Result |
| --- | --- | --- | --- | --- | --- | --- | --- |
| TODO | `/stock/inbound` | TODO | TODO | TODO | TODO | TODO | TODO |
| TODO | `/stock/outbound` | TODO | TODO | TODO | TODO | TODO | TODO |
| TODO | `/stock/transfer` | TODO | TODO | TODO | TODO | TODO | TODO |
| TODO | `/stock/receive-transfer` | TODO | TODO | TODO | TODO | TODO | TODO |
| TODO | `/stock/return` | TODO | TODO | TODO | TODO | TODO | TODO |
| TODO | `/stock/stock-take` | TODO | TODO | TODO | TODO | TODO | TODO |

## 2026-06-23 Attempted 390px Browser QA

Environment: local Next dev server at `http://127.0.0.1:3000`.

Result:

- Local app responded at `/stock`.
- Authenticated 390px browser QA could not be completed in this Codex session because the browser automation runtime failed to launch in the Windows sandbox with permission error `CreateProcessAsUserW failed: 5`.
- No production data or live Supabase migration was touched.

Evidence captured instead:

- Added source-level guard `scripts/stock-mobile-ux-coverage.mjs`.
- `npm.cmd run smoke` now runs the Stock mobile UX guard.
- The guard checks six-button worker Stock home, no worker finance/value/report/settings content, scan-first Stock worker forms, scanner mobile copy, label reprint copy, and QA-doc 390px requirements.

Remaining manual QA:

- Sign in from Vercel or local app as a stock worker on a real phone around 390px width.
- Test `/stock`, `/stock/inbound`, `/stock/outbound`, `/stock/transfer`, `/stock/receive-transfer`, `/stock/return`, `/stock/stock-take`, and `/stock/units/[id]`.
- Capture screenshots/video notes for camera permission, camera denied message, large Scan Barcode button, manual fallback, no horizontal scrolling, print/PDF label fallback, and blocked/warning states.

## 2026-06-12 Local Route Protection Check

Environment: local Next dev server at `http://127.0.0.1:3000`.

Result:

- `/stock/dashboard` returned `307` redirect to `/login`.
- `/stock/inbound` returned `307` redirect to `/login`.
- `/stock/reports` returned `307` redirect to `/login`.
- `/stock/stock-take` returned `307` redirect to `/login`.

Notes:

- This proves unauthenticated Stock routes are protected in local runtime.
- Authenticated visual QA was not completed in this environment because the in-app browser automation failed with a Windows sandbox permission error.
- Phone/laptop camera QA still needs to be run manually with an authenticated session.

## Desktop Scanner Evidence

| Device / browser | Route | Camera opens | Manual fallback | Label print/export | Result |
| --- | --- | --- | --- | --- | --- |
| TODO | `/stock/inbound` | TODO | TODO | TODO | TODO |
| TODO | `/stock/outbound` | TODO | TODO | N/A | TODO |
| TODO | `/stock/units/[id]` | N/A | N/A | TODO | TODO |

## Final Sign-Off

- [ ] All 13 acceptance tests passed with real evidence.
- [ ] RLS / scope evidence was captured for allowed and denied cases.
- [ ] Phone scanner evidence was captured on a real phone around 390px width.
- [ ] Desktop scanner and label print evidence was captured.
- [ ] No Supabase service-role key is used in frontend environment variables.
- [ ] All migrations were applied in filename order on a fresh Supabase project.
- [ ] `npm.cmd run smoke`, `npm.cmd run lint`, `npm.cmd run typecheck`, and `npm.cmd run build` passed.
- [ ] Remaining limitations were added to `HANDOFF.md`.
