# Elite Meat ERP Testing Plan

This plan is for real internal testing of the existing ERP modules: Stock, Delivery, Attendance, OA Actions, Retail, Processing, Accounting/Finance, and Director.

## Setup

1. Apply migrations in filename order from `supabase/migrations`.
2. Run `supabase/seed.sql`.
3. Create Supabase Auth users for every role.
4. For every non-admin/director profile, assign the correct `outlet_id`, `department_id`, and `stock_location_id`.
5. Run local validation:

```bash
npm run lint
npm run typecheck
npm run build
npm run smoke
```

## Test Users

Create at least one user for each role:

- Retail worker and retail manager for `JALAN CHANNEL`.
- Retail worker and retail manager for `SUNGAI MERAH`.
- Delivery worker and delivery manager.
- Processing worker and processing manager.
- Account user.
- Admin.
- Director.

Use at least two outlets/teams so cross-team isolation can be tested.

## Priority Test Order

1. Login and sidebar access by role.
2. Scope badge shows expected scope.
3. Stock inbound, duplicate inbound block, transfer, receive transfer, return, and stock take approval.
4. Attendance clock in/out, late, out-of-radius, and no-clock-out.
5. OA advance, claim, leave, payslip.
6. Retail sales, payments, cash closing, daily closing, same-day edit block.
7. Processing batch entry and manager review.
8. Cleaning task frequency and 30-day matrix.
9. Finance invoice/container lifecycle.
10. Director dashboard, approvals, print/PDF, WhatsApp summary, CSV.

## Evidence To Capture

- Screenshot or note of each happy path.
- Screenshot or note of each blocked path.
- Database row IDs for representative workflow records.
- Confirmation that users from one outlet/team cannot read or mutate another outlet/team.

## Pass Criteria

- No frontend service-role key usage.
- No destructive migration needed.
- Build, lint, typecheck, and smoke pass.
- Every workflow has one happy path and one blocked path tested.
- RLS blocks direct database access that frontend pages also hide.

