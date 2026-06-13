# Stock Module Completion Audit

Last updated: 2026-06-12

This audit maps the Stock Module completion goal to current evidence. It is intentionally conservative: source-level checks and passing builds are useful, but the module is not complete until the real Supabase, RLS, device scanner, and browser print checks in `docs/STOCK_QA_EVIDENCE.md` are filled in.

## Local Evidence Summary

Local commands currently expected before handoff:

- `npm.cmd run smoke`
- `npm.cmd run lint`
- `npm.cmd run typecheck`
- `npm.cmd run build`

`npm.cmd run smoke` currently runs:

- route and broad workflow smoke checks
- stock workflow regression checks
- stock acceptance source coverage
- stock state-transition/RPC coverage
- stock migration safety coverage
- stock role/scope source coverage
- stock scanner source coverage
- stock RLS policy source coverage
- stock seed fixture coverage
- stock security/no-service-role coverage
- stock item-master coverage
- stock label coverage
- stock-take lock coverage
- stock report coverage

## Acceptance Test Audit

| # | Acceptance test | Current automated/source evidence | Manual evidence still required | Status |
| --- | --- | --- | --- | --- |
| 1 | Inbound scan works | `stock-state-transition-coverage.mjs` checks `inbound_stock_unit`; `stock-acceptance-coverage.mjs` checks stock unit, movement, scan log, audit log wiring. | Run `/stock/inbound` against migrated Supabase and prove rows in `stock_units`, `stock_movements`, `barcode_scan_logs`, and `audit_logs`. | Partial |
| 2 | Duplicate barcode blocked | `stock-acceptance-coverage.mjs` checks server duplicate rejection, local duplicate warning, manual-save disable, and camera auto-save duplicate prevention. | Scan the same barcode twice and prove no second `stock_units` row plus a clear staff error. | Partial |
| 3 | Barcode weight rule saved/reused | Barcode decode regression covers GS1, position, and fixed weight; acceptance coverage checks `barcode_weight_rules` and global item+brand+origin rule wiring. | Save a rule in the UI, scan again with same item+brand+origin, and prove the rule is reused from Supabase. | Partial |
| 4 | Barcode label printing works | `stock-label-coverage.mjs` checks numeric-only generated barcode, grams encoding, 50mm x 30mm inbound labels, multiple labels, and stock-unit reprint surface. | Browser print/PDF preview from `/stock/inbound` and `/stock/units/[id]`. | Partial |
| 5 | Order-based outbound works | Outbound helper regression covers ready-order gating, barcode parsing, duplicate detection, missing-barcode messaging, unavailable-status block reasons, and UI warning text; state-transition coverage checks `confirm_order_outbound_batch`. | Use `ORD-SEED-PICKUP-001`, scan seeded barcodes, and verify outbound batch rows, movement rows, unit status, warnings, missing/blocked-status messaging, and substitution records. | Partial |
| 6 | Transfer/receive works | State-transition coverage checks atomic `transfer_stock_unit` and `receive_stock_transfer`; stockable status regression keeps `TRANSFER_PENDING` out of active stock. | Transfer and receive a barcode in Supabase; prove location changes only after receive scan and pending transfers alert after 3 days. | Partial |
| 7 | Damage/spoilage approval works | Approval regression covers status gates; role/scope coverage checks approval location gates; RLS policy coverage checks manager/director policy gates; state-transition coverage checks `approve_stock_damage_request`. | Use `DMG-SEED-SUBMITTED-001` and `DMG-SEED-REVIEWED-001`; prove manager review, director approval, unit `DAMAGED`, and `OUTBOUND_SPOILED` movement. | Partial |
| 8 | Stock take manager+director approval works | Stock-take regression covers barcode-only count, manual count-line blocking, empty-session submit/review/approval blocking, missing-barcode variance at director approval, item+brand scope, and signatures; RLS policy coverage checks manager/director gates; state-transition coverage checks `approve_stock_take_session`. | Use `ST-SEED-*` fixtures; prove barcode count, manager signature, director signature, lock scope, missing-barcode adjustment, and adjustment movement. | Partial |
| 9 | No-barcode-to-barcode flow works | Security coverage checks redirect, server-action block, label-first worker guidance, and no loose no-barcode insert. | In browser, visit `/stock/no-barcode-inbound`, confirm redirect, generate label, and inbound through barcode flow. | Partial |
| 10 | Reports/export work | Report-export regression covers CSV escaping and WhatsApp summary; acceptance coverage checks report rows and toolbar. | Browser-test CSV download, print/PDF view, and WhatsApp summary from `/stock/reports`. | Partial |
| 11 | Role/outlet isolation works | Role/scope source coverage checks action/module/location guards; RLS policy coverage checks scoped policies and admin/director delete limits. | Real Supabase Auth users must prove allowed/denied cross-location access and director routine-operation blocking. | Partial |
| 12 | Mobile scanner works on phone-width UI | Scanner source coverage checks `@zxing/browser`, rear camera preference, permission/error message, manual fallback, recent scan list, success feedback, continuous mode, duplicate-scan debounce, and stream cleanup. | Real phone and laptop camera tests, including permission prompt, repeated scans, success feedback, and stream stop on close. | Partial |
| 13 | Automated tests exist for critical stock workflows | `npm.cmd run smoke` includes all current stock guards listed above. | Save command output in `docs/STOCK_QA_EVIDENCE.md` for the final branch/commit. | Partial |

