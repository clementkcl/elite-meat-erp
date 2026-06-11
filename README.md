# Elite Meat ERP

Core ERP foundation with Stock Module V1, Delivery Module V1, Attendance Module
V1, OA Actions Module V1, Retail Module V1, Processing V1, Cleaning V1,
Accounting/Finance V1, and Director V1 built on Next.js App Router, TypeScript,
Supabase Auth, Supabase PostgreSQL, Supabase Storage, Tailwind CSS, shadcn/ui,
TanStack Table, and Recharts.

## Scope

Stock Module V1, Delivery Module V1, Attendance Module V1, OA Actions Module
V1, Retail Module V1, Processing V1, Cleaning V1, Accounting/Finance V1, and
Director V1 are implemented. Settings is still a placeholder page.

## Environment

Create `.env.local` with Supabase public project values:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://aikfqnbsshflbtuakwrz.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

Do not put service-role keys in frontend code. Server actions use the
authenticated user's Supabase session.

## Database Setup

Run the migration first, then seed data:

```bash
supabase db push
supabase db seed
```

If you are using the Supabase SQL editor instead of the CLI, run these files in
order:

1. `supabase/migrations/202606100001_erp_core_stock_v1.sql`
2. `supabase/migrations/202606100002_delivery_v1.sql`
3. `supabase/migrations/202606100003_attendance_v1.sql`
4. `supabase/migrations/202606100004_oa_actions_v1.sql`
5. `supabase/migrations/202606100005_retail_v1.sql`
6. `supabase/migrations/202606100006_finance_director_v1.sql`
7. `supabase/migrations/202606100007_roles_scope_and_operations_v1.sql`
8. `supabase/migrations/202606100008_team_rls_v1.sql`
9. `supabase/migrations/202606100009_internal_qa_hardening_v1.sql`
10. `supabase/migrations/202606100010_stock_inbound_workflow_v1.sql`
11. `supabase/migrations/202606100011_outlet_module_access_v1.sql`
12. `supabase/migrations/202606100012_delivery_workflow_status_v1.sql`
13. `supabase/migrations/202606100013_oa_workflow_hardening_v1.sql`
14. `supabase/migrations/202606100014_finance_invoice_aging_v1.sql`
15. `supabase/migrations/202606100015_attendance_leave_sync_v1.sql`
16. `supabase/seed.sql`

After creating your first Supabase Auth user, assign roles in SQL, for example:

```sql
insert into public.profile_roles (profile_id, role_key)
values ('USER_UUID_HERE', 'admin')
on conflict do nothing;
```

Valid role keys are `retail_team_general_worker`, `retail_manager`,
`delivery_team_general_worker`, `delivery_manager`,
`processing_team_general_worker`, `processing_manager`, `account`, `admin`, and
`director`. Non-admin/director users should also have the correct
`profiles.outlet_id`, `profiles.department_id`, and `profiles.stock_location_id`
so team-scoped RLS can isolate outlet, delivery team, processing department, and
stock-location data. Admin assigns scope once; normal staff workflows should use
that assigned scope instead of asking staff to pick an outlet every time.
Outlet module availability is controlled by `outlet_module_access`; for example,
Jalan Channel can use Retail, Processing, and Stock while Wonderful can use
Processing and Stock.

## Local Development

```bash
npm install
npm run dev
npm run lint
npm run typecheck
npm run build
```

Open `http://localhost:3000`.

## Stock Routes

- `/stock/dashboard`
- `/stock/items`
- `/stock/inbound`
- `/stock/outbound`
- `/stock/transfer`
- `/stock/receive-transfer`
- `/stock/return`
- `/stock/no-barcode-inbound`
- `/stock/balance`
- `/stock/movements`
- `/stock/stock-take`
- `/stock/reports`
- `/stock/settings`

## Delivery Routes

- `/delivery/dashboard`
- `/delivery/orders`
- `/delivery/new-order`
- `/delivery/driver`
- `/delivery/vehicles`
- `/delivery/payments`

Delivery V1 includes delivery orders, order items, vehicle setup, status logs,
driver location records, delivery payments, order source tracking for manual,
retail sale, and WhatsApp orders, and proof-of-delivery photo uploads to the
private `erp-files` Supabase Storage bucket. Delivery status now follows the
operational workflow: Pending, Out for Delivery, Delivered, Failed, and
Cancelled. Payment types are Cash, Online Transfer, and Credit Term.

## Attendance Routes

