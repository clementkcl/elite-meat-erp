# Stock Remote QA On Vercel

Use this when testing from the deployed app:

`https://elite-meat-erp.vercel.app`

This document assumes the target Supabase project has already been migrated through `supabase/migrations/202606230006_stock_transfer_any_location_v1.sql`.

Use `docs/STOCK_MOBILE_UX_REQUIREMENT_AUDIT.md` beside this checklist to see each confirmed Stock Mobile MVP rule, current source evidence, and the remaining owner/device proof needed.

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

## Guided Stock Inbound Vercel QA

Page: `https://elite-meat-erp.vercel.app/stock/inbound`

Use this focused pass before the broad Stock Mobile QA list. It proves the current guided inbound work from a real deployed app session.

### Supplier Barcode Flow

1. Sign in with a Stock test user and open `/stock/inbound`.
2. Confirm the session code is shown and cannot be edited.
3. Select product `Belly Boneless` and manufacturer `Locks NV`, or use equivalent test values if those demo rows are not available.
4. Confirm the UI displays `Locks NV Belly Boneless` and still lets you filter/report product and manufacturer separately.
5. Confirm location defaults from the user profile and location editing is under `Change Location`.
6. Confirm the supplier-barcode path moves through setup, barcode rule, scanner, and summary.
7. Scan or paste one supplier barcode, type its real kg once, and save the barcode rule.
8. Scan a second same-format supplier barcode and confirm weight is auto-extracted.
9. Scan a different-length barcode and confirm `Barcode length is different from saved rule.` appears as a warning.
10. Scan a duplicate barcode and confirm `Duplicate barcode. Inbound is blocked.` appears in red and is logged as a failed scan.
11. Test the scanner popup external input with a handheld scanner or keyboard Enter and confirm the latest barcode is saved.
12. Confirm live count, live total weight, previous scanned item, previous scanned barcode, and previous scanned weight stay visible.
13. Undo the previous test scan and confirm it is voided with audit history.
14. Finish the session and confirm the summary includes product, manufacturer, total count, total weight, saved scans, failed scans, scanned-by names, and print-ready area.
15. On test data only, use whole-session undo/delete and confirm it requires confirmation and voids stock safely.

### No Supplier Barcode Flow

1. Open a fresh `/stock/inbound` session.
2. Select item, manufacturer, origin, and profile-default location once.
3. Use the no-supplier/internal-label path.
4. Confirm the scanner stays hidden until a label is generated.
5. Enter one weight, generate a numeric-only internal barcode, and confirm the 50mm x 30mm label preview shows company, product, weight, and barcode.
6. Print with Bluetooth label printer if available; otherwise use PDF fallback.
7. Attach the label, scan it back, and confirm stock saves only after the printed label is scanned.
8. Confirm the page returns to the weight field for the next unit.
9. Enter a second weight and confirm previous saved item/weight, session count, and total weight update.
10. Finish the session and capture the summary screen.

If phone camera or Bluetooth printing cannot be tested, record the browser/device used and mark camera permission, rear camera, vibration, Bluetooth printer selection, and physical label scan as pending owner/device QA.

## First 390px Mobile QA Pass

Run this from the Vercel app first, using a real phone when possible. If using desktop Chrome/Edge, use responsive mode around 390px width.

Codex prepared this pass with local source guards and project checks. Real Vercel login, phone camera permission, Bluetooth label printing, and Supabase-backed workflow evidence still need to be captured by the owner.

Latest Codex QA preparation note, 2026-06-24:

