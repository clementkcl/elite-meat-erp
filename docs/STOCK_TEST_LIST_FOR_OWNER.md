# Stock Test List For Owner

Use this checklist after Supabase is linked and migrations are confirmed. It is written for testing from both:

- Vercel: `https://elite-meat-erp.vercel.app`
- Local app: `http://localhost:3000`

Do not run `db push`, seed, or production data changes until the Supabase target project is confirmed.

## Before You Start

1. Confirm you can sign in with a demo or test user that has Stock module access.
2. Confirm migrations are applied through `supabase/migrations/202606250004_stock_barcode_rule_sample_v1.sql`.
3. Confirm the latest Vercel deployment includes the Stock Inbound changes.
4. Use test barcodes only. Do not scan real production stock unless the database is the intended staging or production project.
5. Keep one browser tab open for the app and one Supabase SQL Editor tab for evidence checks.

## Guided Stock Inbound End-To-End Evidence

Run these two Stock Inbound sessions before signing off the guided workflow. Capture screenshots or a short video of each important screen, especially at phone width around 390px.

### Supplier Barcode Guided Flow

1. Open `/stock/inbound`.
2. Confirm the inbound session code is visible and uneditable.
3. Select or create product `Belly Boneless`.
4. Select or type manufacturer `Locks NV`.
5. Confirm the displayed product name is `Locks NV Belly Boneless` while product and manufacturer remain separate fields.
6. Confirm the assigned stock location is selected by default and changing it is under `Change Location`.
7. Confirm the supplier-barcode flow shows setup, barcode rule, scanner, and summary steps.
8. Scan or paste the first supplier barcode in the barcode rule page.
9. Type the actual sample weight once.
10. Confirm the page shows an extracted-weight preview and tells the worker the rule can be saved.
11. Save the scan and rule.
12. Scan another barcode with the same format and confirm the weight auto-extracts without another confirmation.
13. Scan a barcode with a different length and confirm the yellow warning says `Barcode length is different from saved rule.`
14. Scan the same barcode again and confirm the short red warning says `Duplicate barcode. Inbound is blocked.`
15. In the scanner popup/window, use the external scanner input or a Bluetooth/USB handheld scanner that sends Enter, and confirm the latest barcode is saved.
16. Confirm the scanner popup shows last scanned item weight, live barcode count, and live total weight.
17. Use `Undo Last Scan` on the latest saved scan and confirm the scan becomes voided instead of disappearing silently.
18. Finish the session and confirm the summary shows product name, manufacturer, total barcode count, total weight, saved scans, failed scans, and scanned-by names.
19. Use the whole-session undo/delete action only on test data and confirm it requires confirmation and voids session stock safely.

Pass result:

- A worker can teach one supplier barcode rule, scan continuously, handle duplicate and length warnings, undo mistakes, and finish with an auditable summary.

### No Supplier Barcode Guided Flow

1. Open `/stock/inbound`.
2. Select the same item/brand/origin/location once.
3. Switch to the internal-label/no-supplier-barcode path if the supplier barcode cannot decode weight.
4. Confirm the scanner is hidden until an internal label is generated.
5. Enter one weight in kg.
6. Generate the internal label and confirm the barcode is numeric only.
7. Confirm the 50mm x 30mm label preview shows company name, product name, weight, and barcode.
8. Print to a Bluetooth label printer if available; otherwise use `PDF fallback`.
9. Attach the label to the test product.
10. Confirm stock saves immediately after label generation.
11. Attach the printed label to the product.
12. Confirm the page returns immediately to weight entry for the next unit.
13. Enter a second weight and confirm previous saved item, previous weight, current count, and current total weight update.
14. Finish the session and confirm the summary shows the same item/manufacturer/location and all saved labels.

Pass result:

- A worker can keep entering weights, generate labels, and save barcode stock without reselecting item, manufacturer, origin, or location.

## Stock Mobile UX Quick Pass

Run this first on a phone or mobile viewport around 390px width. Capture one screenshot or short video per failed item.

Codex local QA note: source guards and build checks were run locally, but authenticated 390px browser automation, real phone camera, and Bluetooth printer testing could not be completed from the Windows sandbox. Treat this quick pass as the first required owner/device evidence pass.

Requirement audit: use `docs/STOCK_MOBILE_UX_REQUIREMENT_AUDIT.md` to see each confirmed Stock Mobile MVP rule, current source evidence, and the remaining manual proof needed before pilot sign-off.

Latest Codex QA preparation note, 2026-06-25:

- Barcode Inbound rule learning now saves barcode length and sample barcode; scan one supplier barcode, type actual kg once, save, then confirm the next same-format barcode auto-fills weight and wrong-length barcode shows a warning.
- Barcode Inbound now shows `Using location: [location]. Profile default.` and keeps location edits under `Change Location`; confirm workers can scan without choosing location first.
- Stock Outbound Sales now focuses customer search if no customer is selected; switch from Processing back to Sales and confirm customer search is ready.
- Stock Outbound now focuses barcode entry after selecting a scan-ready direct outbound type such as Processing or Sample/Testing; confirm no extra tap is needed before scanning.
- Receive Transfer now focuses barcode entry after selecting a receiving location or tapping a pending barcode; confirm the next scan/receive needs no extra field tap.
- Stock Transfer and Receive Transfer now have `Search stock location` before quick destination/receiving buttons; search a location/outlet and confirm the quick list filters before scanning.
- Barcode Inbound now focuses the barcode field once product, brand, origin, and location are complete; choose setup using quick buttons/dropdowns and confirm scanning is ready without another tap.
- Barcode Inbound recent templates now say `Choose location, then scan.` instead of focusing the barcode field if no location is selected.
- Stock Outbound Direct Sales now shows the selected customer in search; edit the search after selecting a customer and confirm scanning is blocked until a customer is chosen again.
- Stock Take session creation now has `Search item or code` before quick item buttons; search a product/code and confirm the quick item list filters before starting a session.
- Barcode Inbound now has `Search brand` and `Search origin` before quick buttons; search each and confirm the quick button list filters before scanning.
- Barcode Inbound brand/origin dropdown choices now fill the search box too; choose one from the dropdown and confirm the search text matches.
- Stock Item Master now shows `Next: open inbound and scan stock.` with `Open Barcode Inbound` after an item is created; create one demo item and confirm the shortcut appears.
- Stock Outbound blocked-scan messages now tell workers to remove the bad scan from the scanned list before scanning the correct/next barcode; test missing, blocked, and wrong-destination scans.
- Stock Outbound now returns focus to the barcode field after each accepted scan; add one barcode manually or with an external scanner and confirm the next scan can start without another tap.
- Barcode Inbound save-rule setup now says the barcode rule is saved for the current product, brand, and origin, and affects future scans only; confirm this appears inside `Set barcode rule once`.
- Stock Outbound final confirm button now shows scanned count and known kg after barcodes are added; scan two direct outbound barcodes and confirm the button summary matches the batch.
- Stock label print/reprint guidance now says both buttons open the phone print sheet; confirm workers can choose a Bluetooth printer there or save PDF fallback.
- Barcode Inbound session summary now shows `Next: print labels, attach them to product, then move stock.`; finish one inbound session and confirm the next action is visible above the correction warning.
- Barcode Inbound now shows `First barcode teaches this product + manufacturer + origin` when no saved item + brand + origin rule exists; choose a no-rule template and confirm the page explains scan one supplier barcode, enter actual kg once, then save so future scans with the same setup auto-fill weight.
- Stock Item Master now focuses Product name after creating an item and after choosing an item to edit; create one item and confirm the next product entry is ready without another tap.
- Stock Take now focuses barcode entry after active session selection; tap an active session and confirm scanning is ready without another tap.
- Stock Return Supplier now focuses barcode entry after supplier selection; tap a recent supplier or finish typing supplier name and confirm scanning is ready without another tap.
- Stock Damage/Spoilage now focuses barcode entry after adding a photo; add a damage photo, choose/change reason, and confirm scanning is ready without another tap.
- Stock Return now focuses barcode entry after return location or condition selection; choose a condition/location and confirm scanning is ready without another tap.
- Stock Transfer and Stock Outbound Direct Transfer now focus barcode entry after destination selection; choose a destination and confirm scanning is ready without another tap.
- Stock Outbound Direct Sales now focuses barcode entry after customer selection; tap a quick customer or full-list customer and confirm scanning is ready without another tap.
- Barcode Inbound now has a second `Generate internal label` button beside `Net weight kg`; use it for repeated internal-label weights without scrolling back to the top action.
- Barcode Inbound recent templates now show the next action directly: saved-rule templates say `Tap to scan`, no-rule templates say `Tap to learn rule`, and the selected-template message tells workers whether to scan now or enter actual kg once.
- Barcode Inbound now explains the `Net weight kg` field: saved-rule sessions say weight auto-fills after scan, while first-time supplier barcode sessions say to enter actual kg once to learn the rule.
- Stock Item Master edit now uses quick item buttons from search results and keeps the full dropdown under `Full item list`; confirm tapping a quick item opens its edit fields.
- Stock Item Master edit now shows item code, category, and product name first; confirm default brand, section, alternate names, and low-stock kg are inside `Optional item details`.
- Stock Outbound direct Sales now tucks the full customer dropdown under `Full customer list`; confirm search and quick customer buttons remain the main path, and a missing search opens the fallback list.
- Transfer Out now hides the assigned source stock location from destination choices; confirm the worker cannot tap their own location as the transfer destination.
- Receive Transfer no longer shows a red wrong-location warning before scanning; confirm the normal `/stock/receive-transfer` page starts with green/neutral guidance only.
- Receive Transfer now shows `Wrong location. This barcode must be received at [destination].` for known pending-transfer barcodes scanned at the wrong receiving location; confirm the wrong scan is still blocked and logged.
- Barcode Inbound now opens `Set barcode rule once` automatically when item + brand + origin have no saved barcode rule; confirm first-time supplier barcode setup is visible without hunting through collapsed sections.
- Stock Item Master create/edit fields now use phone-friendly keyboard hints and avoid browser autofill; open `/stock/items`, create/edit one product, and confirm item code uses numeric keyboard while product/low-stock fields are easier to complete on mobile.
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
- Stock movement/report filter buttons now use phone-size tap targets; confirm `Filter` and `Filter reports` are easy to tap at 390px.
- Stock unit detail/reprint now wraps long item name, barcode, status, item code, brand, origin, location, inbound source, and batch fields; confirm `/stock/units/[id]` stays readable at 390px.
- Stock mobile balance, barcode-unit, movement-history, and stock-unit detail cards now wrap long item, brand, origin, status, and location names; confirm cards do not overflow at 390px.
- Stock mobile item-master, balance, and barcode-unit card headers now stack status badges below long item text on very narrow phones; confirm item names and badges do not squeeze each other around 390px.
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
- Stock Outbound missing, blocked-status, and wrong-destination alert cards now identify the barcode in the red card; confirm long barcode text wraps and workers can tell which scan to remove.
- Stock Outbound duplicate batch scans now show `Duplicate barcode. Outbound is blocked.` as a short red alert; confirm scanning the same outbound barcode twice does not add a second row.
- Stock Damage/Spoilage selected-photo messages now wrap long photo names/references; confirm long camera filenames do not create horizontal scrolling at 390px.
- Stock Outbound direct outbound now auto-selects the first quick remark for the selected outbound type; confirm Sales, Processing, Transfer, Sample/Testing, Damage/Spoilage, and Return Supplier can proceed with no typing unless the worker wants to edit remarks.
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
- Barcode Inbound now prefers the worker assigned stock location when the page opens, shows `Using location: [location]. Profile default.`, and keeps edits under `Change Location`.
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
- Receive-transfer now uses receiving-location wording: `Quick receiving locations`, `Tap receiving location to scan faster.`, and `Selected receiving location`.
- Stock scan fields now link blocked reasons to the manual barcode field and camera scan button; connection loss is announced as an urgent red alert while setup blockers stay as yellow status messages.
- Barcode Inbound duplicate warning now uses urgent red alert semantics for `Duplicate barcode. Inbound is blocked.` while keeping duplicate save blocking unchanged.
- Stock Take active warning now announces politely as status text while staying warning-only, not blocking other movements.
- Receive-transfer now shows a clearer red reminder: `Wrong location is blocked. Receive only at the barcode destination.`
- Stock worker scan feedback now announces transfer, receive-transfer, return, damage/spoilage, return supplier, and stock-take messages with proper live-region priority.
- Stock Outbound setup/confirm warning cards now announce politely as status text.
- Current QA preparation pass ran `npm.cmd run smoke`, `npm.cmd run lint`, `npm.cmd run typecheck`, and `npm.cmd run build`; all passed.
- Latest local re-run also passed `node scripts\stock-mobile-ux-coverage.mjs`; it confirmed the requested Stock mobile source guards and damage/spoilage photo picker gating, but did not replace real phone, Bluetooth printer, or authenticated Vercel QA.
- Local source guards checked every requested Stock mobile area in this quick pass. The local app starts in foreground, but authenticated 390px browser-route QA, real camera scanning, and Bluetooth printer QA still need owner/device evidence.
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
- Stock mobile source guards passed for this checklist.
- `npm.cmd run smoke`, `npm.cmd run lint`, `npm.cmd run typecheck`, and `npm.cmd run build` passed locally.
- The smoke run includes Stock mobile UX, scanner, label, stock-take, report, RLS-policy, security, and owner-QA doc guards.
- Do this phone QA from Vercel or local app to capture the real device evidence that local source checks cannot prove.