- `/attendance/today`
- `/attendance/clock`
- `/attendance/my-attendance`
- `/attendance/department`
- `/attendance/settings`

Attendance V1 includes GPS clock-in/out, work-location radius validation,
50m work-location radius validation, department-specific clock-in rules, more
than 5 minutes late status, approved leave auto-marked as On Leave,
`NO_CLOCK_OUT` summaries, department summary review, own attendance history, and
attendance location/rule settings.

## OA Actions Routes

- `/oa-actions/dashboard`
- `/oa-actions/advance`
- `/oa-actions/claim`
- `/oa-actions/leave`
- `/oa-actions/payslip`
- `/oa-actions/my-requests`

OA Actions V1 includes staff advance requests, expense claims, leave requests,
payslip uploads, own-request views, department manager claim/leave review, admin
advance/claim review, director approval or rejection, account/admin payment
close-out, file attachments, and approval audit logs.

## Retail Routes

- `/retail/dashboard`
- `/retail/pos`
- `/retail/processing`
- `/retail/cleaning`
- `/retail/sales`
- `/retail/payments`
- `/retail/cash-closing`
- `/retail/expenses`
- `/retail/prices`

Retail V1 includes daily sales capture, admin-configurable payment types, POS
sale capture, barcode stock sale-out, no-barcode stock sale-out, retail
payments, register cash closing and variance, daily closing submission/approval,
outlet expenses with receipt image path, separate checker/payment tracking, and
retail price rules by item, brand, origin, and outlet.

## Processing Routes

- `/processing/dashboard`
- `/processing/batches`
- `/retail/processing`

Processing V1 consumes raw loose stock from the assigned stock location, records
finished goods without auto-adding them to stock, monitors item-level yield/loss
thresholds, and supports processing manager review. Finished goods enter stock
only after packing and barcode inbound scan.

## Cleaning Routes

- `/cleaning/tasks`
- `/retail/cleaning`

Cleaning V1 includes department cleaning tasks with daily, weekly, monthly, and
quarterly frequency. Department users can mark scoped tasks done or missed,
retail/processing managers can create and edit scoped department tasks, and
admin/director can see all. Missing cleaning alerts show overdue pending work and
missed tasks.

## Accounting & Finance Routes

- `/accounting-finance/dashboard`
- `/accounting-finance/claims`
- `/accounting-finance/advances`
- `/accounting-finance/ar-invoices`
- `/accounting-finance/ap-invoices`
- `/accounting-finance/containers`

Accounting/Finance V1 includes claims and advances review via OA Actions,
AR/AP invoice upload with invoice number, customer/supplier, invoice date,
amount, item list, payment status, derived invoice age, admin invoice data
review, director/admin invoice approval, account/admin payment close,
debtor/creditor aging, container ETA/arrival/cost tracking, and invoice file
attachments.

## Director Routes

- `/director-reports/dashboard`
- `/director-reports/approvals`
- `/director-reports/reports`

Director V1 includes a director dashboard, approval queue for OA requests,
finance invoices, and retail expenses, plus print/PDF-ready and WhatsApp-ready
on-demand report output.

## Seed Data

The seed adds:

- Outlets and stock locations: JALAN CHANNEL, SUNGAI MERAH, WONDERFUL,
  SUNGAI MAAW, DIRECTOR
- Departments: Retail, Processing, Delivery, Stock, Accounting, Admin,
  Management
- Outlet module access, including Jalan Channel = Retail/Processing/Stock and
  Wonderful = Processing/Stock
- Brands: TICAN, RIVASAM, SEABOARD, VAN ROOI, ABC, ICP, LOCKS
- Origins: DENMARK, SPAIN, USA, NETHERLAND, BELGIUM, CHINA
- Items:
  - MEAT / BELLY / BONELESS
  - MEAT / BELLY / BONE IN
  - MEAT / LOIN / BONELESS
  - ORGANS / COOKED / STOMACH
  - ORGANS / TONGUE / TONGUE
  - PROCESSED / MEATBALL / MEATBALL
- Delivery vehicles: EM-LORRY-01, EM-VAN-02
- Delivery orders: DO-20260610-001, DO-20260610-002
- Attendance work locations with 50m radius and 5-minute late rules
- OA sample advance, claim, leave request, and payslip rows when profiles exist
- Retail registers, price rules, one closed cash session, one sale, payment,
  processing batch, cleaning tasks, outlet expense, and configurable payment types
- Finance AR/AP invoices, one container, and one director report snapshot
- Barcode inbound source and saved weight-position rule demo data