- Stock Item Master edit now has item-code/product search before the edit dropdown; search one existing and one missing product on `/stock/items`.
- Stock Item Master edit now starts blank; open `/stock/items`, select a product, and confirm active/barcode-required toggles are under `Advanced item settings`.
- Barcode Inbound internal-label saves now return focus to `Net weight kg`; generate two internal labels in one session and confirm the worker can enter the next weight without tapping back into the field.
- Stock barcode fields now treat Enter in the manual barcode input as a scan; test one USB/Bluetooth scanner that sends Enter on inbound, outbound, transfer, receive, return, and stock-take.
- Barcode Inbound now tells workers `No weight position found. Use internal label.` when a typed actual kg cannot teach a supplier barcode weight-position rule; test this before label generation.
- Stock Outbound direct scan prerequisites are now guarded inside the scan handler, not only by disabled fields; confirm direct Sales is blocked until a customer is selected, while Damage/photo, Return Supplier/supplier, and Transfer/destination blockers reject camera/manual scans before adding a row.
- Stock table sort buttons now use phone-size tap targets and Stock table values wrap instead of clipping; confirm table headers under the mobile cards are easier to tap and long barcodes/locations/references remain readable at 390px.
- Stock alert cards now wrap negative-stock, old-stock, and overdue-transfer item/location/reason text; confirm red/yellow/orange alert cards stay readable at 390px.
- Stock shortcut buttons now use flexible minimum height; confirm Inbound, Outbound, Transfer, Receive, Return/Damage, and Stock Take labels stay readable and unclipped at 390px, including with larger browser text.
- Stock inbound disclosure headers now use phone-size tap targets; confirm `New product`, `Weight rule and notes`, quick product `Create`, duplicate warnings, and decode warnings stay easy to tap/read at 390px.
- Stock workflow disclosure headers now use phone-size tap targets; confirm optional/reference sections on Outbound, Transfer, Receive, Return/Damage, and Return Supplier are easy to open at 390px.
- Stock label previews now wrap company, product, and weight text; confirm long product names remain readable before Bluetooth print or PDF fallback at 390px.
- Stock unit movement cards now stack movement type/date and weight on narrow phones; confirm `/stock/units/[id]` movement history stays readable at 390px.
- Stock mobile item-master cards now wrap long item code, item name, category, section, brand, and barcode requirement values; confirm `/stock/items` cards do not overflow at 390px.
- Stock mobile item-master, balance, and barcode-unit card headers now stack the status badge under the item text below 390px, then align side by side at 390px; confirm long item names and badges do not squeeze each other.
- Stock movement/report filter buttons now use phone-size tap targets; confirm `Filter` and `Filter reports` are easy to tap at 390px.
- Stock unit detail/reprint now wraps long item name, barcode, status, item code, brand, origin, location, inbound source, and batch fields; confirm `/stock/units/[id]` stays readable at 390px.
- Stock mobile balance, barcode-unit, movement-history, and stock-unit detail cards now wrap long item, brand, origin, status, and location names; confirm cards do not overflow at 390px.
- Stock mobile movement cards and Stock outbound scan labels now wrap long product names; confirm full item names remain visible at 390px.
- Stock label print/reprint buttons now use flexible height and wrapping text; confirm `Print labels` / `Print Labels PDF` actions remain readable with no horizontal scrolling at 390px.
- Shared Stock scanner helper and message cards now wrap long text; confirm setup-blocked, connection-lost, camera-error, and success messages stay inside the scanner field and camera sheet at 390px.
- Stock Transfer/Receive, Return, and Stock Take quick location/session buttons now wrap long labels; confirm long stock-location, item, brand, and active-session names stay inside their buttons at 390px.
- Stock Outbound direct type and quick-remark buttons now wrap long labels; confirm direct outbound type names and remarks stay inside their buttons at 390px. Order picking is opened from `/orders/picking`.
- Barcode Inbound recent template and quick product/brand/origin/location buttons now wrap long labels; confirm long item, brand, origin, and location names stay inside their buttons at 390px.
- Stock Transfer, Receive Transfer, Return, Damage/Spoilage, and Return Supplier local feedback cards now wrap long worker messages; confirm setup/offline/status text stays inside the card at 390px.
- Stock Return/Damage now hides `Release inspected return` from normal workers; confirm workers see only worker tasks while managers still see the release form.
- Stock Return now has large condition buttons; choose `Good / sellable`, `Failed delivery, product ok`, or `Customer rejected, product ok`, then scan the barcode and confirm the condition is saved in return notes.
- Stock Take blocked scan feedback now wraps long alert text; confirm setup/offline blocked messages stay inside the red card at 390px.
- Stock Outbound missing, blocked-status, and wrong-destination alert cards now identify the barcode in the red card; confirm long barcode text wraps and points to the scan to remove.
- Stock Outbound duplicate batch scans now show `Duplicate barcode. Outbound is blocked.` as a short red alert; confirm the duplicate is not added to the outbound batch.
- Stock Damage/Spoilage selected-photo messages now wrap long photo names/references; confirm selected photo text stays inside the green card around 390px width.
- Stock Outbound direct outbound now auto-selects the first quick remark for the selected outbound type; confirm each direct outbound type can continue without typing remarks unless the worker chooses to edit them.
- Stock Outbound direct Sales now has `Search customer or phone`; search a customer, tap the quick button, and confirm scanning starts only after customer selection.
- Stock Outbound scanned barcode rows now show full wrapping barcode text; confirm long scanned barcodes are readable and removable before final confirm at 390px.
- Barcode Inbound blocked/error session rows now wrap long barcode text; confirm duplicate/no-weight/error scan rows do not create horizontal scrolling at 390px.
- Shared Stock success, error, warning, and offline scan messages now wrap long text; confirm action messages do not create horizontal scrolling at 390px.
- Stock worker home shortcut buttons now keep icons from shrinking and wrap labels inside the button; confirm the six buttons fit at 390px with no horizontal scrolling.
- Shared Stock barcode fields now say `Type barcode if needed.`; confirm this helper appears under manual barcode inputs and camera scanning remains the main action.
- Shared Stock scanner now uses `Camera scanning is not available. Use manual entry.` if the browser cannot provide camera scanning; confirm the manual-entry fallback is available.
- Shared Stock scanner camera error messages now point workers to `Use manual entry` instead of saying to type the barcode manually.
- Shared Stock scanner permission help now says `If permission is blocked, tap Use manual entry.`; confirm the helper does not tell workers to close the scanner first.
- Shared Stock scanner now announces `Starting camera...` as a polite status while the camera stream is opening; confirm the startup overlay appears before the video feed is ready.
- Shared Stock scanner camera errors now show both `Try camera again` and `Use manual entry` inside the error card; confirm `Use manual entry` closes the scanner and focuses the barcode input.
- Shared Stock scanner now shows `Try camera again` inside the scanner sheet when camera startup fails; deny/interrupt camera access if possible and confirm the retry button is available.
- Shared Stock scanner now clears stale camera error text and the camera-only duplicate debounce whenever `Scan Barcode` opens; close/reopen the scanner and confirm it is immediately ready for the next scan.
- Barcode Inbound now shows `Print and attach labels.` beside generated-label print actions when saved labels are available; confirm this appears after generating an internal label.
- Shared Stock scanner now shows `Detected. Ready for next scan.` after a successful continuous camera read; confirm this appears after scanning a label while the camera sheet stays open.
- Shared Stock scanner now shows a `Camera session scans` count inside the camera sheet and resets it every time the scanner opens; scan two labels continuously to confirm it increments, then close/reopen the scanner to confirm it resets.
- Current pass reviewed the requested Stock mobile QA list and confirmed source guards for Stock home buttons, inbound, continuous scanning, duplicate/no-weight warnings, label generation/reprint, order/direct outbound, damage/spoilage request, transfer, receive-transfer wrong-location blocking, stock-take progress, unknown-barcode exceptions, and online-only scan blocking.
- Local browser/device evidence is still manual: the app starts locally in foreground, but in-app browser automation is blocked in this Windows sandbox by `CreateProcessAsUserW failed: 5`.
- Barcode Inbound recent templates now use a 390px two-column grid and show `Tap Brand + Product to scan faster.` so workers can start repeat inbound with less scrolling.
- Barcode Inbound now shows `Saved barcode rule ready` or `No saved barcode rule yet` after item + brand + origin are selected; confirm workers know whether to scan immediately or enter actual kg once and save the rule.
- Barcode Inbound now shows `Barcode length is different from saved rule.` when a saved-rule scan has a different barcode length from the latest matching saved unit; confirm it appears as a yellow warning and does not block saving by itself.
- Barcode Inbound blocked duplicate and no-weight scans now create failed scan logs; confirm managers can see them in barcode scan error/report surfaces after live QA data exists.
- Stock manager dashboard now shows `Manager scan issue review` for all failed barcode scans, including duplicate, wrong-location, unknown-barcode, unavailable-stock, and barcode-rule failures; confirm `Open barcode scan error report` filters the report and shows the barcode.
- Barcode Inbound previous-scan and recent-scan cards now wrap long product names and stack status badges on narrow phones; confirm saved-scan cards remain readable around 390px.
- Barcode Inbound recent scan cards and finished-session details now use the 390px breakpoint so saved labels and summary fields are easier to compare on worker phones.
- Stock Outbound now stays direct-outbound focused; order picking belongs in `/orders/picking`, and the Stock page shows a link there for customer-order work.
- Stock Outbound scanned rows now turn red for missing, blocked-status, or wrong-transfer-destination barcodes and show `Remove before confirm.` guidance beside the row.
- Barcode Inbound now prefers the worker assigned stock location when the page opens and shows `Using location: [location]. Profile default.` before scanning.
- Receive-transfer and normal Stock Return now prefer the worker assigned stock location. Stock Return shows `Returning to` first and keeps location editing under `Change return location`.
- Receive-transfer now shows `Pending to this location` for the selected receiving location; confirm only barcodes destined to that location appear and tapping one fills the barcode field.
- Stock item edit and Stock filter dropdowns now use phone-size controls so category, brand, movement type, and status selects are easier to tap around 390px width.
- Stock Item Master now shows mobile item cards before the full item table, with item code, product name, category/section, brand, barcode requirement, and active status.
- Stock Item Master create now shows generated item code, category, and product name first, with brand/section/alternate names/low-stock/barcode-required under `Optional item details`; confirm this keeps item setup readable at 390px.
- Stock Dashboard latest movements now show mobile movement cards before the full table so recent stock activity is readable around 390px width.
- Stock scan pages now show mobile recent-movement cards before the recent-movements table, so workers can confirm recent inbound/outbound/transfer/return actions around 390px width.
- Barcode Inbound `Finish Session` now uses a full-width phone-size button before switching to compact desktop sizing.
- Stock worker shortcut buttons, overdue transfer `Open receive`, and barcode unit `Open / reprint` now use in-app navigation links for smoother phone movement between Stock pages.
- Shared Stock scanner modal now uses dialog semantics, links its title/help text, and focuses the scanner sheet when opened.
- Shared Stock scanner modal now locks background page scrolling while the camera sheet is open and restores scrolling when it closes.
- Shared Stock scanner now returns focus to the `Scan Barcode` button after the camera sheet closes.
- Shared Stock scanner now offers `Use manual entry` inside the camera sheet and focuses the manual barcode input after closing.
- Stock manual barcode fallback now requests the phone numeric keyboard with a Done key and disables autocorrect/capitalization for faster long-barcode typing.
- Barcode Inbound weight entry now requests a decimal phone keyboard with a Done key, and barcode weight-rule number fields request a numeric phone keyboard.
- Barcode Inbound product search now requests the phone search keyboard, and quick product creation uses a Done key.
- Barcode Inbound batch number now uses a phone Done key and avoids browser autofill while keeping the auto-generated value editable.
- Return/Damage supplier and photo-reference fallback fields now use a phone Done key and avoid browser autofill.
- Optional Stock reference-number fields now use a phone Done key and avoid browser autofill across inbound, outbound, transfer, receive-transfer, and return.
- No-barcode stock guidance now uses a full-width phone-size `Open Barcode Inbound` in-app link so workers can move to label/inbound flow quickly.
- Stock Take barcode-only, wrong-item/brand, and unknown-barcode rule cards now use the 390px breakpoint so workers can see the scan rules side by side on phones.
- Shared Stock barcode fields now have their own online-only guard: if the browser is offline, the manual barcode input and `Scan Barcode` button are disabled with `Connection lost. Please reconnect before scanning.`, and an open scanner stops before any scan is passed to the workflow.
- Barcode Inbound live counters and finished-session summary now use the 390px breakpoint so saved count and weight stay readable together.
- Stock Outbound scan summary now uses the 390px breakpoint so `Scanned units`, `Known weight`, and `Unknown scans` can be compared while scanning.
- Label print guidance now appears as a green worker card: Bluetooth label printer first, PDF fallback if unavailable, 50mm x 30mm, one label per page.
- Stock Take barcode progress and weight progress now use the 390px mobile breakpoint so workers can compare both while scanning.
- Stock Take review-session cards now wrap long session numbers, item/location scope, exception barcodes, signatures, and approval actions; confirm manager/director review cards stay readable around 390px.
- Stock Take now shows `Pending stock take exceptions` above review sessions when unresolved unknown-barcode or wrong-location lines exist; confirm managers/directors can see exception type, barcode, session/location, and next approval step.
- Receive-transfer now uses receiving-location wording: `Quick receiving locations`, `Tap receiving location to scan faster.`, and `Selected receiving location`.
- Stock scan fields now link blocked reasons to the manual barcode field and camera scan button; connection loss is announced as an urgent red alert while setup blockers stay as yellow status messages.
- Barcode Inbound duplicate warning now uses urgent red alert semantics for `Duplicate barcode. Inbound is blocked.` while keeping duplicate save blocking unchanged.
- Stock Take active warning now announces politely as status text while staying warning-only, not blocking other movements.
- Receive-transfer now shows a clearer red reminder: `Wrong location is blocked. Receive only at the barcode destination.`
- Stock worker scan feedback now announces transfer, receive-transfer, return, damage/spoilage, return supplier, and stock-take messages with proper live-region priority.
- Stock Outbound setup/confirm warning cards now announce politely as status text.
- Stock Outbound `Scanning outbound` and `Previous outbound scan` cards now wrap long order numbers, customer names, destination locations, product labels, and scan results; confirm those cards stay readable around 390px.
- Current QA preparation pass ran `npm.cmd run smoke`, `npm.cmd run lint`, `npm.cmd run typecheck`, and `npm.cmd run build`; all passed.
- Latest local re-run also passed `node scripts\stock-mobile-ux-coverage.mjs`; it confirmed the requested Stock mobile source guards and damage/spoilage photo picker gating, but did not replace real phone, Bluetooth printer, or authenticated Vercel QA.
- Local source guards checked every requested Stock mobile area in this quick pass. Authenticated Vercel login, real 390px phone/browser evidence, phone camera scanning, and Bluetooth printer output still need owner/device QA.
- Current pass source-checked the requested Stock mobile areas: home buttons, inbound, continuous scanning, duplicate/no-weight warnings, label generation/reprint, outbound, direct outbound, damage request, transfer, receive-transfer wrong-location block, stock-take progress, unknown exceptions, and online-only blocking.
- Stock worker home buttons now use a two-column grid at about 390px width.
- Barcode scan fields now keep the label above the large `Scan Barcode` button at phone width, avoiding squeezed controls around 390px.
- Label print actions now show `Print label` and `PDF fallback` side by side around 390px width.
- Label print actions now show helper text: `Bluetooth printer` under `Print label` and `Save as PDF` under `PDF fallback`.
- Stock unit detail now shows a full-width phone-size `Back to stock balance` button.
- Stock unit detail now shows mobile movement summary cards before the full movement table.
- Stock Balance now shows mobile summary cards with item, location, quantity, weight, and alert state before the full table.
- Stock Balance now shows mobile barcode unit cards with barcode, item, status, weight, location, received date, and a large `Open / reprint` action before the full barcode unit table.
- Stock Movement History now shows mobile summary cards with movement type, item, barcode, quantity, weight, locations, time, and reference before the full table.
- Stock workflow final action buttons now default to full-width on phone screens and compact sizing on desktop.
- Stock mobile source guards passed for the checklist below.
- `npm.cmd run smoke`, `npm.cmd run lint`, `npm.cmd run typecheck`, and `npm.cmd run build` passed locally.
- The smoke run includes Stock mobile UX, scanner, label, stock-take, report, RLS-policy, security, and owner-QA doc guards.