1. Open `/stock` as a general worker and confirm only six big buttons appear in a clean two-column grid around 390px width: Inbound, Outbound, Transfer, Receive, Return / Damage, and Stock Take.
2. Tap each Stock shortcut button once and confirm navigation feels like in-app movement, not a full browser reload.
3. Open ERP Home as a general worker and confirm the shortcut is labeled `Stock`, not `Stock Dashboard`.
3. Open `/stock/inbound`, confirm Scan Barcode/manual entry is blocked until product, brand, origin, and location are chosen, then choose a recent item or search product.
4. If recent inbound templates exist, confirm they show two per row around 390px width and the helper says `Tap Brand + Product to scan faster.`
5. Confirm the assigned stock location appears first as `Using location: [location]. Profile default.` and the picker is tucked under `Change Location`.
6. Change the location before the first scan and confirm the scanner uses the selected location.
7. Confirm disabled scan fields show the short reason directly under the barcode field, for example `Choose product, brand, origin, and location first.` or `Connection lost. Please reconnect before scanning.`
8. Tap the manual barcode fallback on a phone and confirm the numeric keyboard appears with a Done key, with no autocorrect or capitalization suggestions.
9. Tap `Net weight kg` and confirm a decimal keyboard appears with a Done key.
10. Open `Weight rule and notes`, tap weight start/digits/decimals and confirm numeric keyboards appear with a Done key.
11. Tap `Search product or item code` and confirm the phone shows a search keyboard/action.
12. Open `New product`, tap `Product name`, and confirm the keyboard has a Done key.
13. Open `Weight rule and notes`, tap `Batch no.`, and confirm the keyboard has a Done key. Leave the generated batch number unchanged and confirm inbound still works.
14. Open `Weight rule and notes`, tap optional `Reference no.`, and confirm the keyboard has a Done key. Leave it blank and confirm inbound still works.
8. Confirm the green `Scanning inbound` card appears above the scanner with the active brand, product, origin, and location.
9. Scan or manually enter two unique inbound test barcodes and confirm continuous scanning, previous scan product/weight, saved count, and saved total weight stay visible.
10. Confirm the `Scanning inbound` card changes to show `Session locked. Finish first.` after the first saved scan.
11. Confirm `Saved scans` and `Saved weight` sit side by side around 390px width without horizontal scrolling.
12. Confirm recent inbound scan cards show two per row around 390px width when multiple saved scans exist.
13. Finish the inbound session and confirm summary details use two columns around 390px width.
14. Scan the same inbound barcode again and confirm `Duplicate barcode. Inbound is blocked.` appears immediately as a short red blocked alert and the duplicate is not saved.
15. Scan a no-weight barcode and confirm save is blocked with label-generation guidance.
15a. Scan a supplier barcode with no saved rule, enter actual kg once, and confirm the form says `Weight position found. Save rule.`
15b. Confirm `Save weight rule for future scans` is on for a no-rule item + brand + origin, save that scan, then scan another same-format barcode and confirm weight auto-fills.
16. Generate an internal label, confirm the stock unit saves, then test `Print label` plus `PDF fallback`.
17. Open `/stock/units/[id]` and confirm label reprint works without a reason field.
18. On `/stock/inbound`, confirm `Finish Session` is a full-width phone-size button around 390px width.
19. Open `/stock/no-barcode-inbound` and confirm `Open Barcode Inbound` is a full-width phone-size in-app link to `/stock/inbound`.
13. Open `/stock/outbound` and confirm it says `Direct stock outbound only. Order picking stays in Orders.`
14. Tap `Open Orders picking` and confirm it opens `/orders/picking` for customer-order picking.
15. Return to `/stock/outbound` and confirm Sales, Processing, Transfer, Sample/Testing, Damage/Spoilage, and Return Supplier are available as direct outbound types.
16. Select `Sales` and confirm scanning is blocked until a customer is selected.
17. Confirm `Scanned units`, `Known weight`, and `Unknown scans` sit side by side around 390px width after scanning.
18. Confirm `Previous outbound scan` wraps long barcode/product/weight text without horizontal scrolling.
19. Open outbound `Reference no. (optional)`, tap `Reference no.`, and confirm the keyboard has a Done key. Leave it blank and confirm outbound can still continue.
20. Confirm Damage/Spoilage lets the worker take or choose a photo, fills the photo file name/reference, and creates an approval request only without deducting stock immediately.
20a. If the photo picker does not fill a name, open `Photo reference fallback` and confirm the fallback field shows a Done key.
21. On `/stock/return`, confirm the green `Returning to` card appears first, then open `Change return location` and confirm the assigned stock location can still be changed.
22. Open return `Reference and notes`, tap `Reference no.`, and confirm the keyboard has a Done key. Leave it blank and confirm return can still continue.
22. In the damage/spoilage section, add a photo and confirm the amber `Requesting damage` card appears before scanning.
23. In return supplier, choose a supplier and confirm the amber `Returning supplier` card appears before scanning.
23. If no recent supplier button is available, tap `Supplier name` and confirm the keyboard has a Done key.
24. Open `/stock/transfer`, tap a large quick destination button, and confirm the green `Sending to` card appears above the scanner.
25. Open transfer `Reference and notes`, tap `Reference no.`, and confirm the keyboard has a Done key. Leave it blank and confirm transfer can still continue.
25. Scan one transfer barcode and confirm the stock becomes `TRANSFER_PENDING`.
26. Open `/stock/receive-transfer`, confirm the assigned stock location appears first with `Default receiving location: [location]. You can change it.`, confirm the red reminder says `Wrong location is blocked. Receive only at the barcode destination.`, then confirm the green `Receiving at` card appears above the scanner.
27. Open receive-transfer `Reference and notes`, tap `Reference no.`, and confirm the keyboard has a Done key. Leave it blank and confirm receive-transfer can still continue.
27. Try the wrong receiving location and confirm: `Wrong location. This barcode must be received at [destination location].`
28. Open `/stock/stock-take` and confirm the assigned stock location appears first with `Default stock take location: [location]. You can change it.`
29. Confirm Scan Barcode/manual entry is blocked until an active draft session is selected, start a session, tap its active-session button, and confirm barcode count progress and total weight progress are visible.
30. Confirm the green `Scanning for` card appears above the Stock Take scanner with the active brand, item, and location before scanning.
30a. Use a long location, session number, brand, and item name, then confirm `Scanning for`, `Counting scope`, progress, and `Previous stock take scan` cards wrap cleanly around 390px width.
31. Confirm the `Barcode-only count.`, `Wrong item/brand blocked.`, and `Unknown barcode is exception.` rule cards sit side by side around 390px width.
32. Scan a wrong item/brand in stock take and confirm it is blocked.
33. Scan an unknown stock-take barcode and confirm it is recorded as an exception.
32. Turn off internet and confirm all Stock scan pages disable the manual barcode input and `Scan Barcode` button with: `Connection lost. Please reconnect before scanning.`
33. If the camera scanner is open when internet drops, confirm the scanner closes or stops, the red message says `Connection lost. Please reconnect before scanning.`, and no scan is saved.
34. On inbound, outbound, transfer, receive-transfer, return/damage, and stock take, confirm final action buttons are full-width and easy to tap around 390px width.
35. On each Stock scanner field, confirm the label sits above the large `Scan Barcode` button at 390px width and the button is not squeezed beside the label.
36. Tap `Scan Barcode` and confirm the camera modal says rear camera is preferred and shows `Keep barcode inside the box.`
37. If using a screen reader or browser accessibility inspector, confirm the camera sheet is announced as a dialog titled `Scan barcode` with the permission/rear-camera help text.
38. While the camera sheet is open, try to scroll the page behind it and confirm the background does not move. Close the scanner and confirm normal scrolling returns.
39. With a keyboard or accessibility inspector if available, close the scanner and confirm focus returns to the same `Scan Barcode` button.
40. Reopen the scanner, tap `Use manual entry`, and confirm the camera sheet closes and the cursor moves to the manual barcode input.
37. On label generation and stock-unit reprint, confirm `Print label` and `PDF fallback` fit side by side around 390px width without horizontal scrolling.
38. Confirm `Print label` shows helper text `Bluetooth printer`, and `PDF fallback` shows helper text `Save as PDF`.
39. Confirm the green label guidance card says Bluetooth label printer first, PDF fallback if unavailable, 50mm x 30mm, and one label per page.
39. On `/stock/items`, confirm mobile item cards appear before the full item table and show item code, product name, category/section, brand, barcode requirement, and active status.
40. On `/stock/items`, open item edit and confirm category and default brand dropdowns are easy to tap around 390px width.
41. On `/stock/movements` and `/stock/reports` as an allowed manager/admin/director, confirm movement type and status dropdowns are easy to tap around 390px width.
42. On `/stock/dashboard` as an allowed manager/admin/director, confirm latest movements show mobile movement cards before the full table.
43. On `/stock/inbound`, `/stock/outbound`, `/stock/transfer`, `/stock/receive-transfer`, and `/stock/return`, confirm the `Recent movements` section shows mobile movement cards before the full table.
44. On `/stock/balance`, confirm mobile barcode unit cards show barcode, item, status, weight, location, and received date before the full barcode unit table.
45. Tap `Open / reprint` from a mobile barcode unit card and confirm it opens `/stock/units/[id]`.
46. On `/stock/units/[id]`, confirm `Back to stock balance` is a full-width phone-size button and returns to `/stock/balance`.
44. On `/stock/units/[id]`, confirm mobile movement summary cards show recent movement type, time, weight, from/to location, and reference before the full table.
45. On `/stock/balance`, confirm mobile balance cards show quantity and weight only, with no cost, value, or finance data.
46. On `/stock/movements`, confirm mobile movement cards show movement type, item, barcode, quantity, and weight with no cost, value, or finance data.
47. With a screen reader or browser accessibility inspector if available, confirm the manual barcode field and camera scan button reference the visible blocked reason when scanning is disabled.
48. On `/stock/receive-transfer`, confirm the quick buttons say `Quick receiving locations` and the selected confirmation says `Selected receiving location`.
49. On `/stock/receive-transfer`, confirm the red wrong-location reminder says `Wrong location is blocked. Receive only at the barcode destination.`
50. On `/stock/stock-take`, confirm `Barcode progress` and `Weight progress` sit side by side around 390px width without horizontal scrolling.
51. With a screen reader or browser accessibility inspector if available, confirm transfer, receive-transfer, return, damage/spoilage, return supplier, and stock-take scan messages are announced; blocked messages should be assertive and success messages should be polite.
52. Confirm the yellow stock-take active warning is exposed as status text and does not block other movement forms.

