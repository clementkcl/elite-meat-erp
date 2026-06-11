# Roles And Team Isolation

## Core Rule

Admin and director can see all operational data. Everyone else is scoped by profile fields:

- `profiles.outlet_id`
- `profiles.department_id`
- `profiles.stock_location_id`

Frontend filters are convenience only. Supabase RLS and server actions are the real enforcement layers.

Admin assigns scope once. Normal staff workflows should auto-use the assigned outlet, department, team, and stock location instead of asking staff to choose an outlet repeatedly.

Current outlets:

- Jalan Channel
- Sungai Merah
- Wonderful
- Sungai Maaw

Current departments:

- Retail
- Processing
- Delivery
- Stock
- Accounting
- Admin
- Management

Outlet module access is controlled by `outlet_module_access` and applies in
addition to role-based navigation. Examples:

- Jalan Channel: Retail, Processing, Stock
- Wonderful: Processing, Stock

## Role Matrix

| Role | Scope | Can Create | Can Review/Approve | Can Pay | Can Delete Protected Data |
| --- | --- | --- | --- | --- | --- |
| `retail_team_general_worker` | Own outlet and stock location | Retail same-day records, stock workflows | No | No | No |
| `retail_manager` | Own outlet/department | Retail and cleaning records | Retail closing/expense where scoped | No | No |
| `delivery_team_general_worker` | Own delivery department/team | Delivery progress/location/proof | No | No | No |
| `delivery_manager` | Own delivery department/team | Delivery records | Delivery team management | No | No |
| `processing_team_general_worker` | Own processing department/location | Processing batches | No | No | No |
| `processing_manager` | Own processing department | Processing and cleaning records | Processing review | No | No |
| `account` | Finance workflows | Finance invoices/containers | Upload and payment close | Approved OA/invoices | No |
| `admin` | All | All admin-operational records | Admin review and all approvals where allowed | Where allowed | Yes |
| `director` | All | Minimal operational entry | Director approval | No routine payment | Yes where policy allows |

## Module Isolation

### Stock

- General/team users operate only assigned `stock_location_id`.
- Everyone with scoped stock access can scan inbound for their assigned outlet/location.
- Barcode inbound supports supplier/import, processing output, return, and transfer sources.
- Inbound scanners select product, brand, origin, location, and barcode weight-position rule once, then continuously scan the same item.
- Barcode weight-position rules are saved by item/brand/origin/location.
- `stock_units`, `stock_movements`, no-barcode stock, no-barcode movements, stock take sessions, stock take lines, scan logs, and reports are scoped or own-user where appropriate.
- Deletes are admin/director only for protected stock records.

### Delivery

- Delivery records are scoped by delivery department/team.
- Workers update only their own team records.
- Admin/director can see all delivery teams.
- Statuses are Pending, Out for Delivery, Delivered, Failed, and Cancelled.
- Payment types are Cash, Online Transfer, and Credit Term.
- Orders track source as manual, retail sale, or WhatsApp; proof must be an image photo.

### Attendance

- Staff sees own attendance.
- Managers see scoped outlet/department records.
- GPS radius is 50m and late grace is 5 minutes.
- Prior days with clock-in but no clock-out are recorded as `NO_CLOCK_OUT`.

### OA Actions

- Advance: staff -> admin -> director -> account pay.
- Claim: staff -> department manager -> admin -> director -> account pay.
- Leave: staff -> department manager.
- Payslip: staff sees own, admin uploads, director sees all.

### Retail

- Retail users see own outlet only.
- Same-day sales and cash edit rules apply to retail operators.
- Payment types are admin-configurable.
- Daily closing and outlet expenses must be checked by someone other than the submitter.
- Outlet expenses capture type, amount, receipt image path, submitted by, paid by, and date.

### Processing

- Workers and managers are scoped by department.
- Raw material is consumed from the user's assigned stock location.
- Finished goods do not auto-enter stock; barcode inbound is required after packing.
- Yield/loss alerts use item-level thresholds.
- Manager review is separate from worker creation/completion.

### Cleaning

- Users in the assigned outlet/department can mark tasks done or missed.
- Retail/processing managers create and edit own department/outlet tasks.
- Admin can manage all; director sees all for reporting.
- Frequency supports daily, weekly, monthly, and quarterly.
- Missing cleaning alerts show overdue pending and missed tasks.

### Finance And Director

- Account handles invoice/container entry and approved payment marking.
- Admin reviews invoice data before director/admin approval.
- Finance dashboard includes debtor and creditor aging buckets.
- Director has view/approve/report surfaces and should not need routine operational entry.
