# Stock QA Evidence Log

Last updated: 2026-07-10

Use this file to record real Supabase, RLS, device, and workflow evidence before calling the Stock module ready for internal pilot use. Do not mark a row as passed from demo-mode data only.

Use `docs/STOCK_COMPLETION_AUDIT.md` to compare local automated evidence with the manual evidence still required.

## 2026-07-10 Stock Inbound Short New-Session Notice

Scope:

- `/stock/inbound` Start new session feedback.

Evidence captured:

- The new-session setup notice now uses short worker copy: `New session. Setup kept.` or `New session. Choose setup.`
- This removes the long product/manufacturer/origin/location sentence while keeping the same behavior.
- Stock acceptance, mobile UX, and guided-flow coverage guards were updated.

Manual QA:

- Tap `Start new session` with and without a selected setup and confirm the feedback is short and clear at phone width.

## 2026-07-10 Stock Inbound Saved Preset Search Restore

Scope:

- `/stock/inbound` setup screen after returning to the page with a saved setup preset.

Evidence captured:

- Product, manufacturer, and origin search fields now initialize from any restored preset, not only from unfinished-session drafts.
- This keeps the setup screen readable when the browser remembers a previous Stock Inbound setup.
- Focused guided-flow coverage guards the restored preset search initialization.

Manual QA:

- Choose an inbound setup, leave `/stock/inbound`, return later, and confirm the selected product/manufacturer/origin are visible in the search fields.

## 2026-07-10 Stock Inbound Draft Search Restore

Scope:

- `/stock/inbound` unfinished-session restore after page refresh.

Evidence captured:

- Restored unfinished-session drafts now initialize the visible product, manufacturer, and origin search fields from the saved locked setup.
- This keeps the setup screen readable after refresh instead of restoring the hidden preset while leaving search boxes blank.
- Focused guided-flow coverage guards the visible search restore.

Manual QA:

- Start an inbound session, choose product/manufacturer/origin/location, save one scan or unit, refresh, and confirm the search boxes show the same setup before continuing.

## 2026-07-10 Stock Inbound Draft Setup Restore

Scope:

- `/stock/inbound` unfinished-session restore.

Evidence captured:

- The unfinished inbound session draft now stores the locked item/manufacturer/origin/location preset together with the session code, start time, and mode.
- Restoring a draft now normalizes that saved preset before showing `Continue unfinished session`, so the current session does not depend only on the separate recent-preset cache.
- Focused guided-flow coverage and smoke coverage guard the restored draft preset.

Manual QA:

- Start an inbound session, choose product/manufacturer/origin/location, save one scan or unit, refresh the page, and confirm `Continue unfinished session` returns to the same setup and session code.

## 2026-07-10 Stock Inbound Submit Context Deduplication

Scope:

- `/stock/inbound` guided inbound form submit payload.

Evidence captured:

- Hidden submit context now carries only custom typed `brandName` and `originName`.
- Visible form controls are the only submit source for item, manufacturer id, origin id, location, inbound source, batch number, and barcode-rule fields.
- Focused Stock Inbound guided-flow coverage now blocks duplicate hidden field names from returning.

Manual QA:

- On Barcode Rule, change weight start/digits/decimals and immediately save; confirm the saved rule uses the visible values.

## 2026-07-10 Stock Inbound 390px Browser QA Attempt

Scope:

- `/stock/inbound` local browser check at 390px width.

Evidence captured:

- Local Next dev server responded from PowerShell at `http://127.0.0.1:3900/stock/inbound` with HTTP 200, redirecting unauthenticated access toward login.
- In-app browser could not reach `127.0.0.1:3900` or `localhost:3900` and reported connection refused, so rendered Stock Inbound visual QA was not completed in this pass.
- Temporary 390px viewport override was reset after the attempt.

Manual QA:

- With a logged-in browser session, open `/stock/inbound` at phone width and verify Session History, Setup, Barcode Rule, Scanner popup, Manual Weight, and Session Summary visually.

## 2026-07-10 Stock Inbound Short Manual Weight Label

Scope:

- `/stock/inbound` manual weight entry field.

Evidence captured:

- Manual mode now labels the active weight field as `Weight kg` instead of the longer `Enter one unit weight kg`.
- Supplier-barcode mode still labels the same field as `Net weight kg`.
- Focused Stock Inbound guided-flow, mobile UX, and acceptance guards updated.

Manual QA:

- Open Inbound without Barcode at 390px width and confirm the weight field label stays short while the page still clearly shows the current locked setup.

## 2026-07-10 Stock Inbound Short Manual Undo Label

Scope:

- `/stock/inbound` manual weight undo actions.

Evidence captured:

- Manual mode now uses `Undo Last Weight` instead of the longer `Undo Last Weight Entry`.
- Existing current-session undo action and audit-preserving void flow are unchanged.
- Focused Stock Inbound guided-flow coverage updated.

Manual QA:

- Enter two manual weights around 390px width and confirm the undo button stays readable in the scanner popup, previous-weight card, and saved-list row.

## 2026-07-10 Stock Scanner Short Metric Labels

Scope:

- Reusable scanner popup used by `/stock/inbound`.

Evidence captured:

- Scanner metric cards now use shorter labels: `Last saved`, `Session total`, and `Count + weight`.
- Existing data/action slots remain unchanged, including current setup, last scanned barcode, camera detections, Undo Last Scan, Close, and Finish Session where provided by the inbound page.
- Focused scanner, Stock Inbound guided-flow, mobile UX, and acceptance guards updated.

Manual QA:

- Open `/stock/inbound`, start the phone scanner around 390px width, and confirm the top scanner cards stay compact while still showing previous saved weight and session total.

## 2026-07-10 Stock Inbound Barcode Rule Optional Notes Collapse

Scope:

- `/stock/inbound` Barcode Rule step.

Evidence captured:

- Optional `Reference no.` and `Notes` fields now sit inside a collapsed `Reference and notes` section.
- Barcode rule fields remain visible: sample barcode, net weight, weight start, digits, decimals, fixed-weight fallback, and save-rule controls.
- Focused source guards updated in Stock Inbound guided-flow, mobile UX, and acceptance coverage.

Manual QA:

- Open Barcode Rule on a 390px phone viewport and confirm the first view focuses on barcode rule setup while `Reference and notes` can still be opened when needed.

## 2026-07-10 Stock Inbound Short Rule Helper Text

Scope:

- `/stock/inbound` setup and barcode-rule helper text.

Evidence captured:

- Manual-label mode now says `Enter weight. Save, print.`
- Missing barcode rule warning now says `Set rule first.`
- Barcode rule helper text now says `First scan saves rule.` or `Next scans use rule.`
- Display-name helper text now says `Manufacturer + product`.
- Focused source guards updated in Stock Inbound guided-flow and mobile UX coverage.

Manual QA:

- Open `/stock/inbound` around 390px width and confirm setup/rule helper text stays short and readable.

## 2026-07-10 Stock Inbound Short Barcode Rule Button

Scope:

- `/stock/inbound` setup navigation.

Evidence captured:

- Supplier-barcode setup now uses the shorter `Next: Barcode Rule` action label.
- `scripts/stock-inbound-guided-flow-coverage.mjs` guards the short label.

Manual QA:

- Open `/stock/inbound` around 390px width and confirm setup actions fit cleanly without horizontal scrolling.

## 2026-07-10 Stock Inbound Session History Compact Cap Hint

Scope:

- `/stock/inbound` recent session history details.

Evidence captured:

- The capped barcode detail hint now says `Latest 20 shown.` instead of the longer history message.
- `scripts/stock-inbound-guided-flow-coverage.mjs` guards the compact history hint.

Manual QA:

- Open a recent inbound session with more than 20 barcodes on phone width and confirm the history detail stays compact with no horizontal scrolling.

## 2026-07-10 Stock Inbound Active Error List Cap

Scope:

- `/stock/inbound` active scan/manual entry error card.

Evidence captured:

- Active scan errors now render the latest 12 errors instead of every error in the session.
- The `Showing latest 12` cue now checks `sessionErrors.length`, not saved-label count.
- `scripts/stock-inbound-guided-flow-coverage.mjs` guards the corrected error cap.

Manual QA:

- Trigger more than 12 blocked scans in one session and confirm the red error card stays compact on phone width.

## 2026-07-10 Stock Inbound Short Summary Title

Scope:

- `/stock/inbound` Session Summary and printable session summary labels.

Evidence captured:

- The visible summary title now uses `Session Summary` instead of long page-specific titles.
- The summary metric, print row, and active error card now use `Scan errors` instead of longer duplicate/error wording.
- Focused Stock Inbound, mobile UX, and acceptance coverage passed with the shorter labels.

Manual QA:

- Finish a barcode and manual-label inbound session at phone width and confirm the summary heading and scan-error labels fit cleanly.

## 2026-07-10 Stock Inbound Short Summary Labels

Scope:

- `/stock/inbound` session history, Barcode Rule fallback, Manual Weight, and Session Summary labels.

Evidence captured:

- Long worker-facing labels were shortened to `Recent sessions`, `Unfinished session`, `Manual setup`, `Selected setup`, `Use labels`, `Saved barcodes`, `Saved units`, `Scan errors`, `Voided scans`, and `Review setup`.
- Focused stock coverage guards now check the shorter labels.

Manual QA:

- Open `/stock/inbound` at phone width and confirm the setup, scanner/manual entry, and summary pages still read clearly without long helper text.

## 2026-07-10 Stock Inbound Decimal Rule Review Copy

Scope:

- `/stock/inbound` Barcode Rule page and detected-rule review.

Evidence captured:

- Barcode rule save/review now shows the selected decimal place as `0.1`, `0.01`, or `0.001` instead of raw internal values `1`, `2`, or `3`.
- The detected barcode-rule preview uses the same worker-facing decimal label.
- `scripts/stock-inbound-guided-flow-coverage.mjs` guards the decimal label mapping and summary display.

Manual QA:

- Open Barcode Rule, select each decimal button, and confirm the save summary and detected-rule preview show the same decimal label as the selected button.

## 2026-07-10 Stock Inbound Whole-Session Void Status

Scope:

- `/stock/inbound` Session Summary `Delete Whole Session`.

Evidence captured:

- Successful whole-session delete now sets the session finished timestamp after voiding saved units.
- This lets the summary status resolve to `Voided` instead of leaving an open empty session.
- `scripts/stock-inbound-guided-flow-coverage.mjs` guards the finish-timestamp update in the whole-session undo path.

Manual QA:

- Finish a session with saved stock, open Delete Whole Session as manager/admin/director, confirm delete, and verify the summary shows `Voided`.
- Confirm the voided units remain visible in the audit list and a new session starts with a new session code.

## 2026-07-10 Stock Inbound Editable Location Resume

Scope:

- `/stock/inbound` setup location default and session resume behavior.

Evidence captured:

- Inbound location still defaults from the logged-in user's assigned stock location.
- If the worker changes to another active allowed location, preset normalization now keeps that location on resume instead of forcing the assigned default back in.
- `scripts/stock-inbound-guided-flow-coverage.mjs` guards the active saved-location preservation path.

Manual QA:

- Open `/stock/inbound`, change location to another allowed stock location, refresh, and confirm the selected location stays the same.
- Start a session from that edited location and confirm saved stock uses the selected location.

## 2026-07-10 Stock Inbound Rule Warning Copy

Scope:

- `/stock/inbound` barcode-rule learning and locked-rule helper messages.

Evidence captured:

- Ambiguous barcode-rule learning now says `Weight appears twice. Scan another sample.`
- Locked barcode rule fields now say `Rule locked. Start new to change.`
- Existing coverage scripts guard both shorter messages.

Manual QA:

- On Barcode Rule Page, enter a sample barcode/weight where the weight appears twice and confirm the page asks for another sample.
- After saving stock, go back to Barcode Rule Page and confirm locked-rule copy remains short.

## 2026-07-10 Stock Inbound Short Worker Copy

Scope:

- `/stock/inbound` guided setup, barcode rule, and session summary helper text.

Evidence captured:

- Barcode rule scope now says `Rule applies here only.`
- Barcode rule input options now say `Manual typing`.
- Summary compact-list helpers now use `Latest 8 shown.`, `Latest 8 shown. Prints all.`, and `Latest 8 voided. Audit kept.`
- Whole-session delete role message now says `Manager/admin/director only.`

Manual QA:

- Open `/stock/inbound` at phone width and confirm the rule page and summary page stay short, readable, and without horizontal scrolling.

## 2026-07-10 Stock Scanner Failed-Scan Tone

Scope:

- Stock phone scanner popup failed-scan feedback.

Evidence captured:

- The `Last scanned barcode` card now uses red/warning/green styling from the current scan result instead of always showing green.
- Duplicate/no-weight/blocked scans should visually match the red camera-frame failure state.
- Failed scans announce as an alert in the popup instead of a quiet status update.
- The generic post-error helper now says `Check message above.` instead of calling every failed save a connection issue.
- The temporary `Saving ... kg.` state now stays amber until the server confirms the stock save.
- Valid saved scans still show green feedback after the workflow confirms the save.

Manual QA:

- In `/stock/inbound`, open the phone scanner and scan a duplicate or no-weight barcode. Confirm both the camera frame and last-scan card show blocked/error feedback.
- Scan a valid barcode and confirm both areas switch to green saved feedback.

## 2026-07-10 Stock Scanner Success Feedback Timing

Scope:

- Stock phone scanner popup success sound/vibration feedback.

Evidence captured:

- The shared scanner no longer vibrates/beeps on raw camera or handheld detection.
- Stock Inbound still vibrates/beeps from its save-success handler after the server confirms stock was saved.
- This prevents duplicate/error scans and pre-save `Saving ... kg` states from getting success feedback before the stock save result is known.

Manual QA:

- In `/stock/inbound`, scan one valid barcode and confirm success feedback happens after the green saved result.
- Scan a duplicate/invalid barcode and confirm it shows the blocked/error result without success feedback.

## 2026-07-10 Stock Inbound Continuous Scanner Helper Trim

Scope:

- `/stock/inbound` active supplier-barcode scanner helper text.

Evidence captured:

- The shared barcode field now renders helper text only when a helper is provided.
- The active continuous Stock Inbound scanner omits the redundant `Continuous scan is on.` helper line.
- Barcode rule setup and manual-label setup still keep short helper text where it changes the worker action.

Manual QA:

- Open `/stock/inbound`, reach the active scanner page, and confirm the barcode field area is cleaner while the phone scanner, external input, sticky summary, undo, and finish controls remain visible.

## 2026-07-10 Stock Inbound Session History Sort Guard

Scope:

- `/stock/inbound` session history compact barcode details.

Evidence captured:

- The inbound session-history builder now sorts copied stock units by received time before building latest barcode details.
- The guided-flow coverage check now proves the sort is inside `buildInboundSessionHistory`, not only in the recent-template helper.
- No server action, RLS, stock movement, barcode uniqueness, scanner, label print, or database behavior changed.

Manual QA:

- Open `/stock/inbound` after several saved scans in one session, reload the page, and confirm the session history still shows the latest barcode/weight details in the expected order.

## 2026-07-10 Stock Scanner Detection Copy

Scope:

- Stock phone scanner popup.

Evidence captured:

- The scanner popup now labels raw camera reads as `Camera detections`, not saved scans.
- The last-read cue now says `Detected. Checking scan.` so workers wait for the green/red save result before assuming stock was saved.
- No server action, RLS, stock movement, barcode uniqueness, camera stream, label print, or database behavior changed.

Manual QA:

- Open `/stock/inbound`, start the phone scanner, scan a valid barcode and a duplicate/invalid barcode, and confirm the popup distinguishes detection from saved stock.

## 2026-07-10 Stock Item Display-Name Merge Helper Alignment

Scope:

- Pending migration `202606250014_stock_item_display_name_trigger_v1.sql`.

Evidence captured:

- The pending display-name trigger migration now also refreshes `merge_stock_manufacturer`.
- Manufacturer merge now uses `public.stock_item_product_display_name(item.section, item.name)` when recalculating item display names.
- SQL display-name generation now trims and collapses repeated spaces in manufacturer, section, and product fields, matching the app display-name helper.
- This keeps duplicate manufacturer cleanup aligned with the same manufacturer + product display-name rule used by inbound pages, labels, stock lists, and reports.

Manual QA:

- After applying migration `202606250014`, merge a duplicate manufacturer in a safe Supabase test project and confirm affected `items.display_name` values stay as manufacturer + product.
- Edit a safe test item with extra spaces in section/name/manufacturer and confirm `items.display_name` is saved with single spaces.

## 2026-07-10 Stock Inbound Whole-Session Delete Role Message

Scope:

- `/stock/inbound` session summary Delete Whole Session action.

Evidence captured:

- Normal workers now see a short reason when whole-session delete is unavailable: manager, admin, or director approval is needed.
- The existing manager/admin/director server-side delete gate remains unchanged.
- No server action, RLS, stock movement, barcode uniqueness, scanner, label print, or database behavior changed.

Manual QA:

- Open a saved session summary as a normal worker and confirm `Delete Whole Session` is disabled with the manager/admin/director approval message.
- Repeat as manager/admin and confirm the confirmation dialog still opens before voiding.

## 2026-07-10 Stock Inbound Scanner Finish Block Message

Scope:

- `/stock/inbound` phone scanner popup controls.

Evidence captured:

- The scanner popup now shows the same short finish-block reason used by the server-safe finish guard.
- Workers see `Save one barcode first.`, `Save one unit first.`, or `Retry or cancel pending label.` instead of a disabled Finish Session button with no context.
- No server action, RLS, stock movement, barcode uniqueness, scanner camera, label print, or database behavior changed.

Manual QA:

- Open the phone scanner popup before saving stock and confirm the disabled Finish Session control shows the short reason.
- Save one barcode/unit and confirm the finish-block message disappears.

## 2026-07-10 Stock Inbound History Origin And Rule Cue

Scope:

- `/stock/inbound` Inbound Session History cards.

Evidence captured:

- History cards now show the locked origin and whether the setup has a saved barcode rule.
- This helps workers pick the correct previous item/manufacturer/origin setup before starting the next session.
- No server action, RLS, stock movement, barcode uniqueness, scanner, label print, or database behavior changed.

Manual QA:

- Open `/stock/inbound`, confirm each history card shows product, manufacturer, origin, location, count/weight, and saved-rule status at phone width.

## 2026-07-10 Stock Inbound Summary Finish Guard

Scope:

- `/stock/inbound` session summary and start-new-session protection.

Evidence captured:

- The Summary card now renders whenever `inboundStep === "summary"`, including the guarded open-session state reached by `Start new session` when saved stock already exists.
- The Summary `Finish Session` button now calls the existing `finishInboundSession()` guard while the session is open, and stays disabled after finish.
- No server action, RLS, stock movement, barcode uniqueness, scanner, label print, or database behavior changed.

Manual QA:

- Save one inbound barcode or internal-label unit, tap `Start new session` before finishing, and confirm Summary appears with status `Open` plus an enabled `Finish Session` button.

## 2026-07-10 Stock Inbound Summary Correction Copy

Scope:

- `/stock/inbound` session summary correction guidance.

Evidence captured:

- The summary warning now says `Corrections need manager approval. Audit kept.`
- This avoids implying every inbound session needs manager approval while preserving the manager-approved correction/delete rule.
- No server action, RLS, stock movement, barcode uniqueness, scanner, label print, or database behavior changed.

Manual QA:

- Finish or open an inbound summary and confirm the correction warning appears below the next-step message.

## 2026-07-10 Stock Inbound Summary Step Navigation

Scope:

- `/stock/inbound` guided step navigation and open-session Summary.

Evidence captured:

- The Summary step can now be opened after saved stock exists, even before `sessionFinishedAt`.
- Summary stays blocked when no stock is saved or an internal label is still pending.
- The helper now says `Open Summary to finish.` for saved open sessions.

Manual QA:

- Save one inbound barcode or internal-label unit, tap `4 Summary`, and confirm the Summary page opens with status `Open` and an enabled `Finish Session` button.

## 2026-07-10 Stock Item Display Name Trigger Migration

Scope:

- Stock item/manufacturer display-name data contract.

Evidence captured:

- Added migration `202606250014_stock_item_display_name_trigger_v1.sql`.
- The migration keeps `items.display_name` synced from manufacturer + product fields on insert/update and backfills existing rows.
- The migration is forward-only and does not drop stock data, RLS, movements, barcodes, or access policies.

Manual QA:

- After applying migrations, create or edit a product with manufacturer `Tican` and product `Belly Boneless`; confirm `display_name` becomes `Tican Belly Boneless`.

## 2026-07-10 Stock Inbound Summary Navigation Guard

Scope:

- `/stock/inbound` guided step navigation.

Evidence captured:

- The shared `goInboundStep()` guard now allows Summary navigation after saved stock exists, matching the Summary step button state.
- The same guard still blocks Summary when no stock has been saved or an internal label is pending.
- No server action, RLS, stock movement, barcode uniqueness, scanner, label print, or database behavior changed.

Manual QA:

- Save one inbound barcode or internal-label unit, tap `4 Summary` before finishing, and confirm the Summary page opens instead of showing `Finish session first.`

## 2026-07-10 Stock Inbound Fixed-Weight Scanner Readiness

Scope:

- `/stock/inbound` Barcode Rule Page fixed-weight fallback.

Evidence captured:

- Active fixed-weight fallback now counts as a usable scan rule for the current inbound session.
- This lets workers proceed from Barcode Rule Page to Scanner when a product uses item-master default fixed weight.
- No server action, RLS, stock movement, barcode uniqueness, scanner, label print, or database behavior changed.

Manual QA:

- Choose a product with default fixed weight, enable `Use fixed-weight fallback`, and confirm the scanner can open without teaching a barcode position rule.

## 2026-07-10 Stock Inbound 390px Browser QA Attempt

Scope:

- `/stock/inbound` mobile-width visual QA at 390px.

Evidence captured:

- Local shell confirmed the app can serve `/stock/inbound` with HTTP 200 when `next dev` is running.
- Foreground `npm.cmd run dev -- -p 3001` starts successfully, but the tool timeout kills it.
- Detached local server attempts did not stay reachable from the in-app browser.
- Browser checks to `localhost:3001` and the reported network URL failed with connection refused.

Result:

- 390px browser/device QA remains not proven in this environment.
- Owner/manual QA still needs to verify `/stock/inbound` at phone width on Vercel or a stable local dev server.

## 2026-07-10 Stock Inbound Ambiguous Sample Cleared Message

Scope:

- `/stock/inbound` barcode rule learning.

Evidence captured:

- Ambiguous supplier-barcode samples now say `Weight appears twice. Scan another sample.`
- The sample barcode and kg are cleared after an ambiguous match so the worker can scan a new sample from the same item/manufacturer/origin.
- No server action, RLS, barcode rule storage, stock movement, scan log, or label-printing logic changed.

Manual QA:

- On Barcode Rule Page, use a sample where the entered weight appears in more than one barcode position and confirm the warning appears, the sample clears, and the worker can scan another barcode.

## 2026-07-10 Stock Inbound Length Warning Confirm Save

Scope:

- `/stock/inbound` saved-rule supplier barcode scanning.

Evidence captured:

- Different-length barcodes that still decode a weight now expose `Confirm weight and save`.
- The scan still logs `BARCODE_LENGTH_MISMATCH` and does not auto-save.
- Source check passed: `node scripts\stock-inbound-guided-flow-coverage.mjs`.

Manual QA:

- In a saved-rule inbound session, scan a barcode with a different length that still extracts weight; confirm warning appears, no auto-save happens, and `Confirm weight and save` saves only after worker taps it.

## 2026-07-10 Stock Inbound Pending Label Copy Cleanup

Scope:

- `/stock/inbound` Inbound without Barcode pending-label warnings.

Evidence captured:

- Pending-label blocker messages now say `Retry or cancel pending label.` instead of cancel-only wording.
- Source check passed: `node scripts\stock-mobile-ux-coverage.mjs`.

Manual QA:

- During a pending internal-label save, confirm Finish/New Session/weight entry blockers point workers to retry or cancel, not cancel only.

## 2026-07-10 Stock Inbound Manufacturer/Origin RLS Guard

Scope:

- Stock Inbound `Other` manufacturer/origin save support.

Evidence captured:

- Stock RLS coverage now guards that manufacturer and origin insert/update policies use `can_manage_stock()`.
- Delete policies for manufacturer/origin remain admin/director-only.
- Source check passed: `node scripts\stock-rls-policy-coverage.mjs`.

Manual QA:

- With a non-admin stock worker profile, create/reuse one custom manufacturer and one custom origin from `/stock/inbound`; confirm both save and appear in setup without SQL Editor changes.

## 2026-07-10 Stock Inbound Pending Label Retry

Scope:

- `/stock/inbound` Inbound without Barcode immediate-save flow.

Evidence captured:

- Pending internal-label save now has a `Retry save` action that resubmits the same generated barcode/weight after a failed save.
- The pending label panel now says `Save pending. Retry or cancel.` so workers do not need to re-enter the weight after a connection/server error.
- Source checks passed: `node scripts\stock-mobile-ux-coverage.mjs`.

Manual QA:

- During an internal-label session, simulate a failed save if possible, confirm the generated barcode remains visible, tap `Retry save`, and confirm the same label saves without retyping weight.

## 2026-07-10 Stock Inbound Custom Origin Save Before Rule

Scope:

- `/stock/inbound` Page 1 setup and Page 2 barcode-rule learning.

Evidence captured:

- Added a stock-operator quick-save path for custom origins, matching the existing custom manufacturer path.
- Barcode/manual scanning now requires a saved origin id, so barcode rules are learned against real item + manufacturer + origin ids instead of the temporary `Other` value.
- Source checks passed: `node scripts\stock-inbound-guided-flow-coverage.mjs`, `node scripts\stock-mobile-ux-coverage.mjs`, `node scripts\stock-acceptance-coverage.mjs`, `node scripts\stock-item-master-coverage.mjs`, and `node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON scripts\stock-workflow-regression.mjs`.

Manual QA:

- On `/stock/inbound`, search a missing origin, tap `Use as origin`, confirm `Save origin first`, save it, then continue to Barcode Rule Page and save a first supplier barcode rule.

## 2026-07-10 Stock Product Duplicate Merge Cleanup

Scope:

- Stock Settings duplicate product cleanup for products created through `Other / custom product`.

Evidence captured:

- Added `merge_stock_item` migration and Stock Settings `Merge products` form for admin/director cleanup.
- Merge moves stock/order/reservation/retail references, deactivates/renames the duplicate source product, and keeps audit history instead of deleting data.
- Source checks passed: `node scripts\stock-item-master-coverage.mjs` and `node scripts\stock-migration-safety.mjs`.

Manual QA:

- In Supabase-backed QA, create two safe demo duplicate products, merge the duplicate into the product to keep, and confirm stock units, movements, barcode rules, orders/reservations, retail rows, reports, and audit log still point to the kept product.

## 2026-07-10 Stock Inbound Explicit Other Product Setup

Scope:

- `/stock/inbound` Page 1 product setup.

Evidence captured:

- Added a visible `Use Other Product` action that opens the existing new-product form for typed products.
- Added `Other / custom product` to the native Product dropdown, using the same new-product form instead of a second save path.
- Existing product selection closes the manual product form so setup stays clean after a choice is made.
- Source checks passed: `node scripts\stock-inbound-guided-flow-coverage.mjs`, `node scripts\stock-mobile-ux-coverage.mjs`, and `node scripts\stock-acceptance-coverage.mjs`.

Manual QA:

- At phone width, type a new product name, tap `Use Other Product`, confirm the new-product form opens, save the product with a manufacturer, and continue inbound.

## 2026-07-10 Stock Inbound Recent Template Simplification

Scope:

- `/stock/inbound` Page 1 recent inbound template cards.

Evidence captured:

- Recent template cards now show only the manufacturer + product display name.
- Extra origin/status text was removed from the card to keep the worker-first mobile setup screen lighter.
- Source checks passed: `node scripts\stock-inbound-guided-flow-coverage.mjs`, `node scripts\stock-mobile-ux-coverage.mjs`, `node scripts\stock-acceptance-coverage.mjs`, and `node scripts\stock-label-coverage.mjs`.

Manual QA:

- At phone width, open `/stock/inbound`, confirm recent template cards show simple product names, tap one, and verify it still opens scanner or barcode-rule setup as appropriate.

## 2026-07-09 Stock Inbound Compact Helper Copy

Scope:

- `/stock/inbound` manual-weight and session-summary helper text.

Evidence captured:

- Manual-weight shortcut, label-print, recent-list, and audit helper messages were shortened for phone use.
- Source checks passed: `node scripts\stock-inbound-guided-flow-coverage.mjs`, `node scripts\stock-mobile-ux-coverage.mjs`, and `node scripts\stock-acceptance-coverage.mjs`.

Manual QA:

- At phone width, enter two manual weights, finish the session, and confirm summary/help messages stay short.

## 2026-07-09 Stock Inbound Shorter Worker Copy

Scope:

- `/stock/inbound` scan and manual-weight helper messages.

Evidence captured:

- Scanner save, rule-save, manual-weight, and rule-fill helper text was shortened.
- Source checks passed: `node scripts\stock-inbound-guided-flow-coverage.mjs`, `node scripts\stock-mobile-ux-coverage.mjs`, and `node scripts\stock-acceptance-coverage.mjs`.

Manual QA:

- At phone width, scan one supplier barcode and enter one manual-label weight. Confirm messages stay short and easy to read.

## 2026-07-09 Stock Inbound Compact Summary Errors

Scope:

- `/stock/inbound` session summary duplicate/error list.

Evidence captured:

- The on-screen summary shows only the latest 8 duplicate/error scans with a short note.
- The printable session summary still includes the full duplicate/error list.
- Source check passed: `node scripts\stock-inbound-guided-flow-coverage.mjs`.

Manual QA:

- Create more than 8 duplicate/error scans, finish the session, and confirm the mobile summary stays compact while Print Session Summary includes all errors.

## 2026-07-09 Stock Inbound Full-Session Error Totals

Scope:

- `/stock/inbound` current-session duplicate/error scan tracking.

Evidence captured:

- Current-session duplicate/error state is no longer capped to the latest 8 entries.
- Session summary and print summary can now report the full duplicate/error scan count for the session.
- Source check passed: `node scripts\stock-inbound-guided-flow-coverage.mjs`.

Manual QA:

- In one inbound session, create more than 8 duplicate or blocked scans and confirm the summary count matches all errors.

## 2026-07-09 Stock Inbound Location Tap Target

Scope:

- `/stock/inbound` Page 1 setup location changer.

Evidence captured:

- The `Change Location` disclosure header now uses the same `min-h-11` phone tap-target size as other stock workflow disclosures.
- Source checks passed: `node scripts\stock-mobile-ux-coverage.mjs` and `node scripts\stock-inbound-guided-flow-coverage.mjs`.

Manual QA:

- At 390px width, open `/stock/inbound`, tap `Change Location`, and confirm it opens easily without horizontal scrolling.

## 2026-07-09 Stock Inbound Setup Finish Handler Reuse

Scope:

- `/stock/inbound` setup-change protection warning.

Evidence captured:

- The setup warning `Finish current session` action now calls the shared `finishInboundSession` handler.
- Finish cleanup is now consistent with the scanner/manual Finish Session path.
- Source checks passed: `node scripts\stock-inbound-guided-flow-coverage.mjs` and `npm.cmd run typecheck`.

Manual QA:

- Save at least one inbound scan, go back to setup, tap `Finish current session`, and confirm the same summary state appears as the main Finish Session action.

## 2026-07-09 Stock Inbound History Barcode Detail Cap

Scope:

- `/stock/inbound` Inbound Session History details.

Evidence captured:

- Session history no longer caps barcode data at 8 before rendering details.
- Details display stays compact by showing latest 20 barcodes with a short note if more exist.
- Source checks passed: `node scripts\stock-inbound-guided-flow-coverage.mjs` and `npm.cmd run typecheck`.

Manual QA:

- Open an inbound session history entry with more than 20 saved scans and confirm details stay compact while indicating only latest 20 are shown.

## 2026-07-09 Stock Inbound Full-Session Label Totals

Scope:

- `/stock/inbound` current-session labels, totals, summary, and label print data.

Evidence captured:

- Current-session label state is no longer capped at 12 entries.
- Visible recent list remains capped to the latest 12 for mobile display.
- Session totals, Print Labels PDF, and Delete Whole Session now have access to all saved scans in the current inbound session.
- Source checks passed: `node scripts\stock-inbound-guided-flow-coverage.mjs`, `node scripts\stock-acceptance-coverage.mjs`, and `npm.cmd run typecheck`.

Manual QA:

- Save more than 12 inbound labels in one session.
- Confirm the visible list says latest 12, while total count/weight and Print Labels PDF include all saved scans.

## 2026-07-09 Stock External Scanner Overwrite Fix

Scope:

- Stock barcode input used by inbound scanner/manual barcode entry.

Evidence captured:

- After an external scanner submits with Enter, the barcode input is selected for the next scan.
- This keeps rapid handheld scanner input from appending the next barcode to the previous value.
- Source checks passed: `node scripts\stock-scanner-coverage.mjs`, `node scripts\stock-mobile-ux-coverage.mjs`, and `npm.cmd run typecheck`.

Manual QA:

- Focus the barcode input on `/stock/inbound`, scan two barcodes with a handheld scanner, and confirm the second value replaces the first instead of appending.

## 2026-07-09 Stock Inbound Continue Unfinished Route Fix

Scope:

- `/stock/inbound` current unfinished-session card.

Evidence captured:

- Current unfinished supplier-barcode sessions without a saved barcode rule now continue to Barcode Rule.
- Current unfinished manual sessions, and supplier-barcode sessions with a saved rule, still continue to the active scan/manual page.
- Source checks passed: `node scripts\stock-inbound-guided-flow-coverage.mjs` and `npm.cmd run typecheck`.

Manual QA:

- Start a supplier-barcode inbound setup with no saved rule and tap `Continue unfinished session`; confirm it opens Barcode Rule.
- Start or resume a manual inbound session and confirm the same button opens Manual Weight.

## 2026-07-09 Stock Inbound Generated Label Preview Restore

Scope:

- `/stock/inbound` manual weight generated-label flow.

Evidence captured:

- Generated internal label state is now set before the immediate stock-save submit.
- The pending label preview/print area can render the generated label while the save is submitting.
- Source checks passed: `node scripts\stock-inbound-guided-flow-coverage.mjs`, `node scripts\stock-acceptance-coverage.mjs`, and `node scripts\stock-label-coverage.mjs`.

Manual QA:

- In manual weight mode, enter a weight and press Enter/Done.
- Confirm the generated 50mm label preview appears while saving, then the saved unit appears in the session list after the save completes.

## 2026-07-09 Stock Scanner Popup Short Copy

Scope:

- Stock scanner popup used by inbound and other stock scanning pages.

Evidence captured:

- Camera permission cue is now `Allow camera. Use manual if blocked.`
- One-sample scanner cue is now `One sample only.`
- External scanner cue is now `Enter sends scan.`
- Blocked-camera error is now `Camera blocked. Allow camera or use manual.`
- Source checks passed: `node scripts\stock-scanner-coverage.mjs`, `node scripts\stock-mobile-ux-coverage.mjs`, `node scripts\stock-acceptance-coverage.mjs`, and `node scripts\stock-inbound-guided-flow-coverage.mjs`.

Manual QA:

- Open the phone scanner popup on `/stock/inbound` around 390px width and confirm the shorter messages fit without horizontal scrolling.
- Block camera permission and confirm the short blocked-camera message appears with manual fallback.

## 2026-07-09 Stock Inbound Saved Manufacturer Gate

Scope:

- `/stock/inbound` setup page and guided inbound step readiness.

Evidence captured:

- Unsaved custom manufacturer text no longer counts as ready for barcode-rule, scanner, or manual-entry pages.
- The setup page now shows `Save manufacturer.` beside the custom manufacturer save action.
- Source checks passed: `node scripts\stock-inbound-guided-flow-coverage.mjs`, `npm.cmd run typecheck`, `npm.cmd run smoke`, `npm.cmd run lint`, and `npm.cmd run build`.

Manual QA:

- Search a new manufacturer, choose it as custom, and confirm Next remains blocked until `Save manufacturer` succeeds.
- After saving, confirm the saved manufacturer is selected and barcode/manual inbound can continue.

## 2026-07-09 Stock Inbound Manual Duplicate Previous-Weight Cleanup

Scope:

- `/stock/inbound` manual weight active page.

Evidence captured:

- Removed the duplicate previous-weight note inside the manual helper card.
- The sticky summary and previous-entry card still show prior weight, barcode, and undo access.
- Source checks passed: `node scripts\stock-mobile-ux-coverage.mjs`, `node scripts\stock-acceptance-coverage.mjs`, and `node scripts\stock-inbound-guided-flow-coverage.mjs`.

Manual QA:

- Enter two manual weights at phone width and confirm previous weight is visible once in the main active flow with Undo Last Weight Entry available.

## 2026-07-09 Stock Inbound Active Page Preset Cleanup

Scope:

- `/stock/inbound` active scan/manual pages.

Evidence captured:

- The full current-scan preset card now hides on active scan/manual pages.
- The sticky summary remains visible and carries session code, display name, product, manufacturer, origin/location, saved count, and saved weight.
- Source checks passed: `node scripts\stock-inbound-guided-flow-coverage.mjs`, `node scripts\stock-mobile-ux-coverage.mjs`, and `node scripts\stock-acceptance-coverage.mjs`.

Manual QA:

- Open active scan/manual entry at phone width and confirm the page shows the sticky summary without the duplicate preset card.

## 2026-07-09 Stock Inbound Sticky Summary Session Code

Scope:

- `/stock/inbound` active scan/manual sticky summary.

Evidence captured:

- The sticky active-session summary now shows the inbound session code under the display name.
- Source checks passed: `node scripts\stock-inbound-guided-flow-coverage.mjs`, `node scripts\stock-mobile-ux-coverage.mjs`, and `node scripts\stock-acceptance-coverage.mjs`.

Manual QA:

- Open active scan/manual entry at phone width and confirm the session code stays visible while scanning or entering weights.

## 2026-07-09 Stock Inbound Sticky Summary Product Lines

Scope:

- `/stock/inbound` active scan/manual sticky summary.

Evidence captured:

- The sticky active-session summary now shows product and manufacturer separately under the display name.
- Source checks passed: `node scripts\stock-inbound-guided-flow-coverage.mjs`, `node scripts\stock-mobile-ux-coverage.mjs`, and `node scripts\stock-acceptance-coverage.mjs`.

Manual QA:

- Open active scan/manual entry at phone width and confirm display name, product, manufacturer, origin/location, count, and weight stay visible.

## 2026-07-09 Stock Inbound Manager-Approved Delete Confirmation

Scope:

- `/stock/inbound` whole-session delete confirmation.

Evidence captured:

- The destructive confirmation now says `Confirm Delete Whole Session`.
- Existing manager/admin/director server-side action gate remains unchanged.
- Source checks passed: `node scripts\stock-inbound-guided-flow-coverage.mjs`, `node scripts\stock-mobile-ux-coverage.mjs`, and `node scripts\stock-acceptance-coverage.mjs`.

Manual QA:

- Finish a session, open Delete Whole Session, and confirm the manager-approved warning is shown before voiding.

## 2026-07-09 Stock Inbound Summary Finish Label

Scope:

- `/stock/inbound` session summary action grid.

Evidence captured:

- The disabled summary finish action is labeled `Finish Session`, matching the guided workflow wording.
- Source checks passed: `node scripts\stock-inbound-guided-flow-coverage.mjs`, `node scripts\stock-mobile-ux-coverage.mjs`, and `node scripts\stock-acceptance-coverage.mjs`.

Manual QA:

- Finish an inbound session on phone width and confirm the summary shows Print Labels PDF, Print Session Summary, Finish Session, and Delete Whole Session.

## 2026-07-09 Stock Inbound Shorter Scan Hints

Scope:

- `/stock/inbound` barcode rule and recent scan helper text.

Evidence captured:

- Rule preview now says `Preview only. Net kg below.`
- First-rule helper now says `Save first barcode. Rule reused.`
- Recent barcode-mode scan note now says `Barcode labels already attached.`
- Source checks passed: `node scripts\stock-mobile-ux-coverage.mjs`, `node scripts\stock-inbound-guided-flow-coverage.mjs`, and `node scripts\stock-acceptance-coverage.mjs`.

Manual QA:

- Open `/stock/inbound` at phone width and confirm the rule/scan helper copy stays short but understandable.

## 2026-07-09 Stock Inbound Short Display Name Label

Scope:

- `/stock/inbound` setup and preview display-name labels.

Evidence captured:

- The setup and locked preview cards now use the shorter label `Display name`.
- Source checks passed: `node scripts\stock-inbound-guided-flow-coverage.mjs`, `node scripts\stock-mobile-ux-coverage.mjs`, and `node scripts\stock-acceptance-coverage.mjs`.

Manual QA:

- Open `/stock/inbound` at phone width and confirm the display name card remains clear while product and manufacturer stay separate.

## 2026-07-09 Stock Inbound Immediate-Save QA Alignment

Scope:

- `/stock/inbound` barcode-rule learning message and internal-label QA guidance.

Evidence captured:

- Barcode rule learning now says `Weight position found. Save rule.`
- Current no-barcode/internal-label QA now checks immediate stock save before print/attach.
- `/stock/no-barcode-inbound` now tells workers stock saves when the label is generated.
- Source checks passed: `node scripts\stock-mobile-ux-coverage.mjs`, `node scripts\stock-owner-qa-doc-coverage.mjs`, and `node scripts\stock-inbound-guided-flow-coverage.mjs`.

Manual QA:

- Open Inbound with Barcode, scan a no-rule supplier barcode, enter kg, and confirm the shorter rule-save message.
- Open Inbound without Barcode, generate one internal label, confirm stock saves immediately, then print/attach it.

## 2026-07-09 Stock Inbound Invalid-Rule Wording Alignment

Scope:

- `/stock/inbound` barcode-rule invalid-preview warning.

Evidence captured:

- Invalid rule preview now says `No valid weight. Use labels.`
- Current QA wording now uses `Inbound with Barcode` for the barcode mode name.
- Source checks passed: `node scripts\stock-inbound-guided-flow-coverage.mjs` and `node scripts\stock-owner-qa-doc-coverage.mjs`.

Manual QA:

- Open barcode rule setup, enter invalid rule fields, and confirm the warning points to `Inbound without Barcode`.

## 2026-07-09 Stock Inbound Immediate-Label Docs Sync

Scope:

- Current Stock Inbound no-barcode/manual-label documentation and live field label.

Evidence captured:

- Stale scan-back wording was removed from current owner QA/evidence/handoff notes.
- Manual no-barcode QA now follows the current immediate-save flow.
- Live manual barcode field label now says `Generated barcode`.
- Source checks passed: `node scripts\stock-owner-qa-doc-coverage.mjs` and `node scripts\stock-inbound-guided-flow-coverage.mjs`.

Manual QA:

- Open Inbound without Barcode, enter one weight, confirm stock saves immediately, then print/attach the generated label.

## 2026-07-09 Stock Inbound Manual Label Save Copy

Scope:

- `/stock/inbound` manual weight entry helper copy.

Evidence captured:

- Manual label scanner helper now says `Weight saves label.`
- Pending-label helper now says `After save, next weight.`
- Source checks passed: `node scripts\stock-inbound-guided-flow-coverage.mjs`, `node scripts\stock-mobile-ux-coverage.mjs`, `node scripts\stock-acceptance-coverage.mjs`, and `node scripts\stock-label-coverage.mjs`.

Manual QA:

- Open Inbound without Barcode, enter one weight, and confirm the generated label saves immediately before returning to the next weight.

## 2026-07-09 Stock Label Reprint Shorter Copy

Scope:

- `/stock/units/[id]` mobile label reprint helper copy.

Evidence captured:

- Reprint page now says `Reprint label from phone. No reason needed.`
- Label preview card now says `Mobile reprint label.`
- Source checks passed: `node scripts\stock-label-coverage.mjs`, `node scripts\stock-mobile-ux-coverage.mjs`, and `node scripts\stock-acceptance-coverage.mjs`.

Manual QA:

- Open a real `/stock/units/[id]` page on phone width, confirm the shorter reprint copy, and print/PDF the label.

## 2026-07-09 Stock Scanner Shorter Worker Copy

Scope:

- Shared stock barcode scanner field and phone scanner popup.

Evidence captured:

- Default scanner helper now says `Type barcode if needed.`
- Camera popup now says `Allow camera. Use manual if blocked.`
- External scanner cue now says `Enter sends scan`.
- Source checks passed: `node scripts\stock-scanner-coverage.mjs`, `node scripts\stock-mobile-ux-coverage.mjs`, `node scripts\stock-inbound-guided-flow-coverage.mjs`, and `node scripts\stock-acceptance-coverage.mjs`.

Manual QA:

- Open `/stock/inbound` on phone width and confirm the scan field and camera popup use short worker messages.
- Test real camera and handheld scanner when device access is available.

## 2026-07-09 Stock Inbound Shorter Setup Labels

Scope:

- `/stock/inbound` setup and session-history labels.

Evidence captured:

- Setup now uses shorter labels: `Auto code.`, `10 per page.`, `Tap product.`, `Save before scanning.`, `Item code:`, `Manufacturers`, and `Tap manufacturer.`
- Source checks passed: `node scripts\stock-inbound-guided-flow-coverage.mjs`, `node scripts\stock-mobile-ux-coverage.mjs`, and `node scripts\stock-acceptance-coverage.mjs`.

Manual QA:

- Open `/stock/inbound` around 390px width and confirm setup/history labels are short and readable.

## 2026-07-09 Stock Inbound Shorter Delete/Fixed-Weight Copy

Scope:

- `/stock/inbound` fixed-weight fallback helper and session summary delete confirmation.

Evidence captured:

- Fixed-weight fallback now shows `Set default fixed kg first.`
- Whole-session delete now shows `Confirm Delete Whole Session`, shorter void count/weight text, and `Corrections need manager approval. Audit kept.`
- Source checks passed: `node scripts\stock-inbound-guided-flow-coverage.mjs`, `node scripts\stock-mobile-ux-coverage.mjs`, and `node scripts\stock-acceptance-coverage.mjs`.

Manual QA:

- Open `/stock/inbound`, choose a product without default fixed weight, and confirm the short fixed-weight message.
- Finish a session with saved scans, open Delete Whole Session, and confirm the shorter correction/audit warning appears before delete.

## Test Run Details

| Field | Evidence |
| --- | --- |
| Tester | TODO |
| Date | TODO |
| Branch / commit | TODO |
| App URL | TODO |
| Supabase project | TODO |
| Migration range applied | TODO |
| Seed status | TODO |
| `npm.cmd run smoke` | TODO |
| `npm.cmd run lint` | TODO |
| `npm.cmd run typecheck` | TODO |
| `npm.cmd run build` | TODO |

## 2026-06-29 Quick Custom Manufacturer Resolve

Scope:

- Continued the guided Stock Inbound product/manufacturer storage goal.
- Quick product creation now sends a typed custom manufacturer as `defaultBrandName`.
- The item create action resolves the default manufacturer id or typed default manufacturer name before saving the item.

Evidence captured:

- `components/stock/workflow-forms.tsx` sends `defaultBrandName` when `preset.brandId === "__other"`.
- `lib/stock/actions.ts` resolves `parsed.defaultBrandId` / `parsed.defaultBrandName` through `resolveNamedRecordId` before inserting the item.
- `lib/stock/action-state.ts` allows the item create action to return the resolved `brandId`.
- `scripts/stock-acceptance-coverage.mjs` guards the quick-create custom-manufacturer resolve path.
- `scripts/stock-item-master-coverage.mjs` now expects item creation to insert the resolved `defaultBrandId`.

Latest check result:

- `node scripts\stock-acceptance-coverage.mjs` - passed.
- `node scripts\stock-mobile-ux-coverage.mjs` - passed.
- `npm.cmd run smoke` - initially failed on the old item-master coverage guard, then passed after aligning the guard with resolved default manufacturer creation.
- `npm.cmd run lint` - passed.
- `npm.cmd run typecheck` - passed.
- `npm.cmd run build` - passed.

## 2026-06-29 Quick Product Manufacturer Default

Scope:

- Continued the guided Stock Inbound product/manufacturer storage goal.
- Quick-created products inside Barcode Inbound now keep the selected existing manufacturer as the item default manufacturer.
- The local item copy is updated the same way, so display names are immediately generated as manufacturer + product after creation.

Evidence captured:

- `components/stock/workflow-forms.tsx` sends `defaultBrandId` during quick item creation when `preset.brandId` is an existing manufacturer.
- `components/stock/workflow-forms.tsx` stores the same default manufacturer id in the newly appended local item.
- `scripts/stock-acceptance-coverage.mjs` guards the quick-create manufacturer default path.

Latest check result:

- `node scripts\stock-acceptance-coverage.mjs` - passed.
- `node scripts\stock-mobile-ux-coverage.mjs` - passed.
- `npm.cmd run smoke` - passed.
- `npm.cmd run lint` - passed.
- `npm.cmd run typecheck` - passed.
- `npm.cmd run build` - passed.

## 2026-06-29 Inbound Scan Issue Manufacturer Context

Scope:

- Continued the guided Stock Inbound product/manufacturer naming goal.
- New inbound scan issue logs now carry product/manufacturer/display-name context in `barcode_scan_logs.related_context`.
- Manager scan issue display now prefers captured context before falling back to item default manufacturer.

Evidence captured:

- `components/stock/workflow-forms.tsx` sets `productName`, `manufacturerName`, `displayProductName`, `brandId`, and `originId` when logging inbound scan issues.
- `lib/stock/actions.ts` accepts the inbound issue context fields and stores them through `issueRelatedContext`.
- `lib/stock/data.ts` uses `formatScanIssueItemName` to render scan issue item names from captured display context.
- `scripts/stock-acceptance-coverage.mjs` guards the issue-context display-name path.

Latest check result:

- `node scripts\stock-acceptance-coverage.mjs` - passed.
- `node scripts\stock-mobile-ux-coverage.mjs` - passed.
- `npm.cmd run smoke` - passed.
- `npm.cmd run lint` - passed.
- `npm.cmd run typecheck` - passed after adding the missing empty related-context fallback in `lib/stock/data.ts`.
- `npm.cmd run build` - passed.

## 2026-06-29 Manager Issue Display Names

Scope:

- Continued the guided Stock Inbound product/manufacturer naming goal.
- Manager scan issue review now uses the Stock display-name helper path for issue item names.
- Where only an item id is available, issue rows prefer the item's default manufacturer + product name.

Evidence captured:

- `lib/stock/data.ts` adds `formatDefaultDisplayItemName` and uses it for `scanAlerts.itemName` and `scanAlerts.selectedItemName`.
- `scripts/stock-acceptance-coverage.mjs` guards the display-name helper in guided inbound goal coverage.

Latest check result:

- `node scripts\stock-acceptance-coverage.mjs` - passed.
- `node scripts\stock-mobile-ux-coverage.mjs` - passed.
- `npm.cmd run smoke` - passed.
- `npm.cmd run lint` - passed.
- `npm.cmd run typecheck` - passed.
- `npm.cmd run build` - passed.

## 2026-06-29 Atomic Whole-Session Inbound Undo

Scope:

- Continued the guided Stock Inbound session-summary goal.
- `Undo/Delete whole session` now calls a server-side transaction RPC instead of undoing each saved scan from the browser one by one.
- The RPC validates the full inbound session before voiding stock, so a failed validation should leave the session unchanged.

Evidence captured:

- `supabase/migrations/202606250008_stock_inbound_session_void_rpc_v1.sql` creates `public.void_inbound_stock_session`.
- `lib/stock/actions.ts` exposes `undoInboundSessionAction` and calls `void_inbound_stock_session`.
- `components/stock/workflow-forms.tsx` calls `undoInboundSessionAction` from the summary `Undo/Delete whole session` button.
- `scripts/stock-mobile-ux-coverage.mjs` and `scripts/stock-acceptance-coverage.mjs` guard the RPC-backed whole-session undo.

Latest check result:

- `node scripts\stock-acceptance-coverage.mjs` - passed.
- `node scripts\stock-mobile-ux-coverage.mjs` - passed.
- `node scripts\stock-migration-safety.mjs` - passed.
- `npm.cmd run smoke` - passed.
- `npm.cmd run lint` - passed.
- `npm.cmd run typecheck` - passed.
- `npm.cmd run build` - passed.

## 2026-06-29 Manual-Weight Recent Template Mode

Scope:

- Continued the guided Stock Inbound no-barcode/manual-weight goal.
- Recent inbound templates are now mode-aware.
- If the worker is in `Inbound without Barcode`, tapping a recent template keeps the session in Manual Weight instead of switching to Inbound with Barcode.
- When the selected template has enough setup data, the form jumps straight to Manual Weight and focuses the weight field.

Evidence captured:

- `components/stock/workflow-forms.tsx` handles `inboundMode === "internal_label"` inside `applyInboundTemplate`.
- Manual template selection shows `Ready. Enter weight.`
- Manual template selection calls `setInboundStep("manual")` and focuses `netWeightInputRef`.
- `scripts/stock-mobile-ux-coverage.mjs` and `scripts/stock-acceptance-coverage.mjs` guard the mode-aware template flow.

Latest check result:

- `node scripts\stock-mobile-ux-coverage.mjs` - passed.
- `node scripts\stock-acceptance-coverage.mjs` - passed.
- `npm.cmd run smoke` - passed.
- `npm.cmd run lint` - passed.
- `npm.cmd run typecheck` - passed.
- `npm.cmd run build` - passed.

Manual QA still required:

- On `/stock/inbound`, choose `Inbound without Barcode`.
- Tap a recent inbound template.
- Confirm the form stays in Manual Weight and focuses the weight field.
- Confirm Supplier Barcode mode still sends saved-rule templates to scanner/rule setup.

## 2026-06-29 Pending Internal Label Finish Guard

Scope:

- Continued the guided Stock Inbound no-barcode/manual-weight goal.
- Prevented workers from finishing a session while an internal barcode label save is still pending.
- Current no-barcode flow: enter weight, generate label, save stock immediately, print/attach label, then finish summary.
- New inbound session reset now clears pending internal-label state and refs.

Evidence captured:

- `components/stock/workflow-forms.tsx` adds `finishBlockedByPendingLabel`.
- The finish button is disabled while a printed label is pending confirmation.
- The current UI shows `Retry or cancel pending label.` while the save is still pending.
- New inbound session reset clears `pendingInternalLabel`, `pendingLabelRef`, and `pendingInternalLabelRef`.
- `scripts/stock-mobile-ux-coverage.mjs` and `scripts/stock-acceptance-coverage.mjs` guard the finish/reset behavior.

Latest check result:

- `node scripts\stock-mobile-ux-coverage.mjs` - passed.
- `node scripts\stock-acceptance-coverage.mjs` - passed.
- Full smoke/lint/typecheck/build results are recorded in `HANDOFF.md` for this run.

Manual QA still required:

- On `/stock/inbound`, choose `Inbound without Barcode`.
- Enter weight and generate an internal label.
- Confirm `Finish Inbound Session` is blocked until the printed label is scanned back or cancelled.
- Start a new inbound session and confirm no old pending label remains.

## 2026-06-29 Scanner Popup Undo Previous Scan

Scope:

- Continued the guided Stock Inbound scanner-page goal.
- The reusable scanner dialog now accepts a contextual `scanActionSlot`.
- Stock Inbound passes an `Undo Previous Scan` action into the camera scanner popup when the current session has a latest saved scan.
- The popup action calls the existing `undoInboundScanAction`, so the stock unit is voided through the existing RPC and audit/movement history is kept.

Evidence captured:

- `components/stock/barcode-scanner.tsx` adds `scanActionSlot?: ReactNode` and renders it inside the scanner dialog.
- `components/stock/workflow-forms.tsx` adds `undoLatestInboundScan`.
- The popup action sends `stockUnitId`, `batchNo`, and reason `Undo previous inbound scan` to `undoInboundScanAction`.
- Successful popup undo updates the current-session label to `VOIDED` and shows `Previous scan undone. Audit trail kept.`
- `scripts/stock-scanner-coverage.mjs`, `scripts/stock-mobile-ux-coverage.mjs`, and `scripts/stock-acceptance-coverage.mjs` guard the popup action wiring.

Latest check result:

- `node scripts\stock-scanner-coverage.mjs` - passed.
- `node scripts\stock-mobile-ux-coverage.mjs` - passed.
- `node scripts\stock-acceptance-coverage.mjs` - passed.
- Full smoke/lint/typecheck/build results are recorded in `HANDOFF.md` for this run.

Manual QA still required:

- On `/stock/inbound`, save one scan while the camera scanner popup is open.
- Confirm the popup shows `Undo Previous Scan`.
- Tap it and confirm the latest scan becomes `VOIDED`, the session total decreases, and the scanner remains usable for the next scan.

## 2026-06-29 Scanner Popup Session Totals

Scope:

- Continued the guided Stock Inbound scanner-page goal.
- The reusable scanner dialog already had the `Inbound session total` display area.
- Stock Inbound now passes the current saved scan count and saved total kg into the scanner popup while continuous scanning stays open.
- This keeps the camera scanner useful for workers because they can see both the latest saved item/weight and the live session total without closing the scanner.

Evidence captured:

- `components/stock/workflow-forms.tsx` computes `inboundScanTotalSummary` from current-session saved scans.
- Stock Inbound passes `scanTotalSummary={inboundScanTotalSummary}` into the inbound `BarcodeField`.
- `components/stock/barcode-scanner.tsx` renders `Inbound session total`.
- `scripts/stock-scanner-coverage.mjs`, `scripts/stock-mobile-ux-coverage.mjs`, and `scripts/stock-acceptance-coverage.mjs` guard the session-total wiring.

Latest check result:

- `node scripts\stock-scanner-coverage.mjs` - passed.
- `node scripts\stock-mobile-ux-coverage.mjs` - passed.
- `node scripts\stock-acceptance-coverage.mjs` - passed.
- Full smoke/lint/typecheck/build results are recorded in `HANDOFF.md` for this run.

Manual QA still required:

- On `/stock/inbound`, open the scanner popup before any scans and confirm it shows `0 saved scans / 0.000 kg total`.
- Save one barcode and confirm the scanner popup updates to one saved scan and the saved kg total.
- Save a second barcode and confirm the scanner remains open and the count/kg total increases.

## 2026-06-29 Scanner Popup Last Saved Item Weight

Scope:

- Continued the guided Stock Inbound scanner-page goal.
- The reusable camera scanner dialog can now show an optional last-saved item and weight summary.
- Stock Inbound passes the latest saved manufacturer/product display name and kg into that scanner summary, so workers do not need to close the camera window to compare the previous saved item/weight.

Evidence captured:

- `components/stock/barcode-scanner.tsx` adds optional `scanSummary`.
- The scanner dialog renders `Last saved item and weight`.
- `components/stock/workflow-forms.tsx` computes `inboundScanSummary` from the latest saved inbound scan.
- Stock Inbound passes `scanSummary={inboundScanSummary}` into `BarcodeField`.
- `scripts/stock-scanner-coverage.mjs`, `scripts/stock-mobile-ux-coverage.mjs`, and `scripts/stock-acceptance-coverage.mjs` guard the scanner summary wiring.

Latest check result:

- `node scripts\stock-scanner-coverage.mjs` - passed.
- `node scripts\stock-mobile-ux-coverage.mjs` - passed.
- `node scripts\stock-acceptance-coverage.mjs` - passed.
- `npm.cmd run smoke` - passed.
- `npm.cmd run lint` - passed.
- `npm.cmd run typecheck` - passed.
- `npm.cmd run build` - passed.

Manual QA still required:

- On `/stock/inbound`, save one barcode or internal-label scan while the camera scanner is open.
- Confirm the scanner popup shows `Last saved item and weight` with the manufacturer/product display name and kg.
- Continue scanning and confirm the popup remains open.

## 2026-06-29 Manual Weight Enter-To-Label

Scope:

- Continued the guided Stock Inbound no-barcode/manual-weight flow.
- Reduced one repetitive tap per stock unit by letting workers press Enter in the weight field to generate the internal label.
- The print/attach/scan confirmation rule remains unchanged; stock is still saved only after the generated label is scanned.

Evidence captured:

- `components/stock/workflow-forms.tsx` adds `handleNetWeightKeyDown`.
- The Enter handler only runs on the Manual Weight step.
- If a printed label is pending, Enter focuses the barcode field and tells the worker to scan the label.
- The manual-weight helper text now says `press Enter to generate label`.
- `scripts/stock-mobile-ux-coverage.mjs` and `scripts/stock-acceptance-coverage.mjs` guard the Enter-to-label behavior.

Latest check result:

- `node scripts\stock-mobile-ux-coverage.mjs` - passed.
- `node scripts\stock-acceptance-coverage.mjs` - passed.
- `npm.cmd run smoke` - passed.
- `npm.cmd run lint` - passed.
- `npm.cmd run typecheck` - passed.
- `npm.cmd run build` - passed.

Manual QA still required:

- On `/stock/inbound`, switch to `Inbound without Barcode`.
- Enter a weight and press Enter; confirm the label preview is generated without tapping the button.
- Print/attach the label, scan it, and confirm the field clears/focuses for the next weight.

## 2026-06-29 Inbound Custom Origin Search

Scope:

- Continued the guided Stock Inbound Page 1 setup flow.
- Made custom origin entry faster when a worker searches for an origin that is not in the list.
- The origin search can now be reused directly as the custom origin name, matching the custom manufacturer path.

Evidence captured:

- `components/stock/workflow-forms.tsx` defines `quickOriginNameSuggestion` and checks whether the search exactly matches an active origin.
- The origin section renders `Use as origin: ...` when the search text is not already in the list.
- Clicking the action selects `Other / custom origin` and fills `originName`.
- `scripts/stock-mobile-ux-coverage.mjs` and `scripts/stock-acceptance-coverage.mjs` guard the custom origin path.

Latest check result:

- `node scripts\stock-mobile-ux-coverage.mjs` - passed.
- `node scripts\stock-acceptance-coverage.mjs` - passed.
- `npm.cmd run smoke` - passed.
- `npm.cmd run lint` - passed.
- `npm.cmd run typecheck` - passed.
- `npm.cmd run build` - passed.

Manual QA still required:

- On `/stock/inbound`, search for an origin that does not exist.
- Tap `Use as origin`, confirm the custom field is filled, then complete one barcode or no-barcode inbound session.
- Confirm origin remains visible separately from manufacturer + product in the scanner and summary.

## 2026-06-29 Inbound Custom Manufacturer Search

Scope:

- Continued the guided Stock Inbound Page 1 setup flow.
- Made custom manufacturer entry faster when a worker searches for a manufacturer that is not in the list.
- The manufacturer search can now be reused directly as the custom manufacturer name while keeping product and manufacturer as separate fields.

Evidence captured:

- `components/stock/workflow-forms.tsx` defines `quickManufacturerNameSuggestion` and checks whether the search exactly matches an active manufacturer.
- The manufacturer section renders `Use search text as custom manufacturer: ...` when the search text is not already in the list.
- Clicking the action selects `Other / custom manufacturer` and fills `brandName`.
- `scripts/stock-mobile-ux-coverage.mjs` and `scripts/stock-acceptance-coverage.mjs` guard the custom manufacturer path.

Latest check result:

- `node scripts\stock-mobile-ux-coverage.mjs` - passed.
- `node scripts\stock-acceptance-coverage.mjs` - passed.
- `npm.cmd run smoke` - passed.
- `npm.cmd run lint` - passed.
- `npm.cmd run typecheck` - passed.
- `npm.cmd run build` - passed.

Manual QA still required:

- On `/stock/inbound`, search for a manufacturer that does not exist.
- Tap `Use search text as custom manufacturer`, confirm the custom field is filled, then choose/create a product.
- Confirm the scanner/setup display name becomes manufacturer + product and that manufacturer remains separately visible in the summary.

## 2026-06-29 Inbound Quick Product Manual Entry

Scope:

- Continued the guided Stock Inbound Page 1 setup flow.
- Made the manual product-create path faster when a worker searches for a product that is not in the list.
- The New Product panel can now copy the current product search text into the product-name field.
- The panel now reminds workers that product and manufacturer are stored separately, so manufacturer still belongs in the manufacturer selector/custom field.

Evidence captured:

- `components/stock/workflow-forms.tsx` defines `quickProductNameSuggestion` from the product search text.
- The New Product panel renders `Use search text as product: ...`.
- The quick product input now says `Product name only`.
- `scripts/stock-mobile-ux-coverage.mjs` and `scripts/stock-acceptance-coverage.mjs` guard the new manual-entry path.

Latest check result:

- `node scripts\stock-mobile-ux-coverage.mjs` - passed.
- `node scripts\stock-acceptance-coverage.mjs` - passed.
- `npm.cmd run smoke` - passed.
- `npm.cmd run lint` - passed.
- `npm.cmd run typecheck` - passed.
- `npm.cmd run build` - passed.

Manual QA still required:

- On `/stock/inbound`, search for a product that does not exist.
- Open `New product`, tap `Use search text as product`, create the item, and confirm it becomes the selected product without retyping.
- Confirm manufacturer selection/custom manufacturer remains separate and the generated display name is manufacturer + product.

## 2026-06-29 Stock Issue Auto-Create Guard

Scope:

- Source-checked stock issue handling so workers still see short scan messages while issue records are auto-created for manager review.
- Tightened Receive Transfer issue logging for wrong-location, unexpected, duplicate, unavailable, and missing/not-found scan cases.
- No database adjustment behavior changed; stock-take mismatch/manual correction still requires approval before adjustment.

Evidence captured:

- `components/stock/workflow-forms.tsx` logs receive-transfer scan issues through `logWorkerScanIssue`.
- `lib/stock/actions.ts` still owns server-side scan rejection logging through `rejectBarcodeScan`.
- `scripts/stock-acceptance-coverage.mjs` guards issue creation coverage for inbound, outbound, transfer/receive, return, stock take, and manager review.

Latest check result:

- `node scripts\stock-acceptance-coverage.mjs` - passed.
- `npm.cmd run smoke` - passed.
- `npm.cmd run lint` - passed.
- `npm.cmd run typecheck` - passed.
- `npm.cmd run build` - passed.

Manual QA still required:

- Create one issue each from inbound duplicate/rule failure, outbound unavailable/wrong location, transfer duplicate/wrong source, receive-transfer wrong location/unexpected/missing, return blocked, stock-take unknown/mismatch, and damage/spoilage request.
- Confirm the manager review queue shows issue type, barcode, item/selected item, expected/scanned location/status, related context, and approve/reject/correct buttons.

## 2026-06-29 Barcode Rule Failure Manual Fallback

Scope:

- Source-checked the guided inbound Page 2 failure path when a sample barcode and actual kg cannot infer a position rule.
- The UI now switches from Barcode Rule to Manual Weight so the worker can generate an internal label instead of staying on a blocked rule page.

Evidence captured:

- `components/stock/workflow-forms.tsx` sets `inboundMode` to `internal_label` and `inboundStep` to `manual` when no rule suggestion is found on Page 2.
- The worker message is `No weight position found. Use internal label.`
- `scripts/stock-mobile-ux-coverage.mjs` guards the fallback message.

Latest check result:

- `node scripts\stock-mobile-ux-coverage.mjs` - passed.
- `npm.cmd run smoke` - passed.
- `npm.cmd run lint` - passed.
- `npm.cmd run typecheck` - passed.
- `npm.cmd run build` - passed.

Manual QA still required:

- On `/stock/inbound`, use a supplier barcode sample and actual kg that cannot infer a rule.
- Confirm the page switches to Manual Weight with the kg still available for label generation.
- Generate, print/attach, and scan the internal label to save stock.

## 2026-06-29 Barcode Rule Extracted Preview Source Check

Scope:

- Source-checked the guided inbound Page 2 extracted weight preview.
- The preview now derives from the sample barcode and current rule fields, not the manually entered actual kg.
- Actual kg remains the editable value saved for the sample inbound/rule-learning flow.

Evidence captured:

- `components/stock/workflow-forms.tsx` computes `ruleExtractedPreview` from `decodeBarcodeWeight()`.
- `components/stock/workflow-forms.tsx` renders `ruleExtractedPreviewWeightKg`.
- `components/stock/workflow-forms.tsx` labels the preview as read-only and separate from actual kg.
- `scripts/stock-mobile-ux-coverage.mjs` guards this preview behavior.

Latest check result:

- `node scripts\stock-mobile-ux-coverage.mjs` - passed.
- `npm.cmd run smoke` - passed.
- `npm.cmd run lint` - passed.
- `npm.cmd run typecheck` - passed.
- `npm.cmd run build` - passed.

Manual QA still required:

- Open `/stock/inbound`, go to Page 2 for a setup without a saved rule.
- Scan/type a sample barcode.
- Change weight start/digits/decimals and confirm the preview changes while actual kg remains editable.
- Enter actual kg and save to learn the rule.

## 2026-06-29 Movement Report Manufacturer Display Source Check

Scope:

- Source-checked movement-backed stock reports for the product/manufacturer naming rule.
- Stock movements now use linked stock-unit manufacturer data where `stock_unit_id` or barcode can identify the barcode unit.
- Demo movements are enriched the same way so local/demo movement history follows the same display rule.
- Item/location stock totals now sum manufacturer-aware balance rows by item id and location instead of matching old item display text.

Evidence captured:

- `lib/stock/data.ts` maps Supabase movement rows through `mapMovement(row, items, brands, units, locations)`.
- `lib/stock/data.ts` uses `formatDisplayItemName()` when a movement links to a barcode stock unit.
- `lib/stock/data.ts` includes `withMovementDisplayNames()` for demo movement rows.
- `scripts/stock-report-coverage.mjs` guards movement display-name enrichment.

Latest check result:

- `node scripts\stock-report-coverage.mjs` - passed.
- `node scripts\stock-label-coverage.mjs` - passed after updating a stale guard string.
- `npm.cmd run smoke` - failed once on the stale label guard, then passed.
- `npm.cmd run lint` - passed.
- `npm.cmd run typecheck` - passed.
- `npm.cmd run build` - passed.

Manual QA still required:

- Open `/stock/movements` with live barcode-linked movements and confirm manufacturer + product names appear.
- Open `/stock/reports`, search by manufacturer name, and confirm movement-backed report rows are found.

## 2026-06-29 Barcode Rule Page Sample Save Guard

Scope:

- Source-checked the guided inbound Page 2 barcode-rule learning flow.
- Sample barcode scans on Page 2 now wait for actual kg instead of auto-saving from default barcode positions.
- Actual kg entry now tries to infer the barcode weight position from the sample barcode even when default fields decode a number.
- Continuous auto-save remains on the regular scanner page, not the rule setup page.

Evidence captured:

- `components/stock/workflow-forms.tsx` shows `Sample scanned. Enter kg, then save rule.`
- `components/stock/workflow-forms.tsx` excludes `inboundStep === "rule"` from the automatic submit path.
- `components/stock/workflow-forms.tsx` disables Page 2 save through `ruleSampleNeedsActualKg` until sample barcode and actual kg exist.
- `scripts/stock-mobile-ux-coverage.mjs` guards the Page 2 sample-save behavior.

Latest check result:

- `node scripts\stock-mobile-ux-coverage.mjs` - passed.
- `npm.cmd run smoke` - passed.
- `npm.cmd run lint` - passed.
- `npm.cmd run typecheck` - passed.
- `npm.cmd run build` - passed.

Manual QA still required:

- Open `/stock/inbound`, choose a new product/manufacturer/origin setup without a saved rule.
- On Page 2, scan one supplier barcode and confirm the app asks for actual kg instead of saving immediately.
- Enter actual kg and save, then confirm future Page 3 scans auto-fill and auto-save continuously.

## 2026-06-29 Stock Balance Manufacturer Display Source Check

Scope:

- Source-checked stock balance/report rows for the guided inbound product naming rule.
- Stock balance rows now preserve manufacturer separately and group by product + manufacturer + location.
- The balance table shows a `Manufacturer` column and mobile cards show manufacturer context.
- Stock reports include explicit `Stock balance` rows using manufacturer + product display names.

Evidence captured:

- `lib/stock/data.ts` builds balances with `itemId`, `brandId`, `itemName`, and `brandName`.
- `lib/stock/data.ts` uses `formatDisplayItemName(item, brand)` for balance display names.
- `components/stock/stock-page.tsx` includes `{ key: "brandName", header: "Manufacturer" }`.
- `scripts/stock-report-coverage.mjs` and `scripts/stock-mobile-ux-coverage.mjs` guard this behavior.

Latest check result:

- `node scripts\stock-report-coverage.mjs` - passed.
- `node scripts\stock-mobile-ux-coverage.mjs` - passed.
- `npm.cmd run smoke` - passed.
- `npm.cmd run lint` - passed.
- `npm.cmd run typecheck` - passed.
- `npm.cmd run build` - passed.

Manual QA still required:

- Open `/stock/balance` with live data that has the same product under two manufacturers.
- Confirm each manufacturer appears as a separate balance row with the correct total weight.
- Open `/stock/reports` and confirm `Stock balance` rows use manufacturer + product display names.

## 2026-06-29 Guided Inbound Manufacturer Wording Source Check

Scope:

- Source-checked the guided `/stock/inbound` setup wording for the product/manufacturer naming rule.
- Inbound now shows the worker-facing selector as `Manufacturer`, with `Select manufacturer` and `Other / custom manufacturer`.
- The underlying storage still uses existing `items` for product and `brands.brand_id` for manufacturer so reports can keep product/manufacturer filters separate.

Evidence captured:

- `components/stock/workflow-forms.tsx` keeps generated display names through `selectedManufacturerValue` and `selectedProductDisplayName`.
- `components/stock/workflow-forms.tsx` uses the generated display product name in scanner cards, summaries, and inbound labels.
- `scripts/stock-mobile-ux-coverage.mjs` now guards the manufacturer selector wording.

Latest check result:

- `node scripts\stock-mobile-ux-coverage.mjs` - passed.
- `npm.cmd run smoke` - passed.
- `npm.cmd run lint` - passed.
- `npm.cmd run typecheck` - passed.
- `npm.cmd run build` - passed.

Manual QA still required:

- Sign in locally or on Vercel.
- Open `/stock/inbound` at about 390px width.
- Confirm Page 1 says `Manufacturer`, not worker-facing `Brand`, and custom manufacturer entry is available.
- Confirm labels and summary show manufacturer + product, for example `Locks NV Belly Boneless`.

## 2026-06-29 Guided Stock Inbound 390px Browser Attempt

Scope:

- Attempted to browser-test `/stock/inbound` at 390px for the guided inbound flow.
- The local route compiled and loaded far enough for middleware to redirect unauthenticated access from `/stock/inbound` to `/login`.
- This confirms the route can start under the local dev server, but it does not prove the authenticated inbound UI or scanner flow.

Evidence captured:

- Direct local route check reached the app once:
  - `GET /stock/inbound 307`
  - `GET /login 200`
- Browser viewport override was prepared at `390 x 844`.
- In-app browser navigation to `http://127.0.0.1:3900/stock/inbound` failed with connection refused after the local dev process exited.

Blocker:

- Starting the dev server through `Start-Process` failed with Windows environment duplication: `Path` / `PATH`.
- A PowerShell background job and a detached `cmd` launch either exited after the first route check or failed to stay reachable.
- Because the dev server would not stay alive for the browser session, real 390px browser evidence is still missing.

Latest verified source/build checks for this inbound workstream:

- `npm.cmd run smoke` - passed.
- `npm.cmd run lint` - passed.
- `npm.cmd run typecheck` - passed.
- `npm.cmd run build` - passed.

Manual QA still required:

- Sign in locally or on Vercel.
- Open `/stock/inbound` at about 390px width.
- Confirm `Inbound with Barcode` flow shows setup, barcode rule, scanner, previous scan, undo previous scan, and summary.
- Confirm `Inbound without Barcode` flow shows setup, manual weight, generated label preview, immediate save, previous weight, count, total weight, and summary.
- Confirm no horizontal scrolling and no generic `Save inbound` button in manual mode.

## 2026-06-25 Inbound Barcode Rule Sample Metadata

Scope:

- Barcode Inbound now sends barcode length and sample barcode when saving a learned item + brand + origin weight-position rule.
- `barcode_weight_rules` gains nullable `barcode_length` and `sample_barcode` columns through migration `202606250004_stock_barcode_rule_sample_v1.sql`.
- Future scans keep using the saved start position, digit length, and decimal rule; different barcode length warnings now prefer the saved rule length.
- Existing duplicate-barcode blocking, camera scanner, external keyboard scanner Enter handling, inbound stock unit/movement/scan-log writes, RLS intent, and approval flows were not changed.

Prepared / source-guarded coverage added:

- `scripts/stock-workflow-regression.mjs` checks first-sample inference and future barcode auto-extraction.
- `scripts/stock-acceptance-coverage.mjs` guards RPC persistence of `barcode_length` and `sample_barcode`.
- `scripts/stock-mobile-ux-coverage.mjs` guards saved sample display and saved-rule length warnings.

Latest check results:

- `node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON scripts\stock-workflow-regression.mjs` - passed.
- `node scripts\stock-acceptance-coverage.mjs` - passed.
- `node scripts\stock-mobile-ux-coverage.mjs` - passed.
- `node scripts\stock-migration-safety.mjs` - passed.
- `node scripts\stock-owner-qa-doc-coverage.mjs` - passed.
- `npm.cmd run lint` - passed.
- `npm.cmd run typecheck` - passed.
- `npm.cmd run build` - passed.
- `npm.cmd run smoke` - passed.

Manual QA still required:

- Run migration `202606250004_stock_barcode_rule_sample_v1.sql` after the prior Stock migrations.
- In `/stock/inbound`, choose item/brand/origin, scan one supplier barcode, type actual kg once, and save.
- Confirm the saved rule row has start, digit length, decimals, barcode length, and sample barcode.
- Scan a same-format barcode and confirm weight auto-fills; scan a different-length barcode and confirm the warning appears.

## 2026-06-25 Worker Home And Assigned Location Defaults

Scope:

- Worker Stock Home now uses big task labels: Inbound, Outbound Without Order, Transfer Out, Receive Transfer, Return Stock, Stock Take, and Item / Barcode Setup when item setup is allowed.
- Barcode Inbound shows the assigned/current stock location first as `Using location` and keeps location edits under `Change Location`.
- Existing route permissions, manager/admin reports, review queues, setup pages, stock movement logic, RLS intent, and schema were not changed.

Prepared / source-guarded coverage added:

- `components/stock/stock-page.tsx` filters Item / Barcode Setup through existing `stockItemMasterRoles`.
- `components/stock/workflow-forms.tsx` keeps the selected location submitted while tucking the picker under `Change Location`.
- `scripts/stock-mobile-ux-coverage.mjs` guards worker task labels and assigned-location copy.
- `scripts/stock-role-scope-coverage.mjs` guards profile stock-location defaults and cross-location action blocking.

Latest check results:

- `node scripts\stock-mobile-ux-coverage.mjs` - passed.
- `node scripts\stock-role-scope-coverage.mjs` - passed.
- `node scripts\stock-owner-qa-doc-coverage.mjs` - passed.
- `npm.cmd run lint` - passed.
- `npm.cmd run typecheck` - passed.
- `npm.cmd run build` - passed.
- `npm.cmd run smoke` - passed.

Manual QA still required:

- Sign in as a general worker at 390px width and confirm Stock Home shows only big worker task buttons.
- Open `/stock/inbound` and confirm the assigned location is already shown before scanning.
- Open `Change Location` only when a different allowed location is needed.

## 2026-06-25 Direct Outbound Type-To-Scan Focus

Scope:

- Stock Outbound now focuses the barcode field after a worker selects a direct outbound type that is already scan-ready.
- Processing and Sample/Testing can go straight to scanning; Sales, Transfer, Damage/Spoilage, and Return Supplier still wait for their required customer, destination, photo, or supplier setup.
- Sales now focuses customer search when no customer is selected, so the worker's next step is active instead of the blocked barcode field.
- Existing outbound validation, stock writes, movement logic, approval flows, RLS, and schema were not changed.

Prepared / source-guarded coverage added:

- `components/stock/workflow-forms.tsx` uses `outboundTypeCanScanNow()` before focusing barcode input.
- `components/stock/workflow-forms.tsx` uses `outboundCustomerSearchInputRef` for Sales setup focus.
- `scripts/stock-mobile-ux-coverage.mjs` guards the direct outbound type-to-scan focus path.

Latest check results:

- `node scripts\stock-mobile-ux-coverage.mjs` - passed.
- `node scripts\stock-owner-qa-doc-coverage.mjs` - passed.
- `npm.cmd run lint` - passed.
- `npm.cmd run typecheck` - passed.
- `npm.cmd run build` - passed.
- `npm.cmd run smoke` - passed.

Manual QA still required:

- Open `/stock/outbound` around 390px width.
- Tap Processing or Sample/Testing and confirm barcode entry is ready without another tap.
- Switch to Sales with no customer selected and confirm customer search is ready without another tap.
- Tap Sales, Transfer, Damage/Spoilage, and Return Supplier and confirm their setup blockers still appear before scanning.

## 2026-06-25 Receive Transfer Scan Focus

Scope:

- Receive Transfer now focuses the barcode field after a worker selects a receiving location.
- Tapping a pending transfer barcode now fills the barcode field and focuses it, so the worker can immediately receive or continue scanner input.
- Existing receive-transfer wrong-location blocking, server validation, movement logic, RLS, and schema were not changed.

Prepared / source-guarded coverage added:

- `components/stock/workflow-forms.tsx` uses `selectReceiveLocation`, `selectPendingReceiveBarcode`, and `receiveBarcodeInputRef`.
- `scripts/stock-mobile-ux-coverage.mjs` guards the Receive Transfer focus path.

Latest check results:

- `node scripts\stock-mobile-ux-coverage.mjs` - passed.
- `node scripts\stock-owner-qa-doc-coverage.mjs` - passed.
- `npm.cmd run lint` - passed.
- `npm.cmd run typecheck` - passed.
- `npm.cmd run build` - passed.
- `npm.cmd run smoke` - passed.

Manual QA still required:

- Open `/stock/receive-transfer` around 390px width.
- Select a receiving location and confirm barcode entry is ready without another tap.
- Tap a pending barcode and confirm the barcode field is focused and the selected barcode remains visible.

## 2026-06-25 Transfer/Receive Location Search

Scope:

- Stock Transfer and Receive Transfer now show `Search stock location` before the quick destination/receiving buttons.
- Search filters quick location buttons and the fallback dropdown by stock location or outlet name.
- Existing transfer receive wrong-location blocking, movement logic, stock writes, RLS, and schema were not changed.

Prepared / source-guarded coverage added:

- `components/stock/workflow-forms.tsx` filters `DestinationOutletSelect` options with `locationQuery`.
- `scripts/stock-mobile-ux-coverage.mjs` guards the destination search, filtered quick list, no-match copy, and selection sync.

Latest check results:

- `node scripts\stock-mobile-ux-coverage.mjs` - passed.
- `node scripts\stock-owner-qa-doc-coverage.mjs` - passed.
- `node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON scripts\stock-workflow-regression.mjs` - passed.
- `node scripts\stock-acceptance-coverage.mjs` - passed.
- `node scripts\stock-scanner-coverage.mjs` - passed.
- `node scripts\stock-label-coverage.mjs` - passed.
- `npm.cmd run lint` - passed.
- `npm.cmd run typecheck` - passed.
- `npm.cmd run build` - passed after clearing stale generated Next build diagnostics marker. Latest rerun passed without cleanup.
- Initial `npm.cmd run smoke` - failed before Stock checks on an unrelated Cleaning guard. Latest rerun passed after the Cleaning workstream updated its guard.

Manual QA still required:

- Open `/stock/transfer` and `/stock/receive-transfer` around 390px width.
- Search by outlet or stock-location name, tap a filtered quick button, and confirm the barcode field is ready after selection.
- Confirm wrong-location receive remains blocked with the existing red destination-specific message.

## 2026-06-25 Barcode Inbound Brand/Origin Search Selection Sync

Scope:

- Barcode Inbound brand/origin dropdown choices now update the matching search box, the same as quick buttons.
- Selecting Other/custom clears the search box and keeps the existing custom entry field.
- Existing barcode-rule matching, setup locking, stock writes, RLS, and schema were not changed.

Prepared / source-guarded coverage added:

- `components/stock/workflow-forms.tsx` uses `selectInboundBrand` and `selectInboundOrigin`.
- `scripts/stock-mobile-ux-coverage.mjs` guards the shared brand/origin selection helpers.

Latest check results:

- `node scripts\stock-mobile-ux-coverage.mjs` - passed.
- `node scripts\stock-owner-qa-doc-coverage.mjs` - passed.
- `npm.cmd run lint` - passed.
- `npm.cmd run typecheck` - passed.
- `npm.cmd run build` - passed.
- `npm.cmd run smoke` - passed.

Manual QA still required:

- Open `/stock/inbound` around 390px width.
- Select brand and origin from quick buttons and dropdowns.
- Confirm the matching search box shows the selected name, and Other/custom still opens the custom text field.

## 2026-06-25 Barcode Inbound Brand And Origin Search

Scope:

- Barcode Inbound now has `Search brand` and `Search origin` before quick brand/origin buttons.
- Search filters the quick buttons only; existing dropdowns, Other/custom entry, barcode-rule matching, session locking, RLS, and schema were not changed.

Prepared / source-guarded coverage added:

- `components/stock/workflow-forms.tsx` adds `brandQuery`, `originQuery`, `inboundBrandSearch`, and `inboundOriginSearch`.
- `scripts/stock-mobile-ux-coverage.mjs` guards the Inbound brand/origin search fields.

Latest check results:

- `node scripts\stock-mobile-ux-coverage.mjs` - passed.
- `node scripts\stock-owner-qa-doc-coverage.mjs` - passed.
- `npm.cmd run lint` - passed.
- `npm.cmd run typecheck` - passed.
- `npm.cmd run build` - passed.
- `npm.cmd run smoke` - passed.

Manual QA still required:

- Open `/stock/inbound` around 390px width.
- Search brand and origin, tap the filtered quick button, then confirm setup still focuses barcode scanning once complete.

## 2026-06-25 Stock Take Item Search

Scope:

- Stock Take session creation now has `Search item or code` before the quick item buttons.
- The quick item buttons filter by item code, category, section, or product name.
- Existing stock-take session creation, scope rules, barcode-only counting, approval flow, RLS, and schema were not changed.

Prepared / source-guarded coverage added:

- `components/stock/workflow-forms.tsx` adds `createItemQuery` and `stockTakeCreateItemSearch`.
- `scripts/stock-mobile-ux-coverage.mjs` guards the Stock Take item search path.

Latest check results:

- `node scripts\stock-mobile-ux-coverage.mjs` - passed.
- `node scripts\stock-take-lock-coverage.mjs` - passed.
- `node scripts\stock-owner-qa-doc-coverage.mjs` - passed.
- `npm.cmd run lint` - passed with existing unrelated Retail warnings.
- `npm.cmd run typecheck` - passed.
- `npm.cmd run build` - passed.
- `npm.cmd run smoke` - failed before Stock checks on unrelated Order assertion: `Order form UX guard missing: Go to Ready Orders`.

Manual QA still required:

- Open `/stock/stock-take` around 390px width.
- Type item code or product text in `Search item or code`.
- Confirm quick item buttons filter and session creation still uses the selected item.

## 2026-06-25 Stock Direct Sales QA Wording Correction

Scope:

- Corrected the owner Stock QA checklist so Direct Sales says scanning is blocked until a customer is selected.
- Added a guard to prevent the stale `customer selection is optional before scanning` wording from returning.
- App behavior, server validation, RLS, stock movements, and schema were not changed.

Prepared / source-guarded coverage added:

- `docs/STOCK_TEST_LIST_FOR_OWNER.md` now matches the current Direct Sales rule.
- `scripts/stock-owner-qa-doc-coverage.mjs` rejects the stale optional-customer wording.

Latest check results:

- `node scripts\stock-owner-qa-doc-coverage.mjs` - passed.
- `node scripts\stock-mobile-ux-coverage.mjs` - passed.

Manual QA still required:

- Open `/stock/outbound`, choose Sales, and confirm scanning stays blocked until a customer is selected.

## 2026-06-25 Stock Outbound Direct Sales Customer Search Safety

Scope:

- Stock Outbound Direct Sales now writes the selected customer name into the customer search box.
- If the worker edits the customer search after choosing a customer, the selected customer is cleared and scanning is blocked until a customer is chosen again.
- Existing direct Sales customer-required validation, barcode scanning, stock movement actions, RLS, and schema were not changed.

Prepared / source-guarded coverage added:

- `components/stock/workflow-forms.tsx` updates `customerQuery` in `selectOutboundCustomer`.
- `components/stock/workflow-forms.tsx` clears `customerId` when the Direct Sales customer search changes.
- `scripts/stock-mobile-ux-coverage.mjs` guards the customer search safety path.

Latest check results:

- `node scripts\stock-mobile-ux-coverage.mjs` - passed.
- `node scripts\stock-owner-qa-doc-coverage.mjs` - passed.
- `npm.cmd run lint` - passed.
- `npm.cmd run typecheck` - passed.
- `npm.cmd run build` - passed.
- `npm.cmd run smoke` - failed before Stock checks on unrelated Cleaning assertion: `Cleaning worker UX must keep tap-to-complete flow, optional photo copy, success next step, and empty state`.

Manual QA still required:

- Open `/stock/outbound` around 390px width.
- Choose Sales, tap a customer, and confirm the customer name appears in the search box.
- Edit the customer search and confirm scanning is blocked until a customer is chosen again.

## 2026-06-25 Barcode Inbound Template Location Guard

Scope:

- Barcode Inbound recent templates now focus the barcode field only when product, brand, origin, and location are ready.
- If a worker taps a recent template before location is selected, the page says `Choose location, then scan.`.
- Existing template loading, assigned-location default, barcode-rule learning, duplicate blocking, stock writes, RLS, and schema were not changed.

Prepared / source-guarded coverage added:

- `components/stock/workflow-forms.tsx` uses `inboundPresetCanScan` before focusing after a recent template.
- `scripts/stock-mobile-ux-coverage.mjs` guards the location-needed message.

Latest check results:

- `node scripts\stock-mobile-ux-coverage.mjs` - passed.
- `node scripts\stock-owner-qa-doc-coverage.mjs` - passed.
- `npm.cmd run lint` - passed.
- `npm.cmd run typecheck` - passed.
- `npm.cmd run build` - passed.
- `npm.cmd run smoke` - passed.

Manual QA still required:

- Open `/stock/inbound` around 390px width.
- Clear or change to a state with no selected location if available, then tap a recent template.
- Confirm the page says `Choose location, then scan.` and focuses scanning only after location is ready.

## 2026-06-25 Barcode Inbound Setup-To-Scan Focus

Scope:

- Barcode Inbound setup selections now focus the barcode field once product, brand, origin, and location are complete.
- This covers quick buttons and dropdowns for product, brand, origin, and location.
- Existing inbound session locking, default location, barcode-rule learning, duplicate blocking, stock writes, RLS, and schema were not changed.

Prepared / source-guarded coverage added:

- `components/stock/workflow-forms.tsx` uses `selectInboundSetup` and `inboundPresetCanScan` to refocus the barcode input after complete setup.
- `scripts/stock-mobile-ux-coverage.mjs` guards the setup-to-scan focus path.

Latest check results:

- `node scripts\stock-mobile-ux-coverage.mjs` - passed.
- `node scripts\stock-owner-qa-doc-coverage.mjs` - passed.
- `npm.cmd run lint` - passed.
- `npm.cmd run typecheck` - passed.
- `npm.cmd run build` - passed.
- `npm.cmd run smoke` - passed.

Manual QA still required:

- Open `/stock/inbound` around 390px width.
- Choose product, brand, origin, and location with quick buttons or dropdowns.
- Confirm the barcode input is ready for scanner input as soon as setup is complete.

## 2026-06-25 Barcode Inbound Location-To-Scan Focus

Scope:

- Barcode Inbound now focuses the barcode field after workers choose an inbound location.
- This helps the normal setup path flow straight into scanning after product, brand, origin, and location are ready.
- Existing inbound session locking, default location, barcode-rule learning, duplicate blocking, stock writes, RLS, and schema were not changed.

Prepared / source-guarded coverage added:

- `components/stock/workflow-forms.tsx` uses `selectInboundSetup` to refocus the barcode input after setup is complete.
- `scripts/stock-mobile-ux-coverage.mjs` guards the location-to-scan focus path.

Latest check results:

- `node scripts\stock-mobile-ux-coverage.mjs` - passed.
- `node scripts\stock-owner-qa-doc-coverage.mjs` - passed.
- `npm.cmd run lint` - passed.
- `npm.cmd run typecheck` - passed.
- `npm.cmd run build` - passed.
- `npm.cmd run smoke` - passed.

Manual QA still required:

- Open `/stock/inbound` around 390px width.
- Choose product, brand, origin, then location.
- Confirm the barcode input is ready for scanner input without another tap.

## 2026-06-25 Stock Item Master Create-To-Inbound Shortcut

Scope:

- Stock Item Master now shows a success-only `Next: open inbound and scan stock.` card after creating an item.
- The card links to `/stock/inbound` so workers can continue into barcode stock capture.
- Existing item creation, generated item code, optional fields, role access, RLS, and schema were not changed.

Prepared / source-guarded coverage added:

- `components/stock/workflow-forms.tsx` renders the create-to-inbound shortcut.
- `scripts/stock-item-master-coverage.mjs` and `scripts/stock-mobile-ux-coverage.mjs` guard the shortcut.

Latest check results:

- `node scripts\stock-item-master-coverage.mjs` - passed.
- `node scripts\stock-mobile-ux-coverage.mjs` - passed.
- `node scripts\stock-owner-qa-doc-coverage.mjs` - passed.
- `npm.cmd run lint` - passed.
- `npm.cmd run typecheck` - passed.
- `npm.cmd run build` - passed.
- `npm.cmd run smoke` - passed.

Manual QA still required:

- Open `/stock/items` around 390px width.
- Create one item and confirm the success card links to `/stock/inbound`.
- Continue to inbound and choose/create brand/origin before scanning.

## 2026-06-25 Stock Outbound Blocked-Scan Recovery Wording

Scope:

- Stock Outbound missing, blocked, and wrong-destination scan messages now tell workers to remove the bad scan from the scanned list.
- The messages then point workers to scan the correct/next barcode or choose another destination.
- Existing outbound validation, status blocking, destination checks, stock writes, RLS, and schema were not changed.

Prepared / source-guarded coverage added:

- `components/stock/workflow-forms.tsx` renders the clearer recovery wording.
- `scripts/stock-mobile-ux-coverage.mjs` guards the messages.

Latest check results:

- `node scripts\stock-acceptance-coverage.mjs` - passed after updating the old wording guard.
- `node scripts\stock-mobile-ux-coverage.mjs` - passed.
- `node scripts\stock-owner-qa-doc-coverage.mjs` - passed.
- `npm.cmd run lint` - passed.
- `npm.cmd run typecheck` - passed.
- `npm.cmd run build` - passed.
- `npm.cmd run smoke` - failed on unrelated Retail guard: `Retail expense UX must stay simple: amount, category, cash default, required receipt, and home return`.

Manual QA still required:

- Open `/stock/outbound` around 390px width.
- Add a missing barcode, a blocked barcode, and a same-destination transfer barcode.
- Confirm each red message tells the worker what to remove and what to do next.

## 2026-06-25 Stock Outbound Continuous Scan Focus

Scope:

- Stock Outbound now returns focus to the barcode field after each accepted barcode is added to the batch.
- This supports manual fallback and external barcode scanners without another tap.
- Existing scan validation, duplicate blocking, missing/blocked barcode handling, outbound save actions, RLS, and schema were not changed.

Prepared / source-guarded coverage added:

- `components/stock/workflow-forms.tsx` refocuses `outboundBarcodeInputRef` after accepted scans.
- `scripts/stock-mobile-ux-coverage.mjs` guards the focus call.

Latest check results:

- `node scripts\stock-mobile-ux-coverage.mjs` - passed.
- `node scripts\stock-owner-qa-doc-coverage.mjs` - passed.
- `npm.cmd run lint` - passed.
- `npm.cmd run typecheck` - passed.
- `npm.cmd run build` - passed.
- `npm.cmd run smoke` - passed.

Manual QA still required:

- Open `/stock/outbound` around 390px width.
- Choose the needed direct outbound setup and add a barcode.
- Confirm the barcode field is ready for the next scan without another tap.

## 2026-06-25 Barcode Inbound Rule Scope Copy

Scope:

- Barcode Inbound save-rule setup now tells workers the rule is saved for the current product, brand, and origin.
- The same note says rule changes affect future scans only.
- Existing barcode-rule inference, save checkbox behavior, inbound save RPC, duplicate blocking, RLS, and schema were not changed.

Prepared / source-guarded coverage added:

- `components/stock/workflow-forms.tsx` renders the rule scope/future-scan note.
- `scripts/stock-mobile-ux-coverage.mjs` guards the note.

Latest check results:

- `node scripts\stock-mobile-ux-coverage.mjs` - passed.
- `node scripts\stock-owner-qa-doc-coverage.mjs` - passed.
- `npm.cmd run lint` - passed.
- `npm.cmd run typecheck` - passed.
- `npm.cmd run build` - passed.
- `npm.cmd run smoke` - passed.

Manual QA still required:

- Open `/stock/inbound` around 390px width.
- Choose an item + brand + origin with no saved rule and open `Set barcode rule once`.
- Confirm workers can see that the saved rule applies to product + brand + origin and future scans only.

## 2026-06-25 Stock Outbound Confirm Button Batch Summary

Scope:

- Stock Outbound final confirm button now shows scanned count and known kg after barcodes are added.
- This helps workers verify the direct outbound batch before submitting.
- Existing outbound validation, customer/destination/photo/supplier prerequisites, scan blocking, stock writes, RLS, and schema were not changed.

Prepared / source-guarded coverage added:

- `components/stock/workflow-forms.tsx` renders the scanned count / kg confirm text.
- `scripts/stock-mobile-ux-coverage.mjs` guards the outbound confirm button summary.

Latest check results:

- `node scripts\stock-mobile-ux-coverage.mjs` - passed.
- `node scripts\stock-owner-qa-doc-coverage.mjs` - passed.
- `npm.cmd run lint` - passed.
- `npm.cmd run typecheck` - passed.
- `npm.cmd run build` - passed.
- `npm.cmd run smoke` - passed.

Manual QA still required:

- Open `/stock/outbound` around 390px width.
- Choose direct outbound setup, scan at least two barcodes, and confirm the final button shows scanned count and known kg.
- Submit a valid batch and confirm the existing server-side validation still controls the save.

## 2026-06-25 Stock Label Phone Print Sheet Guidance

Scope:

- Stock label print/reprint guidance now says both label buttons open the phone print sheet.
- This keeps the MVP honest: workers choose the Bluetooth label printer from the print sheet, or use PDF fallback there.
- Existing label generation, Code 128 rendering, 50mm x 30mm print CSS, stock writes, RLS, and schema were not changed.

Prepared / source-guarded coverage added:

- `components/stock/stock-label.tsx` renders `Both buttons open the phone print sheet.`
- `scripts/stock-label-coverage.mjs` and `scripts/stock-mobile-ux-coverage.mjs` guard the print-sheet guidance.

Latest check results:

- `node scripts\stock-label-coverage.mjs` - passed.
- `node scripts\stock-mobile-ux-coverage.mjs` - passed.
- `node scripts\stock-owner-qa-doc-coverage.mjs` - passed.
- `npm.cmd run lint` - passed.
- `npm.cmd run typecheck` - passed.
- `npm.cmd run build` - passed.
- `npm.cmd run smoke` - passed.

Manual QA still required:

- Open `/stock/inbound` after generating a label or `/stock/units/[id]` around 390px width.
- Confirm the green print guidance says both buttons open the phone print sheet.
- Test Bluetooth printer selection where supported, then save a PDF fallback.

## 2026-06-25 Barcode Inbound Finish Summary Next Step

Scope:

- Barcode Inbound session summary now tells workers the immediate next action after finishing: print labels, attach them to product, then move stock.
- Existing session totals, correction warning, label print actions, undo lockout after finish, stock writes, RLS, and schema were not changed.

Prepared / source-guarded coverage added:

- `components/stock/workflow-forms.tsx` renders the finish-summary next-step card.
- `scripts/stock-mobile-ux-coverage.mjs` guards the summary next-step text.

Latest check results:

- `node scripts\stock-mobile-ux-coverage.mjs` - passed.
- `node scripts\stock-owner-qa-doc-coverage.mjs` - passed.
- `npm.cmd run lint` - passed.
- `npm.cmd run typecheck` - passed.
- `npm.cmd run build` - passed.
- `npm.cmd run smoke` - passed.

Manual QA still required:

- Open `/stock/inbound` around 390px width.
- Save at least one inbound scan and tap `Finish Inbound Session`.
- Confirm the summary shows totals plus the next-step label/stock movement instruction.

## 2026-06-25 Barcode Inbound First-Scan Learning Guidance

Scope:

- Barcode Inbound now shows a first-scan learning card when item + brand + origin are selected but no saved barcode rule exists.
- The card tells workers to scan one supplier barcode, enter actual kg once, and save so next scans auto-fill weight.
- Existing barcode decode, duplicate blocking, weight-rule saving, stock-unit creation, movement logging, scan logging, RLS, and schema were not changed.

Prepared / source-guarded coverage added:

- `components/stock/workflow-forms.tsx` renders `First barcode teaches this product + manufacturer + origin`.
- `scripts/stock-mobile-ux-coverage.mjs` guards the first-scan learning instructions.

Latest check results:

- `node scripts\stock-mobile-ux-coverage.mjs` - passed.
- `node scripts\stock-owner-qa-doc-coverage.mjs` - passed.
- `npm.cmd run lint` - passed.
- `npm.cmd run typecheck` - passed.
- `npm.cmd run build` - first two attempts saw another Next build process running; passed after retry.
- `npm.cmd run smoke` - passed.

Manual QA still required:

- Open `/stock/inbound` around 390px width.
- Choose an item + brand + origin with no saved barcode rule.
- Confirm the first-scan card is visible and clear before scanning.
- Scan one supplier barcode, enter actual kg once, and confirm the next scans use the learned rule.

## 2026-06-25 Stock Item Master Product-Name Focus

Scope:

- Stock Item Master focuses Product name after a successful item create so workers can enter the next product faster.
- Stock Item Master focuses edit Product name after a worker selects an item from quick item buttons or the full item list.
- Existing item-code generation, duplicate item-code validation, item master role access, optional fields, advanced settings, RLS, and schema were not changed.

Prepared / source-guarded coverage added:

- `components/stock/workflow-forms.tsx` uses `createNameInputRef`, `editNameInputRef`, and `selectEditItem`.
- `scripts/stock-item-master-coverage.mjs` guards the Item Master product-name focus path.

Latest check results:

- `node scripts\stock-item-master-coverage.mjs` - passed.
- `node scripts\stock-owner-qa-doc-coverage.mjs` - passed.
- `npm.cmd run lint` - passed.
- `npm.cmd run typecheck` - passed.
- `npm.cmd run build` - first attempt saw another Next build process running; passed after waiting.
- `npm.cmd run smoke` - passed.

Manual QA still required:

- Open `/stock/items` around 390px width.
- Create one item and confirm Product name is ready for the next item without another tap.
- Select an item to edit and confirm edit Product name is ready without another tap.

## 2026-06-25 Stock Take Session-To-Scan Focus

Scope:

- Stock Take now focuses barcode entry after active session selection.
- Stock Take clears the scanned barcode and refocuses barcode entry after a successful scan.
- Existing barcode-only counting, wrong item/brand blocking, unknown-barcode exception creation, manager/director approval flow, stock-take adjustment timing, RLS, and schema were not changed.

Prepared / source-guarded coverage added:

- `components/stock/workflow-forms.tsx` uses `selectStockTakeScanSession` and passes `stockTakeBarcodeInputRef` into the shared barcode field.
- `scripts/stock-mobile-ux-coverage.mjs` guards the Stock Take session-to-scan path.

Latest check results:

- `node scripts\stock-mobile-ux-coverage.mjs` - passed.
- `node scripts\stock-owner-qa-doc-coverage.mjs` - passed.
- `npm.cmd run lint` - passed.
- `npm.cmd run typecheck` - passed.
- `npm.cmd run build` - passed.
- `npm.cmd run smoke` - passed.

Manual QA still required:

- Open `/stock/stock-take` around 390px width.
- Tap an active session and confirm barcode entry is ready for scanner input.
- Scan one stock-take barcode and confirm the next scan can start without another tap.

## 2026-06-25 Stock Return Supplier Supplier-To-Scan Focus

Scope:

- Stock Outbound Direct Return Supplier focuses barcode entry after supplier selection.
- Dedicated Return Supplier workbench focuses barcode entry after supplier selection.
- After a successful supplier-return request, the barcode field is focused for the next scan.
- Existing supplier requirement, hold-before-approval behavior, manager approval deduction, stock movement history, scan logging, RLS, and schema were not changed.

Prepared / source-guarded coverage added:

- `components/stock/workflow-forms.tsx` uses supplier setup helpers for direct outbound return-supplier and the dedicated return-supplier workbench.
- `scripts/stock-mobile-ux-coverage.mjs` guards the supplier setup-to-scan path.

Latest check results:

- `node scripts\stock-mobile-ux-coverage.mjs` - passed.
- `node scripts\stock-owner-qa-doc-coverage.mjs` - passed.
- `npm.cmd run lint` - passed.
- `npm.cmd run typecheck` - passed.
- `npm.cmd run build` - passed.
- `npm.cmd run smoke` - passed.

Manual QA still required:

- Open `/stock/outbound` around 390px width, choose Return Supplier, select or type a supplier, and confirm barcode entry is ready.
- Open `/stock/return` around 390px width, select or type a supplier in the Return Supplier task, and confirm barcode entry is ready.
- Save one supplier-return request and confirm the next barcode can be scanned without another tap.

## 2026-06-25 Stock Damage Photo-To-Scan Focus

Scope:

- Stock Outbound Direct Damage/Spoilage focuses barcode entry after the damage photo is selected.
- Stock Damage/Spoilage workbench focuses barcode entry after the damage photo is selected.
- Changing the damage reason focuses barcode entry when a photo is already present.
- After a successful damage request, the barcode field is focused for the next scan.
- Existing photo requirement, damage approval flow, no-immediate-deduction rule, stock movement history, scan logging, RLS, and schema were not changed.

Prepared / source-guarded coverage added:

- `components/stock/workflow-forms.tsx` uses damage setup helpers for direct outbound damage and the dedicated damage workbench.
- `scripts/stock-mobile-ux-coverage.mjs` guards the damage setup-to-scan path.

Latest check results:

- `node scripts\stock-mobile-ux-coverage.mjs` - passed.
- `node scripts\stock-owner-qa-doc-coverage.mjs` - passed.
- `npm.cmd run lint` - passed.
- `npm.cmd run typecheck` - passed.
- `npm.cmd run build` - first attempt saw another Next build process running; passed after waiting.
- `npm.cmd run smoke` - passed.

Manual QA still required:

- Open `/stock/outbound` around 390px width, choose Damage/Spoilage, add a photo, and confirm barcode entry is ready.
- Open `/stock/return` around 390px width, add a damage photo, and confirm barcode entry is ready.
- Change damage reason after photo selection and confirm scanning remains the next action.
- Save one damage request and confirm the next barcode can be scanned without another tap.

## 2026-06-25 Stock Return Setup-To-Scan Focus

Scope:

- Stock Return now focuses the barcode field after selecting a return location.
- Stock Return now focuses the barcode field after selecting a return condition.
- After a successful return save, the barcode field is focused for the next scan.
- Existing return condition recording, return RPC, barcode status validation, stock movement history, scan logging, RLS, and schema were not changed.

Prepared / source-guarded coverage added:

- `components/stock/workflow-forms.tsx` uses return setup helpers and passes `returnBarcodeInputRef` into the shared barcode field.
- `scripts/stock-mobile-ux-coverage.mjs` guards the return setup-to-scan path.

Latest check results:

- `node scripts\stock-mobile-ux-coverage.mjs` - passed.
- `node scripts\stock-owner-qa-doc-coverage.mjs` - passed.
- `npm.cmd run lint` - passed.
- `npm.cmd run typecheck` - passed.
- `npm.cmd run build` - passed.
- `npm.cmd run smoke` - passed.

Manual QA still required:

- Open `/stock/return` around 390px width.
- Tap a return condition and confirm the barcode field is ready for scanner input.
- Change return location and confirm the barcode field is ready for scanner input.
- Save one return and confirm the next scan can start without another tap.

## 2026-06-25 Stock Transfer Destination-To-Scan Focus

Scope:

- Stock Outbound Direct Transfer now focuses the barcode field after selecting a destination stock location.
- Dedicated Stock Transfer now focuses the barcode field after selecting a destination stock location.
- Destination selection clears the previous local scan blocker message.
- Existing transfer destination requirement, same-destination block, transfer outbound movement, receive-transfer logic, server actions, RLS, and schema were not changed.

Prepared / source-guarded coverage added:

- `components/stock/workflow-forms.tsx` uses destination-selection helpers for direct outbound transfer and dedicated transfer.
- `scripts/stock-mobile-ux-coverage.mjs` guards both barcode-input focus paths.

Latest check results:

- `node scripts\stock-mobile-ux-coverage.mjs` - passed.
- `node scripts\stock-owner-qa-doc-coverage.mjs` - passed.
- `npm.cmd run lint` - passed.
- `npm.cmd run typecheck` - passed.
- `npm.cmd run build` - passed.
- `npm.cmd run smoke` - passed.

Manual QA still required:

- Open `/stock/outbound` around 390px width.
- Choose Transfer, select a destination, and confirm the barcode field is ready for scanner input.
- Open `/stock/transfer` around 390px width.
- Select a destination and confirm the barcode field is ready for scanner input.

## 2026-06-25 Stock Direct Sales Customer-To-Scan Focus

Scope:

- Stock Outbound Direct Sales now focuses the barcode field after selecting a customer from quick customer buttons or the full customer list.
- Customer selection clears the previous local scan blocker message.
- Existing direct Sales customer requirement, outbound scan blocking, batch confirmation, server actions, RLS, and schema were not changed.

Prepared / source-guarded coverage added:

- `components/stock/workflow-forms.tsx` uses `selectOutboundCustomer` for quick buttons and full customer list selection.
- `scripts/stock-mobile-ux-coverage.mjs` guards the barcode-input focus path.

Latest check results:

- `node scripts\stock-mobile-ux-coverage.mjs` - passed.
- `node scripts\stock-owner-qa-doc-coverage.mjs` - passed.
- `npm.cmd run lint` - passed.
- `npm.cmd run typecheck` - passed.
- `npm.cmd run build` - passed.
- `npm.cmd run smoke` - passed.

Manual QA still required:

- Open `/stock/outbound` around 390px width.
- Choose Sales.
- Tap a quick customer and confirm the barcode field is ready for scanner input.
- Repeat using `Full customer list`.

## 2026-06-25 Barcode Inbound Internal-Label Weight Button

Scope:

- Barcode Inbound now has one `Generate internal label` button beside `Net weight kg`; the earlier no-weight fallback opens Inbound without Barcode first.
- Repeated internal-label inbound can enter a weight, save the generated label immediately, print/attach it, and return to the same weight field for the next unit.
- Existing generated barcode format, duplicate checks, label printing, server actions, RLS, and schema were not changed.

Prepared / source-guarded coverage added:

- `components/stock/workflow-forms.tsx` renders the weight-field internal-label action.
- `scripts/stock-mobile-ux-coverage.mjs` guards `data-stock-action="generate-internal-label-from-weight"`.

Latest check results:

- `node scripts\stock-mobile-ux-coverage.mjs` - passed.
- `node scripts\stock-owner-qa-doc-coverage.mjs` - passed.
- `npm.cmd run lint` - passed.
- `npm.cmd run typecheck` - passed.
- `npm.cmd run build` - passed.
- `npm.cmd run smoke` - passed.

Manual QA still required:

- Open `/stock/inbound` around 390px width.
- Select item, brand, origin, and location.
- Enter a weight beside `Net weight kg`, tap the nearby internal-label button, and confirm the label saves.
- Generate a second label and confirm focus returns to the weight field for the next entry.

## 2026-06-25 Barcode Inbound Template Next-Action Wording

Scope:

- Saved-rule recent inbound templates now say `Tap to scan`.
- No-rule recent inbound templates now say `Tap to learn rule`.
- Selecting a saved-rule template shows `Ready. Scan next barcode.`
- Selecting a no-rule template shows `Scan barcode, enter kg once.`
- Existing template loading, barcode-field focus, barcode decode, rule learning, duplicate blocking, server actions, RLS, and schema were not changed.

Prepared / source-guarded coverage added:

- `components/stock/workflow-forms.tsx` renders the shorter template button and selection messages.
- `scripts/stock-mobile-ux-coverage.mjs` guards the worker-facing messages.

Latest check results:

- `node scripts\stock-mobile-ux-coverage.mjs` - passed.
- `npm.cmd run lint` - passed.
- `npm.cmd run typecheck` - passed.
- `npm.cmd run build` - passed.
- `npm.cmd run smoke` - passed.

Manual QA still required:

- Open `/stock/inbound` around 390px width.
- Tap a saved-rule recent template and confirm the message says `Ready. Scan next barcode.`
- Tap a no-rule recent template and confirm the message says `Scan barcode, enter kg once.`

## 2026-06-25 Barcode Inbound Weight-Field Guidance

Scope:

- Barcode Inbound now explains beside `Net weight kg` when saved rules will auto-fill the weight after scan.
- First-time supplier barcode sessions now tell workers to scan, then enter actual kg once to learn the rule.
- Existing barcode decode, weight-rule save, internal-label generation, duplicate blocking, server actions, RLS, and schema were not changed.

Prepared / source-guarded coverage added:

- `components/stock/workflow-forms.tsx` renders the saved-rule and first-time-rule helper copy beside `Net weight kg`.
- `scripts/stock-mobile-ux-coverage.mjs` guards both helper messages.

Latest check results:

- `node scripts\stock-mobile-ux-coverage.mjs` - passed.
- `npm.cmd run lint` - passed.
- `npm.cmd run typecheck` - passed.
- `npm.cmd run build` - first attempt saw another Next build process running; passed after waiting for it to finish.
- `npm.cmd run smoke` - passed.

Manual QA still required:

- Open `/stock/inbound` around 390px width.
- Select an item + brand + origin with a saved barcode rule and confirm `Net weight kg` says it auto-fills after scan.
- Select an item + brand + origin without a saved rule and confirm the helper says to scan supplier barcode, then enter actual kg once to learn the rule.

## 2026-06-25 Item Master Edit Quick Item Buttons

Scope:

- Stock Item Master edit shows quick item buttons from search results.
- The full edit-item dropdown is under `Full item list` and opens automatically when search has no matches.
- Existing item update action, validation, RLS, item-code uniqueness, active flag behavior, and schema were not changed.

Prepared / source-guarded coverage added:

- `components/stock/workflow-forms.tsx` renders quick buttons from `filteredEditItems.slice(0, 6)`.
- `scripts/stock-item-master-coverage.mjs` guards `Full item list`.

Latest check results:

- `node scripts\stock-item-master-coverage.mjs` - passed.
- `node scripts\stock-mobile-ux-coverage.mjs` - passed.
- `npm.cmd run lint` - passed.
- `npm.cmd run typecheck` - passed.
- `npm.cmd run build` - passed.
- `npm.cmd run smoke` - passed.

Manual QA still required:

- Open `/stock/items` around 390px width.
- Search an item and tap a quick item button.
- Search a missing item and confirm `Full item list` opens.

## 2026-06-25 Item Master Edit Optional Details

Scope:

- Stock Item Master edit shows item code, category, and product name first after selecting an item.
- Default brand, product section, alternate names, and low-stock kg are under `Optional item details`.
- Active and barcode-required remain under `Advanced item settings`.
- Existing item update action, validation, RLS, item-code uniqueness, active flag behavior, and schema were not changed.

Prepared / source-guarded coverage added:

- `components/stock/workflow-forms.tsx` keeps edit optional fields inside `Optional item details`.
- `scripts/stock-item-master-coverage.mjs` guards edit item mobile fields.

Latest check results:

- `node scripts\stock-item-master-coverage.mjs` - passed.
- `node scripts\stock-mobile-ux-coverage.mjs` - passed.
- `npm.cmd run lint` - passed.
- `npm.cmd run typecheck` - failed on unrelated Processing/Retail import: `RetailProcessingReviewForm` is not exported from `@/components/retail/retail-forms`.
- `npm.cmd run build` - passed with the same unrelated Processing/Retail import warning.
- `npm.cmd run smoke` - passed.

Manual QA still required:

- Open `/stock/items` around 390px width.
- Select an existing item.
- Confirm only item code, category, and product name are visible before opening optional details.

## 2026-06-25 Direct Sales Customer Fallback Tucked Away

Scope:

- Stock Outbound direct Sales keeps search and quick customer buttons first.
- The dense full customer dropdown is under `Full customer list` and opens automatically when search has no matches.
- Existing direct Sales customer requirement, server validation, outbound action, RLS, movement history, and schema were not changed.

Prepared / source-guarded coverage added:

- `components/stock/workflow-forms.tsx` renders the full dropdown under `Full customer list`.
- `scripts/stock-mobile-ux-coverage.mjs` guards the fallback copy.

Latest check results:

- `node scripts\stock-mobile-ux-coverage.mjs` - passed.
- `npm.cmd run lint` - passed.
- `npm.cmd run typecheck` - passed.
- `npm.cmd run build` - passed.
- `npm.cmd run smoke` - passed.

Manual QA still required:

- Open `/stock/outbound` around 390px width.
- Choose Sales and confirm customer search plus quick buttons are the main path.
- Search a missing customer and confirm `Full customer list` opens.

## 2026-06-25 Transfer Out Source Hidden From Destination Picker

Scope:

- Transfer Out removes the worker's assigned source stock location from destination buttons/dropdown.
- Existing same-location transfer blocking remains as a safety net.
- Receive Transfer destination choices are unchanged.
- Existing transfer action, receive action, RLS, movement history, and schema were not changed.

Prepared / source-guarded coverage added:

- `components/stock/workflow-forms.tsx` passes `excludeLocationId` for Transfer Out.
- `scripts/stock-mobile-ux-coverage.mjs` guards the assigned-source exclusion.

Latest check results:

- `node scripts\stock-mobile-ux-coverage.mjs` - passed.
- `npm.cmd run lint` - passed.
- `npm.cmd run typecheck` - passed.
- `npm.cmd run build` - first attempt saw another Next build process running; passed after waiting for the active build to finish.
- `npm.cmd run smoke` - passed.

Manual QA still required:

- Open `/stock/transfer` around 390px width.
- Confirm `Sending from assigned location` appears.
- Confirm that same assigned location is not available in destination buttons/dropdown.

## 2026-06-25 Receive Transfer Idle Warning Cleanup

Scope:

- Receive Transfer no longer shows a red wrong-location warning before a worker enters a wrong-location pending-transfer barcode.
- The red destination-specific warning still appears for a known pending-transfer barcode whose destination is another receiving location.
- Existing server-side wrong-location blocking, scan-issue logging, receive action, RLS, and schema were not changed.

Prepared / source-guarded coverage added:

- `components/stock/workflow-forms.tsx` renders the wrong-location warning only when `wrongReceiveDestinationName` exists.
- `scripts/stock-mobile-ux-coverage.mjs` guards the destination-specific warning text.

Latest check results:

- `node scripts\stock-mobile-ux-coverage.mjs` - passed.
- `npm.cmd run lint` - passed.
- `npm.cmd run typecheck` - passed.
- `npm.cmd run build` - first two attempts saw another Next build process running; passed after waiting for the active build to finish.
- `npm.cmd run smoke` - passed.

Manual QA still required:

- Open `/stock/receive-transfer` around 390px width and confirm no red wrong-location warning appears before scanning.
- Enter a pending-transfer barcode for another receiving location and confirm the red destination-specific warning appears.

## 2026-06-25 Receive Transfer Wrong-Location Destination Copy

Scope:

- Receive Transfer names the required destination when a known pending-transfer barcode is entered at the wrong receiving location.
- Existing server-side wrong-location blocking, scan-issue logging, receive action, RLS, and schema were not changed.

Prepared / source-guarded coverage added:

- `components/stock/workflow-forms.tsx` uses `wrongReceiveDestinationName`.
- `scripts/stock-mobile-ux-coverage.mjs` guards `Wrong location. This barcode must be received at`.

Latest check results:

- `node scripts\stock-mobile-ux-coverage.mjs` - passed.
- `npm.cmd run lint` - passed.
- `npm.cmd run typecheck` - passed.
- `npm.cmd run build` - first attempt saw another Next build process running; passed on retry.
- `node scripts\smoke-routes.mjs` and `npm.cmd run smoke` are currently blocked by unrelated Orders/Retail smoke guards before Stock checks.

Manual QA still required:

- Open `/stock/receive-transfer` around 390px width.
- Choose a receiving location.
- Enter a known pending-transfer barcode whose destination is another location.
- Confirm the red message names the destination and the receive remains blocked.

## 2026-06-25 Barcode Inbound First-Time Rule Setup

Scope:

- Barcode Inbound opens `Set barcode rule once` when product, brand, and origin are selected but no saved barcode rule exists.
- Saved-rule sessions keep the rule panel collapsed so repeat inbound stays scan-first.
- Existing barcode decode, duplicate blocking, internal-label fallback, server actions, RLS, and schema were not changed.

Prepared / source-guarded coverage added:

- `components/stock/workflow-forms.tsx` uses `shouldOpenWeightRulePanel`.
- `scripts/stock-mobile-ux-coverage.mjs` guards `Set barcode rule once`.

Latest check results:

- `node scripts\stock-mobile-ux-coverage.mjs` - passed.
- `node scripts\smoke-routes.mjs` - passed.
- `npm.cmd run smoke` - passed.
- `npm.cmd run lint` - passed.
- `npm.cmd run typecheck` - passed.
- `npm.cmd run build` - passed.

Manual QA still required:

- Open `/stock/inbound` around 390px width.
- Choose item + brand + origin with no saved barcode rule and confirm the rule panel is already open.
- Choose a saved-rule template and confirm scanning remains the first visible action.

## 2026-06-25 Stock Return Default Location Focus

Scope:

- Stock Return now shows the selected `Returning to` location card first.
- Location changes remain available under `Change return location`.
- The primary worker path is now condition buttons plus barcode scan.
- Existing return save action, editable location, return-condition values, inspection warning, RLS, and return RPC behavior were not changed.

Prepared / source-guarded coverage added:

- `components/stock/workflow-forms.tsx` uses the new default-location-first return copy.
- `scripts/stock-mobile-ux-coverage.mjs` guards `Default location is selected. Choose condition, scan barcode, done.` and `Change return location`.

Latest check results:

- `node scripts\stock-mobile-ux-coverage.mjs` - passed.
- `node scripts\stock-acceptance-coverage.mjs` - passed.
- `node scripts\smoke-routes.mjs` - passed.
- `npm.cmd run smoke` - passed.
- `npm.cmd run lint` - passed.
- `npm.cmd run typecheck` - passed.
- `npm.cmd run build` - first attempt saw another Next build process running; passed on retry.

Manual QA still required:

- Open `/stock/return` around 390px width.
- Confirm `Returning to` appears before the condition and scanner controls.
- Open `Change return location` and confirm the worker can still choose a different return location.

## 2026-06-25 Item Master Advanced Edit Settings

Scope:

- Stock Item Master edit keeps active status and barcode-required toggles under `Advanced item settings`.
- Workers still intentionally select an item before any edit fields appear.
- Existing item create/update actions, role checks, RLS, item-code validation, active flag behavior, and schema were not changed.

Prepared / source-guarded coverage added:

- `components/stock/workflow-forms.tsx` wraps the edit toggles in `Advanced item settings`.
- `scripts/stock-item-master-coverage.mjs` guards the advanced settings disclosure.

Latest check results:

- `node scripts\stock-item-master-coverage.mjs` - passed.
- `node scripts\stock-mobile-ux-coverage.mjs` - passed.
- `node scripts\smoke-routes.mjs` - passed.
- `npm.cmd run smoke` - passed.
- `npm.cmd run lint` - passed.
- `npm.cmd run typecheck` - passed.
- `npm.cmd run build` - first attempt saw another Next build process running; passed on retry.

Manual QA still required:

- Open `/stock/items` around 390px width.
- Select a product for editing.
- Confirm normal product fields appear first and active/barcode-required toggles are under `Advanced item settings`.

## 2026-06-25 Item Master Phone Keyboard Hints

Scope:

- Stock Item Master create/edit fields now avoid browser autofill and request phone-friendly keyboard behavior.
- Generated item code and edit item code request numeric entry.
- Product/section/alternate-name fields use a `Done` keyboard action, and low-stock kg fields request decimal entry.
- Existing item create/update actions, role checks, RLS, item-code validation, and schema were not changed.

Prepared / source-guarded coverage added:

- `components/stock/workflow-forms.tsx` adds phone keyboard hints to Item Master create/edit inputs.
- `scripts/stock-item-master-coverage.mjs` guards the Item Master mobile keyboard controls.

Latest check results:

- `node scripts\stock-item-master-coverage.mjs` - passed.
- `npm.cmd run lint` - passed.
- `npm.cmd run typecheck` - passed.
- `npm.cmd run smoke` - passed.
- `npm.cmd run build` - first attempt failed because another Next build process was already running; passed on retry after the worker cleared.

Manual QA still required:

- Open `/stock/items` on a phone-width viewport.
- Create one item and confirm item code uses numeric keyboard, product name uses a normal keyboard with `Done`, and browser autofill suggestions do not cover the form.
- Edit one item and confirm item code, product name, optional names, and low-stock kg fields use the expected phone keyboard.

## 2026-06-25 Item Master Edit Search

Scope:

- Stock Item Master edit now has an item-code/product search before the edit dropdown.
- The edit form still starts with no selected item and still hides update fields/toggles until a product is selected.
- Existing item create/update actions, role checks, RLS, item-code validation, and schema were not changed.

Prepared / source-guarded coverage added:

- `components/stock/workflow-forms.tsx` filters edit dropdown options through `filteredEditItems`.
- `scripts/stock-item-master-coverage.mjs` guards the search input and no-match message.

Latest check results:

- `node scripts\stock-item-master-coverage.mjs` - passed.
- `npm.cmd run lint` - passed.
- `npm.cmd run typecheck` - passed.
- `npm.cmd run build` - passed.
- `npm.cmd run smoke` - failed before Stock checks on unrelated Order coverage: `/orders detail route missing end marker: } : route === "detail" ?`.

Manual QA still required:

- Open `/stock/items`, search by item code or product name, and confirm the edit dropdown only shows matching products.
- Search a non-existing item and confirm the no-match message appears.

## 2026-06-25 Item Master Intentional Edit Selection

Scope:

- Stock Item Master edit now starts with no selected item.
- Update fields appear only after the worker intentionally selects a product, and active/barcode-required toggles stay under `Advanced item settings`.
- Existing item create/update actions, role checks, RLS, item-code validation, and schema were not changed.

Prepared / source-guarded coverage added:

- `components/stock/workflow-forms.tsx` initializes `selectedItemId` as blank.
- `scripts/stock-item-master-coverage.mjs` guards that the edit form does not auto-select `items[0]`.

Latest check results:

- `node scripts\stock-item-master-coverage.mjs` - passed.
- `npm.cmd run lint` - passed.
- `npm.cmd run typecheck` - passed.
- `npm.cmd run build` - passed.
- `npm.cmd run smoke` - passed.

Manual QA still required:

- Open `/stock/items` and confirm Edit item starts with `Select item`.
- Confirm active/barcode-required toggles are under `Advanced item settings` after selecting a product.

## 2026-06-25 Internal Label Repeat Weight Focus

Scope:

- Barcode Inbound now returns focus to the `Net weight kg` field after an internal-label save.
- Supplier barcode saves still return focus to the barcode field for continuous scanning.
- Existing generated-label save, barcode-rule learning, duplicate blocking, inbound RPC, RLS, and schema were not changed.

Prepared / source-guarded coverage added:

- `components/stock/workflow-forms.tsx` tracks internal-label submits with `pendingInternalLabelRef`.
- Internal-label success selects `netWeightInputRef`; normal barcode success still focuses `barcodeInputRef`.
- `scripts/stock-mobile-ux-coverage.mjs` guards the internal-label focus path.

Latest check results:

- `node scripts\stock-mobile-ux-coverage.mjs` - passed.
- `npm.cmd run lint` - passed.
- `npm.cmd run typecheck` - passed.
- `npm.cmd run build` - passed.
- `npm.cmd run smoke` - passed.

Manual QA still required:

- On `/stock/inbound`, choose item + brand + origin + location, enter kg, generate an internal label, and confirm the next active field is `Net weight kg`.
- Confirm normal supplier barcode saves still return focus to the barcode field.

## 2026-06-25 External Scanner Enter Handling

Scope:

- Shared Stock barcode fields now treat Enter in the manual barcode input as a scan.
- This supports USB/Bluetooth barcode scanners that type the barcode and send Enter.
- Existing camera scanner, duplicate blocking, online-only guard, server validation, and workflow actions were not changed.

Prepared / source-guarded coverage added:

- `components/stock/barcode-scanner.tsx` routes Enter through `handleDetected(value)`.
- `scripts/stock-scanner-coverage.mjs` guards the shared Enter-to-scan wiring.

Latest check results:

- `node scripts\stock-scanner-coverage.mjs` - passed.
- `npm.cmd run lint` - passed.
- `npm.cmd run typecheck` - passed.
- `npm.cmd run build` - passed.
- `npm.cmd run smoke` - passed.

Manual QA still required:

- Focus any Stock barcode field, scan with an external USB/Bluetooth scanner that sends Enter, and confirm it behaves like a camera scan.
- Test at least `/stock/inbound`, `/stock/outbound`, `/stock/transfer`, `/stock/receive-transfer`, `/stock/return`, and `/stock/stock-take`.

## 2026-06-25 Inbound No-Rule Internal Label Guidance

Scope:

- Barcode Inbound now shows `No weight position found. Use internal label.` when a worker types actual kg but the supplier barcode cannot teach a usable weight-position rule.
- Existing generated-label save flow, duplicate blocking, barcode-rule saving, inbound RPC, and RLS were not changed.

Prepared / source-guarded coverage added:

- `components/stock/workflow-forms.tsx` sets the warning message from `handleNetWeightChange` when no inference is found after a positive weight is entered.
- `scripts/stock-mobile-ux-coverage.mjs` guards the worker-facing fallback message.

Latest check results:

- `node scripts\stock-mobile-ux-coverage.mjs` - passed.
- `npm.cmd run lint` - passed.
- `npm.cmd run typecheck` - passed.
- `npm.cmd run build` - passed.
- `npm.cmd run smoke` - passed.

Manual QA still required:

- On `/stock/inbound`, select item + brand + origin + location, scan a supplier barcode that has no decodable weight, enter actual kg, and confirm the fallback message points to internal label generation.
- Generate the internal label and confirm stock saves, then print/PDF the label and attach it before further movement.

## 2026-06-25 Stock Outbound Scan Prerequisite Guard

Scope:

- Direct Stock Outbound now enforces the same worker setup requirements inside the scan handler that the disabled scanner UI already showed.
- Camera/manual scans are rejected before adding a barcode if Damage/Spoilage has no photo, Return Supplier has no supplier, or Transfer has no destination. Direct Sales customer selection is optional.
- Existing outbound server actions, approval-only damage behavior, direct remarks, RLS, and database schema were not changed.

Prepared / source-guarded coverage added:

- `components/stock/workflow-forms.tsx` now checks `outboundScanBlocked && outboundScanBlockMessage` inside `addBarcode`.
- `scripts/stock-mobile-ux-coverage.mjs` guards that direct outbound scan prerequisites are enforced in the scan handler, not only through disabled inputs.

Latest check results:

- `node scripts\stock-mobile-ux-coverage.mjs` - passed.
- `node scripts\stock-acceptance-coverage.mjs` - passed.
- `npm.cmd run smoke` - failed before Stock checks on unrelated Retail coverage: `Retail focused page wrapper missing route="settings-prices"`.
- `npm.cmd run lint` - passed.
- `npm.cmd run typecheck` - passed.
- `npm.cmd run build` - passed.

Manual QA still required:

- On `/stock/outbound`, choose Sales and confirm scanning can start without selecting customer. Customer selection is optional for movement notes.
- Choose Damage/Spoilage and try scanning before adding a photo; confirm `Add damage photo first.` and no row is added.
- Choose Return Supplier and try scanning before supplier; confirm `Choose supplier first.` and no row is added.
- Choose Transfer and try scanning before destination; confirm `Choose destination stock location first.` and no row is added.

## 2026-06-25 Stock Inbound Rule Saving Default

Scope:

- When the selected item + brand + origin has no saved barcode rule, Stock Inbound now turns `Save weight rule for future scans` back on.
- This prevents an old browser-saved checkbox state from blocking first-scan barcode-rule learning.
- Saved-rule loading, barcode decoding, inbound RPC, duplicate blocking, and RLS behavior were not changed.

Prepared / source-guarded coverage added:

- `components/stock/workflow-forms.tsx` returns `{ ...preset, saveWeightRule: true }` when no matching rule exists.
- `scripts/stock-mobile-ux-coverage.mjs` guards the rule-saving default.

Latest check results:

- `node scripts\stock-mobile-ux-coverage.mjs` - passed.
- `npm.cmd run smoke` - passed.
- `npm.cmd run lint` - passed.
- `npm.cmd run typecheck` - passed.
- `npm.cmd run build` - passed.

Manual QA still required:

- Open `/stock/inbound`, select an item + brand + origin with no saved rule, and confirm `Save weight rule for future scans` is on under `Weight rule and notes`.
- Scan supplier barcode, enter actual kg once, save, then confirm the next same-format barcode auto-extracts weight.

## 2026-06-25 Stock Transfer Assigned Source Cue

Scope:

- Stock Transfer now shows the worker's assigned stock location as the source.
- Transfer scanning is blocked if the selected destination matches the assigned source location.
- Existing transfer RPC, barcode validation, scoped location access, and receive-transfer behavior were not changed.
- No migration or RLS change was added.

Prepared / source-guarded coverage added:

- `components/stock/workflow-forms.tsx` renders `Sending from assigned location: ...` and uses `destinationIsAssignedSource`.
- `components/stock/stock-page.tsx` passes the logged-in profile stock location into `TransferForm`.
- `scripts/stock-mobile-ux-coverage.mjs` guards the assigned-source cue and same-destination block copy.

Latest check results:

- `node scripts\stock-mobile-ux-coverage.mjs` - passed.
- `npm.cmd run smoke` - passed.
- `npm.cmd run lint` - passed.
- `npm.cmd run typecheck` - passed.
- `npm.cmd run build` - passed.

Manual QA still required:

- Open `/stock/transfer` as a scoped worker and confirm the assigned source location is shown.
- Choose the same location as destination and confirm scanning is blocked with `Choose a different destination.`
- Choose another destination and confirm scanning unlocks.

## 2026-06-25 Stock Direct Sales Customer Search

Scope:

- Added a customer name/phone search field to direct Sales outbound.
- Search filters the quick customer buttons so workers can tap a customer before scanning.
- The full customer dropdown remains available.
- No database schema, RLS, outbound RPC, barcode validation, or customer validation behavior changed.

Prepared / source-guarded coverage added:

- `components/stock/workflow-forms.tsx` filters direct Sales quick customer buttons through `filteredOutboundCustomers`.
- `scripts/stock-mobile-ux-coverage.mjs` guards the search field, filtered quick buttons, and no-match fallback copy.

Latest check results:

- `node scripts\stock-mobile-ux-coverage.mjs` - passed.
- `npm.cmd run smoke` - passed.
- `npm.cmd run lint` - passed.
- `npm.cmd run typecheck` - passed.
- `npm.cmd run build` - first two attempts hit an existing Next build lock; retry after waiting passed.

Manual QA still required:

- Open `/stock/outbound`, choose `Sales`, search by customer name or phone, tap the matching customer, and confirm scanning unlocks.
- Search a non-existing customer and confirm the fallback says `No customer match. Use the full list below.`

## 2026-06-25 Stock Item And Barcode Rule Setup Worker Simplification

Scope:

- Simplified the Stock Item Master create form for worker/mobile use.
- The visible required setup is now generated item code, category, and product name.
- Optional default brand, product section, Chinese/Iban names, low-stock level, and barcode-required toggle are under `Optional item details`.
- Added a Stock Inbound barcode rule status card after item + brand + origin are selected.
- The card shows `Saved barcode rule ready` when a saved item+brand+origin rule exists, or `No saved barcode rule yet` with one-scan setup guidance.
- Hid the manager-only inspection-release form from normal workers on `/stock/return`.
- Added large return-condition buttons on `/stock/return` and records the choice in the existing return notes path.
- No database schema, RLS, item-create action, item-update action, return RPC, or delete permission behavior changed.

Prepared / source-guarded coverage added:

- `components/stock/workflow-forms.tsx` keeps item creation required fields first and optional fields in a disclosure.
- `components/stock/workflow-forms.tsx` shows saved-rule or no-rule guidance before continuous inbound scanning.
- `components/stock/workflow-forms.tsx` shows return-condition buttons before return scanning.
- `lib/stock/actions.ts` includes the chosen return condition in existing return notes.
- `components/stock/stock-page.tsx` renders inspection release only for users with stock manager access.
- `scripts/stock-item-master-coverage.mjs` guards the generated-code, required setup, and optional details copy.
- `scripts/stock-mobile-ux-coverage.mjs` guards the inbound barcode-rule status guidance, return-condition buttons, and manager-only inspection-release visibility.
- `scripts/stock-acceptance-coverage.mjs` guards return-condition handoff through the existing return action.

Latest check results:

- `node scripts\stock-item-master-coverage.mjs` - passed.
- `node scripts\stock-mobile-ux-coverage.mjs` - passed.
- `npm.cmd run smoke` - passed.
- `npm.cmd run lint` - passed.
- `npm.cmd run typecheck` - passed.
- `npm.cmd run build` - first attempt hit an existing Next build lock; retry after a short wait passed.

Manual QA still required:

- Open `/stock/items` around 390px width.
- Confirm `Create item` shows only item code, category, and product name before optional details.
- Confirm the item code is generated automatically and can still be edited.
- Open `Optional item details` and confirm brand, section, alternate names, low-stock level, and barcode-required settings are still available.
- Open `/stock/inbound`, select item + brand + origin, and confirm either `Saved barcode rule ready` or `No saved barcode rule yet` appears before scanning.
- Open `/stock/return`, choose each return condition once, scan a test barcode, and confirm the movement/audit notes include the chosen condition.
- Open `/stock/return` as a normal worker and confirm the manager-only `Release inspected return` form is not shown.

## 2026-06-25 Stock Take Pending Exception Review

Scope:

- Added a `Pending stock take exceptions` card above stock-take review sessions.
- The card lists unresolved `UNKNOWN_BARCODE` and `WRONG_LOCATION` lines, barcode, session, location, and next step.
- Demo stock-take data now includes a pending wrong-location exception as well as a pending unknown-barcode exception.
- No migration, RLS, approval action, or stock adjustment behavior changed.

Prepared / source-guarded coverage added:

- `components/stock/workflow-forms.tsx` builds `pendingStockTakeExceptions` from unresolved exception lines.
- `scripts/stock-take-lock-coverage.mjs` and `scripts/stock-acceptance-coverage.mjs` guard the pending exception review card.

Latest check results:

- `node scripts\stock-take-lock-coverage.mjs` - passed.
- `node scripts\stock-acceptance-coverage.mjs` - passed.
- `npm.cmd run smoke` - passed.
- `npm.cmd run lint` - passed.
- `npm.cmd run typecheck` - passed.
- `npm.cmd run build` - first attempt hit an existing Next build lock; retry after a short wait passed.

Manual QA still required:

- Open `/stock/stock-take` as manager/admin/director with pending unknown-barcode and wrong-location exception lines.
- Confirm `Pending stock take exceptions` appears before `Review sessions`.
- Confirm each row shows exception type, barcode, session/location, and `Next: manager review, then director approval.`
- Confirm final adjustment/resolution still happens only after manager review and director approval.

## 2026-06-25 Stock Manager Scan Issue Review

Scope:

- Widened the Stock dashboard scan issue card from duplicate/decode-only to all failed barcode scan logs.
- The manager card now shows `Manager scan issue review` with duplicate barcode, wrong-location, unknown-barcode, unavailable-stock, and barcode-rule failure examples.
- The full Stock report now includes the failed barcode in `Barcode scan errors` rows.
- Demo data includes representative failed scan logs for wrong-location receive, unknown stock-take barcode, and unavailable stock.
- No migration was added.

Prepared / source-guarded coverage added:

- `lib/stock/data.ts` builds dashboard scan alerts from `failedScanLogs = scanLogs.filter((log) => !log.success)`.
- `components/stock/stock-page.tsx` links managers to `/stock/reports?q=Barcode%20scan%20errors`.
- `scripts/stock-report-coverage.mjs` and `scripts/stock-acceptance-coverage.mjs` guard the review card and report path.

Latest check results:

- `node scripts\stock-report-coverage.mjs` - passed.
- `node scripts\stock-acceptance-coverage.mjs` - passed.
- `npm.cmd run smoke` - passed.
- `npm.cmd run lint` - passed.
- `npm.cmd run typecheck` - passed.
- `npm.cmd run build` - passed.

Manual QA still required:

- Open `/stock/dashboard` as manager/admin/director and confirm `Manager scan issue review` appears when failed scan logs exist.
- Confirm duplicate, wrong-location, unknown-barcode, unavailable-stock, and barcode-rule failures are visible as short review rows.
- Tap `Open barcode scan error report` and confirm the report is filtered to barcode scan errors and includes the barcode.

## 2026-06-25 Stock Direct Sales Customer Selection

Scope:

- Updated `/stock/outbound` so Stock outbound remains direct-only while direct `Sales` requires customer selection before scanning.
- Added quick customer buttons and a customer dropdown to reduce typing while still linking Sales outbound to a customer.
- Kept customer-order picking in `/orders/picking`.
- Added server-side validation so direct `SALES` confirmation fails clearly without a customer.
- Stored the selected customer name in existing movement notes; no schema or RLS change was added.

Prepared / source-guarded coverage added:

- `components/stock/workflow-forms.tsx` blocks direct Sales scanning until a customer is selected.
- `components/stock/workflow-forms.tsx` also shows the customer prompt before the barcode prompt on the disabled confirm helper.
- `lib/stock/actions.ts` rejects direct Sales confirmation when no customer is provided.
- `scripts/stock-mobile-ux-coverage.mjs`, `scripts/stock-acceptance-coverage.mjs`, and `scripts/smoke-routes.mjs` guard the new direct Sales customer-selection copy and server helper.
- Owner/Vercel QA docs now ask testers to confirm Sales is blocked until a customer is selected.

Latest check results:

- `node scripts\stock-mobile-ux-coverage.mjs` - passed.
- `node scripts\stock-acceptance-coverage.mjs` - passed.
- `node scripts\smoke-routes.mjs` - passed.
- `npm.cmd run smoke` - passed.
- `npm.cmd run lint` - passed.
- `npm.cmd run typecheck` - passed.
- `npm.cmd run build` - passed.

Manual QA still required:

- On `/stock/outbound` around 390px width, select `Sales` and confirm the scanner/manual barcode entry and disabled confirm helper both tell the worker to choose a customer first.
- Choose a customer, scan multiple barcodes, confirm outbound, and verify the movement note includes the selected customer.
- Confirm a worker does not see finance/cost data during direct Sales outbound.
- Confirm RLS allows only scoped customers and stock units for the signed-in worker.

## 2026-06-25 Stock Inbound Saved-Rule Barcode Length Warning

Scope:

- Added a yellow worker warning when Stock Inbound scans a barcode whose length differs from the latest saved barcode length for the same item + brand + origin with an existing weight rule.
- The warning does not block the scan by itself.
- No database migration was added.

Prepared / source-guarded coverage added:

- `components/stock/workflow-forms.tsx` computes `expectedBarcodeLength` from the latest matching stock unit when a saved rule exists.
- `scripts/stock-mobile-ux-coverage.mjs` guards the warning copy and expected-length logic.

Latest check results:

- `node scripts\stock-mobile-ux-coverage.mjs` - passed.
- `npm.cmd run smoke` - passed.
- `npm.cmd run lint` - passed.
- `npm.cmd run typecheck` - passed after restoring an unrelated Delivery driver upcoming-order prop path.
- `npm.cmd run build` - passed.

Manual QA still required:

- Select a recent inbound template with a saved rule.
- Scan or type a same-scope barcode with a different length.
- Confirm the yellow message says `Barcode length changed.` and the worker can still continue if the weight decodes correctly.

## 2026-06-25 Stock Inbound Blocked-Scan Issue Logging

Scope:

- Added failed scan-log issue records for browser-blocked duplicate inbound scans.
- Added failed scan-log issue records for browser-blocked no-weight/barcode-rule failures.
- Reused `barcode_scan_logs`; no new issue table or migration was added.

Prepared / source-guarded coverage added:

- `lib/stock/actions.ts` exports `logInboundScanIssueAction`.
- `components/stock/workflow-forms.tsx` calls `logInboundScanIssue(value, message)` from duplicate and no-weight scan blocks.
- `scripts/stock-acceptance-coverage.mjs` and `scripts/stock-mobile-ux-coverage.mjs` guard the new path.

Latest check results:

- `node scripts\stock-mobile-ux-coverage.mjs` - passed.
- `node scripts\stock-acceptance-coverage.mjs` - passed.
- `npm.cmd run smoke` - passed.
- `npm.cmd run lint` - passed.
- `npm.cmd run typecheck` - passed.
- `npm.cmd run build` - passed.

Manual QA still required:

- In `/stock/inbound`, scan a duplicate barcode and confirm it is blocked.
- Scan a barcode with no decoded weight and confirm it is blocked with label guidance.
- As manager/admin, check barcode scan error/report surfaces and confirm both failures appear as failed scan logs.

## 2026-06-25 Stock Receive-Transfer Pending List

Scope:

- Added pending transfer barcode cards to `/stock/receive-transfer`.
- Pending cards are filtered to the selected receiving stock location through existing `transfer_to_location_id`.
- Tapping a pending barcode fills the receive barcode field; camera and external scanner input still work.
- No migration was added.

Prepared / source-guarded coverage added:

- `lib/stock/data.ts` maps `transfer_to_location_id` to `transferToLocationId`.
- `components/stock/workflow-forms.tsx` renders `Pending to this location` cards.
- `scripts/stock-acceptance-coverage.mjs` and `scripts/stock-mobile-ux-coverage.mjs` guard the new pending-list path.

Latest check results:

- `node scripts\stock-mobile-ux-coverage.mjs` - passed.
- `node scripts\stock-acceptance-coverage.mjs` - passed.
- `npm.cmd run smoke` - passed.
- `npm.cmd run lint` - passed.
- `npm.cmd run typecheck` - passed.
- `npm.cmd run build` - passed.

Manual QA still required:

- Open `/stock/receive-transfer` as a worker with a destination transfer pending to the assigned stock location.
- Confirm the assigned location is selected by default.
- Confirm pending barcode cards appear only for that receiving location.
- Tap a pending barcode and confirm it fills the receive barcode field.

## 2026-06-24 Stock Table Header And Cell Wrapping

Scope:

- Updated Stock table sort buttons so table headers use phone-size tap targets with wrapping labels and non-shrinking sort icons.
- Updated Stock table cells so long barcodes, locations, references, and item names wrap instead of being clipped in fallback tables.
- This is Stock UI only and does not change table data, sorting behavior, RLS, server actions, or stock movement behavior.

Prepared / source-guarded coverage added:

- `components/stock/data-table.tsx` now uses `min-h-11` sort buttons.
- `components/stock/data-table.tsx` now wraps table cell values instead of truncating them.
- `scripts/stock-mobile-ux-coverage.mjs` guards the Stock table sort button touch-target classes and wrapped cell classes.
- Owner/Vercel QA docs now ask testers to confirm table headers and long table values under the mobile cards are easier to use around 390px width.

Latest check results:

- `node scripts\stock-mobile-ux-coverage.mjs` - passed.
- `node scripts\stock-owner-qa-doc-coverage.mjs` - passed.
- `npm.cmd run smoke` - passed.
- `npm.cmd run lint` - passed.
- `npm.cmd run typecheck` - passed.
- `npm.cmd run build` - passed.
- Local `/stock` route preview check - HTTP 200.
- 390px automated browser visual QA - blocked by sandbox browser startup error; prepared manual owner QA remains required.

Manual QA still required:

- On Stock pages with tables around 390px width, scroll under the mobile cards and confirm table sort headers are easier to tap and long table values wrap instead of being clipped.
- On Vercel or local app, resize to 390px and verify Stock home, inbound, outbound, transfer, receive-transfer, return/damage, stock take, label generation, and label reprint screens do not horizontally scroll.

## 2026-06-24 Stock Alert Card Wrapping

Scope:

- Updated Stock dashboard alert cards so negative stock, stock-age, and overdue-transfer item/location/reason text wraps on phone width.
- This is Stock UI only and does not change alert data, thresholds, visibility, RLS, server actions, stock movements, or approval rules.

Prepared / source-guarded coverage added:

- `components/stock/stock-page.tsx` wraps alert descriptions, item names, locations, reasons, and transfer route text.
- `scripts/stock-mobile-ux-coverage.mjs` guards the alert wrapping classes.
- Owner/Vercel QA docs now ask testers to confirm long alert content stays inside the card around 390px width.

Latest check results:

- `node scripts\stock-mobile-ux-coverage.mjs` - passed.
- `node scripts\stock-owner-qa-doc-coverage.mjs` - passed.
- `npm.cmd run smoke` - passed.
- `npm.cmd run lint` - passed.
- `npm.cmd run typecheck` - passed.
- `npm.cmd run build` - passed.

Manual QA still required:

- On `/stock/dashboard` around 390px width, use long product names, long stock-location names, and long transfer routes.
- Confirm red/yellow/orange alert cards stay readable without horizontal scrolling.

## 2026-06-24 Stock Shortcut Button Flexible Height

Scope:

- Updated Stock shortcut buttons so worker home actions and shared Stock shortcuts use minimum height with padding instead of fixed height.
- This lets labels wrap or grow under phone font scaling without clipping the button contents.
- This is Stock UI only and does not change routes, permissions, workflow logic, RLS, or server actions.

Prepared / source-guarded coverage added:

- `components/stock/stock-page.tsx` uses `min-h-20` for worker home buttons and `min-h-16` for shared Stock shortcuts.
- `scripts/stock-mobile-ux-coverage.mjs` guards the flexible-height shortcut classes.
- Owner/Vercel QA docs now ask testers to confirm Stock shortcut labels remain readable around 390px width.

Latest check results:

- `node scripts\stock-mobile-ux-coverage.mjs` - passed.
- `node scripts\stock-owner-qa-doc-coverage.mjs` - passed.
- `npm.cmd run smoke` - failed before Stock checks on unrelated `scripts/delivery-module-coverage.mjs`: `Order page linked delivery display missing: Delivery handoff will be available from the Delivery module list.`
- `npm.cmd run lint` - passed.
- `npm.cmd run typecheck` - passed.
- `npm.cmd run build` - first attempt hit an existing Next build lock; retry passed.

Manual QA still required:

- On `/home` then `/stock` around 390px width, confirm Inbound, Outbound, Transfer, Receive, Return/Damage, and Stock Take buttons stay large, readable, and unclipped.
- Repeat with browser text size increased if available.

## 2026-06-24 Stock Inbound Disclosure Tap Targets

Scope:

- Updated Barcode Inbound disclosure headers for `New product` and `Weight rule and notes` so they have phone-size tap targets.
- Updated the quick product `Create` button to use a phone-size full-width action.
- Updated inbound decode and duplicate warning cards so worker messages wrap instead of overflowing.
- This is Stock UI only and does not change item creation logic, barcode decoding, duplicate blocking, RLS, server actions, or stock movements.

Prepared / source-guarded coverage added:

- `components/stock/workflow-forms.tsx` uses `min-h-11` disclosure summaries for inbound setup sections.
- `components/stock/workflow-forms.tsx` keeps the quick product create button phone-size.
- `scripts/stock-mobile-ux-coverage.mjs` guards these inbound mobile classes and wrapped decode message classes.
- Owner/Vercel QA docs now ask testers to confirm inbound setup disclosures and scan warnings are easy to tap/read around 390px width.

Latest check results:

- `node scripts\stock-mobile-ux-coverage.mjs` - passed.
- `node scripts\stock-owner-qa-doc-coverage.mjs` - passed.
- `npm.cmd run smoke` - passed.
- `npm.cmd run lint` - first run entered generated `.worktrees\delivery-v1-deploy\.next` output; added explicit generated-worktree ignores in `eslint.config.mjs`, rerun passed.
- `npm.cmd run typecheck` - passed.
- `npm.cmd run build` - stale Next build-lock retries failed, then the lock cleared and rerun passed.

Manual QA still required:

- On `/stock/inbound` around 390px width, tap `New product` and `Weight rule and notes`.
- Confirm `Create`, duplicate warnings, low-confidence warnings, and no-weight errors stay readable without horizontal scrolling.

## 2026-06-24 Stock Workflow Disclosure Tap Targets

Scope:

- Updated the remaining Stock workflow disclosure headers so optional/reference sections use phone-size tap targets across worker scan flows.
- This covers Stock workflow disclosures beyond the inbound setup pass, including outbound, transfer, receive-transfer, return/damage, and supplier-return optional/reference sections where present.
- This is Stock UI only and does not change hidden fields, validation, RLS, server actions, stock movements, or workflow rules.

Prepared / source-guarded coverage added:

- `components/stock/workflow-forms.tsx` no longer uses the old small `summary className="cursor-pointer text-sm font-medium"` pattern.
- `scripts/stock-mobile-ux-coverage.mjs` now fails if that small disclosure summary class returns.
- Owner/Vercel QA docs now ask testers to confirm optional/reference sections are easy to open around 390px width.

Latest check results:

- `node scripts\stock-mobile-ux-coverage.mjs` - passed.
- `node scripts\stock-owner-qa-doc-coverage.mjs` - passed.
- `npm.cmd run smoke` - passed.
- `npm.cmd run lint` - passed.
- `npm.cmd run typecheck` - passed.
- `npm.cmd run build` - initial attempts hit an active Next build lock; after waiting for active workers to settle, rerun passed.

Manual QA still required:

- On `/stock/outbound`, `/stock/transfer`, `/stock/receive-transfer`, and `/stock/return` around 390px width, open any optional/reference sections and confirm the header tap target is comfortable.

## 2026-06-24 Stock Label Preview Wrapping

Scope:

- Updated the on-screen Stock label preview so company name, product name, and weight wrap instead of clipping in the mobile preview card.
- This helps workers verify the correct label before printing or reprinting from a phone.
- This is Stock UI only and does not change generated barcode format, label size, print CSS, PDF output, RLS, server actions, or stock movement behavior.

Prepared / source-guarded coverage added:

- `components/stock/stock-label.tsx` wraps label preview company, product, and weight text.
- `scripts/stock-mobile-ux-coverage.mjs` rejects `line-clamp-2` in the Stock label preview.
- Owner/Vercel QA docs now ask testers to confirm long product labels remain readable around 390px width.

Latest check results:

- `node scripts\stock-mobile-ux-coverage.mjs` - passed.
- `node scripts\stock-owner-qa-doc-coverage.mjs` - passed.
- `npm.cmd run smoke` - passed.
- `npm.cmd run lint` - passed.
- `npm.cmd run typecheck` - passed.
- `npm.cmd run build` - passed.

Manual QA still required:

- On `/stock/inbound` after generating labels and `/stock/units/[id]` around 390px width, preview a label with a long product name.
- Confirm the preview stays readable before using Bluetooth print or PDF fallback.

## 2026-06-24 Stock Unit Movement Card Layout

Scope:

- Updated the Stock unit detail mobile movement cards so movement type/date and weight stack on very narrow phones and only sit side-by-side at the 390px breakpoint.
- This keeps barcode movement history readable when workers reprint labels or inspect a barcode on mobile.
- This is Stock UI only and does not change movement data, label reprint behavior, RLS, server actions, or stock movement behavior.

Prepared / source-guarded coverage added:

- `components/stock/stock-unit-detail.tsx` uses a responsive movement-card header layout.
- `scripts/stock-mobile-ux-coverage.mjs` guards the responsive movement-card classes.
- Owner/Vercel QA docs now ask testers to confirm Stock unit movement cards stay readable around 390px width.

Latest check results:

- `node scripts\stock-mobile-ux-coverage.mjs` - passed.
- `node scripts\stock-owner-qa-doc-coverage.mjs` - passed.
- `npm.cmd run smoke` - failed before Stock checks on unrelated `scripts/retail-v1-e2e-coverage.mjs`: `Scenario 25 failed: Processing warning flag appears when values look abnormal` / `Reports must render abnormal processing warnings. Missing: Processing abnormal warning`.
- `npm.cmd run lint` - passed.
- `npm.cmd run typecheck` - passed.
- `npm.cmd run build` - passed.

Manual QA still required:

- On `/stock/units/[id]` around 390px width, check a unit with several movements and long movement/location/reference values.
- Confirm movement type, date, weight, From, To, and Ref remain readable without horizontal scrolling.

## 2026-06-24 Stock Item Card Wrapping

Scope:

- Updated Stock mobile item-master cards so long item code, item name, category, section, brand, and barcode requirement values wrap inside the card.
- This is Stock UI only and does not change item master data, item creation/editing behavior, RLS, server actions, or stock movement behavior.

Prepared / source-guarded coverage added:

- `components/stock/stock-page.tsx` now wraps long item-master card fields and keeps the active/inactive badge from shrinking into the text.
- `scripts/stock-mobile-ux-coverage.mjs` guards the item-card wrapping classes.
- Owner/Vercel QA docs now ask testers to confirm `/stock/items` cards do not overflow around 390px width.

Latest check results:

- `node scripts\stock-mobile-ux-coverage.mjs` - passed.
- `node scripts\stock-owner-qa-doc-coverage.mjs` - passed.
- `npm.cmd run smoke` - failed before Stock checks on unrelated `scripts/smoke-routes.mjs`: `Processing page must link to order preparation and clarify stock entry`.
- `npm.cmd run lint` - passed.
- `npm.cmd run typecheck` - passed.
- `npm.cmd run build` - passed.

Manual QA still required:

- On `/stock/items` around 390px width, use long item code/name/category/section/brand values.
- Confirm item cards stay readable with no horizontal scrolling.
- Resolve or isolate the unrelated Processing smoke assertion before treating the full repository smoke gate as green.

## 2026-06-24 Stock Filter Button Touch Targets

Scope:

- Updated Stock movement/report filter buttons so they use phone-size tap targets and non-shrinking search icons.
- This is Stock UI only and does not change filter behavior, report access, RLS, server actions, or stock data loading.

Prepared / source-guarded coverage added:

- `components/stock/stock-page.tsx` now uses `min-h-11` full-width mobile filter buttons.
- `scripts/stock-mobile-ux-coverage.mjs` guards the phone-size filter button classes.
- Owner/Vercel QA docs now ask testers to confirm `Filter` and `Filter reports` are easy to tap around 390px width.

Latest check results:

- `node scripts\stock-mobile-ux-coverage.mjs` - passed.
- `node scripts\stock-owner-qa-doc-coverage.mjs` - passed.
- `npm.cmd run smoke` - passed.
- `npm.cmd run lint` - passed.
- `npm.cmd run typecheck` - passed.
- `npm.cmd run build` - passed.

Manual QA still required:

- On `/stock/movements` and `/stock/reports` around 390px width, confirm the filter submit buttons are easy to tap and do not squeeze the search icon/text.

## 2026-06-24 Stock Unit Detail Field Wrapping

Scope:

- Updated Stock unit detail/reprint fields so long item name, barcode, status, item code, brand, origin, location, inbound source, and batch values wrap inside the detail card.
- This is Stock UI only and does not change stock-unit data, label generation, label reprint behavior, RLS, server actions, or stock movement behavior.

Prepared / source-guarded coverage added:

- `components/stock/stock-unit-detail.tsx` now wraps/breaks long stock-unit identity fields.
- `scripts/stock-mobile-ux-coverage.mjs` guards the stock-unit detail wrapping classes.
- Owner/Vercel QA docs now ask testers to confirm `/stock/units/[id]` remains readable around 390px width.

Latest check results:

- `node scripts\stock-mobile-ux-coverage.mjs` - passed.
- `node scripts\stock-owner-qa-doc-coverage.mjs` - passed.
- `npm.cmd run smoke` - passed.
- `npm.cmd run lint` - passed.
- `npm.cmd run typecheck` - passed.
- `npm.cmd run build` - passed.

Manual QA still required:

- Open `/stock/units/[id]` around 390px width with a long barcode, item name, brand, origin, location, and batch.
- Confirm the detail card and reprint controls remain readable with no horizontal scrolling.

## 2026-06-24 Stock Mobile Card Field Wrapping

Scope:

- Updated Stock mobile balance, barcode-unit, movement-history, and stock-unit detail cards so long item, brand, origin, status, and location names wrap inside worker cards.
- This is Stock UI only and does not change stock data loading, report data, RLS, server actions, or stock movement behavior.

Prepared / source-guarded coverage added:

- `components/stock/stock-page.tsx` now wraps long item/location/brand/origin/status fields in mobile balance, barcode-unit, and movement cards.
- `components/stock/stock-unit-detail.tsx` now wraps long movement type and location names in mobile history cards.
- `scripts/stock-mobile-ux-coverage.mjs` guards the mobile-card wrapping classes.
- Owner/Vercel QA docs now ask testers to confirm those cards do not overflow around 390px width.

Latest check results:

- `node scripts\stock-mobile-ux-coverage.mjs` - passed.
- `node scripts\stock-owner-qa-doc-coverage.mjs` - passed.
- `npm.cmd run smoke` - passed.
- `npm.cmd run lint` - passed.
- `npm.cmd run typecheck` - passed.
- `npm.cmd run build` - passed.

Manual QA still required:

- On `/stock/balance`, `/stock/movements`, `/stock/dashboard`, scan pages with recent movements, and `/stock/units/[id]`, use long item, brand, origin, status, and location names.
- Confirm mobile cards stay readable around 390px width with no horizontal scrolling.

## 2026-06-24 Stock Mobile Product Name Wrapping

Scope:

- Updated Stock mobile movement cards and outbound order item checklist rows so long product names wrap instead of truncating.
- This is Stock UI only and does not change outbound validation, stock movement behavior, RLS, or server actions.

Prepared / source-guarded coverage added:

- `components/stock/stock-page.tsx` now wraps mobile movement-card item names.
- `components/stock/workflow-forms.tsx` now wraps outbound order checklist item labels.
- `scripts/stock-mobile-ux-coverage.mjs` guards both wrapping classes.
- Owner/Vercel QA docs now ask testers to confirm full product names remain visible around 390px width.

Latest check results:

- `node scripts\stock-mobile-ux-coverage.mjs` - passed.
- `node scripts\stock-owner-qa-doc-coverage.mjs` - passed.
- `npm.cmd run smoke` - passed.
- `npm.cmd run lint` - passed.
- `npm.cmd run typecheck` - passed.
- `npm.cmd run build` - passed.

Manual QA still required:

- On `/stock/movements`, Stock dashboard recent movements, and scan-page recent movements around 390px width, use movement rows with long product names and confirm they wrap.
- On `/stock/outbound` order mode, use an order item with a long label and confirm the checklist shows the full item name without horizontal scrolling.

## 2026-06-24 Stock Label Print Button Wrapping

Scope:

- Updated Stock label print/reprint action buttons so `Print label` and `PDF fallback` can wrap their helper text at phone width while keeping icons visible.
- This is Stock UI only and does not change generated barcode format, label size, print/PDF behavior, stock save behavior, RLS, or stock movement behavior.

Prepared / source-guarded coverage added:

- `components/stock/stock-label.tsx` now uses flexible-height print/PDF buttons, non-shrinking icons, and wrapping action/helper text.
- `scripts/stock-label-coverage.mjs` and `scripts/stock-mobile-ux-coverage.mjs` guard the mobile-friendly label action classes.
- Owner/Vercel QA docs now ask testers to confirm label print/reprint buttons stay readable around 390px width.

Latest check results:

- `node scripts\stock-label-coverage.mjs` - passed.
- `node scripts\stock-mobile-ux-coverage.mjs` - passed.
- `node scripts\stock-owner-qa-doc-coverage.mjs` - passed.
- `npm.cmd run smoke` - passed.
- `npm.cmd run lint` - passed.
- `npm.cmd run typecheck` - passed.
- `npm.cmd run build` - passed.

Manual QA still required:

- On `/stock/inbound` after generating labels and `/stock/units/[id]` for reprint, test around 390px width.
- Confirm `Print label` / `PDF fallback` buttons remain readable with no horizontal scrolling.
- Test real phone Bluetooth printer selection and PDF fallback output separately.

## 2026-06-24 Stock Scanner Message Wrapping

Scope:

- Updated the shared Stock scanner helper, disabled/setup reason, camera permission/error, offline, and success cards so long messages break inside the scanner field and camera sheet at phone width.
- This is Stock UI only and does not change scanner decoding, duplicate prevention, online-only blocking, server validation, RLS, or stock movement behavior.

Prepared / source-guarded coverage added:

- `components/stock/barcode-scanner.tsx` now applies `break-words` to shared scanner helper and message cards.
- `scripts/stock-mobile-ux-coverage.mjs` guards the scanner wrapping classes and prevents the helper/status text from switching to a squeezed 390px row.
- Owner/Vercel QA docs now ask testers to confirm setup-blocked, connection-lost, camera-error, and success messages stay inside the scanner field and camera sheet around 390px width.

Latest check results:

- `node scripts\stock-mobile-ux-coverage.mjs` - passed.
- `node scripts\stock-owner-qa-doc-coverage.mjs` - passed.
- `npm.cmd run smoke` - passed.
- `npm.cmd run lint` - passed.
- `npm.cmd run typecheck` - failed on unrelated `lib/whatsapp-crm/webhook.ts(644,9)`: `statusesUpdated` is missing from a `WhatsappWebhookProcessResult` return object.
- `npm.cmd run build` - passed.

Manual QA still required:

- On every Stock scan page around 390px width, trigger setup-blocked and connection-lost messages.
- Open the scanner and trigger permission/camera errors if possible, then confirm all scanner messages wrap without horizontal scrolling.
- Resolve or isolate the unrelated WhatsApp CRM typecheck error before treating the full repository typecheck gate as green.

## 2026-06-24 Stock Transfer Return Stock Take Button Wrapping

Scope:

- Updated Stock Transfer/Receive, Return, and Stock Take quick location/session buttons so long labels break inside the button at phone width.
- This is Stock UI only and does not change transfer, receive-transfer, return, stock-take validation, scanner behavior, RLS, server actions, or stock movement behavior.

Prepared / source-guarded coverage added:

- `components/stock/workflow-forms.tsx` now applies `min-w-0` and `break-words` to transfer/receive destination buttons, return-location buttons, stock-take location/item/brand buttons, and active stock-take session buttons.
- `scripts/stock-mobile-ux-coverage.mjs` guards the expanded quick-button wrapping coverage.
- Owner/Vercel QA docs now ask testers to confirm long stock-location, item, brand, and active-session names stay inside their buttons around 390px width.

Latest check results:

- `node scripts\stock-mobile-ux-coverage.mjs` - passed.
- `node scripts\stock-owner-qa-doc-coverage.mjs` - passed.
- `npm.cmd run smoke` - passed.
- `npm.cmd run lint` - passed.
- `npm.cmd run typecheck` - passed.
- `npm.cmd run build` - passed.

Manual QA still required:

- On `/stock/transfer`, `/stock/receive-transfer`, `/stock/return`, and `/stock/stock-take` around 390px width, use demo or real data with long location, item, brand, and session names.
- Confirm quick buttons wrap inside each button without horizontal scrolling.

## 2026-06-24 Stock Outbound Quick Button Wrapping

Scope:

- Updated Stock Outbound job/type, quick ready-order, and quick-remark buttons so long labels break inside the button at phone width.
- This is Stock UI only and does not change outbound validation, order selection rules, scanner behavior, RLS, server actions, or stock movement behavior.

Prepared / source-guarded coverage added:

- `components/stock/workflow-forms.tsx` now applies `min-w-0` and `break-words` to outbound quick buttons and quick ready-order text.
- `scripts/stock-mobile-ux-coverage.mjs` guards the outbound quick-button wrapping classes.
- Owner/Vercel QA docs now ask testers to confirm long order numbers, customer names, and direct remarks stay inside their buttons around 390px width.

Latest check results:

- `node scripts\stock-mobile-ux-coverage.mjs` - passed.
- `node scripts\stock-owner-qa-doc-coverage.mjs` - passed.
- `npm.cmd run smoke` - passed.
- `npm.cmd run lint` - passed.
- `npm.cmd run typecheck` - passed.
- `npm.cmd run build` - passed.

Manual QA still required:

- On `/stock/outbound` around 390px width, use demo or real data with long order numbers/customer names and direct outbound remarks.
- Confirm job/type buttons, quick ready-order buttons, and quick remark buttons wrap inside each button without horizontal scrolling.

## 2026-06-24 Barcode Inbound Quick Button Wrapping

Scope:

- Updated Barcode Inbound recent template and quick product, brand, origin, and location buttons so long labels break inside the button at phone width.
- This is Stock UI only and does not change inbound validation, barcode rules, scanner behavior, RLS, server actions, or stock movement behavior.

Prepared / source-guarded coverage added:

- `components/stock/workflow-forms.tsx` now applies `min-w-0` and `break-words` to inbound setup quick buttons.
- `scripts/stock-mobile-ux-coverage.mjs` guards the recent-template and quick-button wrapping classes.
- Owner/Vercel QA docs now ask testers to confirm long item, brand, origin, and stock-location names stay inside their buttons around 390px width.

Latest check results:

- `node scripts\stock-mobile-ux-coverage.mjs` - passed.
- `node scripts\stock-owner-qa-doc-coverage.mjs` - passed.
- `npm.cmd run smoke` - passed.
- `npm.cmd run lint` - passed.
- `npm.cmd run typecheck` - passed.
- `npm.cmd run build` - passed.

Manual QA still required:

- On `/stock/inbound` around 390px width, use demo or real data with long product, brand, origin, and location names.
- Confirm recent templates and quick setup buttons wrap inside each button without horizontal scrolling.

## 2026-06-24 Stock Worker Feedback Card Wrapping

Scope:

- Updated Stock Transfer, Receive Transfer, Return, Damage/Spoilage, and Return Supplier local feedback cards so long worker messages wrap inside the card at phone width.
- This is Stock UI only and does not change transfer, receive, return, damage, supplier-return validation, scanner behavior, RLS, server actions, or stock movement behavior.

Prepared / source-guarded coverage added:

- `components/stock/workflow-forms.tsx` now applies wrapping to the shared local feedback card pattern used by those five scan workflows.
- `scripts/stock-mobile-ux-coverage.mjs` guards that at least five local worker feedback cards use the wrapping class.
- Owner/Vercel QA docs now ask testers to confirm setup/offline/status text stays inside the card around 390px width.

Latest check results:

- `node scripts\stock-mobile-ux-coverage.mjs` - passed.
- `node scripts\stock-owner-qa-doc-coverage.mjs` - passed.
- `npm.cmd run smoke` - passed.
- `npm.cmd run lint` - passed.
- `npm.cmd run typecheck` - passed.
- `npm.cmd run build` - passed.

Manual QA still required:

- On `/stock/transfer`, `/stock/receive-transfer`, `/stock/return`, and Return/Damage flows around 390px width, trigger setup/offline/status messages.
- Confirm each feedback card wraps text and does not create horizontal scrolling.

## 2026-06-24 Stock Take Blocked Message Wrapping

Scope:

- Updated Stock Take blocked scan feedback so long setup/offline alert text wraps inside the red alert card.
- This is Stock UI only and does not change stock-take validation, scanner behavior, RLS, server actions, or stock movement behavior.

Prepared / source-guarded coverage added:

- `components/stock/workflow-forms.tsx` now applies wrapping to the Stock Take local blocked-scan message.
- `scripts/stock-mobile-ux-coverage.mjs` guards the wrapped red alert class in the Stock Take scan area.
- Owner/Vercel QA docs now ask testers to confirm Stock Take blocked messages stay inside the card around 390px width.

Latest check results:

- `node scripts\stock-mobile-ux-coverage.mjs` - passed.
- `node scripts\stock-owner-qa-doc-coverage.mjs` - passed.
- `npm.cmd run smoke` - passed.
- `npm.cmd run lint` - passed.
- `npm.cmd run typecheck` - passed.
- `npm.cmd run build` - passed.

Manual QA still required:

- On `/stock/stock-take` around 390px width, trigger setup/offline blocked scan messages.
- Confirm the red alert wraps cleanly and does not create horizontal scrolling.

## 2026-06-24 Stock Outbound Blocked Alert Details

Scope:

- Updated Stock Outbound missing, blocked-status, and wrong-destination red alert cards to use assertive alerts and wrapping text.
- Updated the blocked-barcode alert list to show the barcode beside the reason, so workers can identify which scan to remove.
- This is Stock UI only and does not change outbound validation, scanner behavior, RLS, server actions, or stock movement behavior.

Prepared / source-guarded coverage added:

- `components/stock/workflow-forms.tsx` now shows blocked barcode text in the red blocked-barcode alert and wraps long barcode text.
- `scripts/stock-mobile-ux-coverage.mjs` guards the blocked-barcode alert list and assertive alert behavior.
- Owner/Vercel QA docs now ask testers to confirm missing/blocked/wrong-destination alerts identify the barcode to remove around 390px width.

Latest check results:

- `node scripts\stock-mobile-ux-coverage.mjs` - passed.
- `node scripts\stock-owner-qa-doc-coverage.mjs` - passed.
- `npm.cmd run smoke` - passed.
- `npm.cmd run lint` - passed.
- `npm.cmd run typecheck` - passed.
- `npm.cmd run build` - passed.

Manual QA still required:

- On `/stock/outbound` around 390px width, scan missing, blocked-status, and wrong-destination barcodes.
- Confirm each red alert identifies the barcode, wraps long barcode text, and makes it clear which scan to remove.

## 2026-06-24 Stock Outbound Duplicate Alert

Scope:

- Updated Stock Outbound duplicate batch scan feedback to the short red message `Duplicate barcode. Outbound is blocked.`
- Added assertive alert behavior and wrapping to the outbound scan-error card.
- This is Stock UI only and does not change outbound validation, scanner behavior, RLS, server actions, or stock movement behavior.

Prepared / source-guarded coverage added:

- `components/stock/workflow-forms.tsx` now uses the short duplicate outbound message and assertive wrapped red alert.
- `scripts/stock-mobile-ux-coverage.mjs` guards the new duplicate outbound copy and rejects the older longer message.
- Owner/Vercel QA docs now ask testers to confirm the same outbound barcode cannot be added twice.

Latest check results:

- `node scripts\stock-mobile-ux-coverage.mjs` - passed.
- `node scripts\stock-owner-qa-doc-coverage.mjs` - passed.
- `npm.cmd run smoke` - passed.
- `npm.cmd run lint` - passed.
- `npm.cmd run typecheck` - passed.
- `npm.cmd run build` - passed.

Manual QA still required:

- On `/stock/outbound` around 390px width, scan or enter the same barcode twice in one outbound batch.
- Confirm the second scan shows `Duplicate barcode. Outbound is blocked.` and does not add another scanned row.

## 2026-06-24 Stock Damage Photo Message Wrapping

Scope:

- Updated Stock Damage/Spoilage selected-photo messages so long camera filenames or fallback photo references wrap inside the green selected-photo card.
- This is Stock UI only and does not change photo-required validation, damage approval rules, RLS, server actions, scanner behavior, or stock movement behavior.

Prepared / source-guarded coverage added:

- `components/stock/workflow-forms.tsx` now applies wrapping to selected-photo messages in direct outbound damage/spoilage and the Return/Damage damage request flow.
- `scripts/stock-mobile-ux-coverage.mjs` guards the selected-photo wrapping class.
- Owner/Vercel QA docs now ask testers to confirm long selected-photo names stay inside the card around 390px width.

Latest check results:

- `node scripts\stock-mobile-ux-coverage.mjs` - passed.
- `node scripts\stock-owner-qa-doc-coverage.mjs` - passed.
- `npm.cmd run smoke` - passed.
- `npm.cmd run lint` - passed with two unrelated WhatsApp CRM unused-variable warnings.
- First `npm.cmd run typecheck` - failed on unrelated WhatsApp CRM `onSuggestReply` prop mismatch; final rerun after build - passed.
- `npm.cmd run build` - passed.

Manual QA still required:

- On `/stock/outbound`, choose Direct outbound -> Damage/Spoilage, select a photo with a long filename, and confirm the green selected-photo card wraps without horizontal scrolling.
- On `/stock/return`, choose Damage/Spoilage, select a photo with a long filename, and confirm the same wrapping behavior.

## 2026-06-24 Stock Outbound Direct Remark Prefill

Scope:

- Updated Stock Outbound direct mode so selecting a direct outbound type auto-selects the first quick remark.
- This reduces required worker typing for Sales, Processing, Transfer, Sample/Testing, Damage/Spoilage, and Return Supplier while leaving the remarks field editable.
- This is Stock UI only and does not change outbound validation, required direct-outbound remarks, RLS, server actions, scanner behavior, or stock movement behavior.

Prepared / source-guarded coverage added:

- `components/stock/workflow-forms.tsx` now sets a default direct outbound remark when switching to direct outbound or changing direct outbound type.
- `scripts/stock-mobile-ux-coverage.mjs` guards the automatic quick-remark copy and implementation markers.
- Owner/Vercel QA docs now ask testers to confirm direct outbound can proceed without typing remarks unless the worker chooses to edit them.

Latest check results:

- `node scripts\stock-mobile-ux-coverage.mjs` - passed.
- `node scripts\stock-owner-qa-doc-coverage.mjs` - passed.
- `npm.cmd run smoke` - passed.
- `npm.cmd run lint` - passed.
- `npm.cmd run typecheck` - passed.
- `npm.cmd run build` - passed.

Manual QA still required:

- On `/stock/outbound` around 390px width, switch to Direct outbound and tap each direct outbound type.
- Confirm the first quick remark is selected automatically, another remark can still be tapped, and the notes box remains editable.

## 2026-06-24 Stock Outbound Scanned Barcode Wrapping

Scope:

- Updated Stock Outbound scanned rows so barcode text wraps fully instead of truncating.
- This is Stock UI only and does not change outbound validation, duplicate/missing/blocked barcode handling, RLS, server actions, scanner behavior, or stock movement behavior.

Prepared / source-guarded coverage added:

- `components/stock/workflow-forms.tsx` now uses break-all monospace barcode text in outbound scanned rows.
- `scripts/stock-mobile-ux-coverage.mjs` guards the outbound scanned barcode wrapping class.
- Owner/Vercel QA docs now ask testers to confirm long outbound scan barcodes remain readable and removable around 390px width.

Latest check results:

- `node scripts\stock-mobile-ux-coverage.mjs` - passed.
- `node scripts\stock-owner-qa-doc-coverage.mjs` - passed.
- `node scripts\stock-acceptance-coverage.mjs` - passed.
- `npm.cmd run smoke` - passed.
- `npm.cmd run lint` - passed.
- `npm.cmd run typecheck` - passed.
- `npm.cmd run build` - passed.

Manual QA still required:

- On `/stock/outbound` around 390px width, scan multiple long barcodes.
- Confirm each scanned barcode is fully readable, wraps inside its row, and the `Remove` button stays easy to tap before final confirm.

## 2026-06-24 Barcode Inbound Blocked Scan Wrapping

Scope:

- Updated Barcode Inbound blocked/error session rows so long barcode values wrap on phone-width screens.
- This is Stock UI only and does not change duplicate blocking, no-weight handling, validation, RLS, scanner behavior, server actions, or stock movement behavior.

Prepared / source-guarded coverage added:

- `components/stock/workflow-forms.tsx` now uses wrapping text for blocked/error session row messages and break-all monospace barcode text.
- `scripts/stock-mobile-ux-coverage.mjs` guards the wrapped blocked/error scan row classes.
- Owner/Vercel QA docs now ask testers to confirm duplicate/no-weight/error rows do not create horizontal scrolling around 390px width.

Latest check results:

- `node scripts\stock-mobile-ux-coverage.mjs` - passed.
- `node scripts\stock-owner-qa-doc-coverage.mjs` - passed.
- `node scripts\stock-acceptance-coverage.mjs` - passed.
- `npm.cmd run smoke` - passed.
- `npm.cmd run lint` - passed.
- `npm.cmd run typecheck` - passed.
- `npm.cmd run build` - passed.

Manual QA still required:

- On `/stock/inbound` around 390px width, trigger duplicate, no-weight, or connection-error scan rows with a long barcode.
- Confirm `Scan errors` rows wrap inside the red card, show `Latest 12 shown.` when capped, and do not create horizontal scrolling.

## 2026-06-24 Stock Worker Message Wrapping

Scope:

- Updated shared Stock success, error, warning, and offline scan messages so long worker-facing text wraps on phone-width screens.
- This is Stock UI only and does not change validation, RLS, server actions, scanner behavior, stock movements, or permissions.

Prepared / source-guarded coverage added:

- `components/stock/workflow-forms.tsx` now adds wrapping text classes to `ActionMessage` and `OfflineScanAlert`.
- `scripts/stock-mobile-ux-coverage.mjs` guards wrapping for success, error, warning, and offline scan messages.
- Owner/Vercel QA docs now ask testers to confirm messages do not create horizontal scrolling around 390px width.

Latest check results:

- `node scripts\stock-mobile-ux-coverage.mjs` - passed.
- `node scripts\stock-owner-qa-doc-coverage.mjs` - passed.
- `node scripts\stock-acceptance-coverage.mjs` - passed.
- `npm.cmd run smoke` - passed.
- `npm.cmd run lint` - passed.
- First parallel `npm.cmd run typecheck` - failed while `npm.cmd run build` was regenerating `.next/types` files.
- `npm.cmd run build` - passed.
- Final `npm.cmd run typecheck` rerun after build - passed.

Manual QA still required:

- On a 390px phone or browser viewport, trigger at least one Stock success, error, warning, and connection-lost message.
- Confirm each message wraps inside its card and does not create horizontal scrolling.

## 2026-06-24 Stock Worker Home Shortcut Wrap

Scope:

- Updated the six Stock worker home shortcut buttons so icons do not shrink and labels wrap inside the button.
- This is Stock UI only and does not change routes, role checks, RLS, server actions, stock movements, or permissions.
- Attempted to start a local dev server for 390px browser QA, but process launch from the Windows sandbox failed with `CreateProcessAsUserW failed: 5`, so this remains source-guarded plus owner/manual QA.

Prepared / source-guarded coverage added:

- `components/stock/stock-page.tsx` now uses `shrink-0` icons and `min-w-0 break-words` labels for worker shortcut buttons.
- `scripts/stock-mobile-ux-coverage.mjs` guards the non-shrinking icons and wrapping labels.
- `docs/STOCK_TEST_LIST_FOR_OWNER.md` and `docs/STOCK_REMOTE_QA_VERCEL.md` now ask owner/Vercel QA to confirm the six Stock worker buttons fit at 390px without horizontal scrolling.

Latest check results:

- `node scripts\stock-mobile-ux-coverage.mjs` - passed.
- `node scripts\stock-owner-qa-doc-coverage.mjs` - passed.
- `node scripts\stock-acceptance-coverage.mjs` - passed.
- `npm.cmd run smoke` - passed.
- `npm.cmd run lint` - passed.
- `npm.cmd run typecheck` - passed.
- `npm.cmd run build` - passed.

Manual QA still required:

- Sign in as a general worker and open `/stock` around 390px width.
- Confirm only six big buttons appear: Inbound, Outbound, Transfer, Receive, Return / Damage, Stock Take.
- Confirm the icons remain visible, labels wrap cleanly, and the page has no horizontal scrolling.

## 2026-06-24 Stock Scanner Manual Entry Helper Copy

Scope:

- Updated the shared Stock barcode field helper. Current copy is `Type barcode if needed.`
- This is copy-only and keeps camera scanning as the main worker path while preserving manual barcode fallback.
- No scanner startup, validation, RLS, server action, or stock movement behavior changed.

Prepared / source-guarded coverage added:

- `components/stock/barcode-scanner.tsx` now uses the shorter manual-entry helper below barcode inputs.
- `scripts/stock-scanner-coverage.mjs` and `scripts/stock-mobile-ux-coverage.mjs` guard the new helper and reject the stale typing-first wording.
- `docs/STOCK_TEST_LIST_FOR_OWNER.md` and `docs/STOCK_REMOTE_QA_VERCEL.md` now include owner/Vercel QA steps for this helper copy.

Latest check results:

- `node scripts\stock-acceptance-coverage.mjs` - passed.
- `node scripts\stock-scanner-coverage.mjs` - passed.
- `node scripts\stock-mobile-ux-coverage.mjs` - passed.
- `node scripts\stock-owner-qa-doc-coverage.mjs` - passed.
- `npm.cmd run smoke` - passed.
- `npm.cmd run lint` - passed.
- `npm.cmd run typecheck` - passed.
- `npm.cmd run build` - passed.

Manual QA still required:

- Open inbound, outbound, transfer, receive-transfer, return/damage, and stock-take scan pages around 390px width.
- Confirm the large `Scan Barcode` button remains the primary action.
- Confirm the helper below the barcode input says `Type barcode if needed.`
- Confirm workers can still use manual entry when camera scanning is unavailable.

## 2026-06-24 Stock Scanner Browser-Unavailable Copy

Scope:

- Updated the reusable Stock scanner browser-unavailable message to `Camera scanning is not available. Use manual entry.`
- This is copy-only and does not change scanner startup, detection, validation, RLS, or stock movement behavior.

Prepared / source-guarded coverage added:

- `components/stock/barcode-scanner.tsx` now uses the short manual-entry message when browser camera APIs are unavailable.
- `scripts/stock-scanner-coverage.mjs` and `scripts/stock-mobile-ux-coverage.mjs` guard the new copy and reject the old browser-specific wording.
- `docs/STOCK_TEST_LIST_FOR_OWNER.md` and `docs/STOCK_REMOTE_QA_VERCEL.md` now include owner/Vercel QA steps for this browser-unavailable state.

Latest check results:

- `node scripts\stock-scanner-coverage.mjs` - passed.
- `node scripts\stock-mobile-ux-coverage.mjs` - passed.
- `node scripts\stock-owner-qa-doc-coverage.mjs` - passed.
- `npm.cmd run smoke` - failed before Stock checks on unrelated Delivery migration guard: `202606240006_delivery_completion_rls_fix_v1.sql:7 policy "delivery users can update scoped deliveries" must be immediately preceded by drop policy if exists "delivery users can update scoped deliveries" on public.deliveries;`.
- `npm.cmd run lint` - passed.
- `npm.cmd run typecheck` - passed.
- `npm.cmd run build` - passed.

Manual QA still required:

- Open any Stock scan page on a real phone or 390px browser viewport.
- Use an unsupported browser or a browser/device state where camera APIs are unavailable, if possible.
- Confirm the worker-facing error says `Camera scanning is not available. Use manual entry.`
- Tap `Use manual entry` and confirm the scanner closes and the manual barcode input receives focus.

## 2026-06-24 Stock Scanner Camera Error Copy

Scope:

- Updated reusable Stock camera scanner error messages so they point workers to `Use manual entry`.
- Removed stale `Type barcode manually` wording from camera startup errors.
- This is copy-only and does not change scanner startup, validation, RLS, or stock movement behavior.

Prepared / source-guarded coverage added:

- `components/stock/barcode-scanner.tsx` now uses `Use manual entry` language in camera error messages.
- `scripts/stock-scanner-coverage.mjs` and `scripts/stock-mobile-ux-coverage.mjs` guard the new error copy and reject stale `Type barcode manually` wording.
- `docs/STOCK_TEST_LIST_FOR_OWNER.md` and `docs/STOCK_REMOTE_QA_VERCEL.md` now include owner/Vercel QA steps for this camera error copy.

Latest check results:

- `node scripts\stock-scanner-coverage.mjs` - passed.
- `node scripts\stock-mobile-ux-coverage.mjs` - passed.
- `node scripts\stock-owner-qa-doc-coverage.mjs` - passed.
- `npm.cmd run smoke` - failed before Stock checks on unrelated Delivery migration guard: `202606240006_delivery_completion_rls_fix_v1.sql:7 policy "delivery users can update scoped deliveries" must be immediately preceded by drop policy if exists "delivery users can update scoped deliveries" on public.deliveries;`.
- `npm.cmd run lint` - passed.
- `npm.cmd run typecheck` - passed.
- `npm.cmd run build` - passed.

Manual QA still required:

- Open any Stock scan page on a real phone or 390px browser viewport.
- Deny camera permission or make the camera unavailable.
- Confirm the worker-facing camera error points to `Use manual entry`.
- Tap `Use manual entry` and confirm the scanner closes and the manual barcode input receives focus.

## 2026-06-24 Stock Scanner Permission Helper Copy

Scope:

- Updated the reusable Stock camera scanner permission helper so it says `If permission is blocked, tap Use manual entry.`
- Removed stale guidance that told workers to close the scanner before using manual fallback.
- This is copy-only and does not change scanner startup, validation, RLS, or stock movement behavior.

Prepared / source-guarded coverage added:

- `components/stock/barcode-scanner.tsx` now points workers to the in-sheet `Use manual entry` button.
- `scripts/stock-scanner-coverage.mjs` and `scripts/stock-mobile-ux-coverage.mjs` guard the new copy and reject the stale close-window instruction.
- `docs/STOCK_TEST_LIST_FOR_OWNER.md` and `docs/STOCK_REMOTE_QA_VERCEL.md` now include owner/Vercel QA steps for this helper copy.

Latest check results:

- `node scripts\stock-scanner-coverage.mjs` - passed.
- `node scripts\stock-mobile-ux-coverage.mjs` - passed.
- `node scripts\stock-owner-qa-doc-coverage.mjs` - passed.
- `npm.cmd run smoke` - failed before Stock checks on unrelated Delivery migration guard: `202606240006_delivery_completion_rls_fix_v1.sql:7 policy "delivery users can update scoped deliveries" must be immediately preceded by drop policy if exists "delivery users can update scoped deliveries" on public.deliveries;`.
- `npm.cmd run lint` - passed.
- `npm.cmd run typecheck` - passed.
- `npm.cmd run build` - passed.

Manual QA still required:

- Open any Stock scan page on a real phone or 390px browser viewport.
- Tap `Scan Barcode`.
- Confirm the scanner help says `If permission is blocked, tap Use manual entry.`
- Deny camera permission and confirm `Use manual entry` is available in the scanner sheet.

## 2026-06-24 Stock Scanner Starting Status

Scope:

- Improved the reusable Stock camera scanner so `Starting camera...` is announced as a polite status while the camera stream opens.
- This keeps startup feedback visible and accessible without changing camera startup logic, scanner detection, validation, RLS, or stock movement behavior.

Prepared / source-guarded coverage added:

- `components/stock/barcode-scanner.tsx` now adds `role="status"` and `aria-live="polite"` to the camera startup overlay.
- `scripts/stock-scanner-coverage.mjs` and `scripts/stock-mobile-ux-coverage.mjs` guard the startup status.
- `docs/STOCK_TEST_LIST_FOR_OWNER.md` and `docs/STOCK_REMOTE_QA_VERCEL.md` now include owner/Vercel QA steps for the startup overlay.

Latest check results:

- `node scripts\stock-scanner-coverage.mjs` - passed.
- `node scripts\stock-mobile-ux-coverage.mjs` - passed.
- `node scripts\stock-owner-qa-doc-coverage.mjs` - passed.
- `npm.cmd run smoke` - passed.
- `npm.cmd run lint` - passed.
- `npm.cmd run typecheck` - passed.
- `npm.cmd run build` - passed.

Manual QA still required:

- Open any Stock scan page on a real phone or 390px browser viewport.
- Tap `Scan Barcode`.
- Confirm `Starting camera...` appears before the video feed is ready.
- Confirm the scanner proceeds to the normal camera view or shows the existing worker-friendly camera error.

## 2026-06-24 Stock Scanner Error Manual Fallback

Scope:

- Improved the reusable Stock camera scanner so camera error cards show both `Try camera again` and `Use manual entry`.
- `Use manual entry` reuses the existing fallback path: it closes the camera sheet and focuses the manual barcode input.
- This does not change server-side duplicate barcode prevention, page-level duplicate warnings, validation rules, RLS, or stock movement behavior.

Prepared / source-guarded coverage added:

- `components/stock/barcode-scanner.tsx` now shows the inline manual fallback beside camera retry in the error card.
- `scripts/stock-scanner-coverage.mjs` and `scripts/stock-mobile-ux-coverage.mjs` guard the inline fallback path.
- `docs/STOCK_TEST_LIST_FOR_OWNER.md` and `docs/STOCK_REMOTE_QA_VERCEL.md` now include owner/Vercel QA steps for error-card fallback.

Latest check results:

- `node scripts\stock-scanner-coverage.mjs` - passed.
- `node scripts\stock-mobile-ux-coverage.mjs` - passed.
- `node scripts\stock-owner-qa-doc-coverage.mjs` - passed.
- `npm.cmd run smoke` - passed.
- `npm.cmd run lint` - passed.
- `npm.cmd run typecheck` - passed.
- `npm.cmd run build` - passed.

Manual QA still required:

- Open any Stock scan page on a real phone or 390px browser viewport.
- Deny camera permission or make the camera temporarily unavailable.
- Confirm the camera error card shows both `Try camera again` and `Use manual entry`.
- Tap `Use manual entry` and confirm the scanner closes and the manual barcode input receives focus.

## 2026-06-24 Stock Scanner Camera Retry

Scope:

- Improved the reusable Stock camera scanner so a worker sees `Try camera again` inside the scanner sheet when camera startup fails.
- The retry action clears scanner-only error/last-scan state and restarts the camera session without closing the sheet.
- This does not change server-side duplicate barcode prevention, page-level duplicate warnings, validation rules, RLS, or stock movement behavior.

Prepared / source-guarded coverage added:

- `components/stock/barcode-scanner.tsx` now has a scanner retry path using `scannerRunId`.
- `scripts/stock-scanner-coverage.mjs` and `scripts/stock-mobile-ux-coverage.mjs` guard the retry button and restart hook.
- `docs/STOCK_TEST_LIST_FOR_OWNER.md` and `docs/STOCK_REMOTE_QA_VERCEL.md` now include owner/Vercel QA steps for camera retry.

Latest check results:

- `node scripts\stock-scanner-coverage.mjs` - passed.
- `node scripts\stock-mobile-ux-coverage.mjs` - passed.
- `node scripts\stock-owner-qa-doc-coverage.mjs` - passed.
- `npm.cmd run smoke` - passed.
- `npm.cmd run lint` - passed.
- `npm.cmd run typecheck` - passed.
- `npm.cmd run build` - passed.

Manual QA still required:

- Open any Stock scan page on a real phone or 390px browser viewport.
- Deny camera permission or make the camera temporarily unavailable.
- Confirm a short camera error appears with `Try camera again`.
- Tap `Try camera again` after fixing permission/camera availability and confirm the scanner attempts to start again.

## 2026-06-24 Stock Scanner Reopen Reset

Scope:

- Improved the reusable Stock camera scanner so opening `Scan Barcode` clears stale camera error text and resets the camera-only recent-detection debounce.
- This prevents a quick close/reopen from ignoring the first camera read of the same barcode because of old scanner UI state.
- This does not change server-side duplicate barcode prevention, page-level duplicate warnings, validation rules, RLS, or stock movement behavior.

Prepared / source-guarded coverage added:

- `components/stock/barcode-scanner.tsx` now clears `lastDetectedRef` and error state inside the scanner open path.
- `scripts/stock-scanner-coverage.mjs` and `scripts/stock-mobile-ux-coverage.mjs` guard the reopen reset behavior.
- `docs/STOCK_TEST_LIST_FOR_OWNER.md` and `docs/STOCK_REMOTE_QA_VERCEL.md` now include owner/Vercel QA steps for close/reopen scanner readiness.

Latest check results:

- `node scripts\stock-scanner-coverage.mjs` - passed.
- `node scripts\stock-mobile-ux-coverage.mjs` - passed.
- `node scripts\stock-owner-qa-doc-coverage.mjs` - passed.
- `npm.cmd run smoke` - passed.
- `npm.cmd run lint` - passed with two unrelated WhatsApp CRM unused-variable warnings.
- `npm.cmd run typecheck` - failed on unrelated `components/whatsapp-crm/whatsapp-crm-inbox.tsx` `onOrderSaved` prop typing in the dirty worktree.
- `npm.cmd run build` - failed on the same unrelated WhatsApp CRM `onOrderSaved` type error.

Manual QA still required:

- Open any Stock scan page on a real phone or 390px browser viewport.
- Tap `Scan Barcode`, scan a label, close the scanner, then reopen it.
- Confirm old camera error text is gone and the scanner is immediately ready for the next label.
- Confirm page-level duplicate barcode blocking still works when the same barcode should be blocked by the workflow.

## 2026-06-24 Inbound Generated Label Attach Cue

Scope:

- Improved Barcode Inbound generated-label feedback by showing `Print and attach labels.` beside the print actions when saved labels are available.
- The cue is worker-facing and appears only after there are saved labels to print.
- No server action, RPC, RLS policy, database schema, migration, role access, validation rule, barcode generation rule, label print behavior, undo behavior, or stock movement behavior was changed.

Prepared / source-guarded coverage added:

- `components/stock/workflow-forms.tsx` now shows the attach cue in the recent inbound scans label area.
- `scripts/stock-label-coverage.mjs` and `scripts/stock-mobile-ux-coverage.mjs` guard the cue.
- `docs/STOCK_TEST_LIST_FOR_OWNER.md` and `docs/STOCK_REMOTE_QA_VERCEL.md` now include owner/Vercel QA steps for the cue.

Latest check results:

- `node scripts\stock-label-coverage.mjs` - passed.
- `node scripts\stock-mobile-ux-coverage.mjs` - passed.
- `node scripts\stock-owner-qa-doc-coverage.mjs` - passed.
- `npm.cmd run smoke` - passed.
- `npm.cmd run lint` - passed.
- `npm.cmd run typecheck` - passed.
- `npm.cmd run build` - passed.

Manual QA still required:

- Open `/stock/inbound` on a real phone or 390px browser viewport.
- Generate an internal label and confirm the stock save succeeds.
- Confirm `Print and attach labels.` appears near `Print label` / `PDF fallback`.
- Print or save the label, attach it, and confirm the 50mm x 30mm label remains readable.

## 2026-06-24 Stock Scanner Continuous Success Cue

Scope:

- Improved the reusable Stock camera scanner so continuous scanning shows `Detected. Ready for next scan.` after a successful camera read.
- The cue appears inside the existing green last-scan card and does not claim the stock movement was saved; page-level success/error messages still handle server-save results.
- No server action, RPC, RLS policy, database schema, migration, role access, validation rule, barcode decode rule, duplicate rule, or stock movement behavior was changed.

Prepared / source-guarded coverage added:

- `components/stock/barcode-scanner.tsx` now shows the continuous-scan ready cue after a detected barcode.
- `scripts/stock-scanner-coverage.mjs` and `scripts/stock-mobile-ux-coverage.mjs` guard the cue.
- `docs/STOCK_TEST_LIST_FOR_OWNER.md` and `docs/STOCK_REMOTE_QA_VERCEL.md` now include owner/Vercel QA steps for the cue.

Latest check results:

- `node scripts\stock-scanner-coverage.mjs` - passed.
- `node scripts\stock-mobile-ux-coverage.mjs` - passed.
- `node scripts\stock-owner-qa-doc-coverage.mjs` - passed.
- `npm.cmd run smoke` - passed.
- `npm.cmd run lint` - failed on unrelated `components/whatsapp-crm/whatsapp-crm-inbox.tsx` React hook lint in the dirty worktree.
- `npm.cmd run typecheck` - failed on unrelated `components/whatsapp-crm/whatsapp-crm-inbox.tsx` missing `canEditProfile` / `onCustomerUpdated` props in the dirty worktree.
- `npm.cmd run build` - passed.

Manual QA still required:

- Open any Stock scan page on a real phone or 390px browser viewport.
- Tap `Scan Barcode`.
- Scan one label in continuous mode and confirm `Detected. Ready for next scan.` appears while the camera sheet stays open.
- Confirm the page-level workflow still shows the real save success or blocked/error state outside the camera sheet.

## 2026-06-24 Stock Scanner Session Count

Scope:

- Improved the reusable Stock camera scanner so the camera sheet shows `Camera session scans` after successful camera reads.
- The count resets every time the scanner opens and increments after each accepted camera decode reaches the existing scan handler.
- No server action, RPC, RLS policy, database schema, migration, role access, validation rule, barcode decode rule, duplicate rule, or stock movement behavior was changed.

Prepared / source-guarded coverage added:

- `components/stock/barcode-scanner.tsx` now tracks per-open camera session scan count.
- `scripts/stock-scanner-coverage.mjs` and `scripts/stock-mobile-ux-coverage.mjs` guard the session-count UI and reset/increment hooks.
- `docs/STOCK_TEST_LIST_FOR_OWNER.md` and `docs/STOCK_REMOTE_QA_VERCEL.md` now include owner/Vercel QA steps for this camera-session count.

Latest check results:

- `node scripts\stock-scanner-coverage.mjs` - passed.
- `node scripts\stock-mobile-ux-coverage.mjs` - passed.
- `node scripts\stock-owner-qa-doc-coverage.mjs` - passed.
- `npm.cmd run smoke` - passed.
- `npm.cmd run lint` - passed.
- `npm.cmd run typecheck` - passed.
- `npm.cmd run build` - first attempt hit an existing Next build lock; retry after waiting passed.

Manual QA still required:

- Open any Stock scan page on a real phone or 390px browser viewport.
- Tap `Scan Barcode`.
- Scan two labels continuously and confirm `Camera session scans` increments.
- Close and reopen the scanner and confirm the count resets.
- Confirm no horizontal scrolling appears in the camera sheet.

## 2026-06-24 Stock Label Action Helper Text

Scope:

- Improved reusable Stock label print/reprint action buttons for workers on phones.
- `Print label` now shows `Bluetooth printer` as helper text.
- `PDF fallback` now shows `Save as PDF` as helper text.
- Existing browser print-sheet behavior remains unchanged for both actions.
- No server action, RPC, RLS policy, database schema, migration, role access, validation rule, barcode generation, label page size, or stock movement behavior was changed.

Prepared / source-guarded coverage added:

- `components/stock/stock-label.tsx` now uses helper text inside the print/PDF action buttons.
- `scripts/stock-label-coverage.mjs` and `scripts/stock-mobile-ux-coverage.mjs` guard the helper text.
- `docs/STOCK_TEST_LIST_FOR_OWNER.md` and `docs/STOCK_REMOTE_QA_VERCEL.md` now include owner/Vercel QA steps for this label action text.

Latest check results:

- `node scripts\stock-label-coverage.mjs` - passed.
- `node scripts\stock-mobile-ux-coverage.mjs` - passed.
- `node scripts\stock-owner-qa-doc-coverage.mjs` - passed.
- `npm.cmd run smoke` - passed.
- `npm.cmd run lint` - passed.
- `npm.cmd run typecheck` - passed.
- `npm.cmd run build` - passed.

Manual QA still required:

- Open `/stock/inbound` after generating an internal label or `/stock/units/[id]` on a real phone.
- Confirm `Print label` shows `Bluetooth printer`.
- Confirm `PDF fallback` shows `Save as PDF`.
- Confirm both actions still open the phone/browser print sheet and fit cleanly around 390px width.

## 2026-06-24 Stock Scanner Manual-Entry Fallback Focus

Scope:

- Improved the reusable Stock camera scanner so workers can tap `Use manual entry` inside the scanner sheet.
- `Use manual entry` closes the camera sheet and focuses the manual barcode input.
- The existing `Close` behavior still returns focus to the `Scan Barcode` button.
- No server action, RPC, RLS policy, database schema, migration, role access, validation rule, barcode decode logic, continuous scan logic, camera stream cleanup, or stock movement behavior was changed.

Prepared / source-guarded coverage added:

- `components/stock/barcode-scanner.tsx` now keeps an internal manual barcode input ref and passes a scanner fallback callback.
- `scripts/stock-scanner-coverage.mjs` and `scripts/stock-mobile-ux-coverage.mjs` guard the `Use manual entry` fallback path.
- `docs/STOCK_TEST_LIST_FOR_OWNER.md` and `docs/STOCK_REMOTE_QA_VERCEL.md` now include owner/Vercel QA steps for this scanner fallback behavior.

Latest check results:

- `node scripts\stock-scanner-coverage.mjs` - passed.
- `node scripts\stock-mobile-ux-coverage.mjs` - passed.
- `node scripts\stock-owner-qa-doc-coverage.mjs` - passed.
- `npm.cmd run smoke` - passed.
- `npm.cmd run lint` - passed.
- `npm.cmd run typecheck` - passed.
- `npm.cmd run build` - passed.

Manual QA still required:

- Open any Stock scan page on a real phone.
- Tap `Scan Barcode`, then tap `Use manual entry`.
- Confirm the camera sheet closes and the cursor is placed in the manual barcode input.
- Confirm typed barcode fallback and normal camera scanning still work.

## 2026-06-24 Stock Scanner Focus Return

Scope:

- Improved the reusable Stock camera scanner so focus returns to the `Scan Barcode` button after the camera sheet closes.
- This helps keyboard and assistive-technology users stay in the same Stock workflow after scanning or closing the modal.
- No server action, RPC, RLS policy, database schema, migration, role access, validation rule, barcode decode logic, continuous scan logic, camera stream cleanup, or stock movement behavior was changed.

Prepared / source-guarded coverage added:

- `components/stock/barcode-scanner.tsx` now keeps a trigger button ref and restores focus after the scanner modal closes.
- `scripts/stock-scanner-coverage.mjs` and `scripts/stock-mobile-ux-coverage.mjs` guard scanner trigger focus restoration.
- `docs/STOCK_TEST_LIST_FOR_OWNER.md` and `docs/STOCK_REMOTE_QA_VERCEL.md` now include owner/Vercel QA steps for this scanner focus behavior.

Latest check results:

- `node scripts\stock-scanner-coverage.mjs` - passed.
- `node scripts\stock-mobile-ux-coverage.mjs` - passed.
- `node scripts\stock-owner-qa-doc-coverage.mjs` - passed.
- `npm.cmd run smoke` - passed.
- `npm.cmd run lint` - passed.
- `npm.cmd run typecheck` - passed.
- `npm.cmd run build` - passed.

Manual QA still required:

- Open any Stock scan page on a real phone or keyboard-accessible browser.
- Tap or focus `Scan Barcode`, close the camera sheet, and confirm focus returns to the same `Scan Barcode` button.
- Confirm barcode scanning and manual fallback still work normally.

## 2026-06-24 Stock Scanner Modal Scroll Lock

Scope:

- Improved the reusable Stock camera scanner on mobile by locking background page scroll while the scanner modal is open.
- Restores the previous page scroll style when the scanner closes or unmounts.
- No server action, RPC, RLS policy, database schema, migration, role access, validation rule, barcode decode logic, continuous scan logic, camera stream cleanup, or stock movement behavior was changed.

Prepared / source-guarded coverage added:

- `components/stock/barcode-scanner.tsx` now sets `document.body.style.overflow = "hidden"` while the scanner is open and restores the previous value on cleanup.
- `scripts/stock-scanner-coverage.mjs` and `scripts/stock-mobile-ux-coverage.mjs` guard the scanner modal scroll lock and restore behavior.
- `docs/STOCK_TEST_LIST_FOR_OWNER.md` and `docs/STOCK_REMOTE_QA_VERCEL.md` now include owner/Vercel QA steps for this scanner modal behavior.

Latest check results:

- `node scripts\stock-scanner-coverage.mjs` - passed.
- `node scripts\stock-mobile-ux-coverage.mjs` - passed.
- `node scripts\stock-owner-qa-doc-coverage.mjs` - passed.
- `npm.cmd run smoke` - passed.
- `npm.cmd run lint` - passed.
- `npm.cmd run typecheck` - passed.
- `npm.cmd run build` - passed.

Manual QA still required:

- Open any Stock scan page on a real phone.
- Scroll down, tap `Scan Barcode`, and confirm the page behind the camera sheet does not scroll.
- Close the scanner and confirm normal page scrolling works again.

## 2026-06-24 Stock Scanner Dialog Accessibility

Scope:

- Improved the reusable Stock camera scanner dialog for phone/accessibility testing.
- The scanner modal now uses dialog semantics, links its title/description, and moves focus to the scanner sheet when opened.
- No server action, RPC, RLS policy, database schema, migration, role access, validation rule, barcode decode logic, continuous scan logic, camera stream cleanup, or stock movement behavior was changed.

Prepared / source-guarded coverage added:

- `components/stock/barcode-scanner.tsx` now sets `role="dialog"`, `aria-modal`, labelled/described-by ids, and focuses the scanner sheet when opened.
- `scripts/stock-scanner-coverage.mjs` and `scripts/stock-mobile-ux-coverage.mjs` guard the scanner dialog behavior.
- `docs/STOCK_TEST_LIST_FOR_OWNER.md` and `docs/STOCK_REMOTE_QA_VERCEL.md` now include owner/Vercel QA steps for this scanner dialog behavior.

Latest check results:

- `node scripts\stock-scanner-coverage.mjs` - passed.
- `node scripts\stock-mobile-ux-coverage.mjs` - passed.
- `node scripts\stock-owner-qa-doc-coverage.mjs` - passed.
- `npm.cmd run smoke` - passed.
- `npm.cmd run lint` - passed.
- `npm.cmd run typecheck` - passed.
- `npm.cmd run build` - passed.

Manual QA still required:

- Open any Stock scan page on a real phone.
- Tap `Scan Barcode` and confirm the scanner sheet opens with `Scan barcode` as the main title.
- If using a screen reader or browser accessibility inspector, confirm the camera sheet is announced as a dialog with the permission/rear-camera help text.
- Confirm the close button is easy to tap and the camera stops after closing.

## 2026-06-24 Stock Inbound Session-Code Read-Only Field

Scope:

- Improved the advanced Barcode Inbound session-code field for phone users.
- The auto-generated inbound session code is read-only, so workers do not type it.
- No server action, RPC, RLS policy, database schema, migration, role access, validation rule, approval workflow, barcode scanning behavior, or stock movement behavior was changed.

Prepared / source-guarded coverage added:

- `components/stock/workflow-forms.tsx` shows `Inbound session code` as a read-only generated value.
- `scripts/stock-mobile-ux-coverage.mjs` guards the read-only inbound session-code field.
- `docs/STOCK_TEST_LIST_FOR_OWNER.md` and `docs/STOCK_REMOTE_QA_VERCEL.md` now include owner/Vercel QA steps for this field.

Latest check results:

- `node scripts\stock-mobile-ux-coverage.mjs` - passed.
- `node scripts\stock-owner-qa-doc-coverage.mjs` - passed.
- `npm.cmd run smoke` - passed.
- `npm.cmd run lint` - passed.
- `npm.cmd run typecheck` - passed.
- `npm.cmd run build` - passed.

Manual QA still required:

- Open `/stock/inbound` on a real phone.
- Open `Weight rule and notes`, confirm `Inbound session code` is visible and read-only.
- Confirm no typing is needed and normal inbound scanning still works.

## 2026-06-24 Stock Reference-Number Keyboard Hints

Scope:

- Improved optional Stock reference-number typing for phone users.
- Barcode Inbound, Stock Outbound, Transfer, Receive Transfer, and Stock Return optional reference-number fields now request a mobile `Done` action and disable browser autofill.
- No server action, RPC, RLS policy, database schema, migration, role access, validation rule, approval workflow, or stock movement behavior was changed.

Prepared / source-guarded coverage added:

- `components/stock/workflow-forms.tsx` now sets `autoComplete="off"` and `enterKeyHint="done"` on the optional reference-number fields.
- `scripts/stock-mobile-ux-coverage.mjs` guards at least five optional reference-number fields.
- `docs/STOCK_TEST_LIST_FOR_OWNER.md` and `docs/STOCK_REMOTE_QA_VERCEL.md` now include owner/Vercel QA steps for these fields.

Latest check results:

- `node scripts\stock-mobile-ux-coverage.mjs` - passed.
- `node scripts\stock-owner-qa-doc-coverage.mjs` - passed.
- `npm.cmd run smoke` - passed.
- `npm.cmd run lint` - passed.
- `npm.cmd run typecheck` - passed.
- `npm.cmd run build` - passed.

Manual QA still required:

- Open `/stock/inbound`, `/stock/outbound`, `/stock/transfer`, `/stock/receive-transfer`, and `/stock/return` on a real phone.
- Open each optional reference/details section, tap `Reference no.`, and confirm the keyboard has a Done key.
- Confirm normal scanning and submission still work when the optional reference number is left blank.

## 2026-06-24 Stock Return/Damage Fallback Keyboard Hints

Scope:

- Improved fallback typing on Return/Damage and direct outbound request flows.
- Direct outbound damage photo reference and Return/Damage photo reference fallback fields now request a mobile `Done` action and disable browser autofill.
- Direct outbound supplier name and Return Supplier supplier name fallback fields now request a mobile `Done` action and disable browser autofill.
- No server action, RPC, RLS policy, database schema, migration, role access, damage photo requirement, supplier requirement, approval workflow, validation rule, or stock movement behavior was changed.

Prepared / source-guarded coverage added:

- `components/stock/workflow-forms.tsx` now sets `autoComplete="off"` and `enterKeyHint="done"` on the supplier/photo fallback fields.
- `scripts/stock-mobile-ux-coverage.mjs` guards direct outbound and Return/Damage fallback fields specifically.
- `docs/STOCK_TEST_LIST_FOR_OWNER.md` and `docs/STOCK_REMOTE_QA_VERCEL.md` now include owner/Vercel QA steps for these fields.

Latest check results:

- `node scripts\stock-mobile-ux-coverage.mjs` - passed.
- `node scripts\stock-owner-qa-doc-coverage.mjs` - passed.
- `npm.cmd run smoke` - failed in unrelated Retail coverage: `Retail expense submission must require a receipt.`
- `npm.cmd run lint` - passed.
- `npm.cmd run typecheck` - passed.
- `npm.cmd run build` - passed.

Manual QA still required:

- Open `/stock/return` on a real phone.
- If the damage photo picker does not fill a file name, open `Photo reference fallback`, tap the fallback field, and confirm the keyboard has a Done key.
- If no recent supplier button is available, tap `Supplier name` and confirm the keyboard has a Done key.
- Repeat the same fallback checks on `/stock/outbound` for direct Damage/Spoilage and Return Supplier.

## 2026-06-24 Stock Inbound Search Keyboard Hints

Scope:

- Improved the Barcode Inbound product search field for phone users.
- Product search now requests a search keyboard/action.
- The quick-create `Product name` fallback now requests a `Done` keyboard action.
- No server action, RPC, RLS policy, database schema, migration, role access, product filtering behavior, item creation rule, validation rule, or stock movement behavior was changed.

Prepared / source-guarded coverage added:

- `components/stock/workflow-forms.tsx` now sets `type="search"`, `autoComplete="off"`, and `enterKeyHint="search"` on the inbound product search.
- `components/stock/workflow-forms.tsx` now sets `autoComplete="off"` and `enterKeyHint="done"` on the quick-create product name input.
- `scripts/stock-mobile-ux-coverage.mjs` guards these inbound search/mobile keyboard hints.
- `docs/STOCK_TEST_LIST_FOR_OWNER.md` and `docs/STOCK_REMOTE_QA_VERCEL.md` now include owner/Vercel QA steps for the phone keyboard behavior.

Latest check results:

- `node scripts\stock-mobile-ux-coverage.mjs` - passed.
- `node scripts\stock-owner-qa-doc-coverage.mjs` - passed.
- `npm.cmd run smoke` - passed.
- `npm.cmd run lint` - passed.
- `npm.cmd run typecheck` - passed.
- `npm.cmd run build` - passed.

Manual QA still required:

- Open `/stock/inbound` on a real phone.
- Tap `Search product or item code` and confirm the phone shows a search keyboard/action.
- Open `New product`, tap `Product name`, and confirm the keyboard has a Done key.
- Confirm product search, quick buttons, and quick-create item behavior still work normally.

## 2026-06-24 Stock Inbound Weight Keyboard Hints

Scope:

- Improved the Barcode Inbound no-weight/internal-label path.
- `Net weight kg` and fallback fixed kg fields now request a decimal phone keyboard with a `Done` action.
- Barcode weight start, weight digits, and weight decimals fields now request a numeric phone keyboard with a `Done` action.
- No server action, RPC, RLS policy, database schema, migration, role access, barcode decoding, scanner camera behavior, validation rule, or stock movement behavior was changed.

Prepared / source-guarded coverage added:

- `components/stock/workflow-forms.tsx` now sets mobile keyboard hints on inbound weight and barcode-rule numeric fields.
- `scripts/stock-label-coverage.mjs` guards the internal-label weight entry mobile hints.
- `scripts/stock-mobile-ux-coverage.mjs` guards the inbound weight/rule fields and Done-key hint.
- `docs/STOCK_TEST_LIST_FOR_OWNER.md` and `docs/STOCK_REMOTE_QA_VERCEL.md` now include owner/Vercel QA steps for these fields.

Latest check results:

- `node scripts\stock-label-coverage.mjs` - passed.
- `node scripts\stock-mobile-ux-coverage.mjs` - passed.
- `node scripts\stock-owner-qa-doc-coverage.mjs` - passed.
- `npm.cmd run smoke` - passed.
- `npm.cmd run lint` - passed.
- `npm.cmd run typecheck` - passed.
- `npm.cmd run build` - passed.

Manual QA still required:

- Open `/stock/inbound` on a real phone.
- Tap `Net weight kg` and confirm a decimal keyboard appears with a Done key.
- Open `Weight rule and notes`, tap weight start/digits/decimals, and confirm numeric keyboards appear with a Done key.
- Generate one internal label and confirm the normal stock save, label print/PDF, movement, and scan-log behavior still applies.

## 2026-06-24 Stock Mobile QA Preparation

Scope reviewed:

- Stock home buttons.
- Barcode Inbound session setup, continuous scanning UI, duplicate warning, no-weight warning, previous scan, saved count, and saved total weight.
- Internal label generation, PDF fallback, and stock-unit label reprint.
- Order outbound, direct outbound, damage/spoilage request, transfer, receive-transfer wrong-location block, return, and stock take.
- Stock-take progress, unknown barcode exception handling, and online-only scanner blocking.

Prepared / source-guarded coverage confirmed:

- `scripts/stock-mobile-ux-coverage.mjs` covers the six-button worker Stock home, mobile scan workflows, 390px layout markers, action feedback, direct outbound, damage/photo gating, transfer/receive, stock take, and recent movement cards.
- `scripts/stock-scanner-coverage.mjs` covers the shared camera scanner, manual fallback, online-only blocking message, camera permission copy, stream stop behavior, recent scans, numeric manual keyboard with Done key, and continuous scan cues.
- `scripts/stock-label-coverage.mjs` covers 50mm x 30mm label print/PDF output structure, Bluetooth-first/PDF fallback copy, multiple labels, generated barcode rules, and reprint surface.
- `scripts/stock-owner-qa-doc-coverage.mjs` covers owner/Vercel QA docs for the requested Stock pages and mobile/device checklist.

Commands run:

- `node scripts\stock-mobile-ux-coverage.mjs` - passed.
- `node scripts\stock-scanner-coverage.mjs` - passed.
- `node scripts\stock-label-coverage.mjs` - passed.
- `node scripts\stock-owner-qa-doc-coverage.mjs` - passed.
- `npm.cmd run smoke` - passed.
- `npm.cmd run lint` - passed.
- `npm.cmd run typecheck` - first parallel run failed while `npm.cmd run build` was regenerating `.next/types`; rerun by itself passed.
- `npm.cmd run build` - passed.

Local runtime evidence:

- The local Next.js app starts in foreground at `http://127.0.0.1:3100`.
- Authenticated 390px browser-route QA could not be completed in this Windows sandbox because the in-app browser runtime returned `CreateProcessAsUserW failed: 5`.
- No live Supabase SQL, seed, deployment, or production data action was run.

Manual QA still required:

- Open the Vercel app on a real phone or desktop responsive mode around 390px width.
- Capture screenshots/video for `/stock`, `/stock/inbound`, `/stock/outbound`, `/stock/transfer`, `/stock/receive-transfer`, `/stock/return`, `/stock/stock-take`, `/stock/balance`, and `/stock/units/[id]`.
- Test real camera permission, rear-camera preference, continuous scanning, duplicate barcode block, no-weight barcode block, and connection-loss message.
- Test Bluetooth label printer selection from the phone print sheet where supported.
- Test PDF fallback and confirm one 50mm x 30mm label page.
- Test live Supabase/RLS workflows with worker, manager, admin, and director users.

## 2026-06-24 No-Barcode Inbound Mobile Link

Scope:

- Updated the no-barcode stock guidance card to use a full-width phone-size `Open Barcode Inbound` action.
- The action now uses `next/link` in-app navigation to `/stock/inbound`.
- This keeps the MVP path clear: generate/attach a barcode label first, then inbound as barcode stock.
- No server action, RPC, RLS policy, database schema, migration, role access, loose-stock behavior, scanner behavior, validation, or stock movement behavior was changed.

Prepared / source-guarded coverage added:

- `components/stock/workflow-forms.tsx` now uses `Link` and `className="min-h-11 w-full sm:w-auto"` for `Open Barcode Inbound`.
- `scripts/stock-mobile-ux-coverage.mjs` guards the no-barcode guidance card and phone-size in-app link.
- `docs/STOCK_TEST_LIST_FOR_OWNER.md` and `docs/STOCK_REMOTE_QA_VERCEL.md` now include owner/Vercel QA steps for `/stock/no-barcode-inbound`.

Manual QA still required:

- Open `/stock/no-barcode-inbound` around 390px width.
- Confirm the card explains that no-barcode stock needs a label first.
- Confirm `Open Barcode Inbound` is full-width and easy to tap.
- Tap it and confirm `/stock/inbound` opens without changing loose-stock behavior.

## 2026-06-24 Stock Manual Barcode Keyboard

Scope:

- Updated the shared Stock manual barcode fallback input to request the mobile numeric keyboard.
- Added a mobile `Done` key hint and numeric-only input pattern for easier phone entry.
- Disabled autocorrect/capitalization on the manual barcode field so long barcode typing or pasting is less error-prone.
- This applies to Stock scan workflows that use the shared `BarcodeField`.
- No server action, RPC, RLS policy, database schema, migration, role access, scanner camera behavior, validation, or stock movement behavior was changed.

Prepared / source-guarded coverage added:

- `components/stock/barcode-scanner.tsx` now sets `inputMode="numeric"`, `enterKeyHint="done"`, `pattern="[0-9]*"`, `autoCapitalize="none"`, and `spellCheck={false}` on the manual barcode input.
- `scripts/stock-scanner-coverage.mjs` guards these mobile manual-entry attributes.
- `docs/STOCK_TEST_LIST_FOR_OWNER.md` and `docs/STOCK_REMOTE_QA_VERCEL.md` now include owner/Vercel QA steps for the phone keyboard behavior.

Latest check results:

- `node scripts\stock-scanner-coverage.mjs` - passed.
- `node scripts\stock-mobile-ux-coverage.mjs` - passed.
- `node scripts\stock-owner-qa-doc-coverage.mjs` - passed.
- `npm.cmd run smoke` - passed.
- `npm.cmd run lint` - passed.
- `npm.cmd run typecheck` - passed.
- `npm.cmd run build` - passed.

Manual QA still required:

- Open any Stock scan page on a phone, such as `/stock/inbound`.
- Tap the manual barcode fallback field.
- Confirm the numeric keyboard appears with a Done key and autocorrect/capitalization suggestions do not interfere.
- Paste or type a long barcode and confirm the normal scan/save validation still applies.

## 2026-06-24 Stock In-App Navigation Links

Scope:

- Updated Stock worker shortcut buttons to use `next/link` in-app navigation.
- Updated overdue transfer `Open receive` and barcode unit `Open / reprint` actions to use `next/link`.
- This keeps phone movement between Stock pages smoother without changing routes, permissions, validation, or stock workflows.
- No server action, RPC, RLS policy, database schema, migration, role access, scanner behavior, or stock movement behavior was changed.

Prepared / source-guarded coverage added:

- `components/stock/stock-page.tsx` now imports `Link` from `next/link` and uses it for the Stock worker shortcuts and barcode-unit reprint links.
- `scripts/stock-mobile-ux-coverage.mjs` guards `Link` usage on the worker home shortcuts and stock-unit mobile cards.
- `docs/STOCK_TEST_LIST_FOR_OWNER.md` and `docs/STOCK_REMOTE_QA_VERCEL.md` now include owner/Vercel QA steps for smoother in-app navigation.

Manual QA still required:

- Open `/stock` around 390px width as a general worker.
- Tap each Stock shortcut and confirm navigation feels like in-app movement instead of a full browser reload.
- Open `/stock/balance`, tap `Open / reprint`, and confirm the stock-unit detail page opens.
- If an overdue transfer alert exists, tap `Open receive` and confirm `/stock/receive-transfer` opens.

## 2026-06-24 Inbound Finish Button Mobile Size

Scope:

- Updated Barcode Inbound `Finish Inbound Session` to use a full-width phone-size button around 390px width.
- The button switches back to compact desktop sizing on larger screens, matching the shared Stock submit button pattern.
- No server action, RPC, RLS policy, database schema, migration, role access, stock movement behavior, session-finish behavior, or validation logic was changed.

Prepared / source-guarded coverage added:

- `components/stock/workflow-forms.tsx` now sets `className="min-h-11 w-full sm:w-auto"` on the `Finish Inbound Session` button.
- `scripts/stock-mobile-ux-coverage.mjs` guards the phone-width button sizing and the existing finish-session copy.
- `docs/STOCK_TEST_LIST_FOR_OWNER.md` and `docs/STOCK_REMOTE_QA_VERCEL.md` now include owner/Vercel QA steps for the finish button.

Manual QA still required:

- Open `/stock/inbound` around 390px width.
- Save at least one inbound scan or generated label so the finish button is enabled.
- Confirm `Finish Inbound Session` is full-width and easy to tap.
- Confirm finishing still shows the same session summary and does not change save/undo behavior.

## 2026-06-24 Stock Scan Pages Recent Movement Cards

Scope:

- Added mobile movement cards to the shared `Recent movements` section shown after Stock scan workflows.
- This covers `/stock/inbound`, `/stock/outbound`, `/stock/transfer`, `/stock/receive-transfer`, `/stock/return`, and `/stock/no-barcode-inbound`.
- Workers can now confirm recent stock actions around 390px width before reaching the full horizontal table.
- No server action, RPC, RLS policy, database schema, migration, role access, stock movement behavior, scanner behavior, or validation logic was changed.

Prepared / source-guarded coverage added:

- `components/stock/stock-page.tsx` now renders `MobileStockMovementCards` inside the shared scan-page `Recent movements` card.
- `scripts/stock-mobile-ux-coverage.mjs` guards the scan-page recent-movement cards before the existing table.
- `docs/STOCK_TEST_LIST_FOR_OWNER.md` and `docs/STOCK_REMOTE_QA_VERCEL.md` now include owner/Vercel QA steps for these scan pages.

Manual QA still required:

- Open `/stock/inbound`, `/stock/outbound`, `/stock/transfer`, `/stock/receive-transfer`, and `/stock/return` around 390px width.
- Confirm `Recent movements` shows mobile cards before the full table.
- Confirm cards show operational fields only: movement type, item, barcode, quantity, weight, location movement, time, and reference.
- Confirm no cost/value/finance data appears for workers.

## 2026-06-24 Stock Dashboard Latest Movement Cards

Scope:

- Added mobile movement cards to the Stock dashboard `Latest movements` card before the full movement table.
- The cards reuse the existing mobile movement-history layout with movement type, item, barcode, quantity, weight, from/to location, time, and reference.
- This keeps manager/admin/director dashboard activity readable around 390px width while leaving the desktop table unchanged.
- No server action, RPC, RLS policy, database schema, migration, role access, stock movement behavior, or dashboard KPI logic was changed.

Prepared / source-guarded coverage added:

- `components/stock/stock-page.tsx` now renders `MobileStockMovementCards` inside the dashboard `Latest movements` card.
- `scripts/stock-mobile-ux-coverage.mjs` guards the dashboard latest-movement mobile cards before the existing table.
- `docs/STOCK_TEST_LIST_FOR_OWNER.md` and `docs/STOCK_REMOTE_QA_VERCEL.md` now include owner/Vercel QA steps for `/stock/dashboard`.

Manual QA still required:

- Open `/stock/dashboard` around 390px width as an allowed manager/admin/director.
- Confirm `Latest movements` shows mobile cards before the full table.
- Confirm the cards show movement type, item, barcode, quantity, weight, from/to location, time, and reference without cost/value/finance data.
- Confirm the desktop table remains available below the cards.

## 2026-06-24 Mobile Item Master Cards

Scope:

- Added mobile-only item master cards on `/stock/items` before the full item table.
- Each card shows item code, product name, category/section, brand, barcode requirement, and active status.
- The cards make item master review easier on worker phones while preserving the existing full table and item edit flow.
- No server action, RPC, RLS policy, database schema, migration, role access, item-master permission, or stock movement behavior was changed.

Prepared / source-guarded coverage added:

- `components/stock/stock-page.tsx` now renders `MobileItemCards` before the Stock Item Master table.
- `scripts/stock-mobile-ux-coverage.mjs` guards the mobile item card title, empty state, item code, barcode requirement, and mobile-only wrapper.
- `docs/STOCK_TEST_LIST_FOR_OWNER.md` and `docs/STOCK_REMOTE_QA_VERCEL.md` now include owner/Vercel QA steps for the item master mobile cards.

Manual QA still required:

- Open `/stock/items` around 390px width with item master records available.
- Confirm the mobile item cards appear before the full item table.
- Confirm each card shows item code, product name, category/section, brand, barcode requirement, and active status without cost/value/finance data.
- Open item edit from the same page and confirm category/default-brand dropdowns remain easy to tap.

## 2026-06-24 Mobile Barcode Unit Cards

Scope:

- Added mobile-only barcode stock unit cards on `/stock/balance` before the full barcode unit table.
- Each card shows barcode, item, brand/origin, status, weight, location, received date, and a large `Open / reprint` action.
- The action opens `/stock/units/[id]` so workers can inspect the unit or reprint its label without using the wide table first.
- No server action, RPC, RLS policy, database schema, migration, role access, stock movement behavior, or stock-unit edit behavior was changed.

Prepared / source-guarded coverage added:

- `components/stock/stock-page.tsx` now renders `MobileStockUnitCards` before `StockUnitsTableClient`.
- `scripts/stock-mobile-ux-coverage.mjs` guards the mobile barcode unit card title, empty state, weight/location fields, and `Open / reprint` action.
- `docs/STOCK_TEST_LIST_FOR_OWNER.md` and `docs/STOCK_REMOTE_QA_VERCEL.md` now include owner/Vercel QA steps for the barcode unit cards.

Manual QA still required:

- Open `/stock/balance` around 390px width with barcode stock units available.
- Confirm the mobile barcode unit cards appear before the full barcode unit table.
- Confirm each card shows barcode, item, status, weight, location, and received date without cost/value/finance data.
- Tap `Open / reprint` and confirm `/stock/units/[id]` opens for detail/reprint.

## 2026-06-24 Stock Mobile Select Touch Targets

Scope:

- Updated Stock item edit category/default-brand dropdowns from the older short select height to phone-size controls.
- Updated Stock movement/report filter dropdowns from the older short select height to phone-size controls.
- Added a source guard so Stock mobile UX coverage fails if those old short select classes return in Stock worker forms or Stock page filters.
- Tried to capture local browser evidence at 390px, but the in-app browser connection was blocked by the Windows sandbox permission error `CreateProcessAsUserW failed: 5`.
- No server action, RPC, RLS policy, database schema, migration, role access, or stock movement behavior was changed.

Prepared / source-guarded coverage added:

- `components/stock/workflow-forms.tsx` now uses `min-h-11` mobile-friendly select controls for item edit category and default brand.
- `components/stock/stock-page.tsx` now uses `min-h-11` mobile-friendly select controls for Stock movement/report filter dropdowns.
- `scripts/stock-mobile-ux-coverage.mjs` guards that the old short Stock select class is not used in Stock worker forms or Stock page filters.
- `docs/STOCK_TEST_LIST_FOR_OWNER.md` and `docs/STOCK_REMOTE_QA_VERCEL.md` now include owner/Vercel QA steps for item edit and filter dropdown touch targets.

Manual QA still required:

- Sign in as an allowed stock user.
- Open `/stock/items` around 390px width, edit an item, and confirm category/default-brand dropdowns are easy to tap.
- Open `/stock/movements` and, as allowed, `/stock/reports` around 390px width and confirm movement type/status dropdowns are easy to tap.
- Capture screenshots or a short video from Vercel or a real phone because local browser automation could not run in this sandbox.

## 2026-06-24 Receive And Return Assigned Location Defaults

Scope:

- Updated receive-transfer so the signed-in worker's active assigned stock location is preferred for the receiving location.
- Updated normal Stock Return so the signed-in worker's active assigned stock location is preferred for the return location.
- Added short green worker cues for receiving and return location context; Stock Return now shows the selected `Returning to` card first and keeps location changes under `Change return location`.
- Kept quick location buttons and dropdowns editable before scanning.
- No receive-transfer validation, wrong-location blocking, return validation, server action, RPC, RLS policy, database schema, migration, role access, or stock movement behavior was changed.

Prepared / source-guarded coverage added:

- `components/stock/workflow-forms.tsx` now uses the shared assigned stock-location helper in `ReceiveTransferForm` and `ReturnForm`.
- `components/stock/stock-page.tsx` passes `profile.stockLocationId` into receive-transfer and return forms.
- `scripts/stock-mobile-ux-coverage.mjs` guards the assigned receive/return location cues.
- `docs/STOCK_TEST_LIST_FOR_OWNER.md`, `docs/STOCK_REMOTE_QA_VERCEL.md`, and `docs/STOCK_MOBILE_UX_REQUIREMENT_AUDIT.md` now include owner/Vercel QA steps for receive-transfer and return assigned-location defaults.

Manual QA still required:

- Sign in as a scoped stock worker whose profile has an assigned stock location.
- Open `/stock/receive-transfer` around 390px width and confirm it defaults to the assigned stock location with `Default receiving location: [location]. You can change it.`
- Change the receive location before scanning and confirm wrong-location receive is still blocked by the existing workflow.
- Open `/stock/return` around 390px width and confirm it shows the selected `Returning to` card first, with location changes under `Change return location`.
- Change the return location before scanning and confirm the selected location is used by the return workflow.

## 2026-06-24 Stock Take Assigned Location Default

Scope:

- Updated Stock Take session creation so the signed-in worker's active assigned stock location is preferred for the create-session location.
- Added a short green worker cue: `Default stock take location: [location]. You can change it.`
- Kept quick location buttons and the location dropdown editable before starting the session.
- No stock-take scan rule, approval rule, exception handling, server action, RPC, RLS policy, database schema, migration, role access, or stock movement behavior was changed.

Prepared / source-guarded coverage added:

- `components/stock/workflow-forms.tsx` now uses the shared assigned stock-location helper in `StockTakeWorkbench`.
- `components/stock/stock-page.tsx` passes `profile.stockLocationId` into `StockTakeWorkbench`.
- `scripts/stock-mobile-ux-coverage.mjs` guards the assigned stock-take location cue.
- `docs/STOCK_TEST_LIST_FOR_OWNER.md`, `docs/STOCK_REMOTE_QA_VERCEL.md`, and `docs/STOCK_MOBILE_UX_REQUIREMENT_AUDIT.md` now include owner/Vercel QA steps for the stock-take assigned-location default.

Manual QA still required:

- Sign in as a scoped stock worker whose profile has an assigned stock location.
- Open `/stock/stock-take` around 390px width.
- Confirm the create-session location defaults to the assigned stock location and shows `Default stock take location: [location]. You can change it.`
- Change the location before starting the session and confirm the selected location is used for the new stock take.

## 2026-06-24 Inbound Assigned Location Default

Scope:

- Updated Barcode Inbound initial setup so the signed-in worker's active assigned stock location is preferred when the page opens.
- Older browser-saved inbound presets can still help with product, brand, and origin, but they no longer override an active assigned stock location on initial page open.
- Added a short green worker cue: `Using location: [location]. Profile default.`
- Kept the confirmed rule that the worker can edit the location before the first saved scan; after the first saved scan, session scope remains locked until finishing.
- No inbound save rule, barcode validation, server action, RPC, RLS policy, database schema, migration, role access, or stock movement behavior was changed.

Prepared / source-guarded coverage added:

- `components/stock/workflow-forms.tsx` now uses `assignedInboundLocationId` with `defaultLocationId` when building the initial inbound preset.
- `scripts/stock-mobile-ux-coverage.mjs` guards the assigned-location default and worker-facing default-location message.
- `docs/STOCK_TEST_LIST_FOR_OWNER.md`, `docs/STOCK_REMOTE_QA_VERCEL.md`, and `docs/STOCK_MOBILE_UX_REQUIREMENT_AUDIT.md` now include owner/Vercel QA steps for the assigned-location default.

Manual QA still required:

- Sign in as a scoped stock worker whose profile has an assigned stock location.
- Open `/stock/inbound` around 390px width after previously using another inbound location in the same browser.
- Confirm the page opens with the assigned stock location selected and shows `Using location: [location]. Profile default.`
- Change location before the first scan and confirm the selected location is used.
- Save one scan and confirm product, brand, origin, and location are locked until `Finish Inbound Session`.

## 2026-06-24 Outbound Blocked Scan Row Visibility

Scope:

- Updated Stock Outbound scanned rows so missing, blocked-status, or wrong-transfer-destination barcodes turn red in the scanned list itself.
- Added short row guidance: `Barcode not found. Remove before confirm.`, `Blocked. Remove before confirm.`, and `Wrong destination. Remove before confirm.`
- Kept the existing pre-confirm warning cards and blocking rules unchanged.
- No outbound business rule, substitution rule, transfer rule, barcode validation, server action, RPC, RLS policy, database schema, migration, role access, or stock movement behavior was changed.

Prepared / source-guarded coverage added:

- `components/stock/workflow-forms.tsx` now renders row-level red styling and short remove-before-confirm guidance for blocked outbound rows.
- `scripts/stock-mobile-ux-coverage.mjs` guards the row-level blocked scan messages and red styling.
- `docs/STOCK_TEST_LIST_FOR_OWNER.md`, `docs/STOCK_REMOTE_QA_VERCEL.md`, and `docs/STOCK_MOBILE_UX_REQUIREMENT_AUDIT.md` now include owner/Vercel QA steps for the red blocked outbound row state.
- `node scripts\stock-mobile-ux-coverage.mjs`, `node scripts\stock-owner-qa-doc-coverage.mjs`, `node scripts\stock-scanner-coverage.mjs`, `npm.cmd run smoke`, `npm.cmd run lint`, `npm.cmd run typecheck`, and `npm.cmd run build` passed after the change.

Manual QA still required:

- Open `/stock/outbound` around 390px width.
- Scan or enter a missing barcode and confirm that row is red with `Barcode not found. Remove before confirm.`
- Scan a blocked-status barcode and confirm that row is red with `Blocked. Remove before confirm.`
- For direct transfer, scan a barcode already at the selected destination and confirm that row is red with `Wrong destination. Remove before confirm.`
- Remove each blocked row before final confirm and verify the scanned count/known weight updates.

## 2026-06-24 Barcode Field Online Guard

Scope:

- Added an online-only guard directly to the shared Stock barcode field.
- If the browser reports offline, the manual barcode input and `Scan Barcode` button are disabled with `Connection lost. Please reconnect before scanning.`
- If the connection drops while the scanner is open, the camera stream is stopped and detected values are not forwarded to the workflow.
- No barcode decoding, scan submission, server action, RPC, RLS policy, database schema, migration, role access, or stock movement behavior was changed.

Prepared / source-guarded coverage added:

- `components/stock/barcode-scanner.tsx` listens for browser online/offline events and blocks offline manual/camera scans.
- `scripts/stock-scanner-coverage.mjs` and `scripts/stock-mobile-ux-coverage.mjs` guard the barcode-field online-only behavior.

Manual QA still required:

- Open any Stock scan page around 390px width.
- Turn off internet and confirm the manual barcode input is disabled.
- Tap `Scan Barcode`, then turn off internet and confirm the scanner closes or stops.
- Confirm the visible message is exactly `Connection lost. Please reconnect before scanning.`
- Confirm no scan is saved while offline.

## 2026-06-24 Scanner Modal Aim Guidance

Scope:

- Updated the shared Stock camera scanner modal to tell workers rear camera is preferred when available.
- Added a visible scan frame over the camera preview with `Keep barcode inside the box.`
- Camera startup errors now use assertive alert announcement.
- No barcode decoding, scan submission, server action, RPC, RLS policy, database schema, migration, role access, or stock movement behavior was changed.

Prepared / source-guarded coverage added:

- `components/stock/barcode-scanner.tsx` renders rear-camera guidance and the scan frame hint.
- `scripts/stock-scanner-coverage.mjs` and `scripts/stock-mobile-ux-coverage.mjs` guard the new scanner guidance.

Manual QA still required:

- Open any Stock scan page around 390px width.
- Tap `Scan Barcode` and confirm the camera modal says rear camera is preferred.
- Confirm the preview shows the scan frame and `Keep barcode inside the box.`
- Confirm camera-denied or camera-busy errors are short red worker messages.

## 2026-06-24 Return And Damage Scan Context Cards

Scope:

- Added a green `Returning to` card above the Stock Return scanner after a return location is selected.
- Added an amber `Requesting damage` card above the Damage/Spoilage scanner after a damage photo is selected.
- Added an amber `Returning supplier` card above the Return Supplier scanner after a supplier is selected.
- Kept existing return/damage rules unchanged: normal return saves through the return workflow, damage/spoilage creates an approval request only, and return-supplier stock goes on supplier hold until manager approval.
- No return, damage/spoilage, return-supplier, server action, RPC, RLS policy, database schema, migration, role access, or stock movement behavior was changed.

Prepared / source-guarded coverage added:

- `components/stock/workflow-forms.tsx` renders return, damage, and supplier-return scan context cards above their barcode fields.
- `scripts/stock-mobile-ux-coverage.mjs` guards `Returning to`, `Requesting damage`, `Returning supplier`, and their short worker messages.

Manual QA still required:

- Open `/stock/return` around 390px width.
- Choose a return location and confirm the green `Returning to` card appears above the scanner.
- Add a damage photo and confirm the amber `Requesting damage` card appears before damage scanning.
- Choose a supplier and confirm the amber `Returning supplier` card appears before supplier-return scanning.

## 2026-06-24 Transfer Scan Context Cards

Scope:

- Added a green `Sending to` card above the Transfer scanner after a destination stock location is selected.
- Added a green `Receiving at` card above the Receive Transfer scanner after a receiving stock location is selected.
- The receive card reminds workers: `Scan only barcodes for this destination.`
- Kept the existing wrong-location receive-transfer block unchanged.
- No transfer/receive-transfer business rule, server action, RPC, RLS policy, database schema, migration, role access, or stock movement behavior was changed.

Prepared / source-guarded coverage added:

- `components/stock/workflow-forms.tsx` renders the transfer and receive-transfer scan context cards above their barcode fields.
- `scripts/stock-mobile-ux-coverage.mjs` guards `Sending to`, `Receiving at`, selected location names, and `Scan only barcodes for this destination.`

Manual QA still required:

- Open `/stock/transfer` around 390px width, select a destination, and confirm the green `Sending to` card appears above the scanner.
- Open `/stock/receive-transfer` around 390px width, select a receiving location, and confirm the green `Receiving at` card appears above the scanner.
- Confirm wrong-location receive still blocks with `Wrong location. This barcode must be received at [destination location].`

## 2026-06-24 Outbound Scan Context Card

Scope:

- Added a green `Scanning outbound` card above the Stock Outbound scanner after the order/direct setup is ready.
- For order outbound, the card shows the selected order number and customer.
- For direct outbound, the card shows the selected outbound type; transfer also shows the selected destination location.
- The card reminds workers: `Scan multiple barcodes, then confirm.`
- No outbound business rule, substitution rule, damage/spoilage approval behavior, server action, RPC, RLS policy, database schema, migration, role access, or stock movement behavior was changed.

Prepared / source-guarded coverage added:

- `components/stock/workflow-forms.tsx` renders the outbound scan context card above the barcode field.
- `scripts/stock-mobile-ux-coverage.mjs` guards `Scanning outbound` and `Scan multiple barcodes, then confirm.`

Manual QA still required:

- Open `/stock/outbound` around 390px width.
- Select a ready order and confirm the green `Scanning outbound` card shows the order and customer before scanning.
- Switch to direct outbound and confirm the card shows the selected direct outbound type.
- Select transfer and confirm the destination appears in the card before scanning.

## 2026-06-24 Inbound Scan Context Card

Scope:

- Added a green `Scanning inbound` card above the Barcode Inbound scanner after product, brand, origin, and location are selected.
- The card shows the active brand, product, origin, and location so phone workers can confirm the save context before scanning.
- After the first saved scan, the card shows `Session locked. Finish first.`
- No inbound save rule, duplicate validation, label generation, undo/audit behavior, server action, RPC, RLS policy, database schema, migration, role access, or stock movement behavior was changed.

Prepared / source-guarded coverage added:

- `components/stock/workflow-forms.tsx` renders the inbound scan context card above the barcode field.
- `scripts/stock-mobile-ux-coverage.mjs` guards `Scanning inbound` and `Session locked. Finish first.`

Manual QA still required:

- Open `/stock/inbound` around 390px width.
- Choose product, brand, origin, and location.
- Confirm the green `Scanning inbound` card appears above the scanner and shows the correct context.
- Save one scan and confirm the same card shows `Session locked. Finish first.`

## 2026-06-24 Stock Take Active Scope Card

Scope:

- Added a green `Scanning for` card above the Stock Take scanner so phone workers see the active item, brand, and location before scanning.
- Added short rule copy in that card: `Wrong item or brand is blocked.`
- Kept existing Stock Take rules unchanged: wrong item/brand scans are blocked, unknown barcodes are exceptions, and missing-barcode adjustment still waits for manager review and director approval.
- No stock-take business rule, server action, RPC, RLS policy, database schema, migration, role access, or stock movement behavior was changed.

Prepared / source-guarded coverage added:

- `components/stock/workflow-forms.tsx` now renders the active Stock Take scan scope before the barcode field.
- `scripts/stock-mobile-ux-coverage.mjs` guards the `Scanning for` card, selected location text, and `Wrong item or brand is blocked.` copy.

Manual QA still required:

- Open `/stock/stock-take` around 390px width.
- Start or select an active draft session.
- Confirm the green `Scanning for` card appears above the scanner and shows brand, item, and location.
- Confirm the card fits without horizontal scrolling and the scanner remains easy to reach.

## 2026-06-24 Stock Mobile QA Preparation Re-run

Scope:

- Re-ran the local Stock mobile source coverage for the requested worker QA areas: Stock home buttons, inbound session, continuous scanning UI, duplicate warning, no-weight warning, label generation, label reprint, outbound by order, direct outbound, damage/spoilage request, transfer, receive-transfer wrong-location block, stock-take progress, unknown-barcode exception, and online-only connection message.
- Added `docs/STOCK_MOBILE_UX_REQUIREMENT_AUDIT.md` to track every confirmed Stock Mobile MVP requirement as source-guarded, partial, or manual-evidence-pending.
- Confirmed from source that damage/spoilage photo capture uses image inputs with phone rear-camera hint, `Photo selected:` feedback, `Photo reference fallback`, and the short `Add damage photo first.` scanner block.
- Confirmed no Stock business rule, barcode validation, server action, RPC, RLS policy, database schema, migration, role access, or stock movement behavior was changed in this QA-preparation pass.

Prepared / source-guarded coverage confirmed:

- `node scripts\stock-mobile-ux-coverage.mjs` passed.
- `scripts/stock-owner-qa-doc-coverage.mjs` now guards the Stock Mobile UX requirement audit during `npm.cmd run smoke`.
- `npm.cmd run smoke` passed, including Stock mobile UX, scanner, label, stock-take, report, RLS-policy, security, and owner-QA doc guards.
- `npm.cmd run lint` passed.
- `npm.cmd run typecheck` passed.
- `npm.cmd run build` passed.

Manual QA still required:

- Open the Vercel app around 390px width and capture real page evidence for the Stock home, inbound, outbound, transfer, receive-transfer, return/damage, stock take, stock unit reprint, balance, and movement pages.
- Test phone camera permission, rear-camera scanning, scanner close/stop behavior, sound/vibration, and continuous scan comfort on a real phone.
- Test Bluetooth label printer selection/output first, then PDF fallback for a 50mm x 30mm label.
- Confirm live Supabase worker, manager, admin, and director data scopes with real test accounts.

## 2026-06-24 Outbound Warning Announcements

Scope:

- Continued the Stock Module Mobile UX goal only.
- Updated Stock Outbound warning cards so setup/confirm warnings, weight-difference warnings, and substitution reminders are exposed as polite status text.
- Kept the confirmed outbound rule unchanged: meat weight differences and substitutions remain warning-only, and no typed substitution reason is required.
- No outbound business rule, barcode validation, server action, RPC, RLS policy, database schema, migration, role access, or stock movement behavior was changed.

Prepared / source-guarded coverage added:

- `components/stock/workflow-forms.tsx` now marks outbound warning cards with `role="status"` and `aria-live="polite"`.
- `scripts/stock-mobile-ux-coverage.mjs` guards the outbound warning copy and status behavior.
- `node scripts\stock-mobile-ux-coverage.mjs`, `npm.cmd run smoke`, `npm.cmd run lint`, `npm.cmd run typecheck`, and `npm.cmd run build` passed after the change.

Manual QA still required:

- Open `/stock/outbound` around 390px width.
- Select order outbound, scan a different weight or substituted item, and confirm the yellow `Check before confirm` warning is readable.
- Confirm the warning still allows confirmation after the worker checks/acknowledges substitution where required.
- If using a screen reader or browser accessibility inspector, confirm the yellow warning is exposed as status text.

## 2026-06-24 Stock Scan Feedback Live Announcements

Scope:

- Continued the Stock Module Mobile UX goal only.
- Added explicit live-region priority to Stock worker scan feedback messages for transfer, receive-transfer, return, damage/spoilage, return supplier, and stock take.
- Blocked messages now announce assertively, while success/progress feedback stays polite.
- Tried to connect to the in-app browser for stronger 390px verification, but the browser runtime was blocked by the Windows sandbox with `CreateProcessAsUserW failed: 5`.
- No stock business rule, server action, RPC, RLS policy, database schema, migration, role access, or stock movement behavior was changed.

Prepared / source-guarded coverage added:

- `components/stock/workflow-forms.tsx` now sets `aria-live` on local scan feedback blocks for transfer, receive-transfer, return, damage/spoilage, return supplier, and stock take.
- `scripts/stock-mobile-ux-coverage.mjs` guards those local scan feedback live announcements.

Manual QA still required:

- Open `/stock/transfer`, `/stock/receive-transfer`, `/stock/return`, and `/stock/stock-take` around 390px width.
- Trigger one success and one blocked/setup message on each page.
- Confirm success/progress messages are clear and blocked messages are short, red or yellow as appropriate, and announced by accessibility tools where available.
- Complete real authenticated 390px browser/device QA because local browser automation could not run in this environment.

## 2026-06-24 Receive-Transfer Wrong-Location Reminder

Scope:

- Continued the Stock Module Mobile UX goal only.
- Updated the receive-transfer mobile reminder from `Wrong location is blocked.` to `Wrong location is blocked. Receive only at the barcode destination.`
- Marked the reminder as polite status text so the rule is easier to notice on phone workflows.
- Kept the server-side wrong-location block unchanged; the actual blocked action still returns the destination-specific error.
- No transfer/receive-transfer business rule, stock movement, server action, RPC, RLS policy, database schema, migration, or role access was changed.

Prepared / source-guarded coverage added:

- `components/stock/workflow-forms.tsx` now shows the clearer receive-transfer wrong-location reminder with `role="status"` and `aria-live="polite"`.
- `scripts/stock-mobile-ux-coverage.mjs` guards the clearer reminder text.
- `node scripts\stock-mobile-ux-coverage.mjs`, `npm.cmd run smoke`, `npm.cmd run lint`, `npm.cmd run typecheck`, and `npm.cmd run build` passed after the change.

Manual QA still required:

- Open `/stock/receive-transfer` around 390px width.
- Confirm the red reminder says `Wrong location is blocked. Receive only at the barcode destination.`
- Try receiving a transfer at the wrong location and confirm the server error still says `Wrong location. This barcode must be received at [destination location].`

## 2026-06-24 Stock Take Warning Announcement

Scope:

- Continued the Stock Module Mobile UX goal only.
- Updated the existing Stock Take active-session warning so the yellow `Stock take is active for this item/manufacturer/location. You can continue, but this movement will be recorded.` message is announced as a polite status update.
- Kept the confirmed rule unchanged: other stock operations during active stock take warn only and do not block.
- No stock-take approval rule, scan exception handling, server action, RLS policy, database schema, migration, stock movement behavior, or role access was changed.

Prepared / source-guarded coverage added:

- `components/stock/workflow-forms.tsx` now marks the Stock Take warning with `role="status"` and `aria-live="polite"`.
- `scripts/stock-mobile-ux-coverage.mjs` guards the warning text and status announcement marker.
- `node scripts\stock-mobile-ux-coverage.mjs`, `npm.cmd run smoke`, `npm.cmd run lint`, `npm.cmd run typecheck`, and `npm.cmd run build` passed after the change.

Manual QA still required:

- Open `/stock/stock-take` around 390px width.
- Start or select a stock-take session and confirm the yellow warning is visible.
- If using a screen reader or browser accessibility inspector, confirm the warning is exposed as status text.
- Confirm other stock operations for the active item/brand/location still show the warning and are not blocked by this UI change.

## 2026-06-24 Inbound Duplicate Alert Semantics

Scope:

- Continued the Stock Module Mobile UX goal only.
- Updated the Barcode Inbound duplicate warning so the red `Duplicate barcode. Inbound is blocked.` message uses urgent alert semantics.
- The existing duplicate detection and save blocking behavior remain unchanged.
- No inbound business rule, stock save logic, duplicate validation, server action, RLS policy, database schema, migration, or stock movement behavior was changed.

Prepared / source-guarded coverage added:

- `components/stock/workflow-forms.tsx` now marks the duplicate barcode warning with `role="alert"` and `aria-live="assertive"`.
- `scripts/stock-mobile-ux-coverage.mjs` guards the duplicate warning text and alert markers.
- `node scripts\stock-mobile-ux-coverage.mjs` passed after the change.
- `npm.cmd run smoke`, `npm.cmd run lint`, `npm.cmd run typecheck`, and `npm.cmd run build` passed after the change.

Manual QA still required:

- Open `/stock/inbound` around 390px width.
- Save or use an existing test barcode.
- Scan the same barcode again and confirm the red duplicate warning appears immediately.
- Confirm the duplicate scan is not saved and does not increase saved count or saved weight.

## 2026-06-24 Inbound Session Summary 390px Layout

Scope:

- Continued the Stock Module Mobile UX goal only.
- Updated Barcode Inbound live session counters so `Saved scans` and `Saved weight` use the 390px mobile breakpoint.
- Updated the finished inbound session summary so total units, total weight, and duplicate/error scans use the 390px mobile breakpoint.
- No inbound business rule, scan locking, duplicate blocking, label generation, undo/audit behavior, server action, RLS policy, database schema, migration, or stock movement behavior was changed.

Prepared / source-guarded coverage added:

- `components/stock/workflow-forms.tsx` now uses `min-[390px]:grid-cols-2` for live inbound counters and the finished summary grid.
- `scripts/stock-mobile-ux-coverage.mjs` guards the 390px inbound counter and summary grid classes.
- `node scripts\stock-mobile-ux-coverage.mjs` passed after the change.

Manual QA still required:

- Open `/stock/inbound` around 390px width.
- Scan or manually save at least two barcodes.
- Confirm `Saved scans` and `Saved weight` sit side by side without horizontal scrolling.
- Finish the session and confirm total units, total weight, and duplicate/error scans stay readable around 390px width.

## 2026-06-24 Outbound Scan Summary 390px Layout

Scope:

- Continued the Stock Module Mobile UX goal only.
- Updated the Stock Outbound scan summary so `Scanned units`, `Known weight`, and `Unknown scans` use the 390px mobile breakpoint.
- This helps workers see the outbound batch status at a glance while scanning on common phone widths.
- No outbound business rule, barcode validation, substitution rule, damage request flow, server action, RLS policy, database schema, migration, or stock movement behavior was changed.

Prepared / source-guarded coverage added:

- `components/stock/workflow-forms.tsx` now uses `min-[390px]:grid-cols-3` for the outbound scan summary metrics.
- `scripts/stock-mobile-ux-coverage.mjs` guards the three outbound summary labels and 390px grid class.
- `node scripts\stock-mobile-ux-coverage.mjs` passed after the change.

Manual QA still required:

- Open `/stock/outbound` around 390px width.
- Select order/direct setup and scan or manually add barcodes.
- Confirm `Scanned units`, `Known weight`, and `Unknown scans` appear side by side without horizontal scrolling.
- Confirm removing a wrong scan still updates the summary.

## 2026-06-24 Label Print Guidance Card

Scope:

- Continued the Stock Module Mobile UX goal only.
- Changed the Stock label print note from plain helper text into a green worker guidance card.
- The note now says to try the Bluetooth label printer first, use PDF fallback if unavailable, confirms `50mm x 30mm`, and states that one label prints per page.
- No label generation, barcode format, stock auto-save, print/PDF behavior, server action, RLS policy, database schema, or migration was changed.

Prepared / source-guarded coverage added:

- `components/stock/stock-label.tsx` includes `Bluetooth label printer first.` and `One label prints per page.`
- `scripts/stock-label-coverage.mjs` and `scripts/stock-mobile-ux-coverage.mjs` guard the clearer label guidance.
- `node scripts\stock-label-coverage.mjs` passed after the change.
- `node scripts\stock-mobile-ux-coverage.mjs` passed after the change.

Manual QA still required:

- Open label generation and `/stock/units/[id]` around 390px width.
- Confirm the green guidance card is readable without horizontal scrolling.
- Tap `Print label` and choose a Bluetooth label printer where supported.
- Tap `PDF fallback` and confirm the saved/printed output is one 50mm x 30mm label per page.

## 2026-06-24 Stock Take Progress 390px Layout

Scope:

- Continued the Stock Module Mobile UX goal only.
- Updated Stock Take progress so barcode count and total weight progress use the 390px mobile breakpoint.
- This lets workers compare count progress and weight progress side by side on common phone widths while scanning.
- No Stock business rule, stock-take approval rule, exception handling, server action, RLS policy, database schema, migration, or stock movement behavior was changed.

Prepared / source-guarded coverage added:

- `components/stock/workflow-forms.tsx` now uses `min-[390px]:grid-cols-2` for the Stock Take barcode/weight progress pair.
- `scripts/stock-mobile-ux-coverage.mjs` guards the 390px Stock Take progress grid.
- `node scripts\stock-mobile-ux-coverage.mjs` passed after the change.

Manual QA still required:

- Open `/stock/stock-take` around 390px width.
- Select or start an active stock-take session.
- Confirm `Barcode progress` and `Weight progress` appear side by side without horizontal scrolling.
- Scan a test barcode and confirm the progress values update.

## 2026-06-24 Receive-Transfer Location Wording

Scope:

- Continued the Stock Module Mobile UX goal only.
- Updated the shared Stock location picker so transfer flows can keep destination wording while receive-transfer uses receiving-location wording.
- Receive-transfer now shows `Quick receiving locations`, `Tap receiving location to scan faster.`, and a green `Selected receiving location` confirmation before barcode scanning.
- Transfer and direct transfer still use destination-location wording.
- No Stock business rule, server action, RLS policy, database schema, migration, barcode validation, or transfer/receive-transfer state transition was changed.

Prepared / source-guarded coverage added:

- `components/stock/workflow-forms.tsx` supports context-specific quick-location labels.
- `scripts/stock-mobile-ux-coverage.mjs` guards `Quick receiving locations`, `Selected receiving location`, and the green selected-location confirmation.
- `node scripts\stock-mobile-ux-coverage.mjs` passed after the change.

Manual QA still required:

- Open `/stock/receive-transfer` around 390px width.
- Confirm quick buttons say `Quick receiving locations`, not `Quick destinations`.
- Tap a receiving location and confirm the green selected-location confirmation appears before scanning.
- Confirm wrong-location receive still blocks with `Wrong location. This barcode must be received at [destination location].`

## 2026-06-24 Stock Scanner Blocked Reason Announcement

Scope:

- Continued the Stock Module Mobile UX goal only.
- Improved the shared Stock barcode field so disabled scan reasons are linked to the manual barcode field and camera scan button.
- `Connection lost. Please reconnect before scanning.` now uses alert/urgent announcement behavior, while setup blockers such as missing product/location remain polite status messages.
- Camera scan button text for assistive technology now includes the blocked reason when scanning is unavailable.
- No Stock business rule, server action, RLS policy, database schema, migration, barcode validation, or stock movement behavior was changed.

Prepared / source-guarded coverage added:

- `components/stock/barcode-scanner.tsx` now uses a shared disabled-reason id for the manual input, scan button, and visible message.
- `scripts/stock-mobile-ux-coverage.mjs` guards `aria-describedby`, urgent connection-loss announcement behavior, and blocked scan-button wording.
- `node scripts\stock-mobile-ux-coverage.mjs` passed after the change.

Manual QA still required:

- Open inbound, outbound, transfer, receive-transfer, return/damage, and stock take around 390px width.
- Turn off internet and confirm the red `Connection lost. Please reconnect before scanning.` message is obvious and no scan is saved.
- Confirm normal setup blockers still show the yellow worker message under the scan field.

## 2026-06-24 Stock Mobile QA Preparation Pass

Scope:

- Ran a Stock-only mobile QA preparation pass for the requested worker flows.
- Reviewed the source guards and owner QA steps for: Stock home buttons, inbound session, continuous scanning UI, duplicate warning, no-weight warning, label generation, label reprint, outbound by order, direct outbound, damage/spoilage request, transfer, receive-transfer wrong-location block, stock-take progress, unknown-barcode exception, and online-only connection message.
- Confirmed the automated Stock smoke suite includes mobile UX, scanner, label, stock-take, report, RLS-policy, security, and owner-QA document guards.
- Confirmed the local app can start in foreground with `npm.cmd run dev -- --port 3001`; authenticated 390px browser-route QA was not completed because a stable background local browser server was not available in this run.
- No app code, database schema, server action, RLS policy, migration, role access, or Stock workflow behavior was changed in this QA pass.

Local command results:

- `npm.cmd run smoke` - passed.
- `npm.cmd run lint` - passed.
- `npm.cmd run typecheck` - passed.
- `npm.cmd run build` - passed.

Prepared / source-guarded coverage:

| Area | Local status | Owner/device QA still required |
| --- | --- | --- |
| Stock home buttons | Source guarded for six worker buttons and no worker finance/report/settings content. | Open `/stock` around 390px as a stock worker and confirm the two-column button layout. |
| Inbound session | Source guarded for recent templates, product search, required brand/origin/location, session lock, saved count, saved total, and previous scan feedback. | Scan or manually enter two unique test barcodes in a real Supabase-backed session. |
| Continuous scanning UI | Source guarded for large scanner controls, manual fallback, short disabled reasons, and current-session scan list. | Confirm the camera stays ready between scans on a phone. |
| Duplicate warning | Source guarded for `Duplicate barcode. Inbound is blocked.` and duplicate prevention checks. | Scan the same test barcode twice and confirm no second stock unit is saved. |
| No-weight warning | Source guarded for no-weight blocking and internal-label guidance. | Scan a no-weight barcode and confirm the worker is sent to label generation before saving. |
| Label generation | Source guarded for generated numeric barcode, stock auto-save wording, 50mm x 30mm label, print action, and PDF fallback. | Print or save a PDF label from a phone/browser and scan the generated label. |
| Label reprint | Source guarded for stock-unit reprint without reason and mobile print controls. | Open `/stock/units/[id]` and reprint from a real device. |
| Outbound by order | Source guarded for selecting order first, quick ready orders, previous outbound scan, substitution warning, and removable scanned rows. | Scan order barcodes and confirm warning-only substitutions with real data. |
| Direct outbound | Source guarded for Sales, Processing, Transfer, Sample/Testing, Damage/Spoilage, Return Supplier, quick remarks, required Sales customer, and required direct remarks. | Confirm direct Sales cannot scan until a customer is selected, Sample/Testing has no photo, and remarks are still required. |
| Damage/spoilage request | Source guarded for photo-first request flow and no immediate stock deduction copy. | Take/choose a real photo and verify the request stays pending approval. |
| Transfer | Source guarded for quick destinations, scan-and-done transfer, previous transfer scan, and `TRANSFER_PENDING` flow. | Transfer a barcode and confirm location does not change until receive. |
| Receive-transfer wrong-location block | Source guarded for strict wrong-location receive blocking. | Try the wrong receiving location and confirm `Wrong location. This barcode must be received at [destination location].` |
| Stock take progress | Source guarded for barcode count progress, weight progress, active-session selection, and scan-only flow. | Run a real stock-take session and confirm progress updates after each scan. |
| Unknown barcode exception | Source guarded for unknown-barcode exception copy and latest-scan feedback. | Scan an unknown barcode and confirm it is recorded as an exception, not active stock. |
| Online-only message | Source guarded for `Connection lost. Please reconnect before scanning.` and scanner disabled/close behavior. | Turn off internet on a phone across each Stock scan page and confirm no scan is saved. |

Device-only evidence still pending:

- Real phone camera permission, rear-camera selection, continuous scan comfort, sound/vibration, and camera stream stop.
- Bluetooth label printer selection and actual 50mm x 30mm output.
- Authenticated Vercel 390px screenshots/videos for every requested Stock worker page.
- Live Supabase RLS/data evidence for worker, manager, admin, and director scopes.

## 2026-06-24 Stock Movement History Mobile Cards

Scope:

- Continued the Stock Module Mobile UX goal only.
- Stock Movement History now shows mobile summary cards before the full movement table.
- Cards show movement type, item, barcode, weight, quantity, from location, to location, time, and reference where available.
- The existing movement table remains below for full detail.
- No stock value, cost, or finance data was added.
- No stock data, RLS policy, server action, migration, validation, or workflow rule was changed.

Prepared / source-guarded QA coverage added:

- `components/stock/stock-page.tsx` includes `MobileStockMovementCards`.
- Mobile cards are hidden on larger screens with `md:hidden`, while the existing table remains available.
- `scripts/stock-mobile-ux-coverage.mjs` guards `Mobile movement history`, quantity/weight labels, barcode display, and the first-8 movement note.

Manual QA still required:

- Open `/stock/movements` as a stock worker around 390px width.
- Confirm cards show movement type, item, barcode, quantity, and weight without horizontal scrolling.
- Confirm no cost, value, or finance data appears.
- Confirm the full table remains available below for detailed review.

## 2026-06-24 Stock Balance Mobile Cards

Scope:

- Continued the Stock Module Mobile UX goal only.
- Stock Balance now shows mobile summary cards before the full balance table.
- Cards show item, location, category, barcode units, total kg, total quantity, barcode kg, and alert state.
- No stock value, cost, or finance data was added.
- The existing balance table remains for full detail.
- No stock data, RLS policy, server action, migration, validation, or workflow rule was changed.

Prepared / source-guarded QA coverage added:

- `components/stock/stock-page.tsx` includes `MobileStockBalanceCards`.
- Mobile cards are hidden on larger screens with `md:hidden`, while the existing table remains available.
- `scripts/stock-mobile-ux-coverage.mjs` guards `Mobile stock balance`, quantity/weight labels, and the first-8 balance note.

Manual QA still required:

- Open `/stock/balance` as a stock worker around 390px width.
- Confirm cards show quantity and weight only, with no cost/value/finance data.
- Confirm the full table remains available below for detailed review.

## 2026-06-24 Stock Unit Mobile Movement Summary

Scope:

- Continued the Stock Module Mobile UX goal only.
- Stock unit detail now shows a mobile movement summary card list before the full movement table.
- The summary shows the latest movement type, time, weight, from location, to location, and reference where available.
- The existing movement history table remains for full audit detail.
- No stock-unit data, movement data, label reprint logic, server action, RLS policy, migration, validation, or workflow rule was changed.

Prepared / source-guarded QA coverage added:

- `components/stock/stock-unit-detail.tsx` includes `MobileMovementCards`.
- Mobile cards are hidden on larger screens with `md:hidden`, while the existing table remains available.
- `scripts/stock-mobile-ux-coverage.mjs` guards `Mobile movement summary` and the latest-6 movement note.

Manual QA still required:

- Open `/stock/units/[id]` around 390px width.
- Confirm movement cards are readable without horizontal scrolling.
- Confirm the full table remains available below for audit/detail review.

## 2026-06-24 Stock Unit Mobile Back Button

Scope:

- Continued the Stock Module Mobile UX goal only.
- Stock unit detail now uses a full-width phone-size `Back to stock balance` button.
- This makes the mobile label reprint flow easier to exit after a worker reprints a label.
- No stock-unit data, label reprint logic, movement history, server action, RLS policy, migration, validation, or workflow rule was changed.

Prepared / source-guarded QA coverage added:

- `components/stock/stock-unit-detail.tsx` uses `min-h-11 w-full justify-start sm:w-fit` for the back action.
- `scripts/stock-mobile-ux-coverage.mjs` guards the larger stock-unit back button.
- Owner and Vercel QA checklists now ask testers to confirm the back button is easy to tap around 390px width.

Manual QA still required:

- Open `/stock/units/[id]` around 390px width.
- Confirm `Back to stock balance` is a full-width phone-size button and returns to `/stock/balance`.
- Confirm label reprint still works without entering a reason.

## 2026-06-24 Stock Label Print Action Grid

Scope:

- Continued the Stock Module Mobile UX goal only.
- Stock label print actions now switch to a two-column grid at 390px width.
- `Print label` remains the primary phone/Bluetooth print path and `PDF fallback` remains available beside it at the target mobile width.
- No label generation logic, barcode content, print CSS, server action, RLS policy, migration, validation, or stock workflow rule was changed.

Prepared / source-guarded QA coverage added:

- `components/stock/stock-label.tsx` uses `min-[390px]:grid-cols-2` for label print actions.
- `scripts/stock-mobile-ux-coverage.mjs` guards the mobile label print action grid.
- Owner and Vercel QA checklists now ask testers to confirm `Print label` and `PDF fallback` fit side by side around 390px width.

Manual QA still required:

- Generate an internal label on a real phone or 390px viewport.
- Confirm `Print label` and `PDF fallback` are visible side by side without horizontal scrolling.
- Test a Bluetooth label printer where the phone/browser supports it, and save a PDF fallback when it does not.

## 2026-06-24 Stock Scanner Phone Header Layout

Scope:

- Continued the Stock Module Mobile UX goal only.
- Barcode scan fields now keep the label and large `Scan Barcode` button stacked on phone widths.
- The label and Scan button switch to a row only from the larger `sm` breakpoint.
- This prevents the full-width Scan button from being squeezed beside the label around 390px width.
- No scanner camera logic, server action, RLS policy, migration, validation, or stock workflow rule was changed.

Prepared / source-guarded QA coverage added:

- `components/stock/barcode-scanner.tsx` uses `flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between`.
- `scripts/stock-mobile-ux-coverage.mjs` guards the stacked phone scanner layout and blocks the old `min-[390px]:flex-row` scanner header.
- Owner and Vercel QA checklists now ask testers to confirm the Scan button is full-width and not squeezed beside the label at 390px.

Manual QA still required:

- Open inbound, outbound, transfer, receive-transfer, return/damage, and stock-take scanner fields around 390px width.
- Confirm the barcode label appears above the large `Scan Barcode` button.
- Confirm there is no horizontal scrolling and the manual fallback remains usable.

## 2026-06-24 Stock Worker Home 390px Shortcut Grid

Scope:

- Continued the Stock Module Mobile UX goal only.
- Stock worker home shortcuts now switch to a two-column button grid at 390px width.
- The same six worker actions remain: Inbound, Outbound, Transfer, Receive, Return / Damage, and Stock Take.
- Button labels now allow wrapping so longer labels stay readable without horizontal scrolling.
- No Stock routing, role access, server action, RLS policy, migration, validation, or workflow rule was changed.

Prepared / source-guarded QA coverage added:

- `components/stock/stock-page.tsx` uses `min-[390px]:grid-cols-2` for Stock shortcut buttons.
- Worker shortcut buttons include wrapped, left-aligned labels for phone widths.
- `scripts/stock-mobile-ux-coverage.mjs` guards the 390px two-column shortcut grid and worker button class.

Manual QA still required:

- Open `/stock` as a general worker around 390px width.
- Confirm the page shows only the six worker action buttons.
- Confirm the buttons appear as a clean two-column grid with no horizontal scrolling.
- Confirm desktop/manager/admin access remains unchanged.

## 2026-06-24 Stock Mobile Submit Button Touch Targets

Scope:

- Continued the Stock Module Mobile UX goal only.
- Stock workflow submit buttons now default to full-width phone buttons with compact desktop sizing.
- This makes final worker actions such as submit, confirm, review, send, receive, and save easier to tap around 390px width.
- No Stock server action, RLS policy, migration, validation, or workflow rule was changed.

Prepared / source-guarded QA coverage added:

- `components/stock/workflow-forms.tsx` shared `SubmitButton` now includes `min-h-11 w-full gap-2 sm:w-auto`.
- `scripts/stock-mobile-ux-coverage.mjs` guards the mobile-first submit button class.
- Owner and Vercel QA checklists now ask testers to confirm final action buttons are full-width at phone width.

Manual QA still required:

- Open the Stock worker pages around 390px width.
- Confirm final action buttons are full-width and easy to tap on inbound, outbound, transfer, receive-transfer, return/damage, and stock take.
- Confirm desktop layout remains clean on wider screens.

## 2026-06-23 Stock Inbound Mobile Undo Button

Scope:

- Stock Module Mobile UX only.
- `/stock/inbound` current-session saved scan cards now show `Undo scan` as a full-width phone-size button.
- A short hint tells workers: `Undo before finish.`
- This makes current-session scan correction easier before the worker finishes the inbound session.
- No server action, undo audit behavior, void movement rule, RLS policy, stock movement rule, schema, migration, live Supabase data, camera permission, or printer behavior was changed.

Prepared / source-guarded QA coverage added:

- `components/stock/workflow-forms.tsx` renders the bigger undo action and short hint.
- `scripts/stock-mobile-ux-coverage.mjs` guards `Undo before finish.`
- Owner and Vercel QA checklists now ask testers to confirm the larger undo button and the post-finish undo lockout.

Manual QA still required:

- Open `/stock/inbound` on a real phone or 390px viewport.
- Save one inbound scan, tap `Undo scan`, and confirm the scan becomes `VOIDED`.
- Finish the session and confirm normal workers can no longer undo from that finished session.

## 2026-06-23 Stock Outbound Mobile Remove Scan Button

Scope:

- Stock Module Mobile UX only.
- `/stock/outbound` scanned barcode rows now include a full-width phone-size `Remove` button.
- A short hint tells workers: `Remove a wrong scan before final confirm.`
- This helps workers undo a wrong outbound scan before confirming the batch.
- No server action, outbound validation rule, substitution rule, RLS policy, stock movement rule, schema, migration, live Supabase data, camera permission, or printer behavior was changed.

Prepared / source-guarded QA coverage added:

- `components/stock/workflow-forms.tsx` renders the bigger remove action and short hint.
- `scripts/stock-mobile-ux-coverage.mjs` guards `Remove a wrong scan before final confirm.` and the phone-size button class.
- Owner and Vercel QA checklists now ask testers to remove a scanned outbound barcode before final confirm and verify count/weight updates.

Manual QA still required:

- Open `/stock/outbound` on a real phone or 390px viewport.
- Scan multiple outbound barcodes.
- Tap `Remove` on one row and confirm the scanned count and known weight update before final confirmation.

## 2026-06-23 Stock Damage And Supplier Request Previous Scan Feedback

Scope:

- Stock Module Mobile UX only.
- `/stock/return` damage/spoilage now shows `Previous damage scan` after a successful damage request submit.
- `/stock/return` supplier return now shows `Previous supplier return scan` after a successful supplier-return request submit.
- This gives phone workers a quick check of the last requested barcode before scanning the next one.
- No server action, damage approval rule, supplier-return approval rule, photo requirement, RLS policy, stock movement rule, schema, migration, live Supabase data, camera permission, or printer behavior was changed.

Prepared / source-guarded QA coverage added:

- `components/stock/workflow-forms.tsx` stores and renders previous successful damage and supplier-return request barcodes.
- `scripts/stock-mobile-ux-coverage.mjs` guards `Previous damage scan` and `Previous supplier return scan`.
- Owner and Vercel QA checklists now ask testers to confirm both previous-request barcode cards appear at about 390px width.

Manual QA still required:

- Open `/stock/return` on a real phone or 390px viewport.
- Submit one damage/spoilage request and confirm `Previous damage scan` shows the barcode.
- Submit one supplier-return request and confirm `Previous supplier return scan` shows the barcode.
- Confirm stock still is not deducted until the existing approval flows complete.

## 2026-06-23 Stock Return Previous Scan Feedback

Scope:

- Stock Module Mobile UX only.
- `/stock/return` now shows `Previous return scan` after a successful normal return submit.
- This gives phone workers a quick check of the last returned barcode before scanning the next one.
- No server action, return validation rule, inspection rule, RLS policy, stock movement rule, schema, migration, live Supabase data, camera permission, or printer behavior was changed.

Prepared / source-guarded QA coverage added:

- `components/stock/workflow-forms.tsx` stores and renders the previous successful return barcode.
- `scripts/stock-mobile-ux-coverage.mjs` guards `Previous return scan`.
- Owner and Vercel QA checklists now ask testers to confirm the previous return barcode appears at about 390px width.

Manual QA still required:

- Open `/stock/return` on a real phone or 390px viewport.
- Return one eligible barcode and confirm `Previous return scan` shows the barcode.
- Confirm blocked returns still show short red messages and customer returns still follow inspection rules.

## 2026-06-23 Stock Transfer Previous Scan Feedback

Scope:

- Stock Module Mobile UX only.
- `/stock/transfer` now shows `Previous transfer scan` after a successful transfer barcode submit.
- `/stock/receive-transfer` now shows `Previous receive scan` after a successful receive barcode submit.
- This gives phone workers a quick check of the last barcode before scanning the next one.
- No server action, wrong-location receive block, transfer status rule, RLS policy, stock movement rule, schema, migration, live Supabase data, camera permission, or printer behavior was changed.

Prepared / source-guarded QA coverage added:

- `components/stock/workflow-forms.tsx` stores and renders the previous successful transfer and receive barcode.
- `scripts/stock-mobile-ux-coverage.mjs` guards `Previous transfer scan` and `Previous receive scan`.
- Owner and Vercel QA checklists now ask testers to confirm the previous transfer/receive barcode appears at about 390px width.

Manual QA still required:

- Open `/stock/transfer` and `/stock/receive-transfer` on a real phone or 390px viewport.
- Send one transfer barcode and confirm `Previous transfer scan` shows the barcode.
- Receive one transfer barcode and confirm `Previous receive scan` shows the barcode.
- Confirm wrong-location receive still blocks with the existing destination-location message.

## 2026-06-23 Stock Damage Photo-First Mobile Flow

Scope:

- Stock Module Mobile UX only.
- Direct outbound damage/spoilage and `/stock/return` damage/spoilage now keep the phone photo picker as the primary worker action.
- After a photo is chosen, workers see `Photo selected:` instead of needing to type into the main form.
- Manual photo reference entry remains available inside a collapsed `Photo reference fallback` section for cases where the picker does not fill the file name.
- No server action, photo requirement, damage approval rule, RLS policy, stock movement rule, schema, migration, live Supabase data, camera permission, or printer behavior was changed.

Prepared / source-guarded QA coverage added:

- `components/stock/workflow-forms.tsx` renders `Photo selected:`, `Take photo before scanning.`, and `Photo reference fallback`.
- `scripts/stock-mobile-ux-coverage.mjs` guards the photo-first copy and fallback panel.
- Owner and Vercel QA checklists now ask testers to confirm the damage photo picker fills the selected-photo state without typing.

Manual QA still required:

- Open `/stock/outbound` and `/stock/return` on a real phone or 390px viewport.
- Use the camera/photo picker and confirm `Photo selected:` appears.
- Confirm scanning remains blocked until the photo exists.
- Open `Photo reference fallback` only when a manual fallback reference is needed.

## 2026-06-23 Stock Take Active Session Auto-Select

Scope:

- Stock Module Mobile UX only.
- `/stock/stock-take` now selects the first active draft session by default for scanning.
- If the current selected session is not scannable and an active draft session exists, the scan form switches back to the first active draft session.
- A short green message tells workers: `First active session is selected automatically.`
- No server action, stock-take approval rule, RLS policy, stock movement rule, schema, migration, live Supabase data, camera permission, or printer behavior was changed.

Prepared / source-guarded QA coverage added:

- `components/stock/workflow-forms.tsx` defaults the selected stock-take scan session to a `DRAFT` session when available.
- `scripts/stock-mobile-ux-coverage.mjs` guards `First active session is selected automatically.` and `firstActiveSessionId`.
- Owner and Vercel QA checklists now ask testers to confirm the first active draft stock-take session is selected automatically at about 390px width.

Manual QA still required:

- Open `/stock/stock-take` on a real phone or 390px viewport with at least one draft stock-take session.
- Confirm the first active session is already selected for scanning.
- Create or use more than one active session, tap another active session, and confirm scanning follows the tapped session.

## 2026-06-23 Stock Outbound Optional Reference Tuck-Away

Scope:

- Stock Module Mobile UX only.
- `/stock/outbound` now keeps the optional reference number inside a collapsed `Reference no. (optional)` section.
- The main outbound setup stays focused on job/order/type/destination/photo/supplier requirements and barcode scanning.
- No server action, validation rule, RLS policy, stock movement rule, schema, migration, live Supabase data, camera permission, or printer behavior was changed.

Prepared / source-guarded QA coverage added:

- `components/stock/workflow-forms.tsx` renders `Reference no. (optional)` and `Open only if paperwork needs a number.`.
- `scripts/stock-mobile-ux-coverage.mjs` guards the collapsed optional-reference copy.
- Owner and Vercel QA checklists now ask testers to confirm the optional reference section stays out of the worker scan path at about 390px width.

Manual QA still required:

- Open `/stock/outbound` at about 390px width.
- Confirm order outbound and direct outbound show the scan setup without forcing reference-number entry.
- Open `Reference no. (optional)`, enter a reference, and confirm outbound still saves the reference when needed.

## 2026-06-23 Stock Mobile QA Source Pass

Scope:

- Stock Module Mobile UX QA preparation only.
- Checked the requested 390px worker QA areas through local source guards and production checks:
  - Stock home buttons.
  - Inbound session setup.
  - Continuous scanning UI.
  - Duplicate barcode warning.
  - No-weight barcode warning.
  - Label generation.
  - Label reprint.
  - Outbound by order.
  - Direct outbound.
  - Damage/spoilage request.
  - Transfer.
  - Receive-transfer wrong-location block.
  - Stock-take progress.
  - Unknown-barcode exception.
  - Online-only connection message.
- No app behavior, server action, RLS policy, database schema, migration, live Supabase data, deployment, camera permission, or printer behavior was changed in this QA pass.

Local checks completed:

- `npm.cmd run smoke` - passed.
- `npm.cmd run lint` - passed.
- `npm.cmd run typecheck` - passed.
- `npm.cmd run build` - passed.

Source-verified coverage:

- `scripts/stock-mobile-ux-coverage.mjs` guards the Stock worker home, inbound, outbound, transfer, receive-transfer, return/damage, stock take, scanner disabled reasons, and online-only message.
- `scripts/stock-label-coverage.mjs` guards label generation, 50mm x 30mm label output, PDF fallback, and reprint wording.
- `scripts/stock-scanner-coverage.mjs` guards scanner permission/manual fallback/continuous-scan behavior at source level.
- `scripts/stock-owner-qa-doc-coverage.mjs` guards that owner QA docs include the required Stock mobile test flow.

Manual QA still required:

- Open Vercel or local app in a real authenticated 390px phone viewport and confirm no horizontal scrolling.
- Test real phone camera permission/rear-camera behavior and laptop camera behavior.
- Test Bluetooth label printer selection from the phone print sheet.
- Save a PDF fallback label and confirm one 50mm x 30mm label per page.
- Run the Supabase-backed Stock flows with real scoped demo users and confirm RLS/team/location restrictions.

## 2026-06-23 Stock Inbound Larger Internal Label Action

Scope:

- Stock Module Mobile UX only.
- `/stock/inbound` now shows a larger `Generate internal label` action for no-weight barcode cases.
- The helper message now tells workers to enter kg, generate the label, save stock, then print/attach the label.
- No server action, RLS policy, barcode generation logic, stock movement rule, label format, schema, migration, live Supabase data, camera permission, or printer behavior was changed.

Prepared / source-guarded QA coverage added:

- `components/stock/workflow-forms.tsx` renders `Generate internal label` as a full-width mobile action.
- `scripts/stock-mobile-ux-coverage.mjs` and `scripts/stock-label-coverage.mjs` guard the label action and short no-weight guidance.
- Owner and Vercel QA checklists now ask testers to confirm the label action is easy to tap around 390px width.

Manual QA still required:

- Open `/stock/inbound` on a real phone or 390px viewport.
- Enter weight for a no-weight barcode case, tap `Generate internal label`, and confirm the stock unit saves before print/attach.
- Print through the phone/Bluetooth print path or save with PDF fallback.

## 2026-06-23 Stock Inbound Quick Product Buttons

Scope:

- Stock Module Mobile UX only.
- `/stock/inbound` now shows quick product buttons from the current active product list before the product dropdown.
- Workers can tap a product during inbound setup; product search and dropdown remain as fallbacks.
- No server action, RLS policy, item-master rule, barcode rule logic, stock movement rule, schema, migration, live Supabase data, camera permission, or printer behavior was changed.

Prepared / source-guarded QA coverage added:

- `components/stock/workflow-forms.tsx` renders `Products` with large buttons and selected state.
- `scripts/stock-mobile-ux-coverage.mjs` guards `Products` and `Tap product.`
- Owner and Vercel QA checklists now ask testers to confirm quick product buttons fit around 390px width and still keep search/dropdown fallbacks.

Manual QA still required:

- Open `/stock/inbound` on a real phone or 390px viewport.
- Confirm quick product buttons are easy to tap and do not cause horizontal scrolling.
- Tap a product, then brand/origin/location, and scan continuously.

## 2026-06-23 Stock Inbound Quick Location Buttons

Scope:

- Stock Module Mobile UX only.
- `/stock/inbound` now shows quick location buttons before the Location dropdown.
- Workers can tap common allowed locations during inbound setup; the assigned default and dropdown fallback remain.
- No server action, RLS policy, stock-location permission logic, barcode rule logic, stock movement rule, schema, migration, live Supabase data, camera permission, or printer behavior was changed.

Prepared / source-guarded QA coverage added:

- `components/stock/workflow-forms.tsx` renders `Locations` with large buttons and selected state.
- `scripts/stock-mobile-ux-coverage.mjs` guards `Locations` and the selected-state setup buttons.
- Owner and Vercel QA checklists now ask testers to confirm quick location buttons fit around 390px width and still keep the assigned default plus dropdown fallback.

Manual QA still required:

- Open `/stock/inbound` on a real phone or 390px viewport.
- Confirm the assigned stock location is selected by default.
- Tap a quick location button, confirm it fills the location, then select product/brand/origin and scan continuously.

## 2026-06-23 Stock Inbound Quick Brand And Origin Buttons

Scope:

- Stock Module Mobile UX only.
- `/stock/inbound` now shows quick brand and quick origin buttons before the Brand and Origin dropdowns.
- Workers can tap common brand/origin choices during inbound setup; the dropdowns and Other/custom inputs remain as fallbacks.
- No server action, RLS policy, barcode rule logic, stock movement rule, schema, migration, live Supabase data, camera permission, or printer behavior was changed.

Prepared / source-guarded QA coverage added:

- `components/stock/workflow-forms.tsx` renders `Manufacturers` and `Origins` with large buttons and selected state.
- `scripts/stock-mobile-ux-coverage.mjs` guards `Manufacturers`, `Origins`, and `Tap origin.`
- Owner and Vercel QA checklists now ask testers to confirm quick brand/origin buttons fit around 390px width and still keep dropdown plus Other/custom fallbacks.

Manual QA still required:

- Open `/stock/inbound` on a real phone or 390px viewport.
- Confirm quick brand and origin buttons are easy to tap and do not cause horizontal scrolling.
- Tap brand and origin, select product/location, then scan continuously.

## 2026-06-23 Stock Take Quick Item And Brand Buttons

Scope:

- Stock Module Mobile UX only.
- Stock Take session creation now shows quick item and quick brand buttons before the item/brand dropdowns.
- Workers can tap location, item, and brand, then start the stock-take session; all dropdowns remain as fallbacks.
- No server action, RLS policy, stock-take approval rule, stock movement rule, schema, migration, live Supabase data, camera permission, or printer behavior was changed.

Prepared / source-guarded QA coverage added:

- `components/stock/workflow-forms.tsx` renders `Quick stock take items` and `Quick stock take brands` with large buttons and `aria-pressed` selected state.
- `scripts/stock-mobile-ux-coverage.mjs` guards `Quick stock take items`, `Tap item to avoid dropdown.`, `Quick stock take brands`, and `Tap brand to avoid dropdown.`
- Owner and Vercel QA checklists now ask testers to confirm quick item and brand buttons fit around 390px width and still keep dropdown fallbacks.

Manual QA still required:

- Open `/stock/stock-take` on a real phone or 390px viewport.
- Confirm quick location, item, and brand buttons are easy to tap and do not cause horizontal scrolling.
- Tap location, item, and brand, start a session, then scan barcodes.

## 2026-06-23 Stock Take Quick Location Buttons

Scope:

- Stock Module Mobile UX only.
- Stock Take session creation now shows quick stock-take location buttons before the location dropdown.
- Workers can tap the count location once, choose item and brand, then start the stock-take session; the dropdown remains as fallback.
- No server action, RLS policy, stock-take approval rule, stock movement rule, schema, migration, live Supabase data, camera permission, or printer behavior was changed.

Prepared / source-guarded QA coverage added:

- `components/stock/workflow-forms.tsx` renders `Quick stock take locations` with large buttons and `aria-pressed` selected state.
- `scripts/stock-mobile-ux-coverage.mjs` guards `Quick stock take locations` and `Tap location, choose item and brand, then start.`
- Owner and Vercel QA checklists now ask testers to confirm quick stock-take location buttons fit around 390px width and still keep the dropdown fallback.

Manual QA still required:

- Open `/stock/stock-take` on a real phone or 390px viewport.
- Confirm quick stock-take location buttons are easy to tap and do not cause horizontal scrolling.
- Tap a quick location, choose item and brand, start a session, then scan barcodes.

## 2026-06-23 Stock Return Quick Location Buttons

Scope:

- Stock Module Mobile UX only.
- Normal `/stock/return` now shows quick return-location buttons before the location dropdown.
- Workers can tap a return location once, then scan the barcode; the dropdown remains as fallback.
- No server action, RLS policy, stock movement rule, return validation, schema, migration, live Supabase data, camera permission, or printer behavior was changed.

Prepared / source-guarded QA coverage added:

- `components/stock/workflow-forms.tsx` renders `Quick return locations` with large buttons and `aria-pressed` selected state.
- `scripts/stock-mobile-ux-coverage.mjs` guards `Quick return locations` and `Tap location to scan faster.`
- Owner and Vercel QA checklists now ask testers to confirm quick return-location buttons fit around 390px width and still keep the dropdown fallback.

Manual QA still required:

- Open `/stock/return` on a real phone or 390px viewport.
- Confirm quick return-location buttons are easy to tap and do not cause horizontal scrolling.
- Tap a quick location, scan a return-eligible barcode, and confirm `Return saved. Scan next barcode.`

## 2026-06-23 Stock Mobile QA Preparation Refresh

Scope:

- Stock Module Mobile UX QA preparation only.
- Reviewed the prepared 390px checklist coverage for Stock home buttons, inbound session, continuous scanning UI, duplicate warning, no-weight warning, label generation, label reprint, outbound by order, direct outbound, damage/spoilage request, transfer, receive-transfer wrong-location block, stock-take progress, unknown-barcode exception, and online-only connection message.
- No app behavior, server action, RLS policy, database schema, live Supabase data, deployment, camera permission, or printer action was changed in this QA pass.

Local checks completed:

- `npm.cmd run smoke` - passed. This includes Stock mobile UX, scanner, label, stock-take, report, RLS-policy, security, and owner-QA doc guards.
- `npm.cmd run lint` - passed.
- `npm.cmd run typecheck` - passed.
- `npm.cmd run build` - passed.

Prepared QA coverage confirmed:

| Area | Local/source evidence | Manual evidence still required |
| --- | --- | --- |
| Stock home buttons | Smoke includes `scripts/stock-mobile-ux-coverage.mjs`. | Open `/stock` at about 390px as a worker and confirm only the six big action buttons appear. |
| Inbound session | Source guards cover recent templates, setup lock, saved count, saved total weight, previous scan, duplicate block, no-weight label guidance, and finish summary. | Scan real/test barcodes in an authenticated session and confirm the UI remains usable without horizontal scrolling. |
| Continuous scanning UI | Source guards cover large Scan Barcode button, manual fallback, recent scan list, success/error states, and continuous scan copy. | Confirm phone camera permission, rear camera behavior, sound/vibration, and stream stop on close. |
| Label generation and reprint | Source guards cover 50mm x 30mm label, print-sheet/Bluetooth wording, PDF fallback, and stock-unit reprint without reason. | Print/save a real label PDF and test Bluetooth printer path where the device/browser supports it. |
| Outbound by order | Source guards cover order-first blocking, quick ready-order buttons, previous outbound scan, substitution warning, and no typed substitution reason. | Select a real ready order and scan valid, duplicate, missing, and substituted barcodes. |
| Direct outbound and damage/spoilage | Source guards cover direct options, quick remarks, damage photo-first blocking, no immediate deduction copy, and return-supplier supplier-first blocking. | Submit real damage/spoilage and return-supplier requests and verify database status/approval behavior. |
| Transfer and receive-transfer | Source guards cover quick location buttons, scan-and-done transfer/receive, and strict wrong-location receive message. | Scan transfer barcodes in real Supabase data and confirm wrong-location receive is blocked. |
| Stock take | Source guards cover active-session buttons, barcode/weight progress, latest scan feedback, wrong item/brand block, unknown exception, and approval gates. | Run a stock-take session with real scoped stock units through manager review and director approval. |
| Online-only safety | Source guards cover `Connection lost. Please reconnect before scanning.` and disabled scanner reasons across worker scan pages. | Turn off internet on a phone while scanner is open and confirm no scan is saved. |

Manual QA still required:

- Real authenticated 390px phone/browser QA from Vercel or a local app.
- Real phone camera and laptop camera permission testing.
- Real Bluetooth label printer and PDF label output testing.
- Live Supabase RLS/scope evidence for worker, manager, admin, and director.

## 2026-06-23 Stock Scan Disabled Reason UX

Scope:

- Stock Module Mobile UX only.
- Disabled barcode fields now show the exact short reason directly under the scanner/manual barcode field.
- Covered worker scan flows: inbound, outbound, transfer, receive-transfer, normal return, inspection release, damage/spoilage, return supplier, and stock take.
- Offline messages use the red blocked/error style; missing setup messages use the yellow warning style.
- No migration, RLS policy, server action, stock movement rule, stock approval rule, live Supabase data, deployment, camera permission, or printer action was changed.

Prepared / source-guarded QA coverage added:

- `components/stock/barcode-scanner.tsx` supports `disabledReason`.
- `components/stock/workflow-forms.tsx` passes existing worker-friendly block messages such as `Choose product, brand, origin, and location first.`, `Select order first.`, `Choose destination stock location first.`, `Add damage photo first.`, `Choose supplier first.`, and `Connection lost. Please reconnect before scanning.`
- `scripts/stock-mobile-ux-coverage.mjs` guards the disabled-reason prop and the red offline styling trigger.
- Owner and Vercel QA checklists now ask testers to confirm the disabled reason appears directly under the barcode field.

Local checks completed:

- `node scripts\stock-mobile-ux-coverage.mjs` - passed.
- `npm.cmd run smoke` - first run passed before a newer Retail migration appeared; final rerun failed in unrelated Retail migration `supabase/migrations/202606230023_retail_daily_cash_closing_v1.sql` because policy `"retail managers can insert daily cash closings"` is not immediately preceded by `drop policy if exists`.
- `npm.cmd run lint` - passed.
- `npm.cmd run typecheck` - failed in unrelated Retail files:
  - `components/retail/retail-forms.tsx:734`: local `SelectField` type does not accept `value` / `onChange`.
  - `components/retail/retail-page.tsx:299`: `RetailDailyClosing` has no `approvedByName`.
- `npm.cmd run build` - compiled, then failed during TypeScript on the same `components/retail/retail-forms.tsx:734` Retail issue.

Local 390px/browser attempt:

- Next.js can start in the foreground, but the Windows sandbox did not keep a detached dev server alive.
- The in-app browser connector and persistent browser runtime could not start because this sandbox rejected the browser runtime process.
- Real authenticated 390px browser/device evidence still needs owner testing from Vercel or local app.

Manual QA still required:

- On a real phone or 390px browser viewport, open `/stock/inbound`, `/stock/outbound`, `/stock/transfer`, `/stock/receive-transfer`, `/stock/return`, and `/stock/stock-take`.
- Confirm each disabled scanner shows the short reason directly under the barcode field.
- Turn off internet and confirm the red `Connection lost. Please reconnect before scanning.` reason appears and scanning/saving is blocked.

## 2026-06-23 Direct Damage Photo-First Outbound UX

Scope:

- Stock Module Mobile UX only.
- Direct outbound `Damage/Spoilage` now blocks barcode scan and final confirm until a damage photo reference exists.
- Worker-facing copy now says `Photo required. Request only; stock is not deducted now.`
- Existing server-side damage request validation, approval workflow, RLS, and no-immediate-deduction behavior were not changed.

Prepared / source-guarded QA coverage added:

- `components/stock/workflow-forms.tsx` includes direct Damage/Spoilage photo gating in both scanner blocking and final confirm blocking.
- `scripts/stock-mobile-ux-coverage.mjs` guards the direct outbound damage type, photo reference condition, and no-deduction copy.
- Owner and Vercel QA checklists now ask testers to confirm direct Damage/Spoilage shows `Add damage photo first.` before scanning.

Local checks completed:

- `node scripts\stock-mobile-ux-coverage.mjs` - passed.
- `node scripts\stock-acceptance-coverage.mjs` - passed.
- `npm.cmd run smoke` - passed.
- `npm.cmd run lint` - passed with unrelated Retail warnings in `components/retail/retail-page.tsx`.
- `npm.cmd run typecheck` - failed in unrelated Retail report files:
  - `app/(erp)/retail/reports/page.tsx:11`: `RetailPage` does not accept a `filters` prop.
  - `lib/retail/reports.ts:55-56`: `date` is possibly undefined.
- `npm.cmd run build` - compiled, then failed during TypeScript on the same `app/(erp)/retail/reports/page.tsx:11` Retail issue.

Manual QA still required:

- On `/stock/outbound`, choose `Direct outbound`, then `Damage/Spoilage`.
- Confirm the scanner/manual barcode field is blocked with `Add damage photo first.` until a photo is chosen or referenced.
- Add/take a photo, scan a test barcode, submit, and confirm a pending damage request is created without deducting stock.

## 2026-06-23 Direct Return Supplier Supplier-First Outbound UX

Scope:

- Stock Module Mobile UX only.
- Direct outbound `Return Supplier` now blocks barcode scan and final confirm until supplier name is filled.
- Existing server-side return-supplier validation, hold status, approval flow, RLS, and stock deduction timing were not changed.

Prepared / source-guarded QA coverage added:

- `components/stock/workflow-forms.tsx` includes direct Return Supplier supplier-name gating in both scanner blocking and final confirm blocking.
- `scripts/stock-mobile-ux-coverage.mjs` guards the direct outbound return-supplier type, supplier-name condition, and `Choose supplier before scanning.` copy.
- Owner and Vercel QA checklists now ask testers to confirm direct Return Supplier shows `Choose supplier first.` before scanning.

Local checks completed:

- `node scripts\stock-mobile-ux-coverage.mjs` - passed.
- `node scripts\stock-acceptance-coverage.mjs` - passed.
- `node scripts\stock-owner-qa-doc-coverage.mjs` - passed.
- `npm.cmd run smoke` - passed.
- `npm.cmd run lint` - passed.
- `npm.cmd run typecheck` - passed.
- `npm.cmd run build` - passed.

Manual QA still required:

- On `/stock/outbound`, choose `Direct outbound`, then `Return Supplier`.
- Confirm the scanner/manual barcode field is blocked with `Choose supplier first.` until supplier name is filled.
- Enter supplier, scan a test barcode, submit, and confirm stock moves to supplier hold pending approval.

## 2026-06-23 Direct Return Supplier Quick Supplier Buttons

Scope:

- Stock Module Mobile UX only.
- Direct outbound `Return Supplier` now reuses recent supplier names from existing return-supplier requests as large tap buttons.
- This reduces typing for worker supplier-return requests and keeps supplier entry required before scanning.
- No migration, server action, RLS policy, hold-status rule, approval rule, or stock movement rule was changed.

Prepared / source-guarded QA coverage added:

- `components/stock/stock-page.tsx` passes existing Stock return-supplier requests to the outbound form.
- `components/stock/workflow-forms.tsx` derives unique recent supplier names and renders large tap buttons for direct Return Supplier.
- `scripts/stock-mobile-ux-coverage.mjs` guards the recent supplier data path and quick-button copy.
- Owner and Vercel QA checklists now ask testers to confirm recent supplier buttons appear when prior supplier-return requests exist.

Local checks completed:

- `node scripts\stock-mobile-ux-coverage.mjs` - passed.
- `node scripts\stock-owner-qa-doc-coverage.mjs` - passed.
- `node scripts\stock-acceptance-coverage.mjs` - passed.
- `npm.cmd run smoke` - passed.
- `npm.cmd run lint` - passed.
- `npm.cmd run typecheck` - passed.
- `npm.cmd run build` - passed.

Manual QA still required:

- Seed or create at least one supplier-return request.
- Open `/stock/outbound`, choose `Direct outbound`, then `Return Supplier`.
- Confirm recent supplier buttons fit at about 390px width and fill supplier name with one tap.

## 2026-06-23 ERP Home Stock Shortcut QA

Scope:

- Stock Module Mobile UX only.
- ERP Home now sends stock users to the simple `/stock` worker home with shortcut label `Stock` instead of presenting the worker shortcut as `Stock Dashboard`.
- Stock Reports remains a separate advanced shortcut for manager/admin/director-style access.
- No migration, RLS policy, server action, stock movement rule, live Supabase data, deployment, camera permission, or printer action was changed.

Prepared / source-guarded QA coverage added:

- `scripts/stock-mobile-ux-coverage.mjs` checks ERP Home contains `href: "/stock"`, `label: "Stock"`, the worker-friendly description, and role-restricted `Stock Reports`.
- The guard also blocks reintroducing `label: "Stock Dashboard"` as the worker Stock shortcut.
- Owner and Vercel QA checklists ask testers to confirm the ERP Home shortcut wording at about 390px width.

Local checks completed:

- `node scripts\stock-mobile-ux-coverage.mjs` - passed.
- `npm.cmd run smoke` - passed.
- `npm.cmd run lint` - passed.
- `npm.cmd run typecheck` - passed.
- `npm.cmd run build` - passed.

Manual QA still required:

- Sign in as a real general worker on Vercel or local app, open ERP Home around 390px width, and confirm the shortcut says `Stock`.
- Tap `Stock` and confirm it opens the six-button worker Stock home.
- Confirm Stock Reports/Settings remain hidden or blocked for worker access.

## 2026-06-23 Stock Take Latest Scan Feedback

Scope:

- Stock Module Mobile UX only.
- Added source-guarded stock-take feedback so workers can see the latest scanned barcode, item, weight, and counted/exception state while scanning at phone width.
- No migration, RLS policy, server action, stock movement rule, approval rule, live Supabase data, deployment, camera permission, or printer action was changed.

Local checks completed:

- `node scripts\stock-mobile-ux-coverage.mjs` - passed.
- `npm.cmd run smoke` - passed.
- `npm.cmd run lint` - passed.
- `npm.cmd run typecheck` - passed.
- `npm.cmd run build` - passed.

Prepared / source-guarded QA coverage added:

- Stock take scan panel now includes `Previous stock take scan`.
- Known counted scans show latest barcode, item, weight, and `Counted`.
- Unknown-barcode exception scans show `Unknown barcode exception`.
- Wrong-location exception scans show `Wrong location exception`.
- Owner and Vercel QA checklists now ask testers to verify those states on a phone around 390px width.

Manual QA still required:

- Sign in as a real stock worker, open `/stock/stock-take`, start/select an active draft session, and scan a known barcode.
- Confirm `Previous stock take scan` updates after each scan and stays readable around 390px width.
- Scan an unknown barcode and confirm the card changes to `Unknown barcode exception`.
- Scan a wrong-location barcode and confirm the card changes to `Wrong location exception`.
- Capture evidence in the acceptance tables below.

## 2026-06-23 Transfer Receive Scan-And-Done UX

Scope:

- Stock Module Mobile UX only.
- Transfer and receive-transfer camera scans now auto-submit after the required stock location is selected.
- Typed/manual barcode fallback still uses the existing `Send transfer` and `Receive barcode` buttons.
- No migration, RLS policy, server action, stock movement rule, transfer validation, wrong-location blocking, live Supabase data, deployment, camera permission, or printer action was changed.

Prepared / source-guarded QA coverage added:

- `/stock/transfer`: after destination location is selected, camera scan submits automatically and shows `Transfer sent. Scan next barcode.` on success.
- `/stock/receive-transfer`: after receiving location is selected, camera scan submits automatically and shows `Received. Scan next barcode.` on success.
- Both pages keep manual button fallback for typed/pasted barcodes.

Manual QA still required:

- Test `/stock/transfer` on a phone around 390px with a real transfer-eligible barcode and confirm scan-and-done behavior.
- Test `/stock/receive-transfer` with the correct location and confirm scan-and-done behavior.
- Test wrong-location receive still blocks with `Wrong location. This barcode must be received at [destination location].`

Local checks completed:

- `node scripts\stock-mobile-ux-coverage.mjs` - passed.
- `npm.cmd run smoke` - passed.
- `npm.cmd run lint` - passed with one existing Retail warning: `components/retail/retail-page.tsx` has unused `missingCleaningTasks`.
- `npm.cmd run typecheck` - passed.
- `npm.cmd run build` - passed.

## 2026-06-23 Normal Return Scan-And-Done UX

Scope:

- Stock Module Mobile UX only.
- Normal `/stock/return` now uses location first, then camera scan saves automatically.
- Typed/manual barcode fallback still uses the existing `Save return` button.
- No migration, RLS policy, server action, return validation, stock movement rule, inspection rule, live Supabase data, deployment, camera permission, or printer action was changed.

Prepared / source-guarded QA coverage added:

- `/stock/return`: after return location is selected, camera scan submits automatically and shows `Return saved. Scan next barcode.` on success.
- The page keeps the `Save return` button for typed/pasted barcodes.
- The customer-return inspection warning remains visible.

Manual QA still required:

- Test `/stock/return` on a phone around 390px with a real return-eligible barcode and confirm scan-and-done behavior.
- Confirm eligible normal returns become `IN_STOCK`.
- Confirm customer returns after sale still go to `HOLD` or `INSPECTION` where applicable.

## 2026-06-23 Return Supplier Supplier-First Scan UX

Scope:

- Stock Module Mobile UX only.
- Return-supplier request now uses supplier first, then barcode scan.
- Camera scan auto-submits the supplier-return request after supplier is selected and shows `Supplier return requested. Scan next.`
- Typed/manual barcode fallback still uses the existing `Submit return supplier` button.
- No migration, RLS policy, server action, return-supplier approval logic, stock movement rule, hold/deduction rule, live Supabase data, deployment, camera permission, or printer action was changed.

Prepared / source-guarded QA coverage added:

- `/stock/return`: return-supplier scan is disabled until supplier is selected.
- Recent supplier buttons still reduce typing.
- Camera scan requests supplier return automatically after supplier is selected.
- The page keeps the `Submit return supplier` button for typed/pasted barcodes.

Manual QA still required:

- Test `/stock/return` on a phone around 390px with a real supplier-return barcode.
- Confirm a supplier must be selected or typed before scanning.
- Confirm stock goes to supplier hold and is deducted only after manager approval.

## 2026-06-23 Damage Photo-First Scan UX

Scope:

- Stock Module Mobile UX only.
- Damage/spoilage request now uses reason/photo first, then barcode scan.
- Camera scan auto-submits the damage request after photo evidence exists and shows `Damage request sent. Scan next.`
- Typed/manual barcode fallback still uses the existing `Submit damage request` button.
- No migration, RLS policy, server action, damage approval logic, stock movement rule, no-immediate-deduction rule, live Supabase data, deployment, camera permission, or printer action was changed.

Prepared / source-guarded QA coverage added:

- `/stock/return`: damage/spoilage scan is disabled until photo evidence exists.
- Large reason buttons remain in place.
- Camera scan sends the approval request automatically after photo.
- The page keeps the `Submit damage request` button for typed/pasted barcodes.

Manual QA still required:

- Test `/stock/return` on a phone around 390px with a real damage/spoilage barcode.
- Confirm photo is required before scanning.
- Confirm stock is not deducted until manager review and director approval.

Local checks completed:

- `node scripts\stock-mobile-ux-coverage.mjs` - passed.
- `npm.cmd run smoke` - passed.
- `npm.cmd run lint` - passed.
- `npm.cmd run typecheck` - passed on final rerun.
- `npm.cmd run build` - passed on final rerun.

## 2026-06-23 Stock Mobile QA Prepared Run

Scope:

- Stock Module Mobile UX QA preparation only.
- No app behavior, stock workflow logic, RLS policy, migration, seed data, deployment, live Supabase data, camera permission, or printer action was changed in this pass.
- 390px visual/device QA was prepared from source guards and owner checklists. Real authenticated phone/browser QA still needs owner evidence.

Requested checklist status:

| Requested item | Prepared status | Owner/device QA still required |
| --- | --- | --- |
| Stock home buttons | Source guarded by `scripts/stock-mobile-ux-coverage.mjs`. | Open `/stock` at about 390px as a worker and confirm only the six big action buttons appear. |
| Inbound session | Source guarded for recent templates, search, required brand/origin/location, setup lock, counters, and finish summary. | Inbound real test barcodes against migrated Supabase data. |
| Continuous scanning UI | Source guarded for large scan/manual controls, continuous copy, recent scan list, previous scan, count, and total weight. | Test phone camera/manual fallback while scanning multiple barcodes. |
| Duplicate warning | Source guarded for `Duplicate barcode. Inbound is blocked.` | Scan the same barcode twice and verify no second save. |
| No-weight warning | Source guarded for label-generation guidance. | Scan a no-weight barcode and confirm save is blocked. |
| Label generation | Source guarded for 50mm x 30mm label, Code 128 bars, print action, and PDF fallback. | Generate a label, confirm stock saves, then print or save PDF from a real phone/browser. |
| Label reprint | Source guarded for `/stock/units/[id]` mobile reprint without reason. | Reprint a real stock-unit label from phone. |
| Outbound by order | Source guarded for order-first scan block, quick ready-order buttons, substitution warning, and previous outbound scan. | Test a real ready order and matching/substitute barcodes. |
| Direct outbound | Source guarded for Sales, Processing, Transfer, Sample/Testing, Damage/Spoilage, Return Supplier, quick remarks, and damage photo picker. | Submit test direct flows and confirm server-side acceptance/blocking. |
| Damage/spoilage request | Source guarded for photo-required approval-only messaging. | Confirm request does not deduct stock until approval. |
| Transfer | Source guarded for destination-first scan block, quick destinations, transfer pending, and overdue receive alert action. | Send a real transfer and confirm location does not change until receive. |
| Receive-transfer wrong-location block | Source guarded for the exact wrong-location message. | Receive at the wrong location and confirm it is blocked. |
| Stock take progress | Source guarded for worker-created session, active-session scan block, count progress, weight progress, and `Previous stock take scan` latest-scan feedback. | Start a real session, scan known barcodes, and confirm the latest barcode/item/weight card updates. |
| Unknown barcode exception | Source guarded for unknown-barcode exception copy and latest-scan exception feedback. | Scan unknown barcode and confirm it is recorded as exception only and shown as `Unknown barcode exception`. |
| Online-only connection message | Source guarded for `Connection lost. Please reconnect before scanning.` and scanner disabled/close behavior. | Turn off internet on a phone across every scan page. |

Command results:

- `npm.cmd run smoke` - passed.
- `npm.cmd run lint` - passed.
- `npm.cmd run typecheck` - failed in unrelated Processing code: `lib/processing/data.ts:71` assigns `batch.status` values such as `DRAFT`/`REJECTED` to `ProcessingBatchStatus`.
- `npm.cmd run build` - compiled, then failed during TypeScript on the same `lib/processing/data.ts:71` Processing status typing issue.

Conclusion:

- Stock mobile QA is prepared and source-guarded for the requested checklist.
- Final full-project typecheck/build passed after rerun, so this Stock QA source pass has a clean local release gate.
- Real authenticated 390px phone/browser, camera, Bluetooth printer, PDF label, and live Supabase/RLS evidence remain required.

## 2026-06-23 Stock Mobile QA Refresh

Scope:

- Stock module mobile QA preparation only.
- No app feature changes, migrations, Supabase SQL, seed, deployment, camera permission, printer action, or production data change was performed in this pass.
- Real 390px phone/browser QA could not be completed from this Codex environment, so the physical-device checks remain owner/manual QA.

Local checks completed:

- `npm.cmd run smoke` - passed.
- `npm.cmd run lint` - passed.
- `npm.cmd run typecheck` - passed.
- `npm.cmd run build` - passed.

Prepared / source-guarded QA coverage:

- Stock home six worker buttons.
- Inbound session setup, setup-required scan block, continuous scanning UI, saved count, saved total weight, and previous scan display.
- Duplicate barcode blocked warning.
- No-weight barcode blocked warning and label-generation guidance.
- Label generation, print/PDF fallback, and stock-unit label reprint.
- Outbound by order and direct outbound worker flows.
- Outbound, transfer, and receive-transfer setup-required scan blocks.
- Damage/spoilage request copy and approval-only behavior.
- Transfer and receive-transfer wrong-location block copy.
- Stock take progress and unknown-barcode exception copy.
- Online-only scanner blocking message: `Connection lost. Please reconnect before scanning.`

Manual QA still required:

- Sign in on Vercel or local app as a real Stock worker and test around 390px width.
- Test real phone camera permission, rear-camera behavior, scanner close/stream stop, and manual barcode fallback.
- Test Bluetooth label printer path and PDF fallback output.
- Test live Supabase/RLS-backed stock workflows and fill the acceptance evidence rows below.

## 2026-06-23 Stock Mobile QA Preparation

Environment:

- Local app was already responding on `http://127.0.0.1:3000`.
- Browser automation could not be launched from this Codex Windows sandbox. The node/browser runner failed with: `CreateProcessAsUserW failed: 5`.
- Real phone camera and Bluetooth label printer testing were not possible from this session.
- No live Supabase migration, seed, production data change, or deploy was run.

Prepared evidence:

| Mobile QA item | Source / automation evidence | Manual owner QA still required |
| --- | --- | --- |
| Stock home buttons | `scripts/stock-mobile-ux-coverage.mjs` checks the six worker buttons: Inbound, Outbound, Transfer, Receive, Return / Damage, Stock Take. | Open `/stock` at about 390px as a general worker and confirm tap targets and no horizontal scrolling. |
| Inbound session | Source guard checks recent templates, product search, scan disabled until product + brand + origin + location are chosen, larger Stock workflow inputs, finish session, session lock wording, saved count, saved weight, previous scan, and 390px layout markers. | Inbound 2-3 real test barcodes and confirm item + brand + origin + location lock after first saved scan. |
| Continuous scanning UI | Source guard checks continuous scanner copy, full-width large scan button on phone widths, larger manual fallback input, large scanner close buttons, wrapped long barcode display, accessible success/warning/error announcements, success vibration, worker-friendly camera errors, and session counters. | On a phone, scan multiple barcodes without restarting the scanner and confirm the scanner stays ready. |
| Duplicate warning | Source guard checks `Duplicate barcode. Inbound is blocked.`, the red blocked/error session list, and duplicate prevention remains in server-side stock actions. | Scan the same test barcode twice and confirm a short red warning and no second stock unit. |
| No-weight warning | Source guard checks `No weight found. Use internal label.` | Scan a no-weight barcode and confirm save is blocked until label generation. |
| Label generation | Source guard checks generated label/reprint copy, phone-width print/PDF action labels, full-width touch targets, Code 128 SVG barcode rendering, and numeric label expectations. | Enter a weight, generate the internal label, confirm stock is pending, print/PDF the 50mm x 30mm label, and scan the printed Code 128 barcode back into the app to save. |
| Label reprint | Source guard checks stock-unit detail has `Print label`, `PDF fallback`, and uses the same full-width mobile print controls and Code 128 barcode renderer without a reason field. | Open `/stock/units/[id]` on a phone and reprint without entering a reason, then scan the reprinted barcode. |
| Outbound by order | Source guard checks quick ready-order buttons, order selection, `Select order first.`, previous outbound scan feedback, substitution warning, no typed reason copy, and announced red blocked panels for missing/blocked/wrong-destination barcodes. | Tap a quick ready order, scan matching and substitute barcodes, confirm `Previous outbound scan` updates, and confirm warnings are readable at 390px. |
| Direct outbound | Source guard checks Sales, Processing, Transfer, Sample/Testing, Damage/Spoilage, Return Supplier mobile copy, required Sales customer selection, direct damage photo picker, and quick remark buttons for required remarks. | Confirm direct Sales cannot scan until a customer is selected, Sample/Testing has no photo, direct Damage/Spoilage photo picker fills the reference field, quick remarks fill the remarks box, and remarks are still required. |
| Damage/spoilage request | Source guard checks photo-required approval-only copy and stock action checks preserve approval flow. | Submit a damage request with photo/reference and verify stock is not deducted until approval. |
| Transfer | Source guard checks transfer mobile copy, large quick destination buttons, stock-location wording, active-location transfer migration, larger Stock form touch targets, and role/scope coverage checks server-side access guards. | Tap a quick destination, scan one barcode, confirm `TRANSFER_PENDING`, and confirm wrong-location receive is still blocked at 390px width. |
| Receive-transfer wrong-location block | Smoke coverage checks quick receiving-location buttons and strict wrong-location receive-transfer blocking. | Tap a quick receiving location, receive at the wrong location, and confirm `Wrong location. This barcode must be received at [destination location].` |
| Stock take progress | Source guard checks worker-created scoped draft sessions, active-session-required scan block, barcode progress, weight progress copy, and protected manager/director approval gates. | Sign in as a stock worker, start a session, confirm scanning is blocked until an active draft session is selected, confirm scanned count/weight progress is readable at 390px, and confirm normal workers cannot review/approve. |
| Unknown barcode exception | Source guard checks unknown-barcode exception copy and stock-take exception scripts. | Scan an unknown barcode and confirm it is recorded as exception, not active stock. |
| Online-only connection message | Source guard checks the shared alert message `Connection lost. Please reconnect before scanning.`, alert semantics, online-status guards, and camera scanner stop/close when disabled. | Turn off internet on a phone and confirm inbound, outbound, transfer, receive-transfer, return/damage, and stock-take scans are blocked; if the scanner is open, confirm it closes or stops. |

Conclusion:

- Local source and smoke coverage are prepared for the requested Stock mobile QA items.
- Real 390px authenticated browser/device evidence is still required because browser automation and physical devices were unavailable in this session.
- The owner should use `docs/STOCK_TEST_LIST_FOR_OWNER.md` and `docs/STOCK_REMOTE_QA_VERCEL.md` to capture screenshots/video notes from Vercel or local app.

## 2026-06-23 Codex Mobile QA Run

Scope:

- Stock module only.
- Requested 390px mobile checks were prepared and source-guarded locally.
- No live Supabase migration, seed, production data change, deployment, camera permission approval, or printer action was performed.

What was checked locally:

- `/stock` route responds locally.
- Stock mobile source coverage includes the six worker home buttons, worker-hidden finance/report/settings content, inbound scan context, continuous scanning UI, duplicate/no-weight messages, label generation/reprint copy, outbound order/direct modes, damage/spoilage approval-only messaging, transfer/receive-transfer wording, stock-take progress/exception wording, and online-only scan blocking.
- Scanner and Stock form source coverage include large phone-width scan/manual controls, worker-friendly camera errors, accessible success/warning/error announcements, stream cleanup, close controls, continuous scan hooks, recent scan list hooks, and wrapped long-barcode display.
- Existing owner QA docs include manual steps for phone camera and Bluetooth/PDF label testing.

Browser/device limitation:

- Local browser automation could not launch from the Windows sandbox. The runtime returned `CreateProcessAsUserW failed: 5`.
- Real authenticated 390px visual QA, phone camera QA, laptop camera QA, Bluetooth label printer QA, and live Supabase RLS/workflow QA remain manual owner checks.

Command results for this run:

- `node scripts\stock-mobile-ux-coverage.mjs` - passed.
- `node scripts\stock-scanner-coverage.mjs` - passed.
- `node scripts\stock-owner-qa-doc-coverage.mjs` - passed.
- Later Stock scanner accessibility re-run:
  - `node scripts\stock-scanner-coverage.mjs` - passed.
  - `node scripts\stock-mobile-ux-coverage.mjs` - passed.
  - `npm.cmd run smoke` - failed before the Stock chain on an Orders smoke assertion: `Order data must expose scope options and only offer active stock items for new order lines`.
  - `npm.cmd run lint` - passed with existing non-Stock warnings in `components/delivery/manager-delivery-dashboard.tsx` and `lib/orders/data.ts`.
  - `npm.cmd run typecheck` - failed in `lib/orders/data.ts` on order status/manual-reason typing.
  - `npm.cmd run build` - compiled successfully, then failed during TypeScript for the same `lib/orders/data.ts` status typing issue.
- Later inbound duplicate blocked-state re-run:
  - `node scripts\stock-mobile-ux-coverage.mjs` - passed.
  - `node scripts\stock-scanner-coverage.mjs` - passed.
  - `npm.cmd run smoke` - failed before the Stock chain on the same Orders smoke assertion.
  - `npm.cmd run lint` - passed with one existing non-Stock warning in `lib/orders/data.ts`.
  - `npm.cmd run typecheck` - failed in `lib/orders/data.ts` on order status/manual-reason typing.
  - `npm.cmd run build` - failed before typecheck on an Orders syntax error in `lib/orders/actions.ts`: `Nullish coalescing operator(??) requires parens when mixing with logical operators`.
- Later Stock form feedback announcement re-run:
  - `node scripts\stock-mobile-ux-coverage.mjs` - passed.
  - `node scripts\stock-scanner-coverage.mjs` - passed.
  - `npm.cmd run smoke` - failed before the Stock chain on an Orders assertion: `Order action missing: addCustomerOrderItemAction`.
  - `npm.cmd run lint` - passed with one existing non-Stock warning in `lib/orders/data.ts`.
  - `npm.cmd run typecheck` - failed in Orders files because exported order actions are missing, `??` is mixed with `||` in `lib/orders/actions.ts`, and `lib/orders/data.ts` has status/manual-reason typing errors.
  - `npm.cmd run build` - failed before typecheck on the same Orders syntax error in `lib/orders/actions.ts`: `Nullish coalescing operator(??) requires parens when mixing with logical operators`.
- Later shared offline alert re-run:
  - `node scripts\stock-scanner-coverage.mjs` - passed.
  - `node scripts\stock-mobile-ux-coverage.mjs` - passed.
  - `npm.cmd run smoke` - failed before the Stock chain on the same Orders assertion: `Order action missing: addCustomerOrderItemAction`.
  - `npm.cmd run lint` - passed with existing non-Stock warnings in `lib/delivery/actions.ts`.
  - `npm.cmd run typecheck` - failed in non-Stock files: `lib/orders/actions.ts` mixes `??` with `||`, and `lib/orders/data.ts` has linked-delivery proof-status typing errors.
  - `npm.cmd run build` - failed before typecheck on the same Orders syntax error in `lib/orders/actions.ts`: `Nullish coalescing operator(??) requires parens when mixing with logical operators`.
- Later outbound blocked-alert re-run:
  - `node scripts\stock-mobile-ux-coverage.mjs` - passed.
  - `node scripts\stock-scanner-coverage.mjs` - passed.
  - `npm.cmd run smoke` - failed before the Stock chain on a non-Stock Orders assertion: `Orders data loader must only use demo fallback when Supabase is not configured and surface real query errors`.
  - `npm.cmd run lint` - passed.
  - `npm.cmd run typecheck` - passed.
  - `npm.cmd run build` - passed.
- Later Stock workflow input touch-target re-run:
  - `node scripts\stock-mobile-ux-coverage.mjs` - passed.
  - `node scripts\stock-scanner-coverage.mjs` - passed.
  - `npm.cmd run smoke` - passed after updating stale Stock coverage checks to the current blocked duplicate/session wording.
  - `npm.cmd run lint` - passed.
  - `npm.cmd run typecheck` - passed.
  - `npm.cmd run build` - passed.
- Later 390px browser attempt:
  - Local `/stock` returned HTTP 200.
  - In-app browser automation could not launch from the Windows sandbox and returned `CreateProcessAsUserW failed: 5`.
  - No live Supabase data, camera permission, or printer action was touched.
  - Real authenticated 390px visual QA remains manual owner/device QA.
  - `npm.cmd run smoke` - passed.
  - `npm.cmd run lint` - passed.
  - `npm.cmd run typecheck` - passed.
  - `npm.cmd run build` - passed.
- Later Stock label mobile print/reprint touch-target re-run:
  - `node scripts\stock-label-coverage.mjs` - passed.
  - `node scripts\stock-mobile-ux-coverage.mjs` - passed.
  - `npm.cmd run smoke` - passed.
  - `npm.cmd run lint` - passed.
  - `npm.cmd run typecheck` - passed.
  - `npm.cmd run build` - passed.
  - No live Supabase data, camera permission, Bluetooth printer action, PDF output, migration, seed, deployment, or production data was touched.
  - Real phone Bluetooth print-sheet and PDF-save QA remains manual owner/device QA.
- Later Stock Code 128 label rendering pass:
  - Replaced decorative label stripe art with local Code 128 SVG barcode rendering for label preview, print, PDF fallback, and stock-unit reprint.
  - `node scripts\stock-label-coverage.mjs` - passed.
  - `npx.cmd tsc --noEmit --pretty false` - passed.
  - `npm.cmd run smoke` - passed.
  - `npm.cmd run lint` - passed.
  - `npm.cmd run typecheck` - passed.
  - `npm.cmd run build` - passed.
  - Real printed-label scanner readability still needs owner/device QA with the actual label printer and scanner/camera.

Current QA status by requested item:

| Requested mobile QA item | Codex local status | Owner/manual status |
| --- | --- | --- |
| Stock home buttons | Source guarded | Test on `/stock` at 390px as a worker |
| Inbound session | Source guarded | Test real session with migrated Supabase data |
| Continuous scanning UI | Source guarded | Test phone camera/manual fallback |
| Duplicate warning | Source guarded | Scan same barcode twice |
| No-weight warning | Source guarded | Scan no-weight barcode and confirm label guidance |
| Label generation | Source guarded | Generate label, confirm stock auto-save, print/PDF, and scan the printed Code 128 barcode |
| Label reprint | Source guarded | Reprint from `/stock/units/[id]` and scan the reprinted barcode |
| Outbound by order | Source guarded | Confirm scanning is blocked until a ready order is selected, then test ready order with matching/substitute barcodes |
| Direct outbound | Source guarded | Test Sales, Processing, Transfer, Sample/Testing, Damage/Spoilage, Return Supplier; confirm direct Transfer scanning waits for destination stock location |
| Damage/spoilage request | Source guarded | Confirm phone photo picker fills the photo file name/reference, and confirm request only with no immediate deduction |
| Return supplier request | Source guarded | Confirm recent supplier buttons fill supplier name without typing and stock deducts only after manager approval |
| Transfer | Source guarded | Confirm scan is blocked until destination stock location is selected, then confirm `TRANSFER_PENDING`, no immediate location change, overdue alert audience text, and `Open receive` from overdue alert |
| Receive-transfer wrong-location block | Source guarded | Confirm scan is blocked until receiving stock location is selected, then confirm exact wrong-location message |
| Return stock | Source guarded | Confirm scan controls wait for return location when no location is selected, then confirm eligible returns become `IN_STOCK` |
| Stock take progress | Source guarded | Confirm scan controls wait for an active draft session, then confirm count and weight progress |
| Unknown barcode exception | Source guarded | Confirm exception is recorded, not immediately stocked |
| Online-only connection message | Source guarded | Turn off internet and confirm scan/save blocking |

## Acceptance Test Evidence

| # | Test | Status | User / role | Route | Database evidence | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Inbound scan works | TODO | TODO | `/stock/inbound` | `stock_units`, `stock_movements`, `barcode_scan_logs`, `audit_logs` | Confirm barcode stock unit is created atomically with correct item, brand, origin, weight, location, and inbound date. |
| 2 | Duplicate barcode blocked | TODO | TODO | `/stock/inbound` | No second `stock_units` row; failed scan log if available | Confirm staff sees a clear duplicate warning, manual save is disabled, and camera auto-save does not submit the known duplicate. |
| 3 | Barcode weight rule saved/reused | TODO | TODO | `/stock/inbound` | `barcode_weight_rules` by item + brand + origin | Confirm rule save is atomic with successful inbound, and GS1 `3102`/`3103`, position rules, fixed-weight fallback, and manual confirmation behavior. |
| 4 | Barcode label printing works | TODO | TODO | `/stock/inbound`, `/stock/units/[id]` | Unique numeric generated barcode | Confirm 50mm x 30mm label PDF/print with company, product, weight, and machine-readable Code 128 barcode. |
| 5 | Order-based outbound works | TODO | TODO | `/stock/outbound` | `stock_outbound_batches`, `stock_outbound_batch_lines`, movements, scan logs | Confirm multiple items under one order, warning-only requested/scanned differences, and substitution recording. |
| 6 | Transfer/receive works | TODO | TODO | `/stock/transfer`, `/stock/receive-transfer` | Unit status/location, `stock_movements`, `barcode_scan_logs`, `audit_logs` | Confirm transfer and receive are atomic, scanned-out transfer becomes `TRANSFER_PENDING`, cannot be cancelled, and location changes only after receive scan. |
| 7 | Damage/spoilage approval works | TODO | TODO | `/stock/outbound` or stock request surface | Damage request, photo path, manager review, director approval, `OUTBOUND_SPOILED` | Confirm reasons: expired, broken packaging, smell, wrong temperature, customer rejected, or other. |
| 8 | Stock take approval works | TODO | TODO | `/stock/stock-take` | Scoped session, scanned lines, missing-barcode variance lines, manager signature, director signature, adjustment movement | Confirm lock applies only to selected item + brand in selected location and missing expected barcodes are adjusted out only after director approval. |
| 9 | No-barcode-to-barcode flow works | TODO | TODO | `/stock/no-barcode-inbound`, `/stock/inbound` | Generated numeric barcode then normal barcode inbound | Confirm loose no-barcode inbound is not used for new MVP stock. |
| 10 | Reports/export work | TODO | TODO | `/stock/reports` | CSV file, print/PDF-ready view, WhatsApp summary | Confirm reports include stock balance, inbound age by item + brand + location, stock take variance, damage/spoilage, and supplier return. |
| 11 | Role/outlet isolation works | TODO | TODO | Stock routes | RLS allowed/denied rows | Confirm non-admin users see only assigned outlet/location; admin/director can see all allowed views. |
| 12 | Mobile scanner works | TODO | TODO | Scanner routes | Device screenshots/video notes | Confirm phone-width 390px, large scan button, manual fallback, recent scan list, permission message, success vibrate/beep where supported, continuous scan on inbound/outbound/stock-take, and stream stop on close. |
| 13 | Automated tests exist | TODO | Local terminal | N/A | Command output | Confirm smoke route, barcode regression, stock acceptance coverage, stock state-transition coverage, stock migration safety, stock role/scope coverage, stock scanner coverage, stock RLS policy coverage, stock seed coverage, stock security/no-service-role coverage, stock item-master coverage, stock label coverage, stock-take warning coverage, and stock report coverage scripts all run. |

## Outbound Workflow Evidence

| Scenario | Status | Evidence |
| --- | --- | --- |
| Order-based outbound scans multiple barcodes continuously, then confirms once | TODO | TODO |
| Order-based outbound allows different items under the same order | TODO | TODO |
| Requested/scanned quantity or weight mismatch shows warning but can continue | TODO | TODO |
| Substitution keeps original ordered item and records substituted scanned item | TODO | TODO |
| Direct outbound supports `SALES`, `TRANSFER`, and `PROCESSING` | TODO | TODO |
| Damage/spoilage uses staff request, manager review, director approval, and photo | TODO | TODO |
| Return supplier uses request and approval workflow before deduction | TODO | TODO |
| Missing barcode is blocked | TODO | TODO; confirm the pre-confirm missing-barcode warning is visible and the server action still blocks if submitted |
| Duplicate barcode in a batch is blocked | TODO | TODO |
| Already-outbounded barcode is blocked | TODO | TODO |
| Wrong-status barcode is blocked | TODO | TODO; confirm the pre-confirm blocked-scan warning is visible and the server action still blocks if submitted |
| Wrong-location barcode is blocked | TODO | TODO |

## Transfer Evidence

| Scenario | Status | Evidence |
| --- | --- | --- |
| Transfer outbound sets `TRANSFER_PENDING` | TODO | TODO |
| Destination receive scan changes location | TODO | TODO |
| Transfer not received after 3 days shows alert | TODO | TODO |
| Transfer cannot be cancelled after scanned out | TODO | TODO |
| Normal return atomically restores `IN_STOCK` with movement, scan-log, and audit-log rows | TODO | TODO |

## Damage And Return Evidence

| Scenario | Status | Evidence |
| --- | --- | --- |
| Damage request requires photo | TODO | TODO |
| Manager review is required before director approval | TODO | TODO |
| Damage and return-supplier approvals reject wrong status or wrong location | TODO | TODO |
| Director approval deducts stock and writes movement | TODO | TODO |
| Customer return after sale goes to `INSPECTION` first, cannot be outbounded, then atomic manager/admin release changes it to `IN_STOCK` with movement, scan-log, and audit-log rows | TODO | TODO |
| Failed delivery return automatically restores linked barcode stock to `IN_STOCK` | TODO | TODO |
| No-barcode failed delivery return is not used for MVP | TODO | TODO |

## Stock Take Evidence

| Scenario | Status | Evidence |
| --- | --- | --- |
| Manager creates stock take session by location and item + brand | TODO | TODO |
| Open stock take blocks inbound/outbound only for selected item + brand in that location | TODO | TODO |
| Barcode-only count is enforced; manual count entry is disabled | TODO | TODO |
| Empty stock take session cannot be submitted | TODO | TODO |
| Empty stock take session cannot be reviewed or approved | TODO | TODO |
| Missing expected barcode in a reviewed stock take becomes variance and `ADJUSTED_OUT` only after director approval | TODO | TODO |
| Staff submit count for manager review | TODO | TODO |
| Manager signature is recorded | TODO | TODO |
| Director signature is recorded | TODO | TODO |
| System applies `STOCK_TAKE_ADJUSTMENT` only after director approval | TODO | TODO |

## RLS / Scope Evidence

| User | Role | Outlet | Stock location | Expected access | Actual result |
| --- | --- | --- | --- | --- | --- |
| TODO | Stock worker | TODO | TODO | Own stock only | TODO |
| TODO | Stock worker | Other outlet | Other location | Denied | TODO |
| TODO | Manager | Own outlet | Own location | Manage own scope | TODO |
| TODO | Admin | All | All | All operational/admin access | TODO |
| TODO | Director | All | All | View/approve, no routine operation | TODO |

## Phone Scanner Evidence

| Device / browser | Route | Camera permission | Rear camera preferred | Manual fallback | Recent scan list | Stream stopped on close | Result |
| --- | --- | --- | --- | --- | --- | --- | --- |
| TODO | `/stock/inbound` | TODO | TODO | TODO | TODO | TODO | TODO |
| TODO | `/stock/outbound` | TODO | TODO | TODO | TODO | TODO | TODO |
| TODO | `/stock/transfer` | TODO | TODO | TODO | TODO | TODO | TODO |
| TODO | `/stock/receive-transfer` | TODO | TODO | TODO | TODO | TODO | TODO |
| TODO | `/stock/return` | TODO | TODO | TODO | TODO | TODO | TODO |
| TODO | `/stock/stock-take` | TODO | TODO | TODO | TODO | TODO | TODO |

## 2026-06-23 Attempted 390px Browser QA

Environment: local Next dev server at `http://127.0.0.1:3000`.

Result:

- Local app responded at `/stock`.
- Authenticated 390px browser QA could not be completed in this Codex session because the browser automation runtime failed to launch in the Windows sandbox with permission error `CreateProcessAsUserW failed: 5`.
- No production data or live Supabase migration was touched.

Evidence captured instead:

- Added source-level guard `scripts/stock-mobile-ux-coverage.mjs`.
- `npm.cmd run smoke` now runs the Stock mobile UX guard.
- The guard checks six-button worker Stock home, no worker finance/value/report/settings content, scan-first Stock worker forms, scanner mobile copy, label reprint copy, and QA-doc 390px requirements.
- Latest local source/build pass on 2026-06-23: `node scripts\stock-mobile-ux-coverage.mjs`, `npm.cmd run smoke`, `npm.cmd run lint`, `npm.cmd run typecheck`, and `npm.cmd run build` passed.
- Damage/spoilage mobile coverage now also checks that the phone image picker fills the required photo file name/reference for approval requests.

Remaining manual QA:

- Sign in from Vercel or local app as a stock worker on a real phone around 390px width.
- Test `/stock`, `/stock/inbound`, `/stock/outbound`, `/stock/transfer`, `/stock/receive-transfer`, `/stock/return`, `/stock/stock-take`, and `/stock/units/[id]`.
- Capture screenshots/video notes for camera permission, camera denied message, large Scan Barcode button, manual fallback, no horizontal scrolling, print/PDF label fallback, and blocked/warning states.

## 2026-06-12 Local Route Protection Check

Environment: local Next dev server at `http://127.0.0.1:3000`.

Result:

- `/stock/dashboard` returned `307` redirect to `/login`.
- `/stock/inbound` returned `307` redirect to `/login`.
- `/stock/reports` returned `307` redirect to `/login`.
- `/stock/stock-take` returned `307` redirect to `/login`.

Notes:

- This proves unauthenticated Stock routes are protected in local runtime.
- Authenticated visual QA was not completed in this environment because the in-app browser automation failed with a Windows sandbox permission error.
- Phone/laptop camera QA still needs to be run manually with an authenticated session.

## 2026-06-24 Stock Mobile Movement Card QA Preparation

Scope:

- Stock dashboard latest movements.
- `/stock/movements` mobile movement history.
- Stock unit detail movement summary.

What changed:

- Stock mobile movement-history cards now stack movement type/item and weight on very narrow phones.
- At 390px and wider phone layouts, the same movement card switches to side-by-side header alignment.
- Movement type, item, barcode, locations, time, and reference remain wrapping or break-all where needed, reducing horizontal overflow risk.
- Source coverage now guards the mobile movement card layout markers.

Commands:

- `node scripts\stock-mobile-ux-coverage.mjs` - passed.
- `node scripts\stock-owner-qa-doc-coverage.mjs` - passed.
- `npm.cmd run smoke` - passed.
- `npm.cmd run lint` - passed.
- `npm.cmd run typecheck` - passed.
- `npm.cmd run build` - first attempt hit an existing Next build lock; retry after waiting passed.

Remaining manual QA:

- Open Stock dashboard, `/stock/movements`, and `/stock/units/[id]` from Vercel or local app on a real authenticated phone around 390px width.
- Confirm movement cards do not clip or squeeze long movement type, item, barcode, location, time, or reference values.
- Real phone camera permission, rear-camera scan, Bluetooth label printer, PDF label fallback, and live Supabase/RLS evidence remain owner/device QA items.

## 2026-06-24 Stock Take Review Card QA Preparation

Scope:

- `/stock/stock-take` review-session cards.
- Manager review and director approval action area.
- Exception badges for unknown and wrong-location stock-take barcodes.

What changed:

- Stock Take review-session cards now wrap long session numbers, location/item/brand scope text, exception barcodes, and manager/director signature text.
- Review, reject, approve, and status controls now keep phone-size height and full-width behavior on mobile while keeping the existing desktop wrapping layout.
- Source coverage now guards the Stock Take review-card mobile classes.

Commands:

- `node scripts\stock-mobile-ux-coverage.mjs` - passed.
- `node scripts\stock-owner-qa-doc-coverage.mjs` - passed.

Remaining manual QA:

- Open `/stock/stock-take` from Vercel or local app on a real authenticated phone around 390px width.
- Use a session with long session number, long location, long product/brand name, and long exception barcode.
- Confirm the review card, signature text, and manager/director approval actions remain readable and do not create horizontal scrolling.
- Real manager/director approval, RLS, and stock-take adjustment evidence remain manual owner/Supabase QA items.

## 2026-06-24 Stock Outbound Feedback Card QA Preparation

Scope:

- `/stock/outbound` order outbound scan context.
- `/stock/outbound` direct outbound scan context.
- Previous outbound scan feedback after a scan.

What changed:

- The green `Scanning outbound` card now wraps long order numbers, customer names, outbound type text, and transfer destination names.
- The `Previous outbound scan` card now wraps long product labels and scan result text while keeping scanned barcode text breakable.
- Source coverage now guards the outbound context and previous-scan wrapping classes.

Commands:

- `node scripts\stock-mobile-ux-coverage.mjs` - passed.
- `node scripts\stock-owner-qa-doc-coverage.mjs` - passed.
- `npm.cmd run smoke` - passed.
- `npm.cmd run lint` - passed.
- `npm.cmd run typecheck` - passed.
- `npm.cmd run build` - passed.

Remaining manual QA:

- Open `/stock/outbound` from Vercel or local app on a real authenticated phone around 390px width.
- Use long order number, customer name, transfer destination, product label, and barcode values.
- Confirm the scan context and previous-scan cards stay readable and do not create horizontal scrolling.

## 2026-06-24 Stock Mobile Card Status Badge QA Preparation

Scope:

- `/stock/items` mobile item-master cards.
- `/stock/balance` mobile balance cards.
- `/stock/balance` mobile barcode-unit cards.

What changed:

- Mobile card headers now stack item text and status badges on very narrow phones.
- The same headers switch to side-by-side alignment at the 390px breakpoint.
- Status badges now wrap and stay within the card instead of shrinking long item/location text.
- Source coverage now guards the stacked header and wrapping badge classes.

Commands:

- `node scripts\stock-mobile-ux-coverage.mjs` - passed.
- `node scripts\stock-owner-qa-doc-coverage.mjs` - passed.
- `npm.cmd run smoke` - passed.
- `npm.cmd run lint` - passed.
- `npm.cmd run typecheck` - passed.
- `npm.cmd run build` - passed.

Remaining manual QA:

- Open `/stock/items` and `/stock/balance` from Vercel or local app on a real authenticated phone around 390px width.
- Use long item names, long location names, and long status values.
- Confirm item-master, balance, and barcode-unit card headers do not squeeze or clip text and do not create horizontal scrolling.

## 2026-06-24 Stock Inbound Scan Card QA Preparation

Scope:

- `/stock/inbound` `Previous scan` card.
- `/stock/inbound` current-session recent saved-scan cards.

What changed:

- Previous-scan product names now wrap inside the green feedback card.
- Recent saved-scan cards now stack product name and status badge on narrow phones, then align side-by-side at 390px.
- Saved-scan status badges wrap inside the card instead of squeezing long product names.
- Source coverage now guards the inbound previous-scan and recent-scan card wrapping classes.

Commands:

- `node scripts\stock-mobile-ux-coverage.mjs` - passed.
- `node scripts\stock-owner-qa-doc-coverage.mjs` - passed.
- `npm.cmd run smoke` - passed.
- `npm.cmd run lint` - passed.
- `npm.cmd run typecheck` - passed.
- `npm.cmd run build` - passed.

Remaining manual QA:

- Open `/stock/inbound` from Vercel or local app on a real authenticated phone around 390px width.
- Use long product, barcode, scanned-by, and location values.
- Confirm previous-scan and recent saved-scan cards stay readable and do not create horizontal scrolling.

## 2026-06-24 Stock Scanner Success Feedback QA Preparation

Scope:

- Shared Stock scanner camera sheet on inbound, outbound, transfer, receive-transfer, return/damage, and stock-take pages.

What changed:

- The scanner sheet now keeps `Last scan` and `Camera session scans` stacked at 390px worker-phone width.
- The two feedback cards switch to side-by-side only on wider screens.
- Source coverage now guards against the older 390px two-column scanner feedback layout.

Commands:

- `node scripts\stock-mobile-ux-coverage.mjs` - passed.
- `node scripts\stock-owner-qa-doc-coverage.mjs` - passed.
- `npm.cmd run smoke` - passed.
- `npm.cmd run lint` - passed.
- `npm.cmd run typecheck` - passed.
- `npm.cmd run build` - passed.

Remaining manual QA:

- Open any Stock scanner page from Vercel or local app on a real authenticated phone around 390px width.
- Complete at least two scans or manual fallback entries.
- Confirm `Last scan` and `Camera session scans` remain stacked, readable, and do not create horizontal scrolling.

## 2026-06-24 Stock Take Scan Card QA Preparation

Scope:

- `/stock/stock-take` scan scope, counting scope, barcode/weight progress, and previous-scan cards.

What changed:

- Stock Take scan-scope and counting-scope cards now force wrapping for long item, brand, location, and session values.
- Previous stock-take scan item text now wraps inside the feedback card.
- Source coverage now guards these mobile wrapping classes.

Commands:

- `node scripts\stock-mobile-ux-coverage.mjs` - passed.
- `node scripts\stock-owner-qa-doc-coverage.mjs` - passed.
- `npm.cmd run smoke` - failed before Stock checks on an unrelated Order guard: `Order form UX guard missing: Create confirmed order`.
- `npm.cmd run lint` - passed.
- `npm.cmd run typecheck` - passed.
- `npm.cmd run build` - passed.

Remaining manual QA:

- Open `/stock/stock-take` from Vercel or local app on a real authenticated phone around 390px width.
- Use long location, session number, brand, and item names.
- Confirm `Scanning for`, `Counting scope`, progress, and `Previous stock take scan` cards stay readable and do not create horizontal scrolling.

## 2026-06-25 Barcode Inbound Rule Learning QA Preparation

Scope:

- `/stock/inbound` supplier barcode weight-rule learning after one manual weight entry.

What changed:

- Added a conservative `inferBarcodeWeightRule()` helper that finds a unique 5-digit imported barcode weight field from scanned barcode + typed kg.
- Barcode Inbound now fills weight-rule fields and turns on `Save weight rule for future scans` when a clear position is found.
- Existing save path still writes the stock unit, movement, scan log, audit log, and optional barcode rule through the existing action/RPC.

Commands:

- `node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON scripts\stock-workflow-regression.mjs` - passed.
- `node scripts\stock-mobile-ux-coverage.mjs` - passed.
- `node scripts\stock-owner-qa-doc-coverage.mjs` - passed.
- `npm.cmd run smoke` - passed.
- `npm.cmd run lint` - passed.
- `npm.cmd run typecheck` - passed.
- `npm.cmd run build` - passed.

Remaining manual QA:

- Use a supplier barcode with no saved rule.
- Scan/type the barcode, enter actual kg once, and confirm the rule-learning message appears.
- Save with `Save weight rule for future scans` on, then scan another same-format barcode and confirm the weight auto-fills.

## 2026-06-25 Stock Outbound Direct-Only QA Preparation

Scope:

- `/stock/outbound` worker mobile flow.
- `/orders/picking` remains the customer-order picking surface.

What changed:

- Stock Outbound now opens as direct stock outbound only.
- The Stock page shows `Direct stock outbound only. Order picking stays in Orders.`
- `Open Orders picking` links workers to `/orders/picking` for customer-order picking.
- Direct Sales requires a customer before scanning and starts with the default remark `Direct sales stock out` to reduce typing; the selected customer is added to movement notes.
- Owner/Vercel QA docs and source guards now check the direct-only Stock split.

Commands:

- `node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON scripts\stock-workflow-regression.mjs` - passed.
- `node scripts\stock-mobile-ux-coverage.mjs` - passed.
- `node scripts\stock-owner-qa-doc-coverage.mjs` - passed.
- `npm.cmd run smoke` - passed.
- `npm.cmd run lint` - passed.
- `npm.cmd run typecheck` - initially failed before/alongside build because `.next/types` was stale; passed after build regenerated route types.
- `npm.cmd run build` - passed.

Coverage cleanup note:

- Smoke also needed stale non-Stock coverage guards aligned to existing app behavior: delivery handoff is now checked after final price, and Orders create-flow text now matches the current create-then-price-after-picking workflow.

Remaining manual QA:

- Open `/stock/outbound` from Vercel or local app on a real authenticated phone around 390px width.
- Confirm only direct stock-out setup appears on the Stock page.
- Confirm `Open Orders picking` opens `/orders/picking`.
- Choose a customer, scan one direct Sales barcode, and confirm no order selection is required.
- Confirm damage/spoilage still requires photo and creates a request without immediate deduction.

## Desktop Scanner Evidence

| Device / browser | Route | Camera opens | Manual fallback | Label print/export | Result |
| --- | --- | --- | --- | --- | --- |
| TODO | `/stock/inbound` | TODO | TODO | TODO | TODO |
| TODO | `/stock/outbound` | TODO | TODO | N/A | TODO |
| TODO | `/stock/units/[id]` | N/A | N/A | TODO | TODO |

## 2026-06-29 Inbound Session Undo Summary Copy

Scope:

- `/stock/inbound` finished-session summary.

What changed:

- Updated the finished inbound session warning so it no longer contradicts the available whole-session undo action.
- Renamed the button to `Undo/Delete whole session` so the action is clearer for workers.
- Kept the existing confirmation and void-with-audit behavior unchanged.

Manual QA:

- Finish an inbound session at phone width around 390px.
- Confirm the summary shows total units, total weight, and duplicate/error scans.
- Confirm the warning says whole-session undo is only for a mistaken inbound session.
- Tap `Undo/Delete whole session`, cancel the confirmation, and confirm stock remains unchanged.
- Repeat only in a safe demo session, accept the confirmation, and confirm units are voided with movement history kept.

## 2026-06-29 Inbound External Scanner Instruction

Scope:

- `/stock/inbound` supplier-barcode, barcode-rule, and manual-label scan panels.

What changed:

- Added a short worker-facing instruction beside the inbound barcode field: keep the cursor in the barcode box and scan with an external scanner.
- The existing Enter-key scan path remains unchanged and still auto-saves valid scans where the page rules allow it.
- No server action, RLS, duplicate check, barcode rule, stock movement, or database behavior changed.

Manual QA:

- Open `/stock/inbound` on desktop with a keyboard-wedge barcode scanner.
- Select product, manufacturer, origin, and location.
- Keep the cursor in the barcode box, scan a valid barcode, and confirm Enter triggers the same behavior as camera/manual scan.
- Confirm duplicate, no-weight, and barcode-length warning messages still appear when expected.

## 2026-06-29 Inbound Manual Summary Count Label

Scope:

- `/stock/inbound` finished-session summary for supplier-barcode and no-supplier-barcode modes.

What changed:

- Supplier-barcode session summaries still show `Total barcode units`.
- No-supplier-barcode/manual-weight session summaries now show `Total count`, matching the guided manual inbound requirement.
- Total weight, product, manufacturer, display name, print summary, and whole-session undo behavior were not changed.

Manual QA:

- Finish one supplier-barcode inbound session and confirm the summary says `Total barcode units`.
- Finish one no-supplier-barcode/manual-weight session and confirm the summary says `Total count`.
- Confirm both summaries still show manufacturer + product display name and total kg.

## 2026-06-29 Manual Weight Continuous Entry Source Guard

Scope:

- `/stock/inbound` no-supplier-barcode/manual-weight save loop.

What changed:

- Strengthened the Stock mobile UX source guard to require the manual-weight continuous-entry mechanics.
- The guard now checks that a successful printed-label save clears the kg value, returns/stays on Manual Weight, shows `Saved. Enter next weight.`, and refocuses the weight field.
- No app runtime logic, server action, RLS, stock movement, duplicate prevention, or migration changed in this pass.

Manual QA:

- Start a no-supplier-barcode inbound session.
- Enter kg, generate the label, confirm stock saves, then print/attach it and confirm the kg field clears.
- Confirm the screen remains on Manual Weight and the kg field is ready for the next unit.

## 2026-06-29 Guided Inbound Acceptance Coverage

Scope:

- Active Stock Inbound guided-flow goal.

What changed:

- Added a compact acceptance coverage block for the exact guided inbound objective.
- The smoke suite now guards the product + manufacturer display naming, Page 1 setup, Page 2 barcode-rule setup, Page 3 continuous scan mechanics, external scanner Enter handling, previous-scan undo, Page 4 summary actions, manual-weight continuous entry, and manufacturer-aware stock balance/report display.
- No app runtime logic, server action, RLS, stock movement, duplicate prevention, or migration changed in this pass.

Browser check attempt:

- Tried to start the local Next.js dev server on port `3900` for a 390px browser check.
- The server reported ready in the workspace log, but the process did not remain reachable across tool calls in this desktop thread; the in-app browser received `connection refused`.
- Real browser/device QA is still required for tap comfort, actual camera permission, external scanner timing, and label printing.

Manual QA:

- Open `/stock/inbound` at about 390px width.
- Walk both `Inbound with Barcode` and `Inbound without Barcode` flows from setup to summary.
- Confirm camera/manual/external scanner paths, previous scan, live count/weight, undo previous scan, print summary, and whole-session undo confirmation.

## 2026-06-29 First-Time Barcode Rule Scan Gate

Scope:

- `/stock/inbound` supplier-barcode Page 2 Barcode Rule flow.

What changed:

- First-time supplier-barcode setups can no longer open the continuous scanner before a saved rule exists.
- The Barcode Rule page now shows `Save rule first` until a saved barcode rule is available for the selected product/manufacturer/origin.
- This prevents workers from scanning continuously using default rule fields before learning/saving the correct barcode rule.
- Existing saved-rule templates still go straight to scanning, and the successful rule-save path still moves the worker into scanning.

Manual QA:

- Select a product/manufacturer/origin combination with no saved barcode rule.
- Confirm Page 2 shows `Save rule first` and does not allow opening the scanner directly.
- Scan one sample barcode, enter actual kg, save the rule, then confirm the scanner flow can continue.
- Select a recent template with a saved rule and confirm it can still open the scanner directly.

## 2026-06-29 First-Time Barcode Rule Continuity

Scope:

- `/stock/inbound` supplier-barcode Page 2 save-rule-to-scan continuation.

What changed:

- After a first-time barcode-rule save succeeds, the client now marks that rule as available for the current session instead of waiting for `barcodeWeightRules` props to refresh.
- The page shows `Rule saved for this session` and allows `Open scanner` immediately after the sample save.
- The sampled barcode length is kept locally so the next scan can still show the saved-rule barcode-length warning before a full server refresh.
- Existing persisted-rule templates, server action behavior, RLS, duplicate prevention, stock movements, and migrations were not changed.

Manual QA:

- Select a no-rule product/manufacturer/origin.
- Scan a sample barcode, enter actual kg, and save the rule.
- Confirm the page moves into scanning and shows `Rule saved. Continue scanning.` or `Rule saved for this session`.
- Scan a different-length barcode and confirm a barcode-length warning appears.

## 2026-06-29 First-Time Barcode Rule Required Save

Scope:

- `/stock/inbound` supplier-barcode Page 2 first sample rule save.

What changed:

- During first-time barcode-rule learning, the save-rule control is now mandatory and reads `Save weight rule for first scan`.
- The disabled checked control is paired with a hidden `saveWeightRule=true` field so the server still receives the save-rule request.
- Once a rule exists for the session or from saved data, the normal `Save weight rule for future scans` behavior remains available.
- No server action, RLS, stock movement, duplicate prevention, or migration changed.

Manual QA:

- Select a no-rule product/manufacturer/origin and open Page 2.
- Confirm the rule checkbox is checked, disabled, and says `Save weight rule for first scan`.
- Save one sample and confirm the scanner can continue.
- Confirm saved-rule sessions do not force the first-scan wording.

## 2026-06-29 Inbound Safe Back Navigation

Scope:

- `/stock/inbound` scan and manual-weight pages.

What changed:

- Supplier-barcode scan now has an explicit `Back to Barcode Rule` action in the worker action row.
- No-supplier/manual-weight mode now has an explicit `Back to setup` action while setup is still safe to change.
- The manual setup back action is disabled once the session is locked by saved scans or a pending label.
- Existing top step navigation, server actions, duplicate blocking, undo behavior, RLS, and stock movement behavior were not changed.

Manual QA:

- Start a supplier-barcode session and confirm the scan page shows `Back to Barcode Rule`.
- Start a no-supplier/manual-weight session before saving anything and confirm `Back to setup` works.
- Generate or save a manual label and confirm setup changes are blocked once the session is locked.

## 2026-06-29 Barcode Rule Save Once

Scope:

- `/stock/inbound` supplier-barcode continuous scanning after a rule exists.

What changed:

- Matching saved barcode rules now load with `saveWeightRule` off, so normal continuous scans use the rule without re-saving it every time.
- After a first sample successfully saves a new rule, the client turns `saveWeightRule` off before continuing into scan mode.
- First-time rule learning still forces `saveWeightRule=true` for the sample save.
- Existing server actions, persisted rule schema, duplicate blocking, stock movements, RLS, and migrations were not changed.

Manual QA:

- Select a no-rule product/manufacturer/origin and save one sample rule.
- Confirm the page moves to scanning.
- Scan a second same-format barcode and confirm it saves stock without presenting the first-scan rule-save state again.
- Select a saved-rule template and confirm it scans normally without showing first-scan rule-save wording.

## 2026-06-29 Session-Saved Rule Guard Consistency

Scope:

- `/stock/inbound` supplier-barcode rule page and scan continuation.

What changed:

- Rule-page guards now use the combined `canUseBarcodeRuleForSession` state instead of checking only persisted `currentBarcodeWeightRule`.
- After a rule is saved in the current session, the page no longer reopens the first-sample teaching panel or requires actual kg again as though no rule exists.
- The scan path still requires sample barcode + actual kg until either a persisted rule or a session-saved rule exists.
- No server action, RLS, stock movement, duplicate prevention, or migration changed.

Manual QA:

- Save a first-time barcode rule.
- Go back to the Barcode Rule page and confirm it shows the rule as usable for the session, not the first-sample teaching state.
- Continue scanning and confirm the next barcode does not require actual kg again unless the rule cannot decode it.

## 2026-06-29 Rule Page Submit Hidden After Rule Ready

Scope:

- `/stock/inbound` supplier-barcode Page 2 action row.

What changed:

- `Save first barcode + rule` now appears only while a barcode rule is still being learned.
- Once a persisted or session-saved rule is usable, Page 2 shows `Open scanner` instead of also showing the save submit action.
- This avoids accidental blank/repeated submissions after the first rule is already ready.
- No server action, RLS, stock movement, duplicate prevention, or migration changed.

Manual QA:

- Open a no-rule setup and confirm Page 2 shows `Save first barcode + rule`.
- Save the first sample rule and go back to Page 2.
- Confirm Page 2 shows `Open scanner` and no longer shows `Save first barcode + rule`.

## 2026-06-29 Barcode Length Warning Precedence

Scope:

- `/stock/inbound` supplier-barcode scans using a saved or session-saved barcode rule.

What changed:

- Barcode length mismatch is now checked even when the barcode also fails weight decoding.
- If both happen, the worker sees the length mismatch plus internal-label guidance instead of only a generic no-weight message.
- The length mismatch issue is logged as `BARCODE_LENGTH_MISMATCH`; decode failure handling still guides the worker to no-barcode/internal-label inbound.
- No server action, RLS, stock movement, duplicate prevention, or migration changed.

Manual QA:

- Save or select a barcode rule with a known barcode length.
- Scan a barcode with a different length that cannot decode.
- Confirm the warning mentions the expected/got barcode length and tells the worker to generate an internal label.

## 2026-07-10 Inbound History Setup Notice

Scope:

- `/stock/inbound` recent session reuse.

What changed:

- Reusing a past inbound session setup now shows `New session. Setup copied.` instead of repeating the full product/manufacturer display name in the notice.
- Source coverage guards the short copy.
- No stock action, RLS, movement, barcode uniqueness, or migration logic changed.

Manual QA:

- Open `/stock/inbound` around 390px width.
- Tap `Use same setup` on a recent session.
- Confirm the notice is short and the selected product/manufacturer/origin/location still restore correctly.

## 2026-07-10 Inbound Scanner Action Row

Scope:

- `/stock/inbound` active scanner action buttons.

What changed:

- The active scanner action row is now one-column on phone width and only wraps into a row on wider screens.
- Existing Back, Save, Confirm, and Finish behavior was not changed.
- No stock action, RLS, movement, barcode uniqueness, or migration logic changed.

Manual QA:

- Open `/stock/inbound` around 390px width.
- Go to Barcode Rule or Scanner.
- Confirm the action buttons stack cleanly without horizontal scrolling.

## 2026-07-10 Inbound External Scanner Helper

Scope:

- `/stock/inbound` active scanner helper text.

What changed:

- The external scanner helper now says `External scanner: scan here.`
- Source coverage rejects the longer old wording.
- No scanner behavior, stock action, RLS, movement, barcode uniqueness, or migration logic changed.

Manual QA:

- Open `/stock/inbound` around 390px width.
- Go to Barcode Rule or Scanner.
- Confirm the helper below the scanner field is short and readable.

## 2026-07-10 Local 390px Browser Attempt

Scope:

- `/stock/inbound` local phone-width verification.

What was checked:

- Next dev server starts on `127.0.0.1:3900`.
- PowerShell route probe reached `/stock/inbound` and received the expected auth redirect.
- In-app browser was set to 390px width, but could not reach `127.0.0.1:3900` or `localhost:3900` in this environment.

Result:

- Browser-localhost access is blocked here, so real logged-in 390px UI evidence still needs owner/Vercel or local browser testing.
- Source, smoke, lint, typecheck, and build checks remain the available verification for this pass.

## Final Sign-Off

- [ ] All 13 acceptance tests passed with real evidence.
- [ ] RLS / scope evidence was captured for allowed and denied cases.
- [ ] Phone scanner evidence was captured on a real phone around 390px width.
- [ ] Desktop scanner and label print evidence was captured.
- [ ] No Supabase service-role key is used in frontend environment variables.
- [ ] All migrations were applied in filename order on a fresh Supabase project.
- [ ] `npm.cmd run smoke`, `npm.cmd run lint`, `npm.cmd run typecheck`, and `npm.cmd run build` passed.
- [ ] Remaining limitations were added to `HANDOFF.md`.
