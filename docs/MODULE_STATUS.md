# Module Status

Last audited: 2026-06-12

## What Already Exists

| Module | Current Status | Main Routes / Files |
| --- | --- | --- |
| Foundation / Navigation | Internal-test complete. App shell, role/sidebar navigation, mobile Sheet menu, module access guard, scope display, login redirect, loading/error states exist. Production status depends on real role testing. | `/`, `/login`, `/dashboard`, `/home`, `components/erp/*`, `lib/auth/*` |
| Dashboard / Home | Partial. Role/access shortcut cards and scope display exist. KPI usefulness is not fully validated by role. | `/dashboard`, `/home`, `components/dashboard/home-page.tsx` |
| Inventory / Stock | Strong partial. Item master, barcode scanner, inbound, outbound, transfer, receive-transfer, return, no-barcode inbound, negative-stock alerting, stock-age alerting, stock take, and reports exist. Needs real RLS, real scanner, and stock edge-case QA. | `/stock/*`, `components/stock/*`, `lib/stock/*` |
| Orders | Strong partial. Customer orders, item entry without reservation, picking/preparation-time reservation RPC, manual reservation release for cancelled orders, ready states, delivery handoff, and notification placeholders exist. Real migrated DB/RLS QA remains. | `/orders`, `/orders/new`, `/orders/[id]`, `/orders/prepare`, `components/orders/*`, `lib/orders/*` |
| Delivery | Strong partial. Delivery orders, vehicles, driver location, payment/proof metadata, receiver/GPS proof upload, auto-delivered proof completion, failed customer-order barcode return logging, payment records, and customer-order handoff exist. Standalone/no-barcode failed-return follow-up and real Storage/RLS/browser QA remain. | `/delivery/*`, `components/delivery/*`, `lib/delivery/*` |
| Processing | Partial. Dedicated `/processing/*` UI now shows raw weight, finished weight, loss kg, yield %, and abnormal-yield alerts with 85% default minimum. Data/actions still adapt retail processing batches and remain one raw item to one finished item. | `/processing/*`, `/retail/processing`, `components/processing/*`, `lib/processing/*`, `components/retail/*`, `lib/retail/*` |
| Cleaning | Partial. Task frequency, scoped update, missed/overdue alerts, and 30-day matrix exist. Cleaning due/completion logic remains mostly page-level and needs real scope tests. | `/cleaning/tasks`, `/retail/cleaning`, `components/retail/*`, `lib/retail/*` |
| Import / Container Tracking | Partial. Implemented at finance/container metadata level only. Not a full import document/workflow module. | `/accounting-finance/containers`, `finance_containers`, `components/finance/*`, `lib/finance/*` |
| Customer Management | Partial. Customers, Retail/Wholesale/VIP category direction, credit terms, lat/long, and customer price rules exist in admin settings. Customer pricing, price override reason, and AutoCount aging are not fully applied across order/retail entry. | `/settings`, `lib/settings/*`, migration `202606100032`, migration `202606100035` |
| Retail | Partial. Sales, payments, cash sessions, daily closing, expenses, price rules, and POS-like stock consumption exist. Needs real same-day lock and outlet-scope validation. | `/retail/*`, `components/retail/*`, `lib/retail/*` |
| Attendance | Partial. GPS clock, rules, late/no-clock-out/on-leave handling exist. Needs real device GPS and leave-balance workflow validation. | `/attendance/*`, `components/attendance/*`, `lib/attendance/*` |
| OA Actions | Strong partial. Advance, claim, leave, payslip, timelines, and role transitions exist. Needs real role/user QA. | `/oa-actions/*`, `components/oa-actions/*`, `lib/oa-actions/*` |
| Accounting / Finance | Partial. AR/AP invoice metadata, aging, containers, review/approval/payment exist. Storage and extraction/manual correction workflow need validation. | `/accounting-finance/*`, `components/finance/*`, `lib/finance/*` |
| Director / Reports | Partial. Dashboard, approvals, reports, print/WhatsApp/CSV surfaces exist. Reports are on-demand but not broad enough for production reporting. | `/director-reports/*`, `components/director/director-page.tsx` |
| Barcode Scanning | Partial. Camera scanner, manual fallback, GS1 `3102`/`3103` weight decode, 1-3 decimal position rules, and fixed-weight fallback confirmation are implemented in stock inbound. Needs phone/laptop camera QA under HTTPS or localhost. | `components/stock/barcode-scanner.tsx`, `components/stock/workflow-forms.tsx`, `lib/stock/barcode-weight.ts` |
| Admin Settings | Partial. User scope, outlet module access, configurable lists, customers, prices, and barcode rules exist. Needs real admin workflow and RLS tests. | `/settings`, `components/settings/settings-page.tsx`, `lib/settings/*` |

