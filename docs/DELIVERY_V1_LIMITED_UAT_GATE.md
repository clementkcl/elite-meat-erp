# Delivery V1 Limited UAT Gate

Limited UAT is **not ready** until every row below is PASS on the deployed preview.

| Gate | Status | Evidence |
| --- | --- | --- |
| `202607110001_delivery_lorry_shifts_v1.sql` applied | TODO | Remote migration list + table/function checks |
| Deployed `/debug/build` shows branch `codex/delivery-v1-deploy-ready` | TODO | Preview URL + screenshot |
| Deployed `/delivery/driver` shows shared-lorry V1 | TODO | Lorry selection + Delivering, Delivered, Failed |
| Driver login works | TODO | `delivery.driver.qa@elitempsb.com` |
| Assistant joins the same shift independently | TODO | Two-phone shared crew/task screenshot |
| Manager login works | TODO | `delivery.manager.qa@elitempsb.com` |
| Returning crew skip lorry selection | TODO | Refresh/re-login during active shift |
| Delivered workflow works through UI | TODO | Accept -> Goods Loaded -> Start Delivery -> Complete Delivery |
| Failed workflow works through UI | TODO | Report Failed -> reason -> proof upload |
| Shared-state and duplicate-action guards work | TODO | Both phones refresh; simultaneous tap has one winner |
| Route, cash, expense, and manual-stop actions work | TODO | Shared summary/order evidence |
| End Shift closes active crew membership | TODO | Rejoin/select-lorry check after shift end |
| Order status sync works through server actions | TODO | Linked order becomes Delivered or Failed |
| Finance data hidden from driver | TODO | No price/cost/credit/payment/profit/accounting fields visible |
| GPS denied still allows completion | TODO | Proof row logs GPS unavailable |
| Proof upload works on real phone | TODO | Android Chrome and iPhone Safari if available |
| Expense submission works | TODO | Receipt upload visible for manager review |
| Address/GPS suggestion works | TODO | Manager can approve/reject |
| Local smoke/typecheck/lint/build pass | PASS | Run output from deploy branch |

## Current Recommendation

NO-GO for limited UAT until the lorry-shift migration is applied, Vercel deploys the latest `codex/delivery-v1-deploy-ready` branch, and the two-phone QA rows above are completed.

## Readiness Label Rule

Delivery V1 shows operational readiness only:

- Goods Ready: all linked orders are `READY`, `READY_FOR_DELIVERY`, `OUT_FOR_DELIVERY`, `DELIVERED`, or `FAILED`; or an unlinked delivery is already loaded/out/delivered.
- Partially Ready: linked orders are mixed ready and not ready.
- Not Ready: no linked order is ready, or the delivery is still before loading with no linked ready order.

The label does not read stock cost/value, does not scan barcodes, and does not deduct stock. Stock outbound/loading remains in the Stock module.
