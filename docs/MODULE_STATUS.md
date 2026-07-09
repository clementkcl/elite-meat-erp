# Module Status

Last audited: 2026-06-24

## Latest Stock Mobile QA Note

- Barcode Inbound quick product creation now resolves a typed custom manufacturer through the existing brand resolver, so a custom manufacturer can become the new item's default manufacturer during setup.
- Barcode Inbound quick product creation now saves the selected existing manufacturer as the new item's default manufacturer, so display names can immediately use manufacturer + product after creation.
- Barcode Inbound scan issue logs now carry product/manufacturer/display-name context in `barcode_scan_logs.related_context`, and manager scan issue review prefers that captured display name before falling back to item default manufacturer.
- Manager scan issue review rows now use the Stock display-name helper path, so issue item names prefer manufacturer + product where the item default manufacturer is known.
- Barcode Inbound session summary now uses an atomic `void_inbound_stock_session` RPC for `Undo/Delete whole session`, so a whole-batch correction validates server-side and writes `INBOUND_VOID` movement/audit rows together instead of looping through scans in the browser.
- Barcode Inbound rule learning now persists the learned barcode length and sample barcode with the item + brand + origin weight-position rule.
- Barcode Inbound now shows the assigned/current location as `Using location` and keeps location editing behind `Change Location`, so location is no longer the first worker step.
- Stock Outbound Sales now focuses customer search when customer setup is missing, while scan-ready outbound types focus barcode entry.
- Stock Outbound now focuses the barcode field after a direct outbound type is selected when that type is scan-ready, such as Processing or Sample/Testing.
- Receive Transfer now focuses the barcode field after selecting a receiving location or tapping a pending barcode, reducing extra taps before scan/receive.
- Stock Transfer and Receive Transfer destination pickers now have `Search stock location` before quick location buttons, reducing long-list scrolling on worker phones.
- Barcode Inbound brand/origin dropdown selections now sync back into the search box, matching quick-button behavior.
- Barcode Inbound now has brand and origin search fields before quick buttons, so long dropdowns are less painful on worker phones.
- Stock Take session creation now has item-code/product search before the quick item buttons, reducing dropdown scrolling on worker phones.
- Stock Outbound Direct Sales now shows the selected customer in the customer search box and clears the selected customer if the worker edits the search again.
- Barcode Inbound recent templates now focus the barcode field only when location is ready; otherwise workers see `Choose location, then scan.`.
- Barcode Inbound setup selections now share one scan-ready shortcut: once product, brand, origin, and location are complete, the barcode field is focused for immediate scanning.
- Barcode Inbound now focuses the barcode field after choosing an inbound location, helping workers scan immediately after setup.
- Stock Item Master now shows a success-only shortcut to `Open Barcode Inbound` after creating an item, so workers can continue into stock capture without hunting through navigation.
- Stock Outbound blocked-scan messages now tell workers to remove the bad scan from the scanned list, then scan the correct/next barcode.
- Stock Outbound now returns focus to the barcode field after each accepted scan so workers can keep scanning without another tap.
- Barcode Inbound save-rule setup now tells workers the rule is saved for the current product, brand, and origin, and affects future scans only.
- Stock Outbound final confirm button now shows the scanned count and known kg once barcodes are scanned, so workers can verify the batch before submitting.
- Stock label print/reprint guidance now says both label buttons open the phone print sheet, so workers know to choose Bluetooth printer there or use PDF fallback.
- Barcode Inbound session summary now gives workers the next action after finishing: print labels, attach them to product, then move stock.
- Barcode Inbound now shows a first-scan learning card when no saved item + brand + origin barcode rule exists, with the worker steps: scan one supplier barcode, enter actual kg once, then save so next scans auto-fill weight.
- Stock Item Master now focuses Product name after item creation and after selecting an item to edit, reducing repeat setup taps.
- Stock Take now focuses barcode entry after active session selection and refocuses after a successful stock-take scan.
- Stock Return Supplier now focuses barcode entry after supplier selection and after a successful supplier-return request.
- Stock Damage/Spoilage now focuses barcode entry after photo setup, after reason selection when a photo exists, and after a successful damage request.
- Stock Return now focuses barcode entry after a worker selects return location or return condition, and refocuses after a successful return save.
- Stock Transfer and Stock Outbound Direct Transfer now focus the barcode field after a worker selects a destination stock location.
- Stock Outbound Direct Sales now focuses the barcode field after a worker selects a customer from quick buttons or the full customer list.
- Barcode Inbound now has a `Generate internal label` button beside `Net weight kg`; generated labels use the inbound session code and save stock immediately, then remain printable from the saved-label list.
- Barcode Inbound recent template buttons now say `Tap to scan` for saved-rule templates and `Tap to learn rule` for no-rule templates, with shorter selection messages that tell workers the next action.
- Barcode Inbound now explains beside `Net weight kg` whether saved rules auto-fill weight after scan or first-time supplier barcodes need one actual-kg entry to learn the rule.
- Stock Item Master edit now shows quick item buttons from search results and tucks the full item dropdown under `Full item list`, auto-opening it only when search has no matches.
- Stock Item Master edit now shows only item code, category, and product name first; default brand, product section, alternate names, and low-stock kg are under `Optional item details`.
- Stock Outbound direct Sales now keeps search/quick customer buttons as the main path and tucks the full customer dropdown under `Full customer list`, auto-opening it only when search has no matches.
- Transfer Out hides the worker's assigned source stock location from destination choices, while keeping the same-location transfer block as a safety net.
- Receive Transfer no longer shows a red wrong-location warning on the idle page; it only shows the red destination-specific warning after a known pending-transfer barcode belongs elsewhere.
- Receive Transfer now names the required destination when a known pending-transfer barcode is entered at the wrong receiving location, while keeping server-side blocking and scan-issue logging unchanged.
- Barcode Inbound now opens `Set barcode rule once` automatically when item + brand + origin are selected but no saved barcode rule exists, while saved-rule sessions remain collapsed for scan-first repeat batches.
- Stock Item Master create/edit fields now request phone-friendly keyboards and avoid browser autofill on item code, product name, optional naming, and low-stock kg fields.
- Stock Item Master edit now includes item-code/product search before the edit dropdown, reducing scrolling through long product lists on mobile.
- Stock Item Master edit now starts with no selected item and keeps active/barcode-required toggles under advanced item settings after a product is chosen, avoiding accidental edits to the first item.
- Barcode Inbound internal-label saves now return focus to the weight field instead of the barcode field, reducing taps for repeated no-barcode/internal-label entries under the same locked session.
- Shared Stock barcode fields now treat Enter in the manual barcode input as a scan, so external USB/Bluetooth keyboard scanners use the same path as camera scans.
- Barcode Inbound now tells workers `No weight position found. Use internal label.` when they type actual kg but the supplier barcode cannot teach a usable weight-position rule.
- Stock Outbound direct scan handler now enforces the same worker prerequisites as the disabled scanner UI; direct Sales requires a customer before scanning, Damage/Spoilage still requires a photo, Return Supplier still requires supplier, and Transfer still requires destination before any camera/manual scan is accepted.
- Barcode Inbound now turns `Save weight rule for future scans` back on whenever the selected item + brand + origin has no saved rule, preventing an old browser setting from blocking first-scan learning.
- Stock Transfer now shows `Sending from assigned location: ...` and blocks choosing that assigned source as the destination before scanning.
- Stock Outbound direct Sales now has a customer name/phone search that filters quick customer buttons before scanning, while the full customer dropdown remains available.
- Stock Return now has large mobile return-condition buttons (`Good / sellable`, `Failed delivery, product ok`, `Customer rejected, product ok`) and records the chosen condition in the existing return notes path.
- Stock Return/Damage now hides the manager-only inspection-release form from normal workers, keeping the worker return page focused on scan-return, damage request, and supplier-return tasks.
- Barcode Inbound now shows a worker-facing barcode rule status card after item + brand + origin are selected: `Saved barcode rule ready` when a saved rule exists, or `No saved barcode rule yet` with one-scan setup guidance.
- Stock Item Master create now shows only the required worker setup fields first: generated item code, category, and product name. Optional brand, section, alternate names, low-stock level, and barcode-required settings are tucked under `Optional item details` for 390px mobile use.
- Barcode Inbound now tries to learn a 5-digit imported barcode weight position after the worker scans a supplier barcode and manually enters the actual kg once; if one clear position is found, it fills the rule fields and turns on `Save weight rule for future scans`.
- Barcode Inbound now warns workers when a scanned barcode length differs from the latest saved barcode format for the selected item + brand + origin rule, without blocking the scan.
- Barcode Inbound now writes failed scan-log issue records when browser-side duplicate or no-weight/barcode-rule failure blocks a scan.
- Stock manager dashboard now shows all recent failed barcode scan logs as `Manager scan issue review`, including duplicate, wrong-location, unknown-barcode, unavailable-stock, and barcode-rule failures, with a link to the barcode scan error report.
- Stock Take now shows a `Pending stock take exceptions` review card for unresolved unknown-barcode and wrong-location exceptions before the session list, so managers/directors can see what will resolve only after manager review and director approval.
- Receive Transfer now shows pending transfer barcodes for the selected receiving stock location, with one-tap barcode fill while keeping camera/external scanner input.
- Latest Receive Transfer pending-list pass on 2026-06-25 passed `npm.cmd run smoke`, `npm.cmd run lint`, `npm.cmd run typecheck`, and `npm.cmd run build`.
- Stock Outbound now opens as direct stock outbound only; customer-order picking is linked to `/orders/picking`, and direct Sales requires customer selection before scanning while keeping a default remark to reduce typing.
- Stock Take scan-scope, counting-scope, session-number, and previous-scan item text now force wrapping so long item/brand/location/session values stay inside cards around 390px width.
- Shared Stock scanner success feedback now keeps `Last scan` and `Camera session scans` stacked at 390px phone width, then switches to side-by-side only on wider screens.
- Stock table sort buttons now use phone-size tap targets with wrapping labels and non-shrinking sort icons, and Stock table values wrap instead of clipping long barcodes, locations, and references below the mobile cards around 390px width.
- Stock dashboard alert cards now wrap negative-stock, old-stock, and overdue-transfer item/location/reason text so red/yellow/orange warning cards stay readable around 390px width.
- Stock shortcut buttons now use flexible minimum height with padding so worker actions like Return/Damage and Stock Take can wrap without clipping at 390px width or larger browser text settings.
- Barcode Inbound disclosure headers and quick product creation now use phone-size tap targets, and inbound decode/duplicate messages wrap for 390px worker screens.
- Stock workflow disclosure headers now use phone-size tap targets across optional/reference sections so workers can open them comfortably at 390px width.
- Stock label previews now wrap company, product, and weight text so workers can verify long product labels before Bluetooth print or PDF fallback at 390px width.
- Stock unit detail movement cards now stack movement type/date and weight on narrow phones, improving barcode history readability around 390px width.
- Stock mobile movement-history cards now stack movement type/item and weight on very narrow phones, then switch to side-by-side at 390px width, reducing overflow risk on Stock dashboard, movement history, and recent-movement panels.
- Stock mobile item-master, balance, and barcode-unit cards now stack status badges below item text on very narrow phones, then align side-by-side at 390px so long names and statuses do not squeeze each other.
- Stock Take review-session cards now wrap long session number, location/item/brand scope, exception barcode, signature, and approval-action text so manager/director review stays readable around 390px width.
- Retail V1 technical QA is confirmed ready for Limited UAT, and the active Retail UX pass is splitting crowded Retail pages into one-task routes. Retail Home is now role-based: workers see Submit Expense, Complete Cleaning, Record Processing, Picking Order, and Today Summary only; managers see Daily Sales, Cash Closing, Review Expenses, Processing Records, Cleaning Setup, and Outlet Report; admin/director see All Outlet Report, Cash Variance, Missing Tasks, Processing Report, and Export Center. Worker Submit Expense, Complete Cleaning, and Record Processing pages now stay task-only, `/retail/today` is a read-only quick check instead of a second launcher, worker Today Summary shows icon status cards and missing cleaning in red, manager Today checklist shows icon status cards, manager Daily Sales, Expense Review, Cash Closing, and Processing Records pages no longer carry adjacent history or cross-task links, manager Retail sub-nav points task labels to focused pages, and admin/director Retail sub-nav now points to focused report/export pages instead of outlet operation shortcuts. `/retail/reports` is a role-based launcher to focused report pages instead of the old all-in-one report dashboard, `/retail/settings/audit` shows only the audit trail task, and setup records tables now live on separate settings records routes instead of the setup form pages. Processing is report-only in Retail V1: workers submit records immediately, managers read processing records and do not review/reject them; `/retail/processing/review` redirects to Processing Records, no processing review success link points back to that retired Retail URL, and retail managers are not allowed by the processing review server action. Worker forms keep required fields up front, show the missing receipt error inline on Submit Expense, hide submit buttons after success when next actions are shown, order Submit Expense as Amount, Category, Payment method, then Receipt, label the required upload simply as Receipt, use phone-friendly dropdown height/text, request the phone decimal keyboard for Retail numeric fields, remove raw/finished processing line remarks from the phone path, and tuck optional expense supplier/remarks, cleaning photo/remarks, and processing optional details behind disclosures. Processing header remarks now sit behind `Processing remarks (optional)`. Cash Closing remarks are visibly optional, matching the warning-only variance rule. Daily Sales now tucks optional remarks behind a disclosure while leaving the AutoCount attachment upload visible. Manager review forms now tuck rejection reason/remarks behind an `if needed` disclosure while preserving rejection validation. Setup forms now also tuck optional/future BOM yield fields behind disclosures.
- Stock mobile item-master cards now wrap long item code, item name, category, section, brand, and barcode requirement values so product setup data stays readable around 390px width.
- Stock movement/report filter buttons now use phone-size tap targets with non-shrinking search icons so Stock filters are easier to submit around 390px width.
- Stock unit detail/reprint now wraps long item name, barcode, status, item code, brand, origin, location, inbound source, and batch fields so old-label reprint pages stay readable around 390px width.
- Stock mobile balance, barcode-unit, movement-history, and stock-unit detail cards now wrap long item, brand, origin, status, and location names so worker cards do not overflow around 390px width.
- Stock mobile movement cards and Stock outbound scan labels now wrap long product names instead of truncating them, helping workers verify item identity around 390px width.
- Stock label print/reprint buttons now use flexible height, wrapping text, and non-shrinking icons so `Print label` / `PDF fallback` actions stay readable around 390px width.
- Shared Stock scanner helper, setup-blocked, connection-lost, camera-error, and camera-success cards now force word wrapping so long worker messages stay inside the scanner field and camera sheet at phone width.
- Stock Transfer/Receive, Return, and Stock Take quick location/session buttons now use word-breaking labels so long stock-location, item, brand, and session names stay inside the button at phone width.
- Stock Outbound direct type and quick-remark buttons now use word-breaking labels so long outbound type names and remarks stay inside the button at phone width.
- Stock Outbound `Scanning outbound` and `Previous outbound scan` feedback cards now wrap long destination/product text so scan context stays readable around 390px width.
- Barcode Inbound recent template and quick product/brand/origin/location buttons now use word-breaking labels so long item, brand, origin, or stock-location names stay inside the button at phone width.
- Barcode Inbound previous-scan and recent saved-scan cards now wrap long product names and status badges so scan feedback stays readable around 390px width.
- Stock Transfer, Receive Transfer, Return, Damage/Spoilage, and Return Supplier local feedback cards now wrap long worker messages, keeping setup/offline/status text inside the card at phone width.
- Stock Take blocked scan feedback now wraps long alert text in the red card while keeping assertive alert behavior for wrong setup/offline cases.
- Stock Outbound missing/blocked/wrong-destination red alert cards now use assertive alerts and include wrapping barcode text in the blocked-barcode list, so workers can identify which scan to remove.
- Stock Outbound duplicate batch scans now show the short red alert `Duplicate barcode. Outbound is blocked.` with assertive announcement and wrapped text.
- Stock Damage/Spoilage selected-photo messages now wrap long photo names/references, reducing horizontal overflow risk when phone cameras create long image filenames.
- Stock Outbound direct outbound now auto-selects the first quick remark for the selected outbound type, reducing required typing while keeping the remarks field editable and server validation unchanged.
- Stock Outbound scanned barcode rows now show full wrapping barcode text instead of truncating it, so workers can identify and remove wrong scans before final confirm.
- Barcode Inbound blocked/error session rows now wrap long barcode text, reducing horizontal overflow risk when workers scan long supplier/GS1 barcodes at 390px width.
- Shared Stock action messages and offline scan alerts now use wrapping text so long worker-facing messages do not force horizontal overflow on phone-width screens.
- Stock worker home shortcut buttons now keep icons from shrinking and wrap labels inside `min-w-0` text, reducing overflow risk for long labels at 390px width.
- Shared Stock barcode fields now say `Type barcode if needed.`, keeping camera scanning as the main worker path and manual entry as fallback.
- Latest Stock scanner manual-entry helper copy pass on 2026-06-24 passed focused Stock acceptance/scanner/mobile/doc guards plus `npm.cmd run smoke`, `npm.cmd run lint`, `npm.cmd run typecheck`, and `npm.cmd run build`.
- Shared Stock scanner now uses `Camera scanning is not available. Use manual entry.` when the browser cannot provide camera scanning.
- Latest Stock scanner browser-unavailable copy pass on 2026-06-24 passed focused Stock scanner/mobile/doc guards, `npm.cmd run lint`, `npm.cmd run typecheck`, and `npm.cmd run build`; full `npm.cmd run smoke` failed before Stock checks on an unrelated Delivery migration policy ordering guard in `202606240006_delivery_completion_rls_fix_v1.sql`.
- Shared Stock scanner camera error messages now point workers to `Use manual entry` instead of saying to type the barcode manually.
- Shared Stock scanner permission help now says `If permission is blocked, tap Use manual entry.`, matching the in-sheet fallback button.
- Shared Stock scanner now announces `Starting camera...` as a polite status while the camera stream is opening.
- Shared Stock scanner camera errors now show both `Try camera again` and `Use manual entry` inside the error card, so workers can recover immediately.
- Shared Stock scanner now shows `Try camera again` inside the scanner sheet when camera startup fails, so workers can retry without closing the scanner.
- Shared Stock scanner now clears stale camera error text and the camera-only duplicate debounce whenever `Scan Barcode` opens, so reopening the camera is ready for the next worker scan.
- Barcode Inbound now shows `Print and attach labels.` beside generated-label print actions when saved labels are available.
- Shared Stock scanner now shows `Detected. Ready for next scan.` after a successful continuous camera read, giving workers immediate green feedback without claiming the server save has completed.
- Shared Stock scanner now shows a `Camera session scans` count inside the camera sheet and resets it every time the scanner opens, so workers can see continuous camera reads during a batch.
- Shared Stock barcode fields now have their own online-only guard: if the browser is offline, the manual barcode input and `Scan Barcode` button are disabled with `Connection lost. Please reconnect before scanning.`, and an open camera scanner stops before any scan is passed to the workflow.
- Barcode Inbound recent templates now switch to a two-column grid at the 390px worker-phone breakpoint and show `Tap Brand + Product to scan faster.` so repeat inbound can start with less scrolling.
- Barcode Inbound now prefers the worker assigned stock location on page open even when the browser has an older saved inbound location, and keeps location editing behind `Change Location`.
- Stock Take session creation now prefers the worker assigned stock location and shows `Default stock take location: [location]. You can change it.` before the worker starts a session.
- Receive-transfer and normal Stock Return now prefer the worker assigned stock location. Stock Return shows the selected `Returning to` card first and tucks location changes behind `Change return location`.
- Stock item edit and Stock filter dropdowns now use phone-size controls instead of the older short select height, so category, default brand, movement type, and status selectors are easier to tap around 390px width.
- Stock Item Master now shows mobile item cards before the full item table, with item code, product name, category/section, brand, barcode requirement, and active status.
- Stock Dashboard latest movements now show mobile movement cards before the full table so recent stock activity is readable around 390px width.
- Stock scan pages now show mobile recent-movement cards before the recent-movements table, so workers can confirm recent inbound/outbound/transfer/return actions around 390px width.
- Barcode Inbound `Finish Inbound Session` now uses a full-width phone-size button before switching to compact desktop sizing.
- Stock worker shortcuts, overdue transfer `Open receive`, and barcode unit `Open / reprint` now use in-app navigation links for smoother phone movement between Stock pages.
- Shared Stock scanner modal now uses dialog semantics, links its title/help text, and focuses the scanner sheet when opened.
- Shared Stock scanner modal now locks background page scrolling while the camera sheet is open and restores scrolling when it closes.
- Shared Stock scanner now returns focus to the `Scan Barcode` button after the camera sheet closes.
- Shared Stock scanner now offers `Use manual entry` inside the camera sheet and focuses the manual barcode input after closing.
- Stock manual barcode fallback now requests the phone numeric keyboard with a Done key and disables autocorrect/capitalization for faster long-barcode typing.
- Barcode Inbound weight and barcode-rule number fields now request decimal/numeric phone keyboards with a Done key, making internal-label generation and weight-rule setup easier on mobile.
- Barcode Inbound product search now requests a phone search keyboard/action, and quick product creation uses a Done key for the product name fallback.
- Barcode Inbound batch number now requests a phone Done key and avoids browser autofill while keeping the auto-generated value editable.
- Return/Damage supplier and photo-reference fallback fields now request a phone Done key and avoid browser autofill, while keeping photo/supplier requirements unchanged.
- Stock optional reference-number fields now request a phone Done key and avoid browser autofill across inbound, outbound, transfer, receive-transfer, and return.
- No-barcode stock guidance now uses a full-width phone-size `Open Barcode Inbound` in-app link so workers can move to label/inbound flow quickly.
- Stock Balance now shows mobile barcode unit cards before the full barcode unit table, with barcode, item, status, weight, location, received date, and a large `Open / reprint` action to the stock-unit detail page.
- Barcode Inbound recent scan cards and finished-session details now use the 390px breakpoint so saved labels and summary fields are easier to compare on worker phones.
- Stock Outbound direct scan rows now use the 390px breakpoint so count and known-weight summaries can be compared while scanning on worker phones.
- Stock Outbound scanned rows now turn red for missing, blocked-status, or wrong-transfer-destination barcodes and show `Remove before confirm.` guidance beside the row before final confirm.
- Stock Take barcode-only, wrong-item/brand, and unknown-barcode rule cards now use the 390px breakpoint so workers can see the scan rules side by side on phones.
- Shared Stock scanner modal now tells workers rear camera is preferred, shows a visible scan frame with `Keep barcode inside the box.`, and announces camera startup errors assertively.
- Return/Damage mobile scans now show pre-scan context cards: `Returning to` for stock return, `Requesting damage` after a damage photo is selected, and `Returning supplier` after a supplier is selected.
- Transfer and Receive Transfer now show green pre-scan context cards: `Sending to` for transfer destination and `Receiving at` for receive-transfer location, with receive reminding workers to scan only barcodes for that destination.
- Stock Outbound now shows a green `Scanning outbound` card above the barcode scanner once direct setup is ready, showing the selected outbound type, transfer destination when relevant, and `Scan multiple barcodes, then confirm.`
- Barcode Inbound now shows a green `Scanning inbound` card above the scanner after setup is ready, with active brand, product, origin, and location plus `Session locked. Finish first.` after the first saved scan.
- Stock Take mobile scanning now shows a green `Scanning for` card above the barcode scanner with the active brand, item, and location plus `Wrong item or brand is blocked.` so workers can verify the scope before scanning.
- `docs/STOCK_MOBILE_UX_REQUIREMENT_AUDIT.md` now maps every confirmed Stock Mobile MVP requirement to source evidence, automated guards, and remaining manual/device proof, and `npm.cmd run smoke` guards that audit through `scripts/stock-owner-qa-doc-coverage.mjs`.
- Latest Stock mobile QA preparation re-run on 2026-06-24 passed `node scripts\stock-mobile-ux-coverage.mjs`, `npm.cmd run smoke`, `npm.cmd run lint`, `npm.cmd run typecheck`, and `npm.cmd run build`; it source-checked the requested worker flows but still needs real authenticated 390px, phone camera, Bluetooth printer, and live Supabase/RLS evidence.
- Barcode Inbound duplicate warning now uses urgent red alert semantics for the red `Duplicate barcode. Inbound is blocked.` message while keeping duplicate save blocking unchanged.
- Stock Take active warning now announces politely as status text while staying warning-only, not blocking other movements.
- Receive-transfer now shows a clearer red wrong-location reminder: `Wrong location is blocked. Receive only at the barcode destination.`
- Stock worker scan feedback now sets live-region priority for transfer, receive-transfer, return, damage/spoilage, return supplier, and stock-take messages.
- Stock Outbound setup/confirm warnings now announce politely as status text while remaining warning-only.
- Barcode Inbound live counters and finished-session summary now use the 390px mobile breakpoint so saved count, saved weight, total units, total weight, and duplicate/error scans stay readable together.
- Stock Outbound scan summary now uses the 390px mobile breakpoint so workers can compare scanned units, known weight, and unknown scans while scanning.
- Stock label print guidance now appears as a green worker card that says Bluetooth label printer first, PDF fallback if unavailable, 50mm x 30mm, and one label per page.
- Stock label print/reprint action buttons now show `Bluetooth printer` under `Print label` and `Save as PDF` under `PDF fallback`.
- Stock Take barcode progress and weight progress now use the 390px mobile breakpoint so workers can compare count and weight progress side by side while scanning.
- Receive-transfer now uses receiving-location wording for the quick location buttons and green selected-location confirmation, while transfer still uses destination wording.
- Latest Stock reference-number keyboard-hint pass on 2026-06-24 passed focused Stock mobile/doc guards, `npm.cmd run smoke`, `npm.cmd run lint`, `npm.cmd run typecheck`, and `npm.cmd run build` after one build-lock retry.
- Stock scan fields now link disabled scan reasons to the manual barcode field and camera scan button, and connection-loss blocks announce urgently while ordinary setup blockers remain polite worker messages.
- Stock mobile QA preparation pass on 2026-06-24 source-checked the requested 390px worker areas: Stock home, inbound, continuous scanning, duplicate and no-weight warnings, label generation/reprint, direct outbound, damage/spoilage request, transfer, receive-transfer wrong-location block, stock-take progress, unknown-barcode exception, and online-only connection message.
- The local app starts in foreground, but authenticated 390px browser-route QA was not completed in this run because a stable background local browser server was not available.
- `npm.cmd run smoke`, `npm.cmd run lint`, `npm.cmd run typecheck`, and `npm.cmd run build` passed on this QA preparation pass.
- Real owner/device QA is still required for phone camera permission, rear-camera scanning, Bluetooth/PDF label output, authenticated Vercel screenshots, and live Supabase/RLS workflow evidence.
- Local in-app browser QA was retried on 2026-06-24 but was blocked by the Windows sandbox permission error `CreateProcessAsUserW failed: 5`; owner/Vercel screenshots remain required.
- Stock Movement History now shows mobile summary cards with movement type, item, barcode, quantity, weight, location movement, time, and reference before the full table.
- Stock Balance now shows mobile summary cards with item, location, quantity, weight, and alert state before the full table, without adding cost/value/finance data.
- Stock Balance now also shows mobile barcode unit cards before the stock-unit table so workers can open/reprint a unit without horizontal table navigation.
- Stock unit detail now shows mobile movement summary cards before the full movement table so workers can read recent barcode history without horizontal scrolling.
- Stock unit detail now uses a full-width phone-size `Back to stock balance` button so workers can leave label reprint/history after reprinting.
- Stock label print actions now switch to a two-column `Print label` / `PDF fallback` grid at 390px width.
- Barcode scanner fields now keep the field label above the large `Scan Barcode` button at phone width, avoiding squeezed scanner controls around 390px.
- Stock worker home shortcuts now switch to a two-column button grid at 390px width, while keeping the same six worker actions and wrapped labels.
- Stock workflow submit buttons now default to full-width phone buttons and compact desktop buttons, making final actions easier to tap at 390px width.
- Barcode Inbound current-session scan cards now use a full-width mobile `Undo scan` button with the hint `Undo before finish.`.
- Stock Outbound scanned rows now use a larger full-width mobile `Remove` button with the hint `Remove a wrong scan before final confirm.`.
- Damage/spoilage and supplier-return request forms now show `Previous damage scan` and `Previous supplier return scan` after successful request submissions.
- Normal Stock Return now shows `Previous return scan` after a successful return so workers can verify the last barcode before scanning the next one.
- Transfer and receive-transfer now show `Previous transfer scan` and `Previous receive scan` after successful barcode submissions so workers can verify the last barcode before scanning the next one.
- Damage/spoilage mobile forms now make photo picking the primary path, show `Photo selected:` after choosing an image, and tuck manual photo reference entry behind `Photo reference fallback`.
- Stock Take scan form now selects the first active draft session automatically, while still allowing workers to tap another active session before scanning.
- Stock Outbound now tucks optional reference number entry into a collapsed `Reference no. (optional)` section so workers can focus on direct setup and barcode scanning first.
- Latest Stock mobile QA source pass on 2026-06-23 checked the requested worker areas through local source guards: Stock home buttons, inbound session, continuous scanning UI, duplicate warning, no-weight warning, label generation, label reprint, direct outbound, damage/spoilage request, transfer, receive-transfer wrong-location block, stock-take progress, unknown-barcode exception, and online-only connection message.
- `npm.cmd run smoke`, `npm.cmd run lint`, `npm.cmd run typecheck`, and `npm.cmd run build` passed on this QA pass.
- ERP Home now shows stock users a simple `Stock` shortcut to `/stock` instead of a worker-facing `Stock Dashboard` shortcut; Stock Reports remains role-restricted for advanced access.
- Disabled Stock barcode fields now show the exact short block reason directly under the scan/manual barcode field across inbound, outbound, transfer, receive-transfer, return/damage, return supplier, inspection release, and stock take.
- Direct outbound `Damage/Spoilage` now blocks scanner/confirm until a damage photo reference exists and clearly says stock is not deducted now.
- Direct outbound `Return Supplier` now blocks scanner/confirm until supplier name is filled.
- Direct outbound `Return Supplier` now shows recent supplier buttons when previous supplier-return requests exist, reducing typing before scan.
- Barcode Inbound setup now shows quick product buttons before the product dropdown/search fallback, reducing typing when no recent template is available.
- Barcode Inbound setup now shows quick brand and origin buttons before their dropdowns, while keeping Other/custom fallback choices.
- Barcode Inbound setup now shows quick location buttons before the location dropdown, while keeping the assigned default and editable fallback.
- Barcode Inbound no-weight flow now uses a larger `Generate internal label` button with short worker guidance to save stock immediately, then print and attach the label.
- Normal Stock Return now shows quick return-location buttons before the dropdown so phone workers can choose location with one tap before scanning.
- Stock Take session creation now shows quick stock-take location buttons before the dropdown so workers can choose the count location with one tap.
- Stock Take session creation now also shows quick item and brand buttons before their dropdowns, reducing setup taps for worker-created stock-take sessions.
- Local `npm.cmd run smoke`, `npm.cmd run lint`, `npm.cmd run typecheck`, and `npm.cmd run build` passed on 2026-06-23.
- The smoke run includes Stock mobile UX, scanner, label, stock-take, report, RLS-policy, security, and owner-QA doc guards for the requested 390px worker flows.
- Real 390px browser/device QA still needs owner testing because this Windows sandbox could not keep a detached dev server/browser connector running.

