# Stock QA Evidence Log

Last updated: 2026-06-12

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

## Acceptance Test Evidence

| # | Test | Status | User / role | Route | Database evidence | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Inbound scan works | TODO | TODO | `/stock/inbound` | `stock_units`, `stock_movements`, `barcode_scan_logs`, `audit_logs` | Confirm barcode stock unit is created atomically with correct item, brand, origin, weight, location, and inbound date. |
| 2 | Duplicate barcode blocked | TODO | TODO | `/stock/inbound` | No second `stock_units` row; failed scan log if available | Confirm staff sees a clear duplicate warning, manual save is disabled, and camera auto-save does not submit the known duplicate. |
| 3 | Barcode weight rule saved/reused | TODO | TODO | `/stock/inbound` | `barcode_weight_rules` by item + brand + origin | Confirm rule save is atomic with successful inbound, and GS1 `3102`/`3103`, position rules, fixed-weight fallback, and manual confirmation behavior. |
| 4 | Barcode label printing works | TODO | TODO | `/stock/inbound`, `/stock/units/[id]` | Unique numeric generated barcode | Confirm 50mm x 30mm label PDF/print with company, product, weight, and barcode. |
| 5 | Order-based outbound works | TODO | TODO | `/stock/outbound` | `stock_outbound_batches`, `stock_outbound_batch_lines`, movements, scan logs | Confirm multiple items under one order, warning-only requested/scanned differences, and substitution recording. |
| 6 | Transfer/receive works | TODO | TODO | `/stock/transfer`, `/stock/receive-transfer` | Unit status/location, `stock_movements`, `barcode_scan_logs`, `audit_logs` | Confirm transfer and receive are atomic, scanned-out transfer becomes `TRANSFER_PENDING`, cannot be cancelled, and location changes only after receive scan. |
| 7 | Damage/spoilage approval works | TODO | TODO | `/stock/outbound` or stock request surface | Damage request, photo path, manager review, director approval, `OUTBOUND_SPOILED` | Confirm reasons: expired, broken packaging, smell, wrong temperature, customer rejected, or other. |
| 8 | Stock take approval works | TODO | TODO | `/stock/stock-take` | Scoped session, scanned lines, missing-barcode variance lines, manager signature, director signature, adjustment movement | Confirm lock applies only to selected item + brand in selected location and missing expected barcodes are adjusted out only after director approval. |
| 9 | No-barcode-to-barcode flow works | TODO | TODO | `/stock/no-barcode-inbound`, `/stock/inbound` | Generated numeric barcode then normal barcode inbound | Confirm loose no-barcode inbound is not used for new MVP stock. |
| 10 | Reports/export work | TODO | TODO | `/stock/reports` | CSV file, print/PDF-ready view, WhatsApp summary | Confirm reports include stock balance, inbound age by item + brand + location, stock take variance, damage/spoilage, and supplier return. |
| 11 | Role/outlet isolation works | TODO | TODO | Stock routes | RLS allowed/denied rows | Confirm non-admin users see only assigned outlet/location; admin/director can see all allowed views. |
| 12 | Mobile scanner works | TODO | TODO | Scanner routes | Device screenshots/video notes | Confirm phone-width 390px, large scan button, manual fallback, recent scan list, permission message, success vibrate/beep where supported, continuous scan on inbound/outbound/stock-take, and stream stop on close. |
| 13 | Automated tests exist | TODO | Local terminal | N/A | Command output | Confirm smoke route, barcode regression, stock acceptance coverage, stock state-transition coverage, stock migration safety, stock role/scope coverage, stock scanner coverage, stock RLS policy coverage, stock seed coverage, stock security/no-service-role coverage, stock item-master coverage, stock label coverage, stock-take lock coverage, and stock report coverage scripts all run. |

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