1. `/stock`: confirm six big worker buttons only in a clean two-column grid around 390px width: Inbound, Outbound, Transfer, Receive, Return / Damage, Stock Take.
2. `/stock`: tap each Stock shortcut button once and confirm navigation feels like in-app movement, not a full browser reload.
3. ERP Home: confirm the stock shortcut is labeled `Stock`, not `Stock Dashboard`, for general workers.
3. `/stock/inbound`: confirm recent item buttons, search, required brand/origin, editable location, no horizontal scrolling, and Scan Barcode/manual entry blocked until product, brand, origin, and location are chosen.
4. `/stock/inbound`: if recent inbound templates exist, confirm they show two per row around 390px width and the helper says `Tap Brand + Product to scan faster.`
5. `/stock/inbound`: confirm the assigned stock location appears first with `Using location: [location]. Profile default.`
6. `/stock/inbound`: change the location before the first scan and confirm the scanner uses the selected location.
7. Confirm disabled scan fields show the short reason directly under the barcode field, for example `Choose product, brand, origin, and location first.` or `Connection lost. Please reconnect before scanning.`
8. Tap the manual barcode fallback on a phone and confirm the numeric keyboard appears with a Done key, with no autocorrect or capitalization suggestions.
9. Tap `Net weight kg` and confirm a decimal keyboard appears with a Done key.
10. Open `Weight rule and notes`, tap weight start/digits/decimals and confirm numeric keyboards appear with a Done key.
11. Tap `Search product or item code` and confirm the phone shows a search keyboard/action.
12. Open `New product`, tap `Product name`, and confirm the keyboard has a Done key.
13. Open `Weight rule and notes`, tap `Batch no.`, and confirm the keyboard has a Done key. Leave the generated batch number unchanged and confirm inbound still works.
14. Open `Weight rule and notes`, tap optional `Reference no.`, and confirm the keyboard has a Done key. Leave it blank and confirm inbound still works.
8. `/stock/inbound`: confirm the green `Scanning inbound` card appears above the scanner with active brand, product, origin, and location.
9. `/stock/inbound`: scan or manually enter two unique barcodes and confirm continuous scanning, previous scan product/weight, saved count, and saved total weight.
10. `/stock/inbound`: confirm the `Scanning inbound` card says `Session locked. Finish first.` after the first saved scan.
11. `/stock/inbound`: confirm `Saved scans` and `Saved weight` sit side by side around 390px width.
12. `/stock/inbound`: confirm recent inbound scan cards show two per row around 390px width when multiple saved scans exist.
13. `/stock/inbound`: finish the inbound session and confirm summary details use two columns around 390px width.
14. `/stock/inbound`: scan a duplicate and confirm `Duplicate barcode. Inbound is blocked.` appears immediately as a short red blocked alert and the duplicate is not saved.
15. `/stock/inbound`: scan a no-weight barcode and confirm the app guides the worker to generate an internal label.
15a. `/stock/inbound`: scan a supplier barcode with no saved rule, enter actual kg once, and confirm the form says `Weight position found. Save this scan to learn the rule for next time.`
15b. `/stock/inbound`: confirm `Save weight rule for future scans` is on for a no-rule item + brand + origin, save that scan, then scan another same-format barcode and confirm weight auto-fills.
16. `/stock/inbound`: generate an internal label, test `Print label` and `PDF fallback`, then scan the printed label and confirm stock saves.
17. `/stock/units/[id]`: reprint an old label without entering a reason.
18. `/stock/inbound`: confirm `Finish Session` is a full-width phone-size button around 390px width.
19. `/stock/no-barcode-inbound`: confirm `Open Barcode Inbound` is a full-width phone-size in-app link to `/stock/inbound`.
13. `/stock/outbound`: confirm it says `Direct stock outbound only. Order picking stays in Orders.`
14. `/stock/outbound`: tap `Open Orders picking` and confirm it opens `/orders/picking` for customer-order picking.
15. `/stock/outbound`: confirm Sales, Processing, Transfer, Sample/Testing, Damage/Spoilage, and Return Supplier are available as direct outbound types.
16. `/stock/outbound`: select `Sales` and confirm scanning is blocked until a customer is selected.
17. `/stock/outbound`: confirm `Scanned units`, `Known weight`, and `Unknown scans` sit side by side around 390px width after scanning.
18. `/stock/outbound`: confirm `Previous outbound scan` wraps long barcode/product/weight text without horizontal scrolling.
19. `/stock/outbound`: open `Reference no. (optional)`, tap `Reference no.`, and confirm the keyboard has a Done key. Leave it blank and confirm outbound can still continue.
19. `/stock/return`: confirm the green `Returning to` card appears first, then open `Change return location` and confirm the assigned stock location can still be changed.
20. `/stock/return`: open `Reference and notes`, tap `Reference no.`, and confirm the keyboard has a Done key. Leave it blank and confirm return can still continue.
20. `/stock/return`: create a damage/spoilage request and confirm photo/reference is required, the amber `Requesting damage` card appears, and stock is not deducted immediately.
20. `/stock/return`: if the photo picker does not fill a name, open `Photo reference fallback` and confirm the fallback field shows a Done key.
21. `/stock/return`: choose a supplier and confirm the amber `Returning supplier` card appears above the supplier-return scanner.
21. `/stock/return`: if no recent supplier button is available, tap `Supplier name` and confirm the keyboard has a Done key.
22. `/stock/transfer`: tap a large quick destination and confirm the green `Sending to` card appears above the scanner.
23. `/stock/transfer`: open `Reference and notes`, tap `Reference no.`, and confirm the keyboard has a Done key. Leave it blank and confirm transfer can still continue.
24. `/stock/transfer`: scan barcode and confirm `TRANSFER_PENDING`.
24. `/stock/receive-transfer`: confirm the assigned stock location appears first with `Default receiving location: [location]. You can change it.`, confirm the red reminder says `Wrong location is blocked. Receive only at the barcode destination.`, then confirm the green `Receiving at` card appears above the scanner.
25. `/stock/receive-transfer`: open `Reference and notes`, tap `Reference no.`, and confirm the keyboard has a Done key. Leave it blank and confirm receive-transfer can still continue.
26. `/stock/receive-transfer`: try receiving at the wrong location and confirm `Wrong location. This barcode must be received at [destination location].`
26. `/stock/stock-take`: confirm the assigned stock location appears first with `Default stock take location: [location]. You can change it.`
27. `/stock/stock-take`: confirm Scan Barcode/manual entry is blocked until an active draft session is selected, then start a session and confirm barcode count progress and weight progress are visible.
28. `/stock/stock-take`: confirm the green `Scanning for` card appears above the scanner with active brand, item, and location.
28a. `/stock/stock-take`: use a long location, session number, brand, and item name, then confirm `Scanning for`, `Counting scope`, progress, and `Previous stock take scan` cards wrap cleanly around 390px width.
29. `/stock/stock-take`: scan wrong item/brand and confirm it is blocked.
30. `/stock/stock-take`: confirm the `Barcode-only count.`, `Wrong item/brand blocked.`, and `Unknown barcode is exception.` rule cards sit side by side around 390px width.
31. `/stock/stock-take`: scan unknown barcode and confirm it is recorded as an exception.
30. Turn off internet and confirm inbound, outbound, transfer, receive-transfer, return/damage, and stock-take disable the manual barcode input and `Scan Barcode` button with `Connection lost. Please reconnect before scanning.`
31. If the camera scanner is open when internet drops, confirm the scanner closes or stops, the red message says `Connection lost. Please reconnect before scanning.`, and no scan is saved.
32. On inbound, outbound, transfer, receive-transfer, return/damage, and stock take, confirm final action buttons are full-width and easy to tap around 390px width.
33. On each Stock scanner field, confirm the label sits above the large `Scan Barcode` button at 390px width and the button is not squeezed beside the label.
34. Tap `Scan Barcode` and confirm the camera modal says rear camera is preferred and shows `Keep barcode inside the box.`
35. If using a screen reader or browser accessibility inspector, confirm the camera sheet is announced as a dialog titled `Scan barcode` with the permission/rear-camera help text.
36. While the camera sheet is open, try to scroll the page behind it and confirm the background does not move. Close the scanner and confirm normal scrolling returns.
37. With a keyboard or accessibility inspector if available, close the scanner and confirm focus returns to the same `Scan Barcode` button.
38. Reopen the scanner, tap `Use manual entry`, and confirm the camera sheet closes and the cursor moves to the manual barcode input.
35. On label generation and stock-unit reprint, confirm `Print label` and `PDF fallback` fit side by side around 390px width without horizontal scrolling.
36. Confirm `Print label` shows helper text `Bluetooth printer`, and `PDF fallback` shows helper text `Save as PDF`.
37. Confirm the green label guidance card says Bluetooth label printer first, PDF fallback if unavailable, 50mm x 30mm, and one label per page.
37. On `/stock/items`, confirm mobile item cards appear before the full item table and show item code, product name, category/section, brand, barcode requirement, and active status.
38. On `/stock/items`, open item edit and confirm category and default brand dropdowns are easy to tap around 390px width.
39. On `/stock/movements` and `/stock/reports` as an allowed manager/admin/director, confirm movement type and status dropdowns are easy to tap around 390px width.
40. On `/stock/dashboard` as an allowed manager/admin/director, confirm latest movements show mobile movement cards before the full table.
41. On `/stock/inbound`, `/stock/outbound`, `/stock/transfer`, `/stock/receive-transfer`, and `/stock/return`, confirm the `Recent movements` section shows mobile movement cards before the full table.
42. On `/stock/balance`, confirm mobile barcode unit cards show barcode, item, status, weight, location, and received date before the full barcode unit table.
43. Tap `Open / reprint` from a mobile barcode unit card and confirm it opens `/stock/units/[id]`.
44. On `/stock/units/[id]`, confirm `Back to stock balance` is a full-width phone-size button and returns to `/stock/balance`.
42. On `/stock/units/[id]`, confirm mobile movement summary cards show recent movement type, time, weight, from/to location, and reference before the full table.
43. On `/stock/balance`, confirm mobile balance cards show quantity and weight only, with no cost, value, or finance data.
44. On `/stock/movements`, confirm mobile movement cards show movement type, item, barcode, quantity, and weight with no cost, value, or finance data.
45. If browser accessibility tools are available, confirm the manual barcode field and camera scan button reference the visible blocked reason when scanning is disabled.
46. On `/stock/receive-transfer`, confirm the quick buttons say `Quick receiving locations` and the selected confirmation says `Selected receiving location`.
47. On `/stock/receive-transfer`, confirm the red wrong-location reminder says `Wrong location is blocked. Receive only at the barcode destination.`
48. On `/stock/stock-take`, confirm `Barcode progress` and `Weight progress` sit side by side around 390px width without horizontal scrolling.
49. With a screen reader or browser accessibility inspector if available, confirm transfer, receive-transfer, return, damage/spoilage, return supplier, and stock-take scan messages are announced; blocked messages should be assertive and success messages should be polite.
50. Confirm the yellow stock-take active warning is exposed as status text and does not block other movement forms.