## What Already Exists

| Module | Current Status | Main Routes / Files |
| --- | --- | --- |
| Foundation / Navigation | Internal-test complete. App shell, role/sidebar navigation, mobile Sheet menu, module access guard, scope display, login redirect, loading/error states exist. Production status depends on real role testing. | `/`, `/login`, `/dashboard`, `/home`, `components/erp/*`, `lib/auth/*` |
| Dashboard / Home | Partial. Role/access shortcut cards and scope display exist. KPI usefulness is not fully validated by role. | `/dashboard`, `/home`, `components/dashboard/home-page.tsx` |
| Inventory / Stock | Strong partial. Numeric-only category+default-brand+product item master with all-role create/edit and admin/director delete, barcode scanner with success feedback and continuous mode for batch workflows, mobile worker Stock home with only six big action buttons, worker navigation and direct-route guards hiding advanced Stock reports/settings, atomic continuous inbound with recent templates, product search, quick product create tucked behind a compact `New product` panel, auto batch number, assigned-location default, session setup locking after first saved scan, advanced source/rule/batch/reference/notes fields tucked under `Weight rule and notes`, online-only scan/save blocking across inbound/outbound/transfer/receive-transfer/return/damage/stock-take worker flows with `Connection lost. Please reconnect before scanning.`, duplicate auto-save prevention, no-weight barcode blocking, generated-label auto-save flow, current preset display, saved scan count, saved total weight, previous scan product/weight/barcode display, recent inbound scan/label list, finish-session summary, current-session undo that voids with audit trail, generated numeric barcode labels, reusable 50mm x 30mm label preview/print component with machine-readable Code 128 SVG bars and structure for later label sizes, Bluetooth-label-printer-first UX copy with PDF fallback, scoped stock-unit detail/reprint page without reason entry, item+brand+origin barcode rules, mobile outbound with large order/direct and outbound-type buttons, order outbound requiring manual ready-order selection, order item checklist, requested-vs-scanned/substitution warning, explicit substitution confirmation without typed reason, missing-barcode and blocked-status pre-confirm warnings, direct outbound with required remarks, direct sales/processing/transfer/sample-testing, direct damage/return-supplier request creation with large reason buttons, pending damage request outbound blocking, return-supplier `HOLD_RETURN_SUPPLIER`, mobile transfer/receive-transfer with stock-location-first selection, active scoped stock-location transfer support in migration `202606230006`, atomic transfer, strict wrong-location receive-transfer blocking with destination-location error, scan-first mobile return/damage/return-supplier forms with optional notes tucked away and large final action buttons, atomic return, atomic customer-return inspection release, damage/spoilage request with manager review/director approval status/scope gates, return-supplier request with manager approval status/scope gates, no-barcode-to-barcode redirect/guidance, mobile scoped barcode-only stock take with worker-created sessions, active-session tap buttons before the session dropdown, count/weight progress, wrong item/brand blocked messaging, unknown-barcode and wrong-location exceptions, empty-session submit/review/approval blocking, stock-take warning-only audit for other operations in the active item+brand+location, unknown-barcode and wrong-location stock-take exceptions resolved only at director approval, missing-barcode variance calculation at director approval, manager review/director approval signatures, and manual count-line blocking, manager stock dashboard KPIs including today inbound/outbound, duplicate scan attempts, barcode decode errors, pending damage approvals, and pending stock-take approvals, stock dashboard shortcuts for inbound/outbound/transfer/receive/return/stock-take, stock balance/movement-history/inbound/outbound/transfer-pending/old-stock/variance/damage/supplier-return/barcode-error reports with filters, negative-stock alerting, stock-age alerting, overdue transfer receive alerting, legacy no-barcode visibility for old records, item-code regression checks, numeric barcode-label regression checks, outbound-rule regression checks, stockable-status regression checks, stock-take scope/signature regression checks, damage/return-supplier approval regression checks, stock acceptance coverage guards, stock state-transition coverage guards, stock migration safety guards, stock role/scope coverage guards, stock scanner coverage guards, stock RLS policy coverage guards, stock seed coverage guards, stock security/no-service-role guards, stock item-master coverage guards, stock label coverage guards, stock-take warning coverage guards, and stock report coverage guards exist. Stock mobile QA runbooks/evidence docs now include a 390px quick-pass checklist for home, inbound, scanning, labels, outbound, damage, transfer, receive-transfer, stock take, exceptions, and online-only blocking. Configured Supabase stock data errors now surface instead of silently falling back to demo data. Needs real RLS, real phone camera, Bluetooth/PDF label printer, authenticated 390px browser, and stock edge-case QA. | `/stock/*`, `components/stock/*`, `lib/stock/*` |
| Orders | Strong partial / V1 feature-complete pending live QA. Manual ERP pickup, delivery, and internal transfer order creation, quick customer create, immediate weight-first reservation, stock-not-enough creation, picking by barcode/manual reason, ready pickup/delivery states, pickup completion, cancellation with reservation release, delivery handoff, dashboard filters, KPI cards, dashboard alerts, in-app notification events, and customer/item/staff/status/queue/delivery-performance reports exist. Real migrated DB/RLS/device QA remains. Legacy `/orders/new` and `/orders/prepare` redirect to canonical routes. | `/orders`, `/orders/create`, `/orders/[id]`, `/orders/picking`, `/orders/ready`, `/orders/customers`, `components/orders/*`, `lib/orders/*` |
| Delivery | Strong partial. Delivery orders, vehicles, driver location, payment/proof metadata, receiver/GPS proof upload, auto-delivered proof completion, failed customer-order barcode return logging, payment records, and customer-order handoff exist. Standalone/no-barcode failed-return follow-up and real Storage/RLS/browser QA remain. | `/delivery/*`, `components/delivery/*`, `lib/delivery/*` |
| Processing | Partial. Dedicated `/processing/*` UI now shows raw weight, finished weight, loss kg, yield %, and abnormal-yield alerts with 85% default minimum. Data/actions still adapt retail processing batches and remain one raw item to one finished item. | `/processing/*`, `/retail/processing`, `components/processing/*`, `lib/processing/*`, `components/retail/*`, `lib/retail/*` |
| Cleaning | Partial. Task frequency, scoped update, missed/overdue alerts, and 30-day matrix exist. Cleaning due/completion logic remains mostly page-level and needs real scope tests. | `/cleaning/tasks`, `/retail/cleaning`, `components/retail/*`, `lib/retail/*` |
| Import / Container Tracking | Partial. Implemented at finance/container metadata level only. Not a full import document/workflow module. | `/accounting-finance/containers`, `finance_containers`, `components/finance/*`, `lib/finance/*` |
| Customer Management | Partial. Customers, Retail/Wholesale/VIP category direction, credit terms, lat/long, and customer price rules exist in admin settings. Customer pricing, price override reason, and AutoCount aging are not fully applied across order/retail entry. | `/settings`, `lib/settings/*`, migration `202606100032`, migration `202606100035` |
| Retail | Technically ready for Limited UAT after real manual phone/browser QA. Retail Module V1 is now a daily outlet control module around AutoCount with role-based Home launchers and focused one-task pages for worker tasks, manager review/setup, and admin/director report exceptions. Old POS/payment/price routes redirect, and active Retail V1 no longer renders POS sale entry or creates stock movements from retail sales/processing. Needs a final real phone/browser pass over the simplified staff rollout UX. | `/retail/*`, `components/retail/*`, `lib/retail/*`, migration `202606230016` |
| Attendance | Partial. GPS clock, rules, late/no-clock-out/on-leave handling exist. Needs real device GPS and leave-balance workflow validation. | `/attendance/*`, `components/attendance/*`, `lib/attendance/*` |
| OA Actions | Strong partial. Advance, claim, leave, payslip, timelines, and role transitions exist. Needs real role/user QA. | `/oa-actions/*`, `components/oa-actions/*`, `lib/oa-actions/*` |
| Accounting / Finance | Partial. AR/AP invoice metadata, aging, containers, review/approval/payment exist. Storage and extraction/manual correction workflow need validation. | `/accounting-finance/*`, `components/finance/*`, `lib/finance/*` |
| Director / Reports | Partial. Dashboard, approvals, reports, print/WhatsApp/CSV surfaces exist. Reports are on-demand but not broad enough for production reporting. | `/director-reports/*`, `components/director/director-page.tsx` |
| Barcode Scanning | Partial. Camera scanner, large mobile scan button, permission guidance, manual fallback text field, recent scan list, saved scan count/weight, success vibrate/beep where supported, continuous mode for inbound/outbound/stock-take, GS1 `3102`/`3103` weight decode, 1-3 decimal position rules, fixed-weight fallback confirmation, generated internal numeric barcode labels, recent label list, duplicate warning, and 50mm x 30mm print/PDF label output are implemented in stock inbound. Needs phone/laptop camera QA under HTTPS or localhost. | `components/stock/barcode-scanner.tsx`, `components/stock/workflow-forms.tsx`, `lib/stock/barcode-weight.ts` |
| Admin Settings | Partial. User scope, outlet module access, configurable lists, customers, prices, and barcode rules exist. Needs real admin workflow and RLS tests. | `/settings`, `components/settings/settings-page.tsx`, `lib/settings/*` |

