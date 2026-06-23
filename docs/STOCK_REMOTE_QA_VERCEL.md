# Stock Remote QA On Vercel

Use this when testing from the deployed app:

`https://elite-meat-erp.vercel.app`

This document assumes the target Supabase project has already been migrated through `supabase/migrations/202606230006_stock_transfer_any_location_v1.sql`.

## Do Not Do From Vercel QA

- Do not run live migrations from the browser.
- Do not run seed data unless you intentionally want demo data in the target database.
- Do not test with production stock barcodes unless the database is meant for production testing.

## Required Pages

Test these exact pages:

- `/stock` or `/stock/dashboard`
- `/stock/inbound`
- `/stock/outbound`
- `/stock/transfer`
- `/stock/receive-transfer`
- `/stock/return`
- `/stock/balance`
- `/stock/movements`
- `/stock/stock-take`
- `/stock/reports`
- `/stock/units/[id]`

## First 390px Mobile QA Pass

Run this from the Vercel app first, using a real phone when possible. If using desktop Chrome/Edge, use responsive mode around 390px width.

Codex prepared this pass with local source guards and project checks. Real Vercel login, phone camera permission, Bluetooth label printing, and Supabase-backed workflow evidence still need to be captured by the owner.

1. `/stock`: confirm six big worker buttons only: Inbound, Outbound, Transfer, Receive, Return / Damage, Stock Take.
2. `/stock/inbound`: confirm recent item buttons, search, required brand/origin, editable location, and no horizontal scrolling.
3. `/stock/inbound`: scan or manually enter two unique barcodes and confirm continuous scanning, previous scan product/weight, saved count, and saved total weight.
4. `/stock/inbound`: scan a duplicate and confirm a short red duplicate warning.
5. `/stock/inbound`: scan a no-weight barcode and confirm the app guides the worker to generate an internal label.
6. `/stock/inbound`: generate an internal label and confirm stock auto-saves, then test `Print label` and `PDF fallback`.
7. `/stock/units/[id]`: reprint an old label without entering a reason.
8. `/stock/outbound`: choose `Order outbound`, confirm order selection is required first, and scan order barcodes.
9. `/stock/outbound`: confirm substitution is warning-only and no typed reason is required.
10. `/stock/outbound`: choose `Direct outbound` and confirm Sales, Processing, Transfer, Sample/Testing, Damage/Spoilage, and Return Supplier.
11. `/stock/return`: create a damage/spoilage request and confirm photo/reference is required and stock is not deducted immediately.
12. `/stock/transfer`: select destination stock location, scan barcode, and confirm `TRANSFER_PENDING`.
13. `/stock/receive-transfer`: try receiving at the wrong location and confirm `Wrong location. This barcode must be received at [destination location].`
14. `/stock/stock-take`: start a session and confirm barcode count progress and weight progress are visible.
15. `/stock/stock-take`: scan wrong item/brand and confirm it is blocked.
16. `/stock/stock-take`: scan unknown barcode and confirm it is recorded as an exception.
17. Turn off internet and confirm inbound, outbound, transfer, receive-transfer, return/damage, and stock-take show `Connection lost. Please reconnect before scanning.`

If phone camera or Bluetooth label printer cannot be tested:

- Record browser/device used.
- Confirm manual barcode fallback works.
- Confirm `PDF fallback` works for labels.
- Mark camera permission, rear camera, vibration, and Bluetooth printer as pending physical-device QA.

## Page Checklist

### `/stock` or `/stock/dashboard`

1. Test at phone width around 390px.
2. Sign in as a general worker.
3. Confirm the page shows big buttons only: Inbound, Outbound, Transfer, Receive, Return / Damage, and Stock Take.
4. Confirm Stock Reports and Stock Settings are not shown in the worker sidebar or ERP Home shortcuts.
5. Try direct URLs `/stock/reports` and `/stock/settings` as a general worker and confirm the app blocks access with a clear message.
6. Confirm no value, cost, finance, report, settings, KPI, chart, or movement table appears on the worker Stock home.
7. Confirm any Stock balance or movement pages visible to workers show operational quantity/weight only, not stock value, cost, or finance data.
8. Sign in as a manager/admin/director and confirm their existing Stock dashboard/report access still appears where allowed.

### `/stock/inbound`