Dashboard KPIs now include total stock weight, barcode units, today inbound, today outbound, pending transfers, legacy no-barcode visibility, open variance, negative-stock alerts, and stock-age alerts. Dashboard shortcuts link to inbound, outbound, transfer, receive-transfer, and return. Real browser QA still needs to confirm these controls are readable at phone width and match seeded movement rows.

## Core Rule Audit

| Rule | Current evidence | Status |
| --- | --- | --- |
| Barcode stock is the main stock model | Label-first route/action guard, no-barcode redirect, no loose no-barcode submit guard. | Partial until browser-tested |
| Every barcode is one stock unit | `stock_units.barcode` unique schema and atomic inbound RPC coverage. | Partial until Supabase-tested |
| Duplicate inbound blocked | Server-action/source checks and unique barcode schema. | Partial until Supabase-tested |
| Return becomes `IN_STOCK` | `return_stock_unit` RPC coverage and stockable status regression. | Partial until Supabase-tested |
| Transfer location changes only after receive scan | Atomic transfer/receive RPC coverage. | Partial until Supabase-tested |
| Damage staff -> manager -> director -> deducted | Damage table/RPC/RLS/source coverage. | Partial until Supabase-tested |
| Return supplier staff -> manager -> deducted | Return-supplier table/RPC/RLS/source coverage. | Partial until Supabase-tested |
| Stock take manager -> director -> adjustment | Stock-take table/RPC/RLS/source coverage. | Partial until Supabase-tested |
| Role/outlet/location restrictions preserved | Source guards and RLS policy coverage. | Partial until real RLS-tested |
| No service-role key in frontend | Stock security coverage and general smoke checks. | Partial until deployed env reviewed |
| No destructive/idempotency migration issues | Migration safety and RLS policy coverage. | Partial until migrations applied fresh |

## Item Master Audit

| Requirement | Current evidence | Status |
| --- | --- | --- |
| Structure category + brand + product name | Migration `202606100045` and item-master coverage check category/default-brand/section/name uniqueness. | Partial until Supabase-tested |
| Numeric-only `item_code` | Migration `202606100037`, item-code helper regression, item-master coverage. | Partial until migration applied |
| Old non-numeric codes converted | Migration `202606100037` coverage. | Partial until migration applied to real data |
| Initial code `0001`, `0002`, editable later | `generatedItemCode` and `nextItemCode` regression; item form numeric input. | Partial until browser-tested |
| Required create fields | Item form and server action coverage for item code, category, name. | Partial until browser-tested |
| Editable fields | Item-master coverage checks item code, category, brand, section/name, Chinese/Iban, barcode required, active, low stock. | Partial until browser-tested |
| Everyone can create/edit | RLS policy and action role coverage. | Partial until RLS-tested |
| Duplicate `item_code` blocked | Server action guard and DB unique key. | Partial until Supabase-tested |
| Inactive visible but no inbound | Data contract keeps active flag; `assertActiveItem` blocks inbound. | Partial until Supabase-tested |

## Remaining Completion Gate

Do not mark Stock complete until all of these are true:

- `docs/STOCK_QA_EVIDENCE.md` has passing real evidence for all 13 acceptance tests.
- Fresh Supabase migration and seed execution succeeds through `202606100053_stock_inbound_session_undo_v1.sql`.
- RLS allowed/denied evidence is captured for own-location worker, other-location denial, manager, admin, and director.
- Phone scanner evidence is captured on a real phone around 390px width.
- Laptop scanner and label print/PDF evidence is captured.
- Final local command output is recorded for the exact branch/commit being handed off.