Device evidence note:

- If a real phone camera cannot be tested, mark camera permission, rear camera selection, continuous scan comfort, sound/vibration, and scanner stream stop as pending.
- If a Bluetooth label printer cannot be tested, save a PDF fallback label and mark Bluetooth printer selection as pending.

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
4. Confirm ERP Home shows a simple `Stock` shortcut for stock users and does not present it as `Stock Dashboard` to workers.
5. Confirm no stock value, cost, finance, report, chart, or settings content appears on the worker Stock home.
6. Confirm each button is easy to tap and opens the correct Stock workflow.
7. Confirm any Stock balance or movement pages visible to workers show operational quantity/weight only, not stock value, cost, or finance data.
8. Sign in as a manager/admin/director and confirm their existing dashboard/report access is preserved.

Pass result:

- General worker Stock home is action-only and mobile-friendly.
- Advanced report/settings access remains limited to permitted roles.

## Stock Inbound

Page: `/stock/inbound`

1. Confirm the page opens on desktop and phone width.
2. Confirm the main action area is visible without horizontal scrolling.
3. Confirm recent item/template buttons appear before manual setup.
4. Confirm product search is available for less common items.
5. Confirm quick inbound product buttons appear before the product dropdown and fit at about 390px width.
6. Tap a quick product button and confirm it fills the product.
7. Confirm product search and the product dropdown still work as fallbacks.
8. Confirm quick inbound brand buttons appear before the brand dropdown and fit at about 390px width.
9. Tap a quick brand button and confirm it fills the brand.
10. Confirm the brand dropdown and Other/custom brand still work as fallback.
11. Confirm quick inbound origin buttons appear before the origin dropdown and fit at about 390px width.
12. Tap a quick origin button and confirm it fills the origin.
13. Confirm the origin dropdown and Other/custom origin still work as fallback.
14. Confirm quick inbound location buttons appear before the location dropdown and fit at about 390px width.
15. Tap a quick location button and confirm it fills the location.
16. Confirm the location dropdown still works as a fallback.
17. Confirm inbound source defaults to Supplier/import inside `Weight rule and notes`.
18. Confirm location defaults to the signed-in user's assigned stock location even if the browser previously saved another inbound location.
19. Confirm `Using location: [location]. Profile default.` appears when the assigned location is active, and changing it requires opening `Change Location`.
20. Confirm location can be edited only to allowed stock locations before the first saved scan.
21. Confirm brand and origin are required before scanning or saving.
22. Confirm Scan Barcode/manual entry stays disabled and shows `Choose product, brand, origin, and location first.` directly under the barcode field until the setup is complete.
22. Confirm a batch number is auto-generated when the page opens.
23. Confirm no Start Batch button is required.

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