1. Confirm recent inbound templates appear first.
2. Confirm product search is available under the recent templates.
3. Confirm brand and origin are required before scan/save.
4. Confirm batch number auto-generates.
5. Confirm inbound source is inside `Weight rule and notes` and defaults to Supplier/import.
6. Confirm location defaults to the signed-in user's stock location and can be edited before the first saved scan.
7. Confirm saved barcode weight rule is reused for item + brand + origin.
8. Confirm continuous scan saves valid unique barcodes.
9. Confirm item, brand, origin, and location lock after the first saved scan until `Finish Inbound Session`.
10. Confirm no-weight barcode is blocked with label-printing guidance.
11. Confirm `Generate internal label` saves the stock unit immediately after weight is entered.
12. Confirm `Print label` is the primary label action and `PDF fallback` remains available.
13. Confirm the label preview is simple and readable at phone width.
14. Confirm the printed/PDF label shows a machine-readable Code 128 barcode and the same human-readable barcode number.
15. Confirm duplicate barcode is blocked with a short red warning.
16. Confirm previous scan product name, previous weight, saved scan count, and saved total weight update.
17. Confirm undo changes current-session scan to `VOIDED`.
18. Confirm Finish Inbound Session shows the session summary.

### `/stock/outbound`

1. Test at phone width around 390px.
2. Confirm `Order outbound` and `Direct outbound` appear as large tap buttons.
3. Confirm order-based outbound does not auto-select an order.
4. Confirm the worker sees `Select order first.` before scanning/confirming.
5. Select a ready customer order and scan multiple barcodes.
6. Confirm duplicate scans in the same batch are blocked.
7. Confirm missing, already-outbounded, wrong-status, and wrong-location barcodes are blocked with short red messages.
8. Confirm scanned total differences show a yellow warning but can continue when business rules allow.
9. Confirm an item not on the order shows substitution warning only and no typed substitution reason is required.
10. Switch to `Direct outbound`.
11. Confirm direct options are Sales, Processing, Transfer, Sample/Testing, Damage/Spoilage, and Return Supplier.
12. Confirm direct Sales does not ask for customer name.
13. Confirm direct Sample/Testing does not ask for photo.
14. Confirm direct Damage/Spoilage shows large reason buttons, requires photo reference, creates a pending request, and does not deduct stock immediately.
15. Confirm direct return supplier requires supplier name and moves stock to `HOLD_RETURN_SUPPLIER`.
16. Confirm direct outbound still requires remarks.

### `/stock/transfer`

1. Confirm transfer scan sets stock to `TRANSFER_PENDING`.
2. Confirm the destination selector shows stock locations.
3. Confirm the actual stock location does not change after transfer outbound.
4. Confirm the mobile flow is destination stock location, barcode, then `Send transfer`.
5. Confirm same-destination transfer is blocked.
6. Confirm transfer cannot be cancelled after scanned out.

### `/stock/receive-transfer`

1. Scan a transfer-pending barcode.
2. Confirm location changes only after receive-transfer scan.
3. Confirm movement and scan-log evidence is visible.
4. Scan from the wrong receiving location.
5. Confirm receive is blocked with: `Wrong location. This barcode must be received at [destination location].`
6. Confirm no wrong-location exception receive is created for MVP.
7. Confirm the mobile flow is receiving stock location, barcode, then `Receive barcode`.
8. Confirm old pending transfers show an overdue alert after 3 days for sender manager, receiver manager, admin, and director.

### `/stock/return`

1. Test at phone width around 390px.
2. Confirm normal return is scan-first: barcode, location, then `Save return`.
3. Confirm reference number and notes stay inside the optional panel.
4. Return an eligible barcode unit.
5. Confirm normal return becomes `IN_STOCK`.
6. Confirm customer return after sale goes to `HOLD` or `INSPECTION` first.
7. Confirm the worker sees a clear red message if the return is blocked.
8. Confirm damage/spoilage is scan-first, requires photo reference, and says: `Photo required. Request only; stock is not deducted now.`
9. Confirm damage/spoilage creates an approval request and does not deduct stock immediately.
10. Confirm return supplier is scan-first and says: `Stock goes on supplier hold until manager approval.`
11. Confirm return supplier deducts stock only after manager approval.

### `/stock/balance`

1. Confirm active barcode stock appears by item, brand, location, and age.
2. Confirm `VOIDED` stock units are not counted as active balance.
3. Confirm old stock warnings appear at 6 months and 12 months.
4. Confirm negative stock alerts are visible if negative no-barcode legacy data exists.

### `/stock/movements`

1. Confirm inbound scan creates `INBOUND`.
2. Confirm undo creates `INBOUND_VOID`.
3. Confirm outbound creates the correct outbound movement.
4. Confirm transfer and receive-transfer movements are auditable.
5. Confirm scan logs match the stock movement story.

### `/stock/stock-take`