## Page Inventory

- Foundation: `/`, `/login`, `/dashboard`, `/home`, `/settings`
- Stock: `/stock`, `/stock/dashboard`, `/stock/items`, `/stock/inbound`, `/stock/outbound`, `/stock/transfer`, `/stock/receive-transfer`, `/stock/return`, `/stock/no-barcode-inbound` redirect, `/stock/balance`, `/stock/units/[id]`, `/stock/movements`, `/stock/stock-take`, `/stock/reports`, `/stock/settings`
- Orders: `/orders`, `/orders/create`, `/orders/[id]`, `/orders/picking`, `/orders/ready`, `/orders/customers`
- Delivery: `/delivery`, `/delivery/dashboard`, `/delivery/orders`, `/delivery/new-order`, `/delivery/driver`, `/delivery/vehicles`, `/delivery/payments`
- Processing: `/processing`, `/processing/dashboard`, `/processing/batches`, `/retail/processing`
- Cleaning: `/cleaning`, `/cleaning/tasks`, `/retail/cleaning`
- Retail: `/retail`, `/retail/today`, `/retail/reports`, `/retail/reports/outlet`, `/retail/reports/all`, `/retail/reports/cash-variance`, `/retail/reports/missing-tasks`, `/retail/reports/processing`, `/retail/reports/export`, `/retail/dashboard` report alias, `/retail/sales`, `/retail/sales/history`, `/retail/expenses`, `/retail/expenses/review`, `/retail/expenses/history`, `/retail/cleaning`, `/retail/cleaning/tasks`, `/retail/cleaning/history`, `/retail/processing`, `/retail/processing/review`, `/retail/processing/history`, `/retail/cash/open`, `/retail/cash-closing`, `/retail/cash/close`, `/retail/cash/history`, `/retail/cash/history/closings`, `/retail/cash/history/sessions`, `/retail/settings`, `/retail/settings/boms`, `/retail/settings/boms/records`, `/retail/settings/categories`, `/retail/settings/categories/records`, `/retail/settings/prices`, `/retail/settings/prices/records`, `/retail/settings/audit`; legacy `/retail/pos`, `/retail/payments`, and `/retail/prices` redirect into V1 routes.
- Attendance: `/attendance`, `/attendance/today`, `/attendance/clock`, `/attendance/my-attendance`, `/attendance/department`, `/attendance/settings`
- OA actions: `/oa-actions`, `/oa-actions/dashboard`, `/oa-actions/advance`, `/oa-actions/claim`, `/oa-actions/leave`, `/oa-actions/payslip`, `/oa-actions/my-requests`, `/oa/my-requests`
- Accounting/Finance: `/accounting-finance`, `/accounting-finance/dashboard`, `/accounting-finance/claims`, `/accounting-finance/advances`, `/accounting-finance/ar-invoices`, `/accounting-finance/ap-invoices`, `/accounting-finance/containers`, `/accounting/dashboard`
- Director/Reports: `/director-reports`, `/director-reports/dashboard`, `/director-reports/approvals`, `/director-reports/reports`, `/director/dashboard`

