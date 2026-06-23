# Stock Test List For Owner

Use this checklist after Supabase is linked and migrations are confirmed. It is written for testing from both:

- Vercel: `https://elite-meat-erp.vercel.app`
- Local app: `http://localhost:3000`

Do not run `db push`, seed, or production data changes until the Supabase target project is confirmed.

## Before You Start

1. Confirm you can sign in with a demo or test user that has Stock module access.
2. Confirm migrations are applied through `supabase/migrations/202606230006_stock_transfer_any_location_v1.sql`.
3. Confirm the latest Vercel deployment includes the Stock Inbound changes.
4. Use test barcodes only. Do not scan real production stock unless the database is the intended staging or production project.
5. Keep one browser tab open for the app and one Supabase SQL Editor tab for evidence checks.

## Stock Mobile UX Quick Pass

Run this first on a phone or mobile viewport around 390px width. Capture one screenshot or short video per failed item.

Codex local QA note: source guards and build checks were run locally, but authenticated 390px browser automation, real phone camera, and Bluetooth printer testing could not be completed from the Windows sandbox. Treat this quick pass as the first required owner/device evidence pass.

1. Open `/stock` as a general worker and confirm only six big buttons appear: Inbound, Outbound, Transfer, Receive, Return / Damage, and Stock Take.
2. Open `/stock/inbound`, choose a recent item or search product, then confirm brand and origin are required before scanning.
3. Scan or manually enter two unique inbound test barcodes and confirm continuous scanning, previous scan product/weight, saved count, and saved total weight stay visible.
4. Scan the same inbound barcode again and confirm a short red duplicate warning.
5. Scan a no-weight barcode and confirm save is blocked with label-generation guidance.
6. Generate an internal label, confirm the stock unit auto-saves, and test `Print label` plus `PDF fallback`.
7. Open `/stock/units/[id]` and confirm label reprint works without a reason field.
8. Open `/stock/outbound`, choose `Order outbound`, confirm the order must be selected first, then scan test barcodes.
9. In outbound, confirm substitution is warning-only and no typed substitution reason is required.
10. Switch to `Direct outbound` and confirm Sales, Processing, Transfer, Sample/Testing, Damage/Spoilage, and Return Supplier are available.
11. Confirm Damage/Spoilage requires photo/reference and creates an approval request only, without deducting stock immediately.
12. Open `/stock/transfer`, select a destination stock location, scan one barcode, and confirm the stock becomes `TRANSFER_PENDING`.
13. Open `/stock/receive-transfer`, try the wrong receiving location, and confirm: `Wrong location. This barcode must be received at [destination location].`
14. Open `/stock/stock-take`, start a session, tap its active-session button, and confirm barcode count progress and total weight progress are visible.
15. Scan a wrong item/brand in stock take and confirm it is blocked.
16. Scan an unknown stock-take barcode and confirm it is recorded as an exception.
17. Turn off internet and confirm all Stock scan pages show: `Connection lost. Please reconnect before scanning.`

Pass result:

- The worker can complete the main Stock flows on phone width without finance data, long technical messages, or desktop-only controls.

## Login And Profile Scope

1. Open `/debug/profile` if available in a non-production-safe environment.
2. Confirm the authenticated user id and email match the expected test account.
3. Confirm the user has the expected role, outlet, department, and stock location.
4. Confirm the scope badge does not show `Profile scope missing`.
5. Confirm the sidebar shows Stock pages for users with Stock module access.
6. Confirm a non-stock user cannot open Stock pages.
7. Sign in as a general worker and confirm Stock Reports and Stock Settings are not shown in the sidebar or ERP Home shortcuts.
8. As the same general worker, try direct URLs `/stock/reports` and `/stock/settings` and confirm the app blocks access with a clear message.
9. Sign in as a manager/admin/director and confirm Stock Reports remains available where that role is allowed.

Pass result:

- Stock worker sees only routine Stock navigation and a valid scope badge.
- Non-stock user is blocked with a clear access message.

## Stock Mobile Home

Page: `/stock` or `/stock/dashboard`

