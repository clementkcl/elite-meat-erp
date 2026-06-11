# Elite Meat ERP Role and Team Access Matrix

This matrix documents the expected internal-testing access model after migrations `202606100001` through `202606100014`.

## Scope Rules

- `admin` and `director` can view all outlets, departments, delivery teams, and stock locations.
- Non-admin users are scoped by their profile fields: `outlet_id`, `department_id`, and `stock_location_id`.
- Operational pages show a scope badge so users can see whether they are operating in outlet, department, stock-location, or all-team scope.
- Normal users must not delete operational or stock master data. Stock deletes are admin/director only.
- Director is approval/view focused. Operational data entry is reserved for the relevant team roles, account, admin, or manager roles.

## Role Summary

| Role | Main Scope | Primary Capabilities | Explicit Blocks |
| --- | --- | --- | --- |
| `retail_team_general_worker` | Own outlet and stock location | Retail sales, payments, cash session submission, stock workflows for assigned location | Cannot delete stock data, approve protected workflows, edit past-day sales/cash, or see other outlets |
| `retail_manager` | Own outlet and department | Retail team work plus retail approvals, cleaning management, cash/daily closing review | Cannot see other outlets unless admin/director |
| `delivery_team_general_worker` | Own delivery department/team | Delivery orders, driver status, proof/location updates, stock flows for assigned location | Cannot see other delivery teams or delete delivery data |
| `delivery_manager` | Own delivery department/team | Delivery team work plus vehicle/order management and team review | Cannot see other delivery teams unless admin/director |
| `processing_team_general_worker` | Own processing department and stock location | Processing batch entry and assigned-location stock operations | Cannot review own protected manager workflow or see other departments |
| `processing_manager` | Own processing department | Processing review, cleaning task management for department, scoped stock operations | Cannot see other processing departments unless admin/director |
| `account` | Finance/accounting plus assigned scope | AR/AP invoice upload, approved invoice payment, approved OA payment, approved claim/advance payment, payslip upload | Cannot admin-review invoice data, cannot director-approve OA/finance, and cannot bypass team scope for non-finance operational data |
| `admin` | All | Configure master data, manage users, review admin workflow steps, delete protected records | Should not use service-role keys in frontend |
| `director` | All | View dashboards/reports, approve/reject protected workflows, approve stock take adjustments | Should not perform routine operational entry |

## Module Matrix

| Module | General Worker | Manager | Account | Admin | Director | Isolation |
| --- | --- | --- | --- | --- | --- | --- |
| Stock master data | Read scoped lists where needed | Read scoped lists where needed | Read where finance needs it | Full manage/delete | Full manage/delete | `stock_location_id` for operational stock; admin/director all |
| Stock inbound/outbound/transfer/receive/return | Own stock location only | Own stock location only | No normal stock operation | All locations | Approval/view focused | RLS and server actions check location |
| Stock take | Create/scan/submit own location | Create/scan/submit own location | No approval | Review/approve/reject/delete | Review/approve/reject/delete | Adjustments only after admin/director approval |
| Delivery | Own delivery team progress/proof/source records | Own delivery team manage/review | Finance payment visibility where relevant | All teams | View/report | `delivery_team_id`/department; proof must be image |
| Attendance | Own records | Own department/team records and rules | Own finance-relevant records only | All | View/report | `outlet_id`, `department_id`, own user |
| OA advance | Create own request | Create own request | Pay after director approval | Admin review | Director approve/reject | Requester plus reviewer roles |
| OA claim | Create own request | Department-manager review | Pay after director approval | Admin review | Director approve/reject | Department scope before admin/director |
| OA leave | Create own request | Department-manager approve/reject | No payment | Admin oversight | View/report | Department scope |
| Payslip | View own | View own | Upload/manage | Upload/manage | View all | Staff sees own; account/admin manage; director views all |
| Retail daily sales/cash | Own outlet same-day only | Own outlet submit/check, not own submission | Mark approved expenses paid where assigned | All | View/approve/report | `outlet_id`; past-day operator edit blocked; checker must differ from submitter |
| Processing | Own department entry, consumes assigned-location raw stock | Own department review and threshold alerts | No processing operation | All | View/report | `department_id` and `stock_location_id`; finished goods require barcode inbound |
| Cleaning | Complete own outlet/department tasks | Create/edit own outlet/department tasks | Complete own department tasks where assigned | All | View/report | work scope function checks outlet/department |
| Finance AR/AP | No | No | Upload, manual fields, payment close | Review/manage/approve | Approve/view | Account/admin manage entry/payment; admin reviews data; director/admin approve |
| Containers | No | No | Upload/update finance/container fields | All | View/report | Finance/admin/director |
| Director reports | No | No | Finance source data only | All | View/approve/export | Director/admin only routes |

## Protected Transitions

- Advance: staff submits, admin reviews, director approves/rejects, account pays.
- Claim: staff submits, department manager reviews, admin reviews, director approves/rejects, account pays.
- Leave: staff submits, department manager approves/rejects; approved dates sync to attendance as `ON_LEAVE`.
- Retail daily closing: retail submits, a different manager/admin/director approves or rejects.
- Retail expenses: retail submits with receipt image path; a different checker reviews; admin/director approves; account/admin marks paid.
- Stock take: operators create and submit only; admin/director reviews, approves, or rejects; stock adjustment happens only after approval.
- Processing: worker creates/completes batch from raw loose stock; finished goods require barcode inbound; processing manager reviews.