## Mock UI / Demo-Mode Areas

- Demo-mode data exists across stock, attendance, delivery, OA, retail, finance, settings, and auth when Supabase is not configured.
- WhatsApp notifications are placeholder events, not real messaging.
- File/proof/invoice uploads store metadata/path and need real Supabase Storage policy validation.
- Import/container tracking is metadata UI, not a complete import operations module.
- Some compatibility routes are wrappers or redirects around canonical pages.

## What Is Missing

- Browser/device QA confirmation for every module.
- Completed `docs/STOCK_QA_EVIDENCE.md` entries for every Stock acceptance test.
- Real customer-management workflow outside admin settings.
- Full production planning module distinct from retail processing.
- Real WhatsApp messaging.
- Real import/container document workflow beyond metadata.
- Automated test suite covering core business workflows.
- Final UX pass after workflows are validated.
- Real Auth users for every role/outlet/department/stock-location combination.
- A dedicated production planning model for multiple raw items to multiple finished items.
- Customer/category price rule application during order and sale entry.
- RLS verification scripts and browser smoke tests with evidence.
- Real Supabase QA for immediate order reservation, stock-not-enough creation, picking, ready, pickup, cancellation release, and delivery handoff with seeded role/outlet/department users.
- Multi-outlet/multi-location staff access support.
- Real Supabase/RLS QA for worker-created, item+brand-scoped stock take sessions and director final approval.
- Real Supabase/RLS QA for director approval before damaged/spoiled stock deduction.
- Real Supabase/RLS QA for direct outbound, customer-return inspection release, and return-supplier request -> manager approval -> stock deduction workflow.
- Broader automated stock action tests against a seeded database.
- Real Supabase QA for manual reservation release after customer cancellation.
- Overdue credit customer warning during order entry.
- Failed-delivery return support for standalone deliveries and no-barcode/loose stock.
- Real browser/device QA for stock-unit detail label reprints.
- Passing evidence for every step in `docs/STOCK_QA_RUNBOOK.md` and `docs/STOCK_QA_EVIDENCE.md`.
- Keep `docs/STOCK_COMPLETION_AUDIT.md` in sync until every Stock acceptance test has real evidence.
- Multiple raw items to multiple finished items in Processing.
- Finished-product barcode generation from Processing output.
- Price override reason enforcement.
- AutoCount-format aging buckets.
- Import document upload workflow and Storage policy verification.

