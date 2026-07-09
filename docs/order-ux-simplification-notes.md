# Order UX Simplification Notes

Date: 2026-06-24

Scope: UI audit and worker-flow simplification only. No Order Module business logic, server actions, RLS, migrations, stock reservation logic, delivery handoff logic, or cancellation logic was changed.

## Audit Findings

- `/orders` was the most table-heavy screen. The default view now starts with task buttons and task queues; KPI cards, filters, reports, dense tables, logs, reservations, and notifications are behind an Advanced disclosure for manager/admin/director roles.
- `/orders/create` was too much form at once for workers. It now uses a five-step guided flow: Customer, Order Type, Items, Total Price, Create Order.
- `/orders/picking` still had a compact order selector as the first interaction. It now opens orders from simple cards and keeps the selector as a secondary fallback.
- `/orders/[id]` remains detail-rich by design. Workers may still see operational detail, timeline, and allowed actions; future UX follow-up could move timeline/log-heavy sections behind disclosures if staff find it crowded.
- `/orders/ready` is already card-based and separates pickup, delivery, and internal transfer queues.
- `/orders/customers` is search-first with customer cards and an Add Customer disclosure. It is no longer table-first.
- The delivery available list is not changed in this pass. Order Home links workers to the delivery area, while delivery handoff behavior stays in the existing Delivery module.

## Worker Information Needs

- Workers need clear task buttons, order/customer identity, stock status, required/picked/remaining weight, tolerance status, and primary actions.
- Workers do not need default KPI grids, dense cross-outlet reports, reservation tables, notification logs, delivery proof history, or broad order tables.
- Advanced filters and reports belong behind manager/admin/director controls, not in the worker default view.

## Role and Finance Review

- Manager/admin/director roles get Advanced Order List and Reports by default.
- General workers and delivery workers stay on task-first cards by default.
- Account users are not shown the Advanced Order List by default in this UI pass unless they also carry a manager/admin/director role.
- No Order V1 screen should show customer outstanding amount, invoice details, payment status, item-level price, cost, profit, stock value, finance invoice wording, or payment collection controls.
- The only price shown in Order V1 is total order price.

## Mobile Risks to Check Manually

- `/orders/create`: confirm the five step buttons wrap cleanly around 390px and hidden required fields do not trap browser focus.
- `/orders/picking`: confirm order cards, scan input, manual weight form, and Ready button fit without horizontal overflow.
- `/orders/[id]`: confirm detail sections and action forms are readable on phone width.
- `/orders/customers`: confirm long customer names, phone numbers, and remarks wrap inside cards.
- Delivery available list: confirm order-linked delivery cards do not expose price, finance, or customer credit data.

## Manual QA Accounts

- Worker default view: `qa.retail.worker.jc@example.test`.
- Delivery worker view: `qa.delivery.worker.jc@example.test`.
- Manager/admin advanced view: `qa.admin@example.test`.
- Blocked/no-orders view: `qa.noorders@example.test`.