1. Test at phone width around 390px.
2. Sign in as a general worker.
3. Confirm the Stock page shows big buttons only: Inbound, Outbound, Transfer, Receive, Return / Damage, and Stock Take.
4. Confirm no stock value, cost, finance, report, chart, or settings content appears on the worker Stock home.
5. Confirm each button is easy to tap and opens the correct Stock workflow.
6. Confirm any Stock balance or movement pages visible to workers show operational quantity/weight only, not stock value, cost, or finance data.
7. Sign in as a manager/admin/director and confirm their existing dashboard/report access is preserved.

Pass result:

- General worker Stock home is action-only and mobile-friendly.
- Advanced report/settings access remains limited to permitted roles.

## Stock Inbound

Page: `/stock/inbound`

1. Confirm the page opens on desktop and phone width.
2. Confirm the main action area is visible without horizontal scrolling.
3. Confirm recent item/template buttons appear before manual setup.
4. Confirm product search is available for less common items.
5. Confirm inbound source defaults to Supplier/import inside `Weight rule and notes`.
6. Confirm location defaults to the signed-in user's assigned stock location.
7. Confirm location can be edited only to allowed stock locations before the first saved scan.
8. Confirm brand and origin are required before scanning or saving.
9. Confirm a batch number is auto-generated when the page opens.
10. Confirm no Start Batch button is required.

Pass result:

- Worker can start inbound by selecting or reusing product setup and scanning.

## Recent Inbound Templates

1. Open `/stock/inbound`.
2. Confirm recent templates appear before the full manual form.
3. Confirm each template shows simple Brand + Product text, for example `Tican Belly Boneless`.
4. Select a template with brand, product, origin, and location.
5. Confirm the form fills the selected setup.
6. If the template has a saved barcode rule, confirm the scanner can be used immediately.

Pass result:

- Worker can reuse a common setup without retyping product context.

## Continuous Scanning

1. Select item, brand, origin, and location once.
2. Scan or manually enter the first unique barcode.
3. Confirm successful scans save immediately when weight confidence is high.
4. Scan a second unique barcode without resetting the form.
5. Confirm the scanner remains ready for the next scan.
6. Confirm success feedback appears after each saved scan.
7. Confirm the worker cannot change item, brand, origin, or location after the first saved scan until `Finish Inbound Session` is clicked.
8. Confirm weight rule, source, batch, reference, and notes fields are tucked under `Weight rule and notes`.

Pass result:

- Multiple units can be inbounded under one setup without restarting the batch.

## Barcode Weight Rule Save And Reuse

1. Select an item + brand + origin that has no saved rule.
2. Scan a barcode that needs a position rule.
3. Set the weight position, decimals, or fixed-weight fallback as required.
4. Save the rule with the scan.
5. Refresh `/stock/inbound`.
6. Select the same item + brand + origin.
7. Confirm the newest matching rule is reused automatically.
8. Change the rule and confirm the new rule affects future scans only.

Pass result:

- Barcode weight rules are saved by item + brand + origin and reused for later scans.

## Barcode Without Weight To Label Printing

1. Scan a barcode that has no confident weight.
2. Confirm inbound is blocked.
3. Confirm the message tells the worker to generate and print a barcode label.
4. Enter weight on the label-generation area.
5. Tap `Generate internal label`.
6. Confirm the generated numeric-only internal barcode saves the stock unit immediately.
7. Confirm the label preview contains company name, product name, weight, and barcode.
8. Confirm the barcode itself does not include `KG` text.
9. Tap `Print label` and choose the Bluetooth label printer from the phone print sheet if available.
10. If the Bluetooth printer is not available, tap `PDF fallback` and save the 50mm x 30mm label as PDF.
11. Confirm the printed label has a clear machine-readable Code 128 barcode plus the human-readable number.
12. Attach the label.
13. Scan the generated barcode back into `/stock/inbound`.

Pass result:

- No-weight supplier barcodes are not saved as main stock barcodes. Generated labels are used instead.
- Browser Bluetooth printing is treated as device-dependent; PDF fallback must remain available.

## Duplicate Barcode Block