1. Confirm scanning is blocked until item, brand, origin, and location are selected.
2. Select item, brand, origin, and location once.
3. Scan or manually enter the first unique barcode.
4. Confirm successful scans save immediately when weight confidence is high.
5. Scan a second unique barcode without resetting the form.
6. Confirm the scanner remains ready for the next scan.
7. Confirm success feedback appears after each saved scan.
8. Confirm `Saved scans` and `Saved weight` sit side by side around 390px width.
9. Confirm the worker cannot change item, brand, origin, or location after the first saved scan until `Finish Session` is clicked.
10. Confirm weight rule, source, batch, reference, and notes fields are tucked under `Weight rule and notes`.

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
5. Confirm `Generate internal label` is large and easy to tap at about 390px width.
6. Tap `Generate internal label`.
7. Confirm stock saves immediately, then print/attach the label.
8. Confirm the label preview contains company name, product name, weight, and barcode.
9. Confirm the barcode itself does not include `KG` text.
10. Confirm the green guidance card says Bluetooth label printer first.
11. Confirm the same card says PDF fallback is available and one label prints per page.
12. Tap `Print label` and choose the Bluetooth label printer from the phone print sheet if available.
13. If the Bluetooth printer is not available, tap `PDF fallback` and save the 50mm x 30mm label as PDF.
14. Confirm the printed label has a clear machine-readable Code 128 barcode plus the human-readable number.
15. Attach the label.
16. Scan the generated barcode back into `/stock/inbound`.