If phone camera or Bluetooth label printer cannot be tested:

- Record browser/device used.
- Confirm manual barcode fallback works.
- Confirm `PDF fallback` works for labels.
- Mark camera permission, rear camera, vibration, and Bluetooth printer as pending physical-device QA.
- Mark live Supabase/RLS evidence as pending unless the test account, outlet, department, and stock location were confirmed in the target project.

## Page Checklist

### `/stock` or `/stock/dashboard`

1. Test at phone width around 390px.
2. Sign in as a general worker.
3. Confirm the page shows big buttons only: Inbound, Outbound, Transfer, Receive, Return / Damage, and Stock Take.
4. Confirm ERP Home shows a simple `Stock` shortcut for stock users and does not present it as `Stock Dashboard` to workers.
5. Confirm Stock Reports and Stock Settings are not shown in the worker sidebar or ERP Home shortcuts.
6. Try direct URLs `/stock/reports` and `/stock/settings` as a general worker and confirm the app blocks access with a clear message.
7. Confirm no value, cost, finance, report, settings, KPI, chart, or movement table appears on the worker Stock home.
8. Confirm any Stock balance or movement pages visible to workers show operational quantity/weight only, not stock value, cost, or finance data.
9. Sign in as a manager/admin/director and confirm their existing Stock dashboard/report access still appears where allowed.