## Risky Logic

- Processing is currently split between order preparation and retail processing batches; this may confuse real production planning.
- Delivery has two paths: standalone delivery orders and customer-order delivery handoff.
- Stock outbound and stock unit state transitions are intentionally strict and atomic; changes can easily break inventory accuracy.
- Temporary negative stock alerts are application-derived from balance rows; real data must be checked to confirm negative no-barcode stock is visible in scoped views.
- Stock age alerts are application-derived from barcode unit inbound dates; real data must be checked to confirm 6-month and 12-month thresholds are visible in scoped views.
- Customer price rules are configurable but not yet fully applied everywhere.
- Director is mostly view/approve, but older code/migrations must be kept aligned with later view-only hardening.
- Module access is both role-based and outlet-module-based; testing only one layer is insufficient.
- Order creation now reserves stock immediately using weight-first reservation rows; picking assigns exact barcodes later. Manual reservation release updates active reservations to `RELEASED` when an order is cancelled.
- Delivery proof enforcement is action-layer plus RPC for customer-order failed returns; direct database writes still depend on RLS/triggers and should be tested with real roles.
- Customer-order failed delivery returns barcode stock from sales outbound lines. Standalone deliveries and loose/no-barcode stock return paths still require manual follow-up or a later normalized return workflow.
- Stock inbound now saves new barcode weight rules globally by item, brand, and origin. Existing old location-specific rules may remain in migrated projects and should be reviewed after applying migration `202606100037_stock_inbound_labels_rules_v1.sql`.
- Stock take now uses item+brand scoped sessions, shows the worker warning `Stock take is active for this item/brand/location. You can continue, but this movement will be recorded.` for matching stock movements at that location, writes a warning audit log without blocking the movement, and uses an atomic director approval RPC after manager review to compute missing barcode variance, adjust missing units out, write adjustment movements, and approve the session.
- Damage/spoilage now uses staff request with required photo path, manager review, and an atomic director approval RPC that updates barcode stock to `DAMAGED`, writes `OUTBOUND_SPOILED`, and links the request.
- Return supplier now uses staff request and an atomic manager approval RPC that updates barcode stock to `OUTBOUNDED`, writes `OUTBOUND_RETURN_SUPPLIER`, and links the request.
- Early migrations include broad policies that are tightened later; fresh projects must run every migration in filename order.
- Large files concentrate business rules and UI in one place, increasing regression risk.

