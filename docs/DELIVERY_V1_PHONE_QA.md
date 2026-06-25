# Delivery V1 Real Phone QA

Use the deployed Vercel preview that shows `/debug/build` for branch `codex/delivery-v1-deploy-ready`.

Do not record passwords in this document.

## Test Users

- Driver: `delivery.driver.qa@elitempsb.com`
- Manager: `delivery.manager.qa@elitempsb.com`

## Android Chrome

- [ ] Login as driver.
- [ ] Open `/delivery/driver`.
- [ ] Confirm tabs: Available, My Deliveries, Completed, Failed, Expenses.
- [ ] Confirm no price, cost, stock value, credit, payment, profit, accounting, or finance data is visible.
- [ ] Confirm each card shows status and one readiness label: Goods Ready, Not Ready, or Partially Ready.
- [ ] In Available, tap Accept Delivery.
- [ ] Confirm the delivery moves to My Deliveries.
- [ ] Tap Mark Loaded.
- [ ] Tap Start Delivery.
- [ ] Tap Google Maps and confirm it opens Google Maps.
- [ ] Tap Call and confirm the phone dialer opens.
- [ ] Tap WhatsApp and confirm WhatsApp opens.
- [ ] Tap Complete Delivery with camera allowed.
- [ ] Allow GPS and confirm proof upload completes.
- [ ] Confirm delivery becomes Delivered and linked order becomes Delivered.
- [ ] Repeat on a separate delivery with GPS denied; proof must still complete and log GPS unavailable.
- [ ] Tap Report Failed on a separate delivery.
- [ ] Confirm failed reason buttons appear.
- [ ] Confirm Other requires a remark.
- [ ] Upload failed proof and confirm delivery/order become Failed.
- [ ] Submit an expense with receipt photo.
- [ ] Submit Address Issue.
- [ ] Save Current Location as Suggested Customer GPS.

## iPhone Safari

- [ ] Repeat driver login.
- [ ] Confirm camera opens from Complete Delivery.
- [ ] Confirm camera denied shows browser permission behavior and does not mark delivered without a photo.
- [ ] Confirm GPS allowed stores coordinates.
- [ ] Confirm GPS denied still allows completion and logs GPS unavailable.
- [ ] Confirm Google Maps, Call, WhatsApp links open the correct apps.
- [ ] Confirm receipt upload works.
- [ ] Confirm Address Issue works.

## Manager Review

- [ ] Login as manager.
- [ ] Open `/delivery`.
- [ ] Confirm Needs Review First appears above filters/KPIs.
- [ ] Review failed deliveries.
- [ ] Review GPS unavailable deliveries.
- [ ] Review address/GPS suggestions.
- [ ] Review pending expenses.
- [ ] Confirm manager sees only allowed outlet/team scope.

## Evidence To Save

- Device/browser.
- Preview URL.
- `/debug/build` branch and commit.
- Delivery number.
- Action result.
- Screenshot or short screen recording when possible.