### `/stock/inbound`

1. Confirm recent inbound templates appear first.
2. Confirm product search is available under the recent templates.
3. Confirm quick inbound product buttons appear before the product dropdown and fit at about 390px width.
4. Tap a quick product button and confirm it fills the product.
5. Confirm product search and the product dropdown still work as fallbacks.
6. Confirm quick inbound brand buttons appear before the brand dropdown and fit at about 390px width.
7. Tap a quick brand button and confirm it fills the brand.
8. Confirm the brand dropdown and Other/custom brand still work as fallback.
9. Confirm quick inbound origin buttons appear before the origin dropdown and fit at about 390px width.
10. Tap a quick origin button and confirm it fills the origin.
11. Confirm the origin dropdown and Other/custom origin still work as fallback.
12. Confirm quick inbound location buttons appear before the location dropdown and fit at about 390px width.
13. Tap a quick location button and confirm it fills the location.
14. Confirm the location dropdown still works as a fallback.
15. Confirm brand and origin are required before scan/save.
16. Confirm Scan Barcode/manual entry is disabled and shows `Choose product, brand, origin, and location first.` directly under the barcode field until the setup is complete.
17. Confirm batch number auto-generates.
18. Confirm inbound source is inside `Weight rule and notes` and defaults to Supplier/import.
19. Confirm location defaults to the signed-in user's stock location even if the browser previously saved another inbound location.
20. Confirm `Using location: [location]. Profile default.` appears when the assigned location is active.
21. Confirm the location can be edited before the first saved scan.
22. Confirm saved barcode weight rule is reused for item + brand + origin.
21. Confirm continuous scan saves valid unique barcodes.
22. Confirm item, brand, origin, and location lock after the first saved scan until `Finish Session`.
23. Confirm no-weight barcode is blocked with label-printing guidance.
24. Confirm `Generate internal label` is large and easy to tap at about 390px width.
25. Confirm stock is not saved until the printed label is scanned back.
26. Confirm `Print label` is the primary label action and `PDF fallback` remains available.
27. Confirm the green guidance card says Bluetooth label printer first.
28. Confirm the same card says PDF fallback is available and one label prints per page.
29. Confirm the label preview is simple and readable at phone width.
30. Confirm the printed/PDF label shows a machine-readable Code 128 barcode and the same human-readable barcode number.
31. Confirm duplicate barcode is blocked with `Duplicate barcode. Inbound is blocked.` as a short red blocked alert.
32. Confirm previous scan product name, previous weight, saved scan count, and saved total weight update.
33. Confirm `Saved scans` and `Saved weight` sit side by side around 390px width.
34. Confirm `Undo Last Scan` is a full-width mobile button on the newest saved scan and the hint says `Undo before finishing this session.`
35. Confirm undo changes current-session scan to `VOIDED`.
36. Confirm `Finish Session` shows the session summary.
37. Confirm total units, total weight, and duplicate/error scans stay readable around 390px width.