## Large / Risky Files

- `components/stock/workflow-forms.tsx` - 1733 lines
- `supabase/seed.sql` - 1552 lines
- `lib/stock/actions.ts` - 1535 lines
- `lib/retail/actions.ts` - 1425 lines
- `components/retail/retail-forms.tsx` - 1244 lines
- `supabase/migrations/202606100008_team_rls_v1.sql` - 1012 lines
- `components/retail/retail-page.tsx` - 848 lines
- `lib/retail/data.ts` - 765 lines
- `components/settings/settings-page.tsx` - 729 lines
- `components/delivery/delivery-page.tsx` - 657 lines

## Duplicated Logic Hotspots

- Processing yield/loss exists in database generated columns, retail data mapping, and the new processing adapter.
- Cleaning due/completion matrix logic is page-level in `components/retail/retail-page.tsx`.
- Finance aging bucket display is split between `lib/finance/data.ts` and `components/finance/finance-page.tsx`.
- Stock report totals are calculated in both data/report surfaces and page display code.
- Status transition logic is spread across server actions, RLS policies, triggers/functions, and UI forms.

## QA Result

- `npm.cmd run smoke` - passed.
- `npm.cmd run lint` - passed.
- Latest Stock damage photo-first scan run on 2026-06-23:
  - `node scripts\stock-mobile-ux-coverage.mjs` - passed.
  - `npm.cmd run smoke` - passed.
  - `npm.cmd run lint` - passed.
  - `npm.cmd run typecheck` - failed in unrelated Processing code: `lib/processing/data.ts:71` assigns `batch.status` values such as `DRAFT`/`REJECTED` to `ProcessingBatchStatus`.
  - `npm.cmd run build` - compiled, then failed during TypeScript on the same `lib/processing/data.ts:71` Processing status typing issue.
  - No Stock schema, RLS, server action, damage approval workflow, no-immediate-deduction rule, live Supabase data, deployment, camera, or printer action was changed.
