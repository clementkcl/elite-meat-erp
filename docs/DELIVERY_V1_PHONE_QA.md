# Delivery V1 Real Phone QA

Use the deployed Vercel preview that shows `/debug/build` for branch `codex/delivery-v1-deploy-ready`.

Do not record passwords in this document.

## Test Users

- Driver: `delivery.driver.qa@elitempsb.com`
- Assistant/isolation user: `delivery.other.qa@elitempsb.com`
- Manager: `delivery.manager.qa@elitempsb.com`

## Android Chrome

- [ ] Login as driver.
- [ ] Open `/delivery/driver`.
- [ ] Select the assigned lorry and confirm Delivery Home opens.
- [ ] Login as the assistant on a second phone and select the same lorry.
- [ ] Confirm both phones show the same driver, assistant, tasks, route, cash, and expenses.
- [ ] Refresh both phones and confirm lorry selection is skipped for the active shift.
- [ ] Confirm tabs: Delivering, Delivered, Failed.
- [ ] Confirm no price, cost, stock value, credit, payment, profit, accounting, or finance data is visible.
- [ ] Confirm one highlighted next stop and one large primary action are visible.
- [ ] Tap Accept Delivery.
- [ ] Confirm the primary action changes to Goods Loaded on both phones.
- [ ] Tap Goods Loaded.
- [ ] Tap Start Delivery.
- [ ] Confirm a second stop cannot be started while the first is out for delivery.
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
- [ ] Confirm the active lorry is filled automatically and delivery link is optional.
- [ ] Record crew cash and confirm the shared cash summary updates.
- [ ] Rearrange accepted stops using drag and the up/down controls; confirm both phones receive the order.
- [ ] Add one unexpected stop.
- [ ] Submit Address Issue.
- [ ] Save Current Location as Suggested Customer GPS.
- [ ] Change lorry and confirm the warning appears.
- [ ] Try End Shift with unfinished work and confirm it is blocked.
- [ ] Finish the work, end the shift, and confirm both crew memberships close.

## iPhone Safari

- [ ] Repeat driver login.
- [ ] Confirm camera opens from Complete Delivery.
- [ ] Confirm camera denied shows browser permission behavior and does not mark delivered without a photo.
- [ ] Confirm GPS allowed stores coordinates.
- [ ] Confirm GPS denied still allows completion and logs GPS unavailable.
- [ ] Confirm Google Maps, Call, WhatsApp links open the correct apps.
- [ ] Confirm receipt upload works.
- [ ] Confirm Address Issue works.
- [ ] Confirm the shared lorry layout fits without horizontal scrolling.

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