## Page Inventory

- Foundation: `/`, `/login`, `/dashboard`, `/home`, `/settings`
- Stock: `/stock`, `/stock/dashboard`, `/stock/items`, `/stock/inbound`, `/stock/outbound`, `/stock/transfer`, `/stock/receive-transfer`, `/stock/return`, `/stock/no-barcode-inbound`, `/stock/balance`, `/stock/movements`, `/stock/stock-take`, `/stock/reports`, `/stock/settings`
- Orders: `/orders`, `/orders/new`, `/orders/[id]`, `/orders/prepare`
- Delivery: `/delivery`, `/delivery/dashboard`, `/delivery/orders`, `/delivery/new-order`, `/delivery/driver`, `/delivery/vehicles`, `/delivery/payments`
- Processing: `/processing`, `/processing/dashboard`, `/processing/batches`, `/retail/processing`
- Cleaning: `/cleaning`, `/cleaning/tasks`, `/retail/cleaning`
- Retail: `/retail`, `/retail/dashboard`, `/retail/pos`, `/retail/sales`, `/retail/payments`, `/retail/cash`, `/retail/cash-closing`, `/retail/expenses`, `/retail/prices`
- Attendance: `/attendance`, `/attendance/today`, `/attendance/clock`, `/attendance/my-attendance`, `/attendance/department`, `/attendance/settings`
- OA actions: `/oa-actions`, `/oa-actions/dashboard`, `/oa-actions/advance`, `/oa-actions/claim`, `/oa-actions/leave`, `/oa-actions/payslip`, `/oa-actions/my-requests`, `/oa/my-requests`
- Accounting/Finance: `/accounting-finance`, `/accounting-finance/dashboard`, `/accounting-finance/claims`, `/accounting-finance/advances`, `/accounting-finance/ar-invoices`, `/accounting-finance/ap-invoices`, `/accounting-finance/containers`, `/accounting/dashboard`
- Director/Reports: `/director-reports`, `/director-reports/dashboard`, `/director-reports/approvals`, `/director-reports/reports`, `/director/dashboard`

## Mock UI / Demo-Mode Areas

- Demo-mode data exists across stock, attendance, delivery, OA, retail, finance, settings, and auth when Supabase is not configured.
- WhatsApp notifications are placeholder events, not real messaging.
- File/proof/invoice uploads store metadata/path and need real Supabase Storage policy validation.
- Import/container tracking is metadata UI, not a complete import operations module.
- Some compatibility routes are wrappers or redirects around canonical pages.

## What Is Missing

- Browser/device QA confirmation for every module.
- Real customer-management workflow outside admin settings.
- Full production planning module distinct from retail processing.
- Real WhatsApp messaging.
- Real import/container document workflow beyond metadata.
- Automated test suite covering core business workflows.
- Final UX pass after workflows are validated.
- Real Auth users for every role/outlet/department/stock-location combination.
- A dedicated production planning model for multiple raw items to multiple finished items.
- Customer/category price rule application during order and sale entry.
- RLS verification scripts and browser smoke tests with evidence.
- Real Supabase QA for the picking-time order reservation RPC with seeded role/outlet/department users.
- Multi-outlet/multi-location staff access support.
- Manager then director stock-take adjustment approval.
- Director approval before damaged/spoiled stock deduction.
- Real Supabase QA for manual reservation release after customer cancellation.
- Overdue credit customer warning during order entry.
- Failed-delivery return support for standalone deliveries and no-barcode/loose stock.
- Multiple raw items to multiple finished items in Processing.
- Finished-product barcode generation from Processing output.
- Price override reason enforcement.
- AutoCount-format aging buckets.
- Import document upload workflow and Storage policy verification.