- Latest Stock return-supplier supplier-first scan run on 2026-06-23:
  - `node scripts\stock-mobile-ux-coverage.mjs` - passed.
  - `npm.cmd run smoke` - passed.
  - `npm.cmd run lint` - passed.
  - `npm.cmd run typecheck` - passed.
  - `npm.cmd run build` - passed.
  - No Stock schema, RLS, server action, supplier-hold workflow, approval workflow, live Supabase data, deployment, camera, or printer action was changed.
- Latest Stock normal return scan-and-done run on 2026-06-23:
  - `node scripts\stock-mobile-ux-coverage.mjs` - passed.
  - `npm.cmd run smoke` - passed.
  - `npm.cmd run lint` - passed with one existing Retail warning: `components/retail/retail-page.tsx` has unused `missingCleaningTasks`.
  - `npm.cmd run typecheck` - passed.
  - `npm.cmd run build` - passed.
  - No Stock schema, RLS, server action, return validation, inspection workflow, live Supabase data, deployment, camera, or printer action was changed.
- Latest Stock transfer/receive scan-and-done run on 2026-06-23:
  - `node scripts\stock-mobile-ux-coverage.mjs` - passed.
  - `npm.cmd run smoke` - passed.
  - `npm.cmd run lint` - passed with one existing Retail warning: `components/retail/retail-page.tsx` has unused `missingCleaningTasks`.
  - `npm.cmd run typecheck` - passed.
  - `npm.cmd run build` - passed.
  - No Stock schema, RLS, server action, wrong-location validation, live Supabase data, deployment, camera, or printer action was changed.
- Latest Stock take latest-scan feedback run on 2026-06-23:
  - `node scripts\stock-mobile-ux-coverage.mjs` - passed.
  - `npm.cmd run smoke` - passed.
  - `npm.cmd run lint` - passed.
  - `npm.cmd run typecheck` - passed.
  - `npm.cmd run build` - passed.
  - No Stock schema, RLS, server action, approval workflow, live Supabase data, deployment, camera, or printer action was changed.