1. Inbound one unique barcode successfully.
2. Scan the same barcode again in the same session.
3. Confirm the app blocks the duplicate before saving.
4. Confirm the blocked message is short, red, and says the duplicate is blocked.
5. Refresh and try the same barcode again.
6. Confirm the duplicate is still blocked from existing stock-unit data.

Pass result:

- Duplicate inbound barcode is blocked with a clear worker-facing message.

## Previous Scan Display

1. Save a successful inbound scan.
2. Confirm the previous saved scan shows product name, weight, and barcode.
3. Save another scan with a different weight.
4. Confirm the previous scan display updates so the worker can compare the latest result.

Pass result:

- Worker can visually compare the latest and previous scanned product/weight.

## Saved Scan Count And Total Weight

1. Start an inbound session.
2. Save three unique barcode scans.
3. Confirm saved scan count increases after each scan.
4. Confirm saved total weight equals the sum of saved non-voided scans in the current session.
5. Confirm duplicate or failed scans do not increase the saved count or weight.

Pass result:

- Session summary counters reflect only successful current-session scans.

## Undo Scan And VOIDED Status

1. Save a unique inbound scan.
2. Click `Undo scan` for that current-session scan.
3. Enter or accept the undo reason.
4. Confirm the UI reports that the inbound scan was undone and audit trail was kept.
5. Confirm the scan row status becomes `VOIDED`.
6. Confirm the original unit was not silently deleted.
7. Finish the inbound session.
8. Confirm normal worker undo is no longer available after finishing.

Pass result:

- Undo voids the current-session unit and keeps audit history.

## Stock Movement INBOUND_VOID

Page: `/stock/movements`

1. Undo a current-session inbound scan.
2. Open `/stock/movements`.
3. Find the original `INBOUND` movement.
4. Find a matching `INBOUND_VOID` movement.
5. Confirm the `INBOUND_VOID` movement has negative quantity or negative weight.
6. Confirm the movement is linked to the same stock unit or barcode.

Pass result:

- Undo writes a clear reverse movement instead of deleting history.

## Stock Balance Excludes Voided Units

Page: `/stock/balance`

1. Inbound a barcode and note its item, brand, location, and weight.
2. Confirm stock balance includes the weight.
3. Undo that inbound scan.
4. Refresh `/stock/balance`.
5. Confirm available stock excludes the voided unit.
6. Confirm reports do not treat `VOIDED` as available sellable stock.

Pass result:

- Voided units are excluded from active balance.

## Outbound Order-Based Scanning

Page: `/stock/outbound`

1. Test at phone width around 390px.
2. Confirm `Order outbound` and `Direct outbound` appear as large buttons.
3. Select `Order outbound`.
4. Confirm no order is auto-selected; the worker must choose a ready order first.
5. Select a ready customer order.
6. Scan multiple barcodes under the same order.
7. Confirm saved scan count and known weight are easy to read.
8. Include a substituted item if needed.
9. Confirm substitution shows a yellow warning only and no typed reason field is required.
10. Confirm meat weight differences show a warning but do not block when other rules allow.
11. Confirm missing, duplicate, already-outbounded, wrong-status, and wrong-location barcodes are blocked with short red messages.
12. Confirm successful outbound creates stock movements and scan logs.

Pass result:

- Ready orders can be outbounded by barcode batch, with blocked scans clearly explained.

## Direct Outbound Mobile Flow

Page: `/stock/outbound`

1. Test at phone width around 390px.
2. Select `Direct outbound`.
3. Confirm the visible direct options are Sales, Processing, Transfer, Sample/Testing, Damage/Spoilage, and Return Supplier.
4. Select `Sales` and confirm no customer name field is required.
5. Select `Sample/Testing` and confirm no photo field is required.
6. Select `Damage/Spoilage`.
7. Confirm damage reason and photo reference are required.
8. Confirm the worker message says stock goes to approval.
9. Confirm damage/spoilage creates an approval request only and does not deduct stock immediately.
10. Confirm direct outbound still requires notes/remarks.

Pass result:

- General workers can use direct outbound without finance/customer details, while damage remains approval-only.

## Transfer And Receive Transfer

Pages:

- `/stock/transfer`
- `/stock/receive-transfer`