1. Test at phone width around 390px.
2. Create a stock take session by location.
3. Select item + brand under stock take.
4. Confirm the page shows: `Stock take is active for this item/brand/location. You can continue, but this movement will be recorded.`
5. Confirm active draft sessions appear as large tap buttons before the session dropdown.
6. Tap the active session button and confirm the scan form changes to that session.
7. Confirm stock take scan is barcode-only and no manual count entry appears.
8. Turn off internet and confirm scanning is blocked with a short red message.
9. Reconnect internet and scan/count barcodes.
10. Confirm barcode progress shows scanned count versus expected count.
11. Confirm weight progress shows scanned weight versus expected weight.
12. Scan a wrong item/brand barcode and confirm it is blocked.
13. Scan an unknown barcode and confirm it appears as an `UNKNOWN BARCODE` exception instead of creating stock immediately.
14. Scan a barcode from another location under the same item + brand and confirm it appears as a `WRONG LOCATION` exception.
15. Submit for manager review.
16. Approve as director.
17. Confirm `STOCK_TAKE_ADJUSTMENT` happens only after director approval.
18. Confirm manager and director signatures are required.
19. After manager review and director approval, confirm the unknown barcode creates a stock unit and the wrong-location barcode moves to the counted location.
20. During an active session, run another matching stock movement and confirm the action succeeds with the yellow warning instead of blocking.

### `/stock/reports`

1. Open stock balance report.
2. Confirm report rows include stock movement history, inbound, outbound, transfer pending, old stock 6 months, stock take variance, damage/spoilage, return supplier, and barcode scan errors when data exists.
3. Test filters for date range, outlet/location, item, brand, origin, status, user, and movement type.
4. Export CSV.
5. Use browser print/save as PDF and confirm the formal report title shows Elite Meat.
6. Open stock take variance report rows and confirm manager/director signature text is visible.
7. Open damage/spoilage report rows and confirm linked barcode weight and signature text are visible when a stock unit exists.

### `/stock/units/[id]`

1. Open a real stock unit detail page from balance or movements.
2. Confirm barcode, item, brand, origin, weight, status, location, and inbound date are visible.
3. Confirm movement history includes rows linked by stock unit id or barcode.
4. Confirm workers can reprint without entering a reason.
5. Confirm `Print label` opens the phone/browser print sheet for a Bluetooth label printer where supported.
6. Confirm `PDF fallback` remains available when Bluetooth/browser printing is unreliable.
7. Confirm label reprint uses one 50mm x 30mm label page.
8. Confirm the label contains company name, product name, weight, and barcode.

## Phone QA

1. Test from a phone on HTTPS.
2. Confirm the hamburger/mobile navigation works.
3. Confirm `/stock/inbound` has no horizontal scrolling around 390px width.
4. Confirm recent item buttons plus search are easy to use.
5. Confirm the large Scan Barcode button is easy to tap.
6. Confirm the browser asks for camera permission.
7. Confirm rear camera is preferred where supported.
8. Confirm manual barcode fallback works.
9. Confirm success/error/blocked messages are short and readable.
10. Confirm previous scan, saved count, saved total weight, and recent scan list stay readable after multiple scans.
11. Confirm label print buttons fit at 390px width.
12. Confirm Bluetooth printer selection is available through the phone print sheet when the browser/device supports it.
13. Confirm PDF fallback works when Bluetooth printing is not available.
14. Turn off internet and confirm inbound, outbound, transfer, receive-transfer, return/damage, and stock-take scans are blocked with `Connection lost. Please reconnect before scanning.`
15. Trigger one blocked save, for example wrong location or duplicate barcode, and confirm the worker sees a short message instead of raw database/RLS text.

Local source guard:

- `npm.cmd run smoke` includes `scripts/stock-mobile-ux-coverage.mjs` to guard the six-button worker Stock home, scan-first worker pages, 390px mobile class markers, and mobile label reprint copy. This does not replace real phone testing.

## Desktop QA

1. Test from Chrome or Edge on desktop.
2. Confirm manual barcode entry works even without a camera.
3. Confirm print preview for labels uses one 50mm x 30mm label per page.
4. Confirm stock reports print/PDF layout is readable.

## Expected Result Summary

Stock Inbound is ready for internal testing when:

- A valid stock user can inbound several barcode units continuously.
- Barcode rules are reused by item + brand + origin.
- No-weight barcodes are blocked until label generation.
- Duplicate barcodes are blocked.
- Undo writes `VOIDED` and `INBOUND_VOID`.
- Balance excludes voided units.
- Transfer location changes only after receive-transfer.
- Transfer destination is selected as an active stock location. Migration `202606230006` removes the older outlet-default-only destination restriction while keeping wrong-location receive blocked.
- Wrong-location receive-transfer is blocked for MVP.
- Stock take adjustment applies only after director approval.