## Risky Logic

- Processing is currently split between order preparation and retail processing batches; this may confuse real production planning.
- Delivery has two paths: standalone delivery orders and customer-order delivery handoff.
- Stock outbound is intentionally strict and atomic; changes can easily break inventory accuracy.
- Temporary negative stock alerts are application-derived from balance rows; real data must be checked to confirm negative no-barcode stock is visible in scoped views.
- Stock age alerts are application-derived from barcode unit inbound dates; real data must be checked to confirm 6-month and 12-month thresholds are visible in scoped views.
- Customer price rules are configurable but not yet fully applied everywhere.
- Director is mostly view/approve, but older code/migrations must be kept aligned with later view-only hardening.
- Module access is both role-based and outlet-module-based; testing only one layer is insufficient.
- Order item creation no longer reserves stock. Picking/preparation uses `prepare_customer_order_item_with_reservation`, but migration `202606100034_order_reservation_on_picking_v1.sql` must be applied before live picking uses this path. Manual reservation release updates active reservations to `RELEASED` only after the order is cancelled.
- Delivery proof enforcement is action-layer plus RPC for customer-order failed returns; direct database writes still depend on RLS/triggers and should be tested with real roles.
- Customer-order failed delivery returns barcode stock from sales outbound lines. Standalone deliveries and loose/no-barcode stock return paths still require manual follow-up or a later normalized return workflow.
- Early migrations include broad policies that are tightened later; fresh projects must run every migration in filename order.
- Large files concentrate business rules and UI in one place, increasing regression risk.

## Large / Risky Files

- `components/stock/workflow-forms.tsx` - 1733 lines
- `supabase/seed.sql` - 1552 lines
- `lib/stock/actions.ts` - 1535 lines
- `lib/retail/actions.ts` - 1425 lines
- `components/retail/retail-forms.tsx` - 1244 lines
- `supabase/migrations/202606100008_team_rls_v1.sql` - 1012 lines
- `components/retail/retail-page.tsx` - 848 lines
- `lib/retail/data.ts` - 765 lines
- `components/settings/settings-page.tsx` - 729 lines
- `components/delivery/delivery-page.tsx` - 657 lines

## Duplicated Logic Hotspots

- Processing yield/loss exists in database generated columns, retail data mapping, and the new processing adapter.
- Cleaning due/completion matrix logic is page-level in `components/retail/retail-page.tsx`.
- Finance aging bucket display is split between `lib/finance/data.ts` and `components/finance/finance-page.tsx`.
- Stock report totals are calculated in both data/report surfaces and page display code.
- Status transition logic is spread across server actions, RLS policies, triggers/functions, and UI forms.

## QA Result

- `npm.cmd run smoke` - passed.
- `npm.cmd run lint` - passed.
- `npm.cmd run typecheck` - passed.
- `npm.cmd run build` - passed.
- Browser/device QA was not performed in this audit.

## Progress Score

| Scoring Area | Score |
| --- | ---: |
| Project foundation and navigation | 8 / 10 |
| Data model and mock data | 7 / 10 |
| Dashboard | 6 / 10 |
| Inventory | 7 / 10 |
| Processing | 5 / 10 |
| Cleaning | 6 / 10 |
| Import/container tracking | 4 / 10 |
| Orders and delivery | 7 / 10 |
| Barcode scanning | 6 / 10 |
| Reports, testing, and deployment readiness | 3 / 10 |
| Overall | 59 / 100 |

## Recommended Next Tasks

1. Test the full flow: order -> prepare/process -> stock outbound -> ready/pickup/delivery -> reports.
2. Confirm which processing route should become the canonical production planning workflow.
3. Test customer and credit workflows with real users and seeded customer categories.
4. Verify barcode camera scanning on actual phone/laptop hardware.
5. Add automated smoke/browser tests after manual workflow acceptance.
6. Keep visual redesign separate until workflow issues are resolved.
7. Apply migrations through `202606100034_order_reservation_on_picking_v1.sql` and test that order item entry does not reserve stock while preparation does.
8. Test proof-required delivery completion with real delivery users and uploaded files.
9. Add RLS verification scripts for seeded role/scope users.
10. Reduce large module files only after high-risk workflows have tests.
