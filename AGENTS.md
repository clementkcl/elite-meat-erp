<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes -- APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Elite Meat ERP Rules

## Business Scope

- Current modules are Stock, Delivery, Attendance, OA Actions, Retail, Processing, Accounting/Finance, and Director.
- Do not add unrelated modules during hardening work. Improve existing workflows, role isolation, forms, reporting, and testing readiness.
- Director is primarily view/approve/report. Routine operational entry belongs to team, manager, account, or admin roles.

## Roles

- `retail_team_general_worker`
- `retail_manager`
- `delivery_team_general_worker`
- `delivery_manager`
- `processing_team_general_worker`
- `processing_manager`
- `account`
- `admin`
- `director`

## Team And Data Isolation

- Outlets are Jalan Channel, Sungai Merah, Wonderful, and Sungai Maaw.
- Departments are Retail, Processing, Delivery, Stock, Accounting, Admin, and Management.
- Outlet module access is explicit. For example, Jalan Channel has Retail, Processing, and Stock; Wonderful has Processing and Stock.
- Admin assigns outlet, department, team, and stock-location access. Normal workflows should auto-scope from that assignment instead of asking staff to choose an outlet every time.
- Non-admin/director users must only see their own outlet, delivery team, processing team, department, and assigned stock location.
- Admin/director can see all records.
- General workers must only see and operate stock for their own `profiles.stock_location_id`.
- Retail, delivery, and processing team data must not bleed across teams.
- Keep server-side checks and Supabase RLS aligned. Frontend filtering is not enough.

## Protected Workflows

- Retail team can only edit same-day sales and cash records.
- Retail daily closing and outlet expenses must be checked by a different manager/admin/director than the submitter.
- Retail expenses track type, amount, receipt image path, submitted by, paid by, and date; account/admin marks approved expenses paid.
- Stock inbound sources are supplier/import, processing output, return, and transfer.
- Inbound scanning should let staff select item, brand, origin, location, and barcode weight rule once, then keep scanning the same item.
- Barcode weight-position rules should be saved for reuse by item/brand/origin/location.
- Stock transfer changes the actual stock location only after receive-transfer scan.
- Duplicate inbound barcode must be blocked.
- Return stock must become `IN_STOCK`.
- Stock take adjustment applies only after admin/director approval.
- Processing consumes raw loose stock from the assigned stock location.
- Finished processing output does not auto-enter stock; it enters stock only after packing and barcode inbound scan.
- Processing yield/loss alerts are based on item-level thresholds.
- Delivery statuses are Pending, Out for Delivery, Delivered, Failed, and Cancelled.
- Delivery payment types are Cash, Online Transfer, and Credit Term.
- Delivery order source is manual, retail sale, or WhatsApp; proof of delivery must be a photo image.
- Attendance uses multiple work locations, department start time, 5-minute late grace, 50m GPS radius, clock in/out, no-clock-out handling, and approved leave auto-marked as `ON_LEAVE`.
- Advance flow: staff -> admin -> director -> account pay.
- Claim flow: staff -> department manager -> admin -> director -> account pay.
- Leave is approved by department manager.
- Payslip: account/admin uploads, staff sees own, director sees all.
- Cleaning tasks can be completed by users in the assigned outlet/department; managers create/edit scoped tasks; no photo or verification is required.
- Accounting uploads AR/AP invoice PDF/image records with invoice number, customer/supplier, invoice date, amount, item list, and payment status.
- Admin reviews invoice data before approval; account/admin can mark approved invoices paid.
- Finance dashboards should show debtor and creditor aging.

## UX Rules

- Keep UI basic but usable for internal testing.
- Use reusable states and controls: `TeamScopeBadge`, `EmptyState`, `StatusBadge`, `ApprovalTimeline`, `ReportToolbar`, and `RecentActivityList` where they fit.
- Operational pages should show scope, recent activity, empty states, error/success states, and obvious next actions.
- Reports should support print/PDF-ready layout and WhatsApp-ready summary where relevant.

## Database Safety

- Do not create destructive migrations. No `drop table`, `drop column`, or `truncate` unless the user explicitly requests it.
- Schema changes must be new migrations only.
- Do not use Supabase service-role keys in frontend code.
- Do not hard-code Supabase secrets.

## Validation Commands

Run these before handing off hardening work:

```bash
npm run lint
npm run typecheck
npm run build
npm run smoke
```