Pass result:

- No-weight supplier barcodes are not saved as main stock barcodes. Generated labels are used instead.
- Browser Bluetooth printing is treated as device-dependent; PDF fallback must remain available.

## Duplicate Barcode Block

1. Inbound one unique barcode successfully.
2. Scan the same barcode again in the same session.
3. Confirm the app blocks the duplicate before saving.
4. Confirm the blocked message is short, red, and says `Duplicate barcode. Inbound is blocked.`.
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
6. Finish the session and confirm total units, total weight, and duplicate/error scans stay readable around 390px width.

Pass result:

- Session summary counters reflect only successful current-session scans.

## Undo Scan And VOIDED Status

1. Save a unique inbound scan.
2. Confirm `Undo Last Scan` is a full-width mobile button on the newest current-session scan card.
3. Confirm the hint says `Undo before finishing this session.`
4. Click `Undo Last Scan` for that current-session scan.
5. Enter or accept the undo reason.
6. Confirm the UI reports that the inbound scan was undone and audit trail was kept.
7. Confirm the scan row status becomes `VOIDED`.
8. Confirm the original unit was not silently deleted.
9. Finish the inbound session.
10. Confirm normal worker undo is no longer available after finishing.

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
7. Confirm mobile barcode unit cards appear before the full barcode unit table.
8. Confirm each mobile barcode unit card shows barcode, item, status, weight, location, and received date.
9. Tap `Open / reprint` and confirm the stock unit detail page opens for label reprint.

Pass result:

- Voided units are excluded from active balance.

## Stock Direct Outbound Mobile Flow

Page: `/stock/outbound`

1. Test at phone width around 390px.
2. Confirm the page says `Direct stock outbound only. Order picking stays in Orders.`
3. Confirm `Open Orders picking` links to `/orders/picking` for customer-order picking.
4. Confirm Sales, Processing, Transfer, Sample/Testing, Damage/Spoilage, and Return Supplier appear as large direct outbound buttons.
5. Confirm Sales shows customer buttons/dropdown and scanning is blocked until a customer is selected.
6. Choose a customer and confirm the default remark is already filled so a worker can scan without typing for normal direct sales.
7. Scan multiple direct outbound barcodes.
8. Confirm duplicate scans in the same batch are blocked.
9. Confirm missing, already-outbounded, wrong-status, and wrong-location barcodes are blocked with short red messages.
10. Confirm `Scanned units`, `Known weight`, and `Unknown scans` sit side by side around 390px width.
11. Confirm saved scan count and known weight are easy to read.
12. Confirm `Previous outbound scan` shows the latest barcode, item name, and weight after each scan.
13. Confirm each scanned row has a full-width mobile `Remove` button and the hint says `Remove a wrong scan before final confirm.`
14. Scan or enter a missing, blocked-status, or same-destination transfer barcode and confirm its row turns red with `Remove before confirm.` guidance.
15. Remove one scanned barcode before final confirm and confirm the scanned count/known weight updates.
16. Confirm `Reference no. (optional)` is tucked away and does not block scanning.
17. Confirm successful outbound creates stock movements and scan logs.

Pass result:

- Stock outbound is direct-only, and customer-order picking is routed to `/orders/picking`.

## Direct Outbound Mobile Flow

Page: `/stock/outbound`