### `/stock/outbound`

1. Test at phone width around 390px.
2. Confirm the page says `Direct stock outbound only. Order picking stays in Orders.`
3. Confirm `Open Orders picking` links to `/orders/picking` for customer-order picking.
4. Confirm Sales, Processing, Transfer, Sample/Testing, Damage/Spoilage, and Return Supplier appear as large direct outbound buttons.
5. Confirm direct Sales shows customer buttons/dropdown and scanning is blocked until a customer is selected.
6. Choose a customer and confirm the default direct-sales remark is already filled so normal direct sales can proceed with no typing.
7. Scan multiple direct outbound barcodes.
8. Confirm duplicate scans in the same batch are blocked.
9. Confirm missing, already-outbounded, wrong-status, and wrong-location barcodes are blocked with short red messages.
10. Confirm `Scanned units`, `Known weight`, and `Unknown scans` sit side by side around 390px width.
11. Confirm `Previous outbound scan` shows the latest barcode, item name, and weight after each scan.
12. Confirm each scanned row has a full-width mobile `Remove` button and the hint says `Remove a wrong scan before final confirm.`
13. Scan or enter a missing, blocked-status, or same-destination transfer barcode and confirm its row turns red with `Remove before confirm.` guidance.
14. Remove one scanned barcode before final confirm and confirm the scanned count/known weight updates.
15. Confirm `Reference no. (optional)` is collapsed and does not block scanning.
16. Confirm direct Sample/Testing does not ask for photo.
17. Confirm direct Damage/Spoilage shows large reason buttons.
18. Confirm Scan Barcode/manual entry is disabled and shows `Add damage photo first.` until a photo reference exists.
19. Tap the damage photo picker, choose or take a photo, and confirm `Photo selected:` appears without typing.
20. Confirm `Photo reference fallback` is collapsed and only needed if the photo picker does not fill the file name.
21. Confirm direct Damage/Spoilage creates a pending request and does not deduct stock immediately.
22. Confirm direct return supplier shows recent supplier buttons when previous supplier-return requests exist, requires supplier name before scanning, and moves stock to `HOLD_RETURN_SUPPLIER`.
23. Confirm direct outbound still requires remarks.
24. Confirm `Quick remarks` fills the direct outbound remarks box with one tap, and custom typing still works.
25. Select direct `Transfer` and confirm Scan Barcode/manual entry is disabled until a destination stock location is selected, with the reason shown under the barcode field.