1. Scan a barcode for transfer outbound.
2. Confirm the destination selector shows stock locations.
3. Confirm status becomes `TRANSFER_PENDING`.
4. Confirm location does not change immediately.
5. Confirm selecting the same destination as current location is blocked.
6. If a configured destination is not allowed by the current server rules, confirm the worker sees `Choose an allowed stock location.`
7. Open `/stock/receive-transfer`.
8. Select a wrong receiving stock location.
9. Scan the transfer-pending barcode.
10. Confirm receive is blocked with: `Wrong location. This barcode must be received at [destination location].`
11. Select the correct destination stock location.
12. Scan the transfer-pending barcode.
13. Confirm location changes only after receive-transfer scan.
14. Confirm transfers pending more than 3 days visibly flag sender manager, receiver manager, admin, and director.

Pass result:

- Transfer location changes only after destination receive scan, and wrong-location receive is not allowed for MVP.

## Return Stock Becomes IN_STOCK

Page: `/stock/return`

1. Test at phone width around 390px.
2. Confirm the normal return form is scan-first: barcode, return location, then `Save return`.
3. Confirm reference number and notes are inside the optional `Reference and notes` panel.
4. Scan a stock unit that is eligible for return.
5. Complete return with allowed location.
6. Confirm the returned unit status becomes `IN_STOCK` when the workflow allows sellable return.
7. For customer returns after sale, confirm it goes to `HOLD` or `INSPECTION` first.
8. Confirm release from inspection requires manager/admin flow where available.
9. Confirm blocked return messages are short and red.

Pass result:

- Normal returns become `IN_STOCK`; customer returns are inspected first.

## Damage And Spoilage Approval

Page: `/stock/return`

1. Test at phone width around 390px.
2. Confirm the damage/spoilage form is scan-first and uses a large `Submit damage request` button.
3. Create a damage/spoilage request from a barcode unit.
4. Attach required photo evidence or photo reference.
5. Select one large reason button: expired, broken packaging, smell, wrong temperature, customer rejected, or other.
6. Confirm notes are optional and tucked behind the `Notes` panel.
7. Confirm stock is not deducted at staff request time.
8. Confirm the page shows: `Photo required. Request only; stock is not deducted now.`
9. Review as department manager.
10. Approve as director.
11. Confirm stock is deducted only after final director approval.
12. Confirm report rows show linked barcode weight.

Pass result:

- Damage/spoilage follows request -> manager review -> director approval before deduction.

## Return Supplier Approval

Page: `/stock/return`

1. Test at phone width around 390px.
2. Confirm the return-supplier form is scan-first and uses a large `Submit return supplier` button.
3. Scan a barcode and enter supplier name.
4. Confirm notes are optional and tucked behind the `Notes` panel.
5. Submit the request.
6. Confirm the page shows: `Stock goes on supplier hold until manager approval.`
7. Confirm stock is held/unavailable until manager approval.
8. Approve as manager.
9. Confirm stock is deducted only after manager approval.

Pass result:

- Return supplier follows staff request -> supplier hold -> manager approval before deduction.

## Stock Take Manager Review And Director Approval

Page: `/stock/stock-take`

1. Test at phone width around 390px.
2. Create a stock take session by location.
3. Select the item + brand under stock take.
4. Confirm the page shows this warning:
   `Stock take is active for this item/brand/location. You can continue, but this movement will be recorded.`
5. Confirm active draft sessions appear as large tap buttons before the session dropdown.
6. Tap the active session button before scanning.
7. Turn off internet and confirm scanning is blocked with `Connection lost. Please reconnect before scanning.`
8. Reconnect internet.
9. Scan barcode counts as staff.
10. Confirm stock take is barcode-only and no manual count entry is available.
11. Confirm barcode progress shows count, for example `80/100`.
12. Confirm weight progress shows scanned weight and expected weight.
13. Scan a wrong item or wrong brand and confirm the barcode is blocked with a short red message.
14. Scan an unknown barcode and confirm it is listed as a pending `UNKNOWN BARCODE` exception, without creating a stock unit yet.
15. Scan a barcode from another location for the same item + brand and confirm it is listed as a pending `WRONG LOCATION` exception.
16. Submit for manager review.
17. Confirm manager signature is required.
18. Submit for director final approval.
19. Confirm director signature is required.
20. Confirm `STOCK_TAKE_ADJUSTMENT` is created only after director approval.
21. After manager review and director approval, confirm the unknown barcode creates a stock unit and the wrong-location barcode moves to the counted location.
22. While the stock take is still active, perform a matching inbound/outbound/transfer action and confirm it succeeds with the same yellow warning instead of blocking.