1. Test at phone width around 390px.
2. Confirm Stock outbound opens directly in direct outbound mode.
3. Confirm the visible direct options are Sales, Processing, Transfer, Sample/Testing, Damage/Spoilage, and Return Supplier.
4. Select `Sales` and confirm scanning is blocked until a customer is selected.
5. Select `Sample/Testing` and confirm no photo field is required.
6. Select `Damage/Spoilage`.
7. Confirm damage reason and photo are required.
8. Confirm Scan Barcode/manual entry is disabled and shows `Add damage photo first.` until a photo reference exists.
9. Tap the damage photo picker, choose or take a photo, and confirm `Photo selected:` appears without typing.
10. Confirm `Photo reference fallback` is collapsed and only needed if the photo picker does not fill the file name.
11. Confirm the worker message says `Photo required. Request only; stock is not deducted now.`
12. Confirm damage/spoilage creates an approval request only and does not deduct stock immediately.
13. Confirm direct outbound still requires notes/remarks.
14. Tap a `Quick remarks` button and confirm it fills the remarks box without typing.
15. Confirm the worker can still type a custom remark if needed.
16. Select direct `Transfer` and confirm Scan Barcode/manual entry is disabled until a destination stock location is selected.
17. Select direct `Return Supplier` and confirm recent supplier buttons appear when previous supplier-return requests exist.
18. Confirm Scan Barcode/manual entry is disabled with `Choose supplier first.` until supplier name is filled.
19. Confirm `Reference no. (optional)` stays collapsed unless paperwork needs a number.

Pass result:

- General workers can use direct outbound without finance details; direct Sales requires customer selection before scanning, while damage remains approval-only.

## Transfer And Receive Transfer

Pages:

- `/stock/transfer`
- `/stock/receive-transfer`

1. Open `/stock/transfer`.
2. Confirm the worker assigned source appears as `Sending from assigned location: [location].`
3. Confirm Scan Barcode/manual entry is disabled until a destination stock location is selected.
4. Select the assigned source as destination and confirm the block message says `Choose a different destination.`
5. Confirm quick destination buttons are visible and fit at about 390px width.
6. Tap a quick destination button and confirm it fills the destination selector.
7. Scan a barcode for transfer outbound.
8. Confirm a camera scan submits automatically and then shows `Transfer sent. Scan next barcode.`
9. Confirm `Previous transfer scan` shows the barcode that was just sent.
10. Confirm the `Send transfer` button still works for typed/manual barcodes.
11. Confirm the destination selector still shows stock locations as a fallback.
12. Confirm status becomes `TRANSFER_PENDING`.
13. Confirm location does not change immediately.
14. Confirm selecting the same destination as current location is blocked.
15. If a configured destination is not allowed by the current server rules, confirm the worker sees `Choose an allowed stock location.`
16. Open `/stock/receive-transfer`.
17. Confirm the assigned stock location appears first with `Default receiving location: [location]. You can change it.`; if the user has no assigned stock location, confirm Scan Barcode/manual entry is disabled until a receiving stock location is selected.
18. Confirm quick receiving-location buttons are visible and fit at about 390px width.
19. Confirm the quick section says `Quick receiving locations`, not `Quick destinations`.
20. Tap a wrong receiving stock location.
21. Confirm the green confirmation says `Selected receiving location`.
22. Scan the transfer-pending barcode.
23. Confirm receive is blocked with: `Wrong location. This barcode must be received at [destination location].`
24. Select the correct destination stock location.
23. Scan the transfer-pending barcode.
24. Confirm a camera scan receives automatically and then shows `Received. Scan next barcode.`
25. Confirm `Previous receive scan` shows the barcode that was just received.
26. Confirm the `Receive barcode` button still works for typed/manual barcodes.
27. Confirm location changes only after receive-transfer scan.
28. Confirm transfers pending more than 3 days visibly flag sender manager, receiver manager, admin, and director.
29. Tap `Open receive` from the overdue transfer alert and confirm it opens `/stock/receive-transfer`.

Pass result:

- Transfer location changes only after destination receive scan, and wrong-location receive is not allowed for MVP.

## Return Stock Becomes IN_STOCK

Page: `/stock/return`

1. Test at phone width around 390px.
2. Confirm the normal return form is location first, barcode second, then done.
3. Confirm the green `Returning to` card appears first, then open `Change return location` if you need a different location.
4. Confirm quick return-location buttons appear before the location dropdown and fit at about 390px width.
5. Tap a quick return-location button and confirm it fills the return location.
6. Confirm the location dropdown still works as a fallback.
7. If the user has no assigned stock location, confirm Scan Barcode/manual entry is disabled and shows `Choose return location first.` until a location is selected.
7. Confirm reference number and notes are inside the optional `Reference and notes` panel.
8. Scan a stock unit that is eligible for return.
9. Confirm a camera scan saves automatically and then shows `Return saved. Scan next barcode.`
10. Confirm `Previous return scan` shows the barcode that was just returned.
11. Confirm the `Save return` button still works for typed/manual barcodes.
12. Confirm the returned unit status becomes `IN_STOCK` when the workflow allows sellable return.
13. For customer returns after sale, confirm it goes to `HOLD` or `INSPECTION` first.
14. Confirm release from inspection requires manager/admin flow where available.
15. Confirm blocked return messages are short and red.

Pass result:

- Normal returns become `IN_STOCK`; customer returns are inspected first.

## Damage And Spoilage Approval

Page: `/stock/return`

1. Test at phone width around 390px.
2. Confirm the damage/spoilage form is reason/photo first, barcode second, then done.
3. Select one large reason button: expired, broken packaging, smell, wrong temperature, customer rejected, or other.
4. Confirm Scan Barcode/manual entry is disabled and shows `Add damage photo first.` until a photo reference exists.
5. Tap the damage photo picker, choose or take a photo, and confirm `Photo selected:` appears.
6. Confirm `Photo reference fallback` is collapsed and only needed if the photo picker does not fill the file name.
7. Scan a damage/spoilage barcode.
8. Confirm a camera scan sends the damage request automatically and then shows `Damage request sent. Scan next.`
9. Confirm `Previous damage scan` shows the barcode that was just requested.
10. Confirm the `Submit damage request` button still works for typed/manual barcodes.
11. Confirm notes are optional and tucked behind the `Notes` panel.
12. Confirm stock is not deducted at staff request time.
13. Confirm the page shows: `Photo required. Request only; stock is not deducted now.`
14. Review as department manager.
15. Approve as director.
16. Confirm stock is deducted only after final director approval.
17. Confirm report rows show linked barcode weight.