- Earlier Stock mobile QA preparation run on 2026-06-23:
  - `npm.cmd run smoke` - passed.
  - `npm.cmd run lint` - passed.
  - `npm.cmd run typecheck` - failed in unrelated Retail files: `components/retail/retail-page.tsx` references missing `RetailExpense.vendor`, `approvedByName`, and `paidByName`; `lib/retail/actions.ts` has narrowed expense-status comparisons for `APPROVED`/`PAID`.
  - `npm.cmd run build` - compiled successfully, then failed during TypeScript on the same Retail `expense.vendor` issue.
  - No Stock app behavior, schema, RLS, seed data, deployment, camera, or printer action was changed in that run.
- Previous clean project gate before the current unrelated Retail type blocker had smoke, lint, typecheck, and build passing; the current 2026-06-23 Stock mobile QA run has only smoke and lint passing until the Retail type errors are fixed.
- Delivery production-readiness review now documents the canonical V1 model, legacy compatibility surfaces, staging migration order, RLS seed/test guidance, real phone QA checklist, and Storage verification plan in `docs/DELIVERY_PRODUCTION_READINESS.md`.
- Latest Orders V1 reports/alerts pass updated the Orders dashboard with customer, item, salesperson/staff, pending/ready/failed, status, and delivery-performance reports plus in-app notification wording.
- Latest Retail V1 pass rebuilt Retail as the AutoCount daily-control module and added source smoke coverage for V1 buttons, settings gate, route redirects, daily sales/closings, scoped retail processing RLS, and no retail stock movement creation.
- Latest Stock mobile QA refresh passed smoke, lint, typecheck, and build on 2026-06-23 after adding source-checked damage photo picker coverage.
- Stock mobile source/coverage QA is prepared for the requested 390px worker flows.
- Stock scanner/form accessibility coverage now guards visible and announced scanner, inbound decode, action success, warning, and blocked feedback.
- Stock inbound duplicate coverage now guards the immediate red blocked message and blocked/error session list.
- Stock online-only coverage now guards a shared red `OfflineScanAlert` with `role="alert"` across worker scan forms.
- Stock outbound/stock-take blocked scan coverage now guards announced red blocked panels for missing, unavailable, wrong-destination, and stock-take blocked messages.
- Stock workflow inputs now use a Stock-only mobile wrapper with `min-h-11 text-base sm:text-sm` so worker typing targets are larger without changing global app inputs.
- Stock label print/reprint controls now use full-width phone touch targets with explicit print-sheet/Bluetooth and PDF fallback labels.
- Stock Take mobile source coverage now guards active-session tap buttons before the session dropdown.
- Stock damage/spoilage mobile source coverage now guards large reason buttons instead of small reason dropdowns.
- Stock direct outbound mobile source coverage now guards quick remark buttons so workers can satisfy required remarks with one tap while keeping custom typing available, and direct Damage/Spoilage now has a phone image picker that fills the required photo file name/reference.
- Stock-take source/RLS coverage now guards worker-created scoped draft sessions while keeping manager review and director approval protected.
- Stock inbound mobile source coverage now guards scanner/manual barcode entry is disabled until product, brand, origin, and location are chosen.
- Stock outbound/transfer/receive-transfer mobile source coverage now guards scanner/manual barcode entry is disabled until the required order or stock location setup is chosen, outbound order selection now has large quick ready-order buttons before the dropdown fallback, outbound scanning now shows a `Previous outbound scan` barcode/item/weight panel, transfer/receive-transfer now have large quick stock-location buttons before the dropdown fallback, and transfer/receive camera scans auto-submit after location selection while keeping the button fallback for typed barcodes.
- Stock take mobile source coverage now guards scanner/manual barcode entry is disabled until an active draft stock-take session is selected and that workers see a `Previous stock take scan` card with the latest barcode, item, weight, and counted/exception state.
- Stock return-supplier mobile source coverage now guards recent supplier buttons so workers can fill supplier name with one tap when prior requests exist.
- Stock return mobile source coverage now guards scanner/manual barcode entry is disabled until a return location is selected, normal return uses location-first scan-and-done flow, camera scans auto-save after location selection, and the `Save return` button remains for typed barcodes.
- Stock return-supplier mobile source coverage now guards supplier-first flow, disabled scanning until supplier is selected, one-tap recent supplier buttons, camera-scan auto-request after supplier selection, and the `Submit return supplier` button fallback for typed barcodes.
- Stock damage/spoilage mobile source coverage now guards reason/photo-first flow, disabled scanning until photo evidence exists, camera-scan auto-request after photo, no-immediate-deduction copy, and the `Submit damage request` button fallback for typed barcodes.
- Stock damage/spoilage mobile source coverage now guards a phone-friendly image picker that fills the required photo file name/reference for approval requests.
- Latest Stock mobile QA source/build pass confirms the 390px checklist is prepared for Stock home, inbound, continuous scanning, duplicate/no-weight warnings, label generation/reprint, outbound, damage/spoilage, transfer, receive-transfer wrong-location blocking, stock-take progress, unknown-barcode exceptions, and online-only blocking.
- Stock scanner source coverage now guards closing/stopping the camera scanner when a scan workflow becomes disabled, such as after connection loss.
- Stock overdue-transfer alerts now include mobile action access to `/stock/receive-transfer` so permitted managers/admin/directors can move directly from alert to receive scan.
- Latest Stock mobile QA preparation pass reviewed the requested 390px Stock mobile checklist and confirmed source guards for Stock home buttons, inbound, continuous scanning, duplicate/no-weight warnings, label generation/reprint, order/direct outbound, damage/spoilage request, transfer, receive-transfer wrong-location blocking, stock-take progress, unknown-barcode exceptions, and online-only scan blocking.
- Latest Stock mobile QA preparation pass commands: focused Stock mobile/scanner/label/owner-doc guards passed; `npm.cmd run smoke` passed; `npm.cmd run lint` passed; `npm.cmd run build` passed; `npm.cmd run typecheck` passed when rerun after the build finished regenerating `.next/types`.
- The local app starts in foreground at `http://127.0.0.1:3100`, but authenticated browser-route QA still could not run from this Windows sandbox because the in-app browser runtime returned `CreateProcessAsUserW failed: 5`.
- Authenticated browser/device QA was attempted but could not run from this Windows sandbox because the browser automation runtime returned `CreateProcessAsUserW failed: 5`.
- Real 390px authenticated phone/browser layout, phone camera, laptop camera, Bluetooth/PDF label printer, and live Supabase RLS/workflow QA still need owner/manual evidence in `docs/STOCK_QA_EVIDENCE.md`.

## Progress Score

| Scoring Area | Score |
| --- | ---: |
| Project foundation and navigation | 8 / 10 |
| Data model and mock data | 7 / 10 |
| Dashboard | 6 / 10 |
| Inventory | 7 / 10 |
| Processing | 5 / 10 |
| Cleaning | 6 / 10 |
| Import/container tracking | 4 / 10 |
| Orders and delivery | 8 / 10 |
| Barcode scanning | 6 / 10 |
| Reports, testing, and deployment readiness | 4 / 10 |
| Overall | 61 / 100 |

## Recommended Next Tasks

1. Test the full flow: order -> prepare/process -> stock outbound -> ready/pickup/delivery -> reports, and record Stock results in `docs/STOCK_QA_EVIDENCE.md`.
2. Confirm which processing route should become the canonical production planning workflow.
3. Test customer and credit workflows with real users and seeded customer categories.
4. Verify barcode camera scanning on actual phone/laptop hardware.
5. Add automated smoke/browser tests after manual workflow acceptance.
6. Keep visual redesign separate until workflow issues are resolved.
7. Apply migrations through `202606100034_order_reservation_on_picking_v1.sql` and test that order item entry does not reserve stock while preparation does.
8. Test proof-required delivery completion with real delivery users and uploaded files.
9. Add RLS verification scripts for seeded role/scope users.
10. Reduce large module files only after high-risk workflows have tests.