Pass result:

- Stock take adjustment and exception resolution are not applied until manager review and director approval are complete.
- Other stock movements for the active item + brand + location show a warning and audit trail, but are not blocked.

## Reports CSV And PDF

Page: `/stock/reports`

1. Open stock balance report.
2. Confirm report rows include stock movement history, inbound, outbound, transfer pending, old stock 6 months, stock take variance, damage/spoilage, return supplier, and barcode scan errors when data exists.
3. Test date range, outlet/location, item, brand, origin, status, user, and movement type filters.
4. Export CSV and confirm headers and weights are correct.
5. Use browser print or save as PDF and confirm layout is readable and shows Elite Meat.
6. Open stock take variance report rows and confirm manager/director signature text is visible.
7. Open damage/spoilage report rows.
8. Confirm linked barcode weights are not zero when a stock unit exists.

Pass result:

- Reports are filterable and usable for CSV and print/PDF review.

## Mobile Scanner On Phone

1. Open Vercel on a real phone using HTTPS.
2. Sign in as a stock user.
3. Open `/stock/inbound`.
4. Confirm the layout is usable around 390px width.
5. Confirm recent item buttons, product search, required brand/origin, and location are visible without horizontal scrolling.
6. Tap the large Scan Barcode button.
7. Allow camera permission.
8. Confirm rear camera is preferred where the browser supports it.
9. Confirm manual fallback works if camera permission is denied.
10. Confirm successful scan gives visible feedback and sound/vibration where supported.
11. Confirm previous scan, saved count, saved total weight, and recent scan list remain readable on the phone.
12. Turn off internet and confirm inbound, outbound, transfer, receive-transfer, return/damage, and stock-take scans are blocked with `Connection lost. Please reconnect before scanning.`
13. Trigger one blocked save, for example wrong location or duplicate barcode, and confirm the worker sees a short message, not raw database/RLS text.

Pass result:

- A worker can scan continuously from a phone without needing desktop layout.
- Stock scanning is online-only for MVP and blocks clearly when the connection is lost.
- Stock blocked/error states are short, clear, and non-technical.

Local source guard:

- `npm.cmd run smoke` includes `scripts/stock-mobile-ux-coverage.mjs` to catch regressions in the six-button Stock worker home, scan-first worker flows, 390px mobile class markers, and mobile label reprint copy. This is helpful coverage, but real phone camera and printer QA is still required.

## Mobile Label Reprint

Page: `/stock/units/[id]`

1. Open a real stock unit from `/stock/balance`.
2. Confirm the page works at phone width around 390px.
3. Confirm `Print label` and `PDF fallback` are visible without needing a reason field.
4. Confirm the label preview is simple and readable.
5. Confirm the label content shows Elite Meat, product name, weight, and barcode.
6. Tap `Print label` and choose a Bluetooth label printer from the phone print sheet if available.
7. If Bluetooth printing is not available or unreliable, tap `PDF fallback`.
8. Confirm the print/PDF output is one 50mm x 30mm label page.

Pass result:

- Workers can reprint old labels from mobile without typing a reason.

## Evidence To Capture

For each test section, capture:

- User email and role.
- Page URL.
- Screenshot of success or blocked state.
- Barcode used.
- Stock unit id if available.
- Movement type if applicable.
- Any error message shown.

## Stop Conditions

Stop testing and document the exact error if:

- Profile scope is missing.
- Stock pages are hidden for an expected stock user.
- A migration enum or RPC is missing.
- Duplicate barcode is saved successfully.
- Undo deletes rows instead of voiding them.
- `INBOUND_VOID` is missing after undo.
- Voided units remain in active stock balance.
- Stock movement happens in the wrong location.