Pass result:

- Damage/spoilage follows request -> manager review -> director approval before deduction.

## Return Supplier Approval

Page: `/stock/return`

1. Test at phone width around 390px.
2. Confirm the return-supplier form is supplier first, barcode second, then done.
3. If recent suppliers appear, tap one and confirm it fills the supplier name without typing.
4. Confirm Scan Barcode/manual entry is disabled and shows `Choose supplier first.` if no supplier is selected.
5. Scan a barcode after supplier is selected.
6. Confirm a camera scan requests supplier return automatically and then shows `Supplier return requested. Scan next.`
7. Confirm `Previous supplier return scan` shows the barcode that was just requested.
8. Confirm the `Submit return supplier` button still works for typed/manual barcodes.
9. Confirm notes are optional and tucked behind the `Notes` panel.
10. Confirm the page shows: `Stock goes on supplier hold until manager approval.`
11. Confirm stock is held/unavailable until manager approval.
12. Approve as manager.
13. Confirm stock is deducted only after manager approval.

Pass result:

- Return supplier follows staff request -> supplier hold -> manager approval before deduction.

## Stock Take Manager Review And Director Approval

Page: `/stock/stock-take`

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
13. Select the item + brand under stock take.
13. Confirm the page shows this warning:
   `Stock take is active for this item/manufacturer/location. You can continue, but this movement will be recorded.`
14. Confirm active draft sessions appear as large tap buttons before the session dropdown.
15. Confirm the first active draft session is selected automatically when one exists.
16. If there is more than one active session, tap another active session button and confirm the scan form changes to that session.
17. Confirm Scan Barcode/manual entry is disabled and shows `Select active stock take session first.` only when no active draft session is selected.
18. Turn off internet and confirm scanning is blocked with `Connection lost. Please reconnect before scanning.`
19. If the camera scanner is open when internet drops, confirm the scanner closes or stops and no scan is saved.
20. Reconnect internet.
21. Scan barcode counts as staff.
22. Confirm stock take is barcode-only and no manual count entry is available.
23. Confirm barcode progress shows count, for example `80/100`.
24. Confirm weight progress shows scanned weight and expected weight.
25. Confirm barcode progress and weight progress sit side by side around 390px width without horizontal scrolling.
25a. Use a long location, session number, brand, and item name, then confirm `Scanning for`, `Counting scope`, progress, and `Previous stock take scan` cards wrap cleanly around 390px width.
26. Confirm `Previous stock take scan` shows the latest barcode, item, weight, and `Counted`.
27. Scan a wrong item or wrong brand and confirm the barcode is blocked with a short red message.
28. Scan an unknown barcode and confirm it is listed as a pending `UNKNOWN BARCODE` exception, without creating a stock unit yet.
29. Confirm `Previous stock take scan` changes to `Unknown barcode exception`.
30. Scan a barcode from another location for the same item + brand and confirm it is listed as a pending `WRONG LOCATION` exception.
31. Confirm `Previous stock take scan` changes to `Wrong location exception`.
32. Submit for manager review.
33. Confirm the review-session card stays readable around 390px width with long session number, location, item, brand, exception barcode, signature, and approval action text.
33a. Confirm `Pending stock take exceptions` appears above review sessions when unresolved unknown-barcode or wrong-location lines exist, and shows exception type, barcode, session/location, and next approval step.
34. Confirm manager signature is required and a normal worker cannot manager-review.
35. Submit for director final approval.
36. Confirm director signature is required and a normal worker cannot director-approve.
37. Confirm `STOCK_TAKE_ADJUSTMENT` is created only after director approval.
38. After manager review and director approval, confirm the unknown barcode creates a stock unit and the wrong-location barcode moves to the counted location.
39. While the stock take is still active, perform a matching inbound/outbound/transfer action and confirm it succeeds with the same yellow warning instead of blocking.

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
12. Confirm the scanner sheet keeps `Last scan` and `Camera session scans` stacked at 390px width, with no horizontal scrolling.
13. Turn off internet and confirm inbound, outbound, transfer, receive-transfer, return/damage, and stock-take scans are blocked with `Connection lost. Please reconnect before scanning.`
14. Confirm an open camera scanner closes or stops when the connection is lost.
15. Trigger one blocked save, for example wrong location or duplicate barcode, and confirm the worker sees a short message, not raw database/RLS text.
16. Open `/stock`, `/stock/movements`, and a stock unit detail page, then confirm movement cards wrap movement type, item, weight, barcode, location, time, and reference without horizontal scrolling around 390px width.

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
4. Confirm the green guidance card says Bluetooth label printer first.
5. Confirm the same card says PDF fallback is available and one label prints per page.
6. Confirm the label preview is simple and readable.
7. Confirm the label content shows Elite Meat, product name, weight, and barcode.
8. Tap `Print label` and choose a Bluetooth label printer from the phone print sheet if available.
9. If Bluetooth printing is not available or unreliable, tap `PDF fallback`.
10. Confirm the print/PDF output is one 50mm x 30mm label page.

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
