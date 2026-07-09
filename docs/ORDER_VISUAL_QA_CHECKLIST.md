# Order Module V1 Manual Visual QA Checklist

Use local app URL: `http://127.0.0.1:3000`.

Use local Supabase URL: `http://127.0.0.1:54321`.

Use the QA password documented in `docs/SUPABASE_QA_PLAN.md`. Do not use production passwords.

## Accounts

| Purpose | Account |
| --- | --- |
| Worker, Outlet 10 | `qa.retail.worker.jc@example.test` |
| Manager, Outlet 10 | `qa.retail.manager.jc@example.test` |
| Delivery worker, Outlet 10 | `qa.delivery.worker.jc@example.test` |
| Admin/global view | `qa.admin@example.test` |
| Director/global view | `qa.director@example.test` |
| Blocked Orders access | `qa.noorders@example.test` |

## How To Test

For every page below, test once on desktop width and once in browser DevTools mobile width, such as iPhone/Pixel size. Record `Pass`, `Fail`, or `Blocked`, plus a short note.

Check for broken layout, missing buttons, wrong labels, confusing badges, mobile overflow, blocked actions that should be allowed, and visible actions that should be hidden.

## Page Checklist

| Page | QA account | What should be visible | Actions to test | Result |
| --- | --- | --- | --- | --- |
| `/orders` | Worker, manager, admin | KPI cards, filters, alerts, order list/cards, clear badges, no customer outstanding amount | Filter by date/status/outlet/customer/salesperson; open an order; confirm mobile uses cards and big touch targets |  |
| `/orders/create` | Worker | Customer search, quick add, order type selector, required fields, item entry, total order price only | Create pickup order; create delivery order with address; create internal transfer; quick-add customer with name + phone; confirm success/warning message |  |
| `/orders/[id]` | Worker, manager | Order no, customer, type, required time, details, items, total price, remarks, timeline, warnings | Open pickup/delivery/internal transfer; confirm cancel button only when valid; confirm edit hidden/blocked after picking starts; confirm Picked Up appears for ready pickup |  |
| `/orders/picking` | Worker | Picking list including stock-not-enough orders, estimated/picked/remaining weight, 10kg tolerance, barcode/manual controls | Open order; scan/type barcode; add manual weight with each reason style; confirm duplicate warning; confirm mismatch log; mark Ready when within tolerance |  |
| `/orders/ready` | Worker, manager | Separate pickup and delivery ready sections, clear status badges, customer remarks | Confirm pickup order can be marked Picked Up; confirm delivery order is presented for Delivery Module handoff |  |
| `/orders/customers` | Worker, manager | Customer list/search, phone/name fields, remarks, active status, no outstanding amount | Search by name/phone; quick-create customer; confirm remarks display and no finance amount appears |  |
| Delivery available list | Delivery worker | Available delivery created from ready delivery order, customer/address/remarks, driver action button | Accept available delivery; confirm driver cannot edit order items/weights; confirm status progression is clear |  |
| Order pages denied | No-orders user | Blocked or redirected state with clear access message | Try `/orders`, `/orders/create`, `/orders/picking`, `/orders/ready`, `/orders/customers`; confirm no order data or actions appear |  |

## Visual Pass Criteria

- Desktop pages fit without overlapping text or clipped controls.
- Mobile pages avoid horizontal scroll and use readable cards/buttons.
- Worker view is simple and action-oriented.
- Manager/admin view can see allowed broader data without exposing blocked actions.
- No-orders user cannot view order data or perform order actions.
- Total order price is visible, but item-level prices and payment status are not shown.
- Customer overdue credit appears only as warning if seeded data shows it; outstanding amount is not shown.

## Findings Template

| Date | Tester | Page | Account | Desktop result | Mobile result | Issue / screenshot | Fixed? |
| --- | --- | --- | --- | --- | --- | --- | --- |
|  |  |  |  |  |  |  |  |