### `/stock/transfer`

1. Confirm transfer scan sets stock to `TRANSFER_PENDING`.
2. Confirm the assigned source appears as `Sending from assigned location: [location].`
3. Confirm large quick destination buttons show before the destination selector.
4. Confirm the quick destination buttons fit at about 390px width without horizontal scrolling.
5. Confirm the destination selector still shows stock locations as a fallback.
6. Confirm Scan Barcode/manual entry is disabled until a destination stock location is selected, with the reason shown under the barcode field.
7. Select the assigned source as destination and confirm the block message says `Choose a different destination.`
8. Tap a quick destination button and confirm it fills the selector.
9. Scan with the camera and confirm it submits automatically, then shows `Transfer sent. Scan next barcode.`
10. Confirm `Previous transfer scan` shows the barcode that was just sent.
11. Type a barcode manually and confirm `Send transfer` still works as fallback.
12. Confirm the actual stock location does not change after transfer outbound.
13. Confirm the mobile flow is destination stock location, barcode, done.
14. Confirm same-destination transfer is blocked.
15. Confirm transfer cannot be cancelled after scanned out.

### `/stock/receive-transfer`

1. Confirm the assigned stock location appears first with `Default receiving location: [location]. You can change it.`
2. Confirm large quick receiving-location buttons show before the receiving selector.
2. Confirm the section says `Quick receiving locations`, not `Quick destinations`.
3. Tap a receiving location and confirm the green confirmation says `Selected receiving location`.
4. Scan a transfer-pending barcode.
5. Confirm location changes only after receive-transfer scan.
6. Confirm movement and scan-log evidence is visible.
7. If the user has no assigned stock location, confirm Scan Barcode/manual entry is disabled until a receiving stock location is selected, with the reason shown under the barcode field.
8. Tap a wrong receiving location.
9. Confirm receive is blocked with: `Wrong location. This barcode must be received at [destination location].`
10. Confirm no wrong-location exception receive is created for MVP.
11. Select the correct receiving location, scan with the camera, and confirm it receives automatically, then shows `Received. Scan next barcode.`
12. Confirm `Previous receive scan` shows the barcode that was just received.
13. Type a barcode manually and confirm `Receive barcode` still works as fallback.
14. Confirm the mobile flow is receiving stock location, barcode, done.
15. Confirm old pending transfers show an overdue alert after 3 days for sender manager, receiver manager, admin, and director.
16. Tap `Open receive` from the overdue transfer alert and confirm it opens `/stock/receive-transfer`.

### `/stock/return`

1. Test at phone width around 390px.
2. Confirm normal return is location first, barcode second, then done.
3. Confirm the green `Returning to` card appears first, then open `Change return location` if you need a different location.
4. Confirm quick return-location buttons appear before the location dropdown and fit at about 390px width.
5. Tap a quick return-location button and confirm it fills the return location.
6. Confirm the location dropdown still works as a fallback.
7. If the user has no assigned stock location, confirm Scan Barcode/manual entry is disabled and shows `Choose return location first.` until a location is selected.
7. Confirm reference number and notes stay inside the optional panel.
8. Return an eligible barcode unit.
9. Confirm a camera scan saves automatically and then shows `Return saved. Scan next barcode.`
10. Confirm `Previous return scan` shows the barcode that was just returned.
11. Confirm the `Save return` button still works for typed/manual barcodes.
12. Confirm normal return becomes `IN_STOCK`.
13. Confirm customer return after sale goes to `HOLD` or `INSPECTION` first.
14. Confirm the worker sees a clear red message if the return is blocked.
15. Confirm damage/spoilage is reason/photo first, barcode second, then done.
16. Confirm Scan Barcode/manual entry is disabled and shows `Add damage photo first.` until a photo reference exists.
17. Tap the damage photo picker on a phone and confirm `Photo selected:` appears.
18. Confirm `Photo reference fallback` is collapsed and only needed if the photo picker does not fill the file name.
19. Scan with the camera after the photo is set and confirm it shows `Damage request sent. Scan next.`
20. Confirm `Previous damage scan` shows the barcode that was just requested.
21. Confirm the `Submit damage request` button still works for typed/manual barcodes.
22. Confirm damage/spoilage creates an approval request and does not deduct stock immediately.
23. Confirm return supplier is supplier first, barcode second, then done.
24. Confirm it says: `Stock goes on supplier hold until manager approval.`
25. If recent suppliers appear, tap one and confirm it fills the supplier name without typing.
26. Confirm Scan Barcode/manual entry is disabled and shows `Choose supplier first.` if no supplier is selected.
27. Scan with the camera after supplier is selected and confirm it shows `Supplier return requested. Scan next.`
28. Confirm `Previous supplier return scan` shows the barcode that was just requested.
29. Confirm the `Submit return supplier` button still works for typed/manual barcodes.
30. Confirm return supplier deducts stock only after manager approval.

### `/stock/balance`

1. Confirm active barcode stock appears by item, brand, location, and age.
2. Confirm `VOIDED` stock units are not counted as active balance.
3. Confirm old stock warnings appear at 6 months and 12 months.
4. Confirm negative stock alerts are visible if negative no-barcode legacy data exists.
5. Confirm mobile barcode unit cards appear before the full barcode unit table.
6. Confirm each mobile barcode unit card shows barcode, item, status, weight, location, and received date.
7. Tap `Open / reprint` and confirm the stock unit detail page opens for label reprint.

### `/stock/movements`

1. Confirm inbound scan creates `INBOUND`.
2. Confirm undo creates `INBOUND_VOID`.
3. Confirm outbound creates the correct outbound movement.
4. Confirm transfer and receive-transfer movements are auditable.
5. Confirm scan logs match the stock movement story.

### `/stock/stock-take`

1. Test at phone width around 390px.
2. Sign in as a stock worker and create a stock take session by location.
3. Confirm the assigned stock location is selected first and the green cue says `Default stock take location: [location]. You can change it.`
4. Confirm quick stock-take location buttons appear before the location dropdown and fit at about 390px width.
5. Tap a quick location button and confirm it fills the stock-take location.
6. Confirm the location dropdown still works as a fallback.
7. Confirm quick stock-take item buttons appear before the item dropdown and fit at about 390px width.
8. Tap a quick item button and confirm it fills the stock-take item.
9. Confirm the item dropdown still works as a fallback.
10. Confirm quick stock-take brand buttons appear before the brand dropdown and fit at about 390px width.
11. Tap a quick brand button and confirm it fills the stock-take brand.
12. Confirm the brand dropdown still works as a fallback.
13. Select item + brand under stock take.
13. Confirm the page shows: `Stock take is active for this item/manufacturer/location. You can continue, but this movement will be recorded.`
14. Confirm active draft sessions appear as large tap buttons before the session dropdown.
15. Confirm the first active draft session is selected automatically when one exists.
16. If there is more than one active session, tap another active session button and confirm the scan form changes to that session.
17. Confirm Scan Barcode/manual entry is disabled and shows `Select active stock take session first.` only when no active draft session is selected.
18. Confirm stock take scan is barcode-only and no manual count entry appears.
19. Turn off internet and confirm scanning is blocked with `Connection lost. Please reconnect before scanning.`
20. If the camera scanner is open when internet drops, confirm the scanner closes or stops and no scan is saved.
21. Reconnect internet and scan/count barcodes.
22. Confirm barcode progress shows scanned count versus expected count.
23. Confirm weight progress shows scanned weight versus expected weight.
24. Confirm barcode progress and weight progress sit side by side around 390px width without horizontal scrolling.
24a. Use a long location, session number, brand, and item name, then confirm `Scanning for`, `Counting scope`, progress, and `Previous stock take scan` cards wrap cleanly around 390px width.
25. Confirm `Previous stock take scan` shows the latest barcode, item, weight, and `Counted`.
26. Scan a wrong item/brand barcode and confirm it is blocked.
27. Scan an unknown barcode and confirm it appears as an `UNKNOWN BARCODE` exception instead of creating stock immediately.
28. Confirm `Previous stock take scan` changes to `Unknown barcode exception`.
29. Scan a barcode from another location under the same item + brand and confirm it appears as a `WRONG LOCATION` exception.
30. Confirm `Previous stock take scan` changes to `Wrong location exception`.
31. Submit for manager review and confirm a normal worker cannot manager-review.
32. Approve as director and confirm a normal worker cannot director-approve.
33. Confirm `STOCK_TAKE_ADJUSTMENT` happens only after director approval.
34. Confirm manager and director signatures are required.
35. After manager review and director approval, confirm the unknown barcode creates a stock unit and the wrong-location barcode moves to the counted location.
36. During an active session, run another matching stock movement and confirm the action succeeds with the yellow warning instead of blocking.

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
7. Confirm the green guidance card says Bluetooth label printer first.
8. Confirm the same card says PDF fallback is available and one label prints per page.
9. Confirm label reprint uses one 50mm x 30mm label page.
10. Confirm the label contains company name, product name, weight, and barcode.

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
11. Confirm the scanner sheet keeps `Last scan` and `Camera session scans` stacked at 390px width, with no horizontal scrolling.
12. Confirm label print buttons fit at 390px width.
13. Confirm Bluetooth printer selection is available through the phone print sheet when the browser/device supports it.
14. Confirm PDF fallback works when Bluetooth printing is not available.
15. Turn off internet and confirm inbound, outbound, transfer, receive-transfer, return/damage, and stock-take scans are blocked with `Connection lost. Please reconnect before scanning.`
16. Confirm an open camera scanner closes or stops when the connection is lost.
17. Trigger one blocked save, for example wrong location or duplicate barcode, and confirm the worker sees a short message instead of raw database/RLS text.
18. Open Stock dashboard, `/stock/movements`, and `/stock/units/[id]` and confirm mobile movement cards do not squeeze or clip movement type, item, weight, barcode, time, or reference around 390px width.

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
