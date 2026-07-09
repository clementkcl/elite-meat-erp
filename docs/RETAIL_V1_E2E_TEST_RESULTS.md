# Retail Module V1 E2E Test Results

Date: 2026-06-24

## Current Result

Retail Module V1 is technically ready for Limited UAT based on the current confirmed manual phone/browser QA status.

Retail-specific automated coverage, authenticated staging Supabase QA, real manual phone/browser QA, file upload, storage isolation, export, calculations, and outlet isolation have passed. The active follow-up is UX simplification before broader staff rollout.

Staff rollout UX follow-up:

- Simplify Retail pages into one-task-per-page workflows.
- Keep worker pages mobile-first, low typing, and big-button driven.
- Keep manager/admin review and settings controls away from worker task pages.

## Automated Coverage

Command:

```bash
node scripts\retail-v1-e2e-coverage.mjs
```

Result:

```text
Retail Module V1 E2E coverage passed (40 scenarios).
```

### Scenarios Covered

- Access: worker own outlet/today view, worker/manager outlet isolation, admin/director all-outlet view.
- Daily Sales: worker same-day draft, manager confirmation, one summary per outlet/date, payment total calculation, missing AutoCount attachment warning.
- Expenses: worker submit with receipt, receipt required, cash-only expected-cash deduction, non-cash ignored for expected cash, manager review.
- Cleaning: worker completion, missing task report, completed green status, missing red status.
- Processing: worker create, multiple raw lines, multiple finished lines, yield %, wastage %, unaccounted difference, no weight-mismatch warning, outlet/item report filtering.
- Cash Closing: one closing per outlet/date, worker blocked, sales pull, cash expense pull, expected cash, variance, warning, manager same-day audit, admin/director past edit audit.
- Reports: manager assigned-outlet view, admin/director all-outlet view, missing closing, payment breakdown, outlet comparison.

## Evidence Type

This pass is automated source, migration, and calculation-fixture coverage. It verifies the Retail V1 workflow across page guards, server actions, Supabase migration/RLS rules, report logic, shared status styling, and deterministic arithmetic fixtures.

## Real Supabase Environment QA

### Supabase Environment Tested

- Configured Supabase URL host: `aikfqnbsshflbtuakwrz.supabase.co`
- Linked project ref: `aikfqnbsshflbtuakwrz`
- Linked project name: `clementkcl's Project`
- Environment classification: confirmed by owner as safe non-production/staging for Retail V1 QA.

### Migration Result

- Applied Retail V1 migration chain `202606230016` through `202606230025` to staging.
- Used `supabase db query --linked --file` for the Retail-only chain instead of full `db push`, because remote migration status showed many pending non-Retail migrations and a duplicate local `202606230013` migration version.
- Repaired remote migration history for Retail versions `202606230016` through `202606230025`.
- Applied Retail file isolation migration `202606240001_retail_file_upload_isolation_v1.sql` to staging and repaired migration history.
- Applied Retail cleaning completion upsert policy migration `202606240002_retail_cleaning_completion_upsert_policy_v1.sql` to staging and repaired migration history.
- Applied Retail file metadata/RLS migration `202606240004_retail_file_metadata_rls_v1.sql` to staging and repaired migration history.
- Fixed staging migration issues found during application:
  - `202606230018_retail_daily_sales_summary_v1.sql`: cast UUID aggregates before `min`/`max`.
  - `202606230021_retail_processing_v1.sql`: added missing `public.can_view_processing()` helper.
- Committed enum additions separately for:
  - `retail_processing_status`: `DRAFT`, `SUBMITTED`, `REJECTED`.
  - `retail_closing_status`: `REVIEWED`.

### Retail V1 Table Validation

Executed against staging.

Verified tables exist with RLS enabled:

- `retail_daily_sales`
- `retail_expenses`
- `retail_expense_categories`
- `retail_cleaning_tasks`
- `retail_cleaning_completions`
- `retail_processing_boms`
- `retail_processing_records`
- `retail_processing_raw_lines`
- `retail_processing_finished_lines`
- `retail_cash_closings`
- `retail_audit_logs`
- `retail_files`

Verified unique indexes:

- One `retail_daily_sales` row per outlet/date.
- One `retail_cash_closings` row per outlet/date.

Verified RLS policies exist for Retail V1 operational tables. Authenticated role/outlet API tests also confirmed outlet isolation for the tested flows.

Verified Retail file isolation:

- Retail upload paths now use `retail/<outlet-id>/<record-type>/<record-id>/<filename>`.
- Retail file metadata is stored in `retail_files` with outlet, record type, record ID, bucket, storage path, original filename, MIME type, uploader, and upload timestamp.
- Retail storage read policy requires a valid outlet-scoped Retail path plus matching Retail metadata.
- Outlet A worker could upload and download an Outlet A Retail file.
- Outlet A manager could download the Outlet A Retail file.
- Outlet B worker was blocked from downloading the Outlet A Retail file.
- Outlet B manager was blocked from downloading the Outlet A Retail file.
- Admin and director could download the Outlet A Retail file.
- Outlet B worker was blocked from uploading into an Outlet A Retail path.
- Old non-record Retail paths such as `retail/<outlet-id>/qa/<filename>` were blocked.

Verified Retail upload UI and authorized file viewing:

- Retail Expenses uses a real required file input for receipt upload.
- Daily Sales Summary uses a real optional file input for AutoCount report upload.
- Cleaning Completion is tap-only in the worker page; photo/remarks are not shown for V1.
- Processing Wastage uses a real optional file input for wastage photo upload.
- Retail upload UI shows the selected filename.
- Forms show an uploading state when submitted with selected files.
- Upload errors are surfaced through the existing form action error message.
- Retail tables link uploaded files through `/api/retail/files`, which checks `retail_files` metadata through RLS before generating a short-lived signed URL.
- No permanent public Retail file URLs are exposed.

Verified Retail report export:

- Retail Reports includes CSV export controls for report viewers.
- Export uses the same filtered report data shown on-screen.
- Retail manager export is scoped to the manager outlet.
- Admin/director export can use all-outlet or selected-outlet report scope.
- Retail worker does not receive the full reports view or export control.

### QA Users Tested

Created and tested real Supabase Auth users:

- `retail.worker.outletA@example.test` - passed sign-in.
- `retail.manager.outletA@example.test` - passed sign-in.
- `retail.worker.outletB@example.test` - passed sign-in.
- `retail.manager.outletB@example.test` - passed sign-in.
- `admin.qa@example.test` - passed sign-in.
- `director.qa@example.test` - passed sign-in.

### Role/Outlet Matrix Result

Executed through Supabase Auth and REST API.

- Outlet A worker: passed. Could see Outlet A sales only.
- Outlet A manager: passed. Could not read or edit Outlet B records through direct API.
- Outlet B worker: passed. Could see Outlet B sales only.
- Outlet B manager: passed for cross-outlet edit block.
- Admin: passed. Could see Outlet A and Outlet B sales.
- Director: passed. Could see Outlet A and Outlet B sales.
- Cross-outlet direct API access: passed for tested sales and expense update paths.
- Cross-outlet direct storage access: passed. Outlet B worker and Outlet B manager could not download Outlet A worker's Retail upload.
- Direct cross-outlet upload access: passed. Outlet B worker could not upload into Outlet A's Retail path.

### Manual Browser/Mobile QA Result

QA attempt time: 2026-06-24 13:50:24 +08:00.

Browser/device attempted:

- Codex in-app browser automation: blocked by local Windows sandbox startup failure, `CreateProcessAsUserW failed: 5`.
- Chrome automation fallback: unavailable because the exposed Chrome control path depends on the same Node-backed browser runtime.
- Local automation packages: unavailable; `playwright`, `@playwright/test`, and `puppeteer` are not installed in this workspace.
- Real phone browser: not available from this execution environment.

Authenticated API workflow QA was executed and passed. Full authenticated browser/mobile click-through was not completed, and no screenshots were captured.

Mobile source check:

- Retail report filters use a responsive grid layout.
- Retail Home and operational pages build successfully in the production build.
- Retail forms now use actual file inputs for expense receipt, AutoCount report, and processing wastage photo. Worker Cleaning is tap-only for V1.

Browser/mobile click-through checklist:

| Area | Result | Evidence |
| --- | --- | --- |
| Retail worker Outlet A browser login and Retail Home | Blocked | Browser automation could not start; no authenticated page evidence captured. |
| Worker expense receipt upload interaction | Blocked | Source/API coverage passed, but real browser file picker/upload interaction was not captured. |
| Worker selected filename and uploading state | Blocked | Source coverage passed, but real browser evidence was not captured. |
| Worker cleaning completion and optional photo upload | Blocked | Source/API coverage passed, but real browser/mobile evidence was not captured. |
| Worker processing record with raw, finished, wastage, and optional photo | Blocked | Source/API coverage passed, but real browser/mobile evidence was not captured. |
| Worker Daily Sales draft, Cash Closing block, Reports block, export block | Blocked for browser evidence | Authenticated staging API/RLS checks passed; browser click-through evidence not captured. |
| Manager Daily Sales confirmation, expense review, cleaning task master, processing records, Cash Closing, reports, export | Blocked for browser evidence | Authenticated staging API/RLS checks passed; browser click-through evidence not captured. |
| Outlet B cross-outlet record and file isolation | Passed by staging API/security QA; blocked for browser evidence | Direct API/storage checks passed, including file download blocks; browser click-through evidence not captured. |
| Admin/director all-outlet reports, export, file access, audit trail workflows | Blocked for browser evidence | Authenticated staging API/RLS checks passed; browser click-through evidence not captured. |
| Mobile Retail Home, navigation, logout, forms, uploads, reports | Blocked | No real phone or working mobile browser automation available. |

Pending mobile/browser QA:

- Real phone or 390px authenticated browser pass through Retail Home, Expenses, Cleaning, Processing, Cash Closing, Reports, Sidebar/navigation, and Logout.
- Real mobile file upload interaction for expense receipt from camera/gallery or file picker.
- Authenticated screenshots or written operator evidence for worker, manager, admin, and director click-through paths.

### Bugs Found

- `202606230018_retail_daily_sales_summary_v1.sql` used `min(uuid)`/`max(uuid)`, which failed on staging.
- `202606230021_retail_processing_v1.sql` referenced missing `public.can_view_processing()`.
- Retail attachment/photo UX used path text entry instead of real file uploads.
- Storage policy was not outlet-isolated for Retail uploaded files.
- Retail Reports V1 export control was not implemented.
- `retail_cleaning_completions` allowed insert but not update, so same-day completion upsert failed on repeated real QA runs.
- Retail upload paths did not include record type and record ID metadata.
- Retail file upload UI needed selected filename and upload-pending feedback.
- Retail uploaded files needed an authorized server-side viewing route instead of direct storage path exposure.

### Fixes Applied

- Fixed the UUID aggregate issue in `202606230018_retail_daily_sales_summary_v1.sql`.
- Added `public.can_view_processing()` in `202606230021_retail_processing_v1.sql`.
- Added staging QA seed script: `scripts/retail-v1-staging-qa-seed.sql`.
- Added staging Auth Admin seed script: `scripts/retail-v1-staging-auth-admin-seed.mjs`.
- Added authenticated staging QA runner: `scripts/retail-v1-staging-real-qa.mjs`.
- Added Retail storage isolation migration `202606240001_retail_file_upload_isolation_v1.sql`.
- Added Retail cleaning completion upsert policy migration `202606240002_retail_cleaning_completion_upsert_policy_v1.sql`.
- Added Retail file metadata/RLS migration `202606240004_retail_file_metadata_rls_v1.sql`.
- Added server-side Retail upload handling for Daily Sales AutoCount report, Expense receipt, and Processing wastage photo. Worker Cleaning does not ask for photo in V1.
- Updated Retail uploads to use `retail/<outlet-id>/<record-type>/<record-id>/<filename>` storage paths.
- Added `retail_files` metadata inserts for Retail uploads.
- Replaced Retail attachment/photo path text inputs with real file inputs.
- Added selected-filename display and upload-pending state to Retail file inputs.
- Added authorized Retail file viewing route at `/api/retail/files`.
- Added Retail table links for Daily Sales attachments, Expense receipts, Cleaning photos, and Processing wastage photos.
- Added Retail Reports CSV export.

### Remaining Limitations

- Earlier local browser automation was blocked by unavailable local tooling; later real manual phone/browser QA is confirmed passed in the current Retail UX simplification goal context.
- Staff rollout still needs a focused phone/browser pass over the simplified one-task Retail pages after UX refinement.
- Non-Retail pending migrations remain unapplied on staging; this pass intentionally applied only the Retail migration chain.

## UX Simplification Pass

Current one-task route split:

- `/retail/expenses` submits one expense.
- `/retail/expenses/review` reviews one expense.
- `/retail/expenses/history` views expense records.
- `/retail/cleaning` completes required cleaning tasks.
- `/retail/cleaning/tasks` manages the cleaning task master.
- `/retail/cleaning/history` views cleaning records.
- `/retail/processing` records one processing batch.
- `/retail/processing/review` redirects to `/retail/processing/history`; Retail processing has no manager review page.
- `/retail/processing/history` views processing records.
- `/retail/cash-closing` submits one daily cash closing.
- `/retail/cash/history/closings` views daily cash closing records.
- `/retail/cash`, `/retail/cash/open`, and `/retail/cash/close` redirect to `/retail/cash-closing` for V1.
- `/retail/cash/history` and `/retail/cash/history/sessions` redirect to `/retail/cash/history/closings` for V1.
- `/retail/settings` now acts as a setup task launcher.
- `/retail/settings/boms` and `/retail/settings/categories` now focus on saving one setup record.
- `/retail/settings/boms/records` and `/retail/settings/categories/records` now hold the setup reference tables separately.
- Retail price setup routes redirect back to Retail Settings in V1 because item-level retail sales/POS are not active.
- `/retail/settings/audit` remains focused on audit review only.

Worker simplifications added:

- Worker home now shows only role-relevant shortcut buttons, with Record Processing first, then Submit Expense, Complete Cleaning, Picking Order, and Today Summary.
- Worker home now labels the read-only daily check as `Today Status`.
- Worker Retail sub-navigation now uses the same task labels as Home: Submit Expense, Complete Cleaning, and Record Processing.
- Manager/admin Retail sub-navigation now uses task labels and focused destinations, so `Processing Records` opens records instead of the worker Record Processing page.
- Picking Order links to the existing Order Module picking page at `/orders/picking`; picking was not rebuilt inside Retail.
- Manager home now shows Daily Sales, Cash Closing, Expense Review, Cleaning Setup, Outlet Report, and Picking Order.
- Admin/director home now shows All Outlet Report, Cash Variance, Missing Tasks, Processing Yield, Expenses, and Export Center.
- `/retail/today` is now a read-only Today Summary quick check, not a second task launcher.
- `/retail/expenses` is now a focused Submit Expense page only; review, history, report tables, and manager actions stay off this page.
- Expense date defaults to today.
- Main form submit buttons use phone-size tap targets.
- Worker submit and Complete Cleaning buttons are fixed at the bottom on phone width, with bottom padding so the button does not cover the form.
- Expense receipt filename displays in a clear selected-file row.
- Expense upload submit state shows `Uploading...` when a receipt file is selected.
- Missing receipt now shows the simple inline error `Receipt is required.` before the worker can submit.
- Expense payment method defaults to Cash.
- Expense success state offers `Back to Retail Home`.
- Workers can edit their own submitted expense before manager review from `/retail/expenses/history`.
- After submitting an expense, the success actions now include `Edit submitted expense` so workers can find the before-review correction path without using a hidden URL.
- Submitted expense edits are blocked after review and blocked for non-submitters unless admin/director.
- `/retail/cleaning` is now a focused Complete Cleaning page only; setup, history, report tables, and manager actions stay off this page.
- Cleaning completion no longer nests task cards inside a larger card.
- Cleaning completion success state offers `Complete another task` and `Back to Retail Home`.
- Cleaning completion now uses the same sticky bottom phone action pattern as the other worker submit pages.
- `/retail/processing` is now a focused Record Processing page only; review, history, order-picking links, report tables, and manager actions stay off this page.
- Processing submit action now uses the worker language `Submit processing`.
- Processing success state offers `Record another processing` and `Back to Retail Home`.
- `/retail/sales` is now a focused Daily Sales entry page only; `/retail/sales/history` redirects to Retail Reports because sales history belongs in reports.
- Daily Sales entry is today-only; the page no longer shows an editable history date picker.
- Daily Sales now keeps optional remarks behind a `Remarks (optional)` disclosure while keeping the AutoCount attachment upload visible.
- Retail workers can save same-day Daily Sales as `DRAFT`; managers/admin/directors confirm it as `CONFIRMED`.
- Cash Closing now refuses draft Daily Sales and only pulls confirmed Daily Sales numbers.
- Cash Closing missing-sales guidance now says `Record and confirm Daily Sales first.`
- `/retail/expenses/review` is now a focused Expense Review page only; expense history stays on `/retail/expenses/history`.
- Expense Review now keeps rejection reason and remarks behind an `if needed` disclosure while preserving required rejection-reason validation.
- Processing Records is report-only; there is no processing review/reject success flow.
- The old `/retail/processing/review` URL now redirects to Processing Records so managers do not see a separate Retail processing review task.
- The shared Processing dashboard review form no longer links back to the retired Retail processing review URL after save.
- Retail managers are also removed from the processing review server action roles, so direct action posts cannot review/reject Retail processing records.
- Old cash-session entry pages now redirect into the V1 Cash Closing flow instead of showing open/close register forms.
- Old POS sale, payment, register cash-session, and item-level price server actions now return disabled V1 messages instead of writing to old POS/register/price tables.
- Dead POS, payment, register-session, and retail-price form exports were removed from the Retail form component so V1 code no longer carries unused user-facing POS/register UI.
- Daily Sales, Expense Review, and Cash Closing use post-success actions for the next V1 task and `Back to Retail Home`.
- Retail workflow forms now hide the original submit button after a successful save when success actions are shown, so staff choose the next action instead of accidentally resubmitting the same record.
- Extra processing raw/finished lines are collapsed by default while keeping multiple-line support.
- `/retail/processing` now uses the requested guided worker layout:
  - Step 1: Processing Type.
  - Step 2: Raw Material.
  - Step 3: Finished Product.
  - Step 4: Wastage.
  - Step 5: Review & Submit.
- Processing Review & Submit now shows live calculated total raw weight, total finished weight, total wastage weight, yield %, wastage %, and unaccounted difference before submission.
- Cleaning completion is now tap Complete only. Photo and remarks are not shown on the worker path.
- Missing cleaning now shows a red `Missing` status; normal required work shows `Pending`.
- Worker Today Summary now shows today sales amount plus actual Daily Sales status, Cash Closing `Closed` / `Not Closed`, cash expenses, missing cleaning, and processing count without full reports/export.
- Today Summary now filters its own sales, cash closing, expenses, cleaning, and processing data to today, so the page cannot show older records if opened by a manager/admin route.
- Worker Today Summary no longer shows cash-session counts; workers use Cash Closing `Closed` / `Not Closed` status only.
- Worker direct access to dense Cleaning History and Processing Records pages is now manager-gated; workers stay on Complete Cleaning, Record Processing, Today Summary, and the submitted-expense edit path.
- Worker Complete Cleaning now receives only today-required cleaning tasks, and the phone guidance uses red `Missing` status instead of late/history wording.
- Worker Today Summary now turns the Cleaning missing card red and labels `Missing tasks today` when required cleaning is still incomplete.
- Worker Today Summary cards now use simple icons for sales, cash closing, cash expenses, cleaning, and processing status.
- Submit Expense now shows the worker's assigned outlet context without asking the worker to select an outlet.
- Submit Expense now follows the worker flow order: Amount, Category, Payment method, then Receipt.
- Submit Expense receipt upload label is simplified to `Receipt` while keeping the selected filename, required validation, and file upload behavior.
- Submit Expense success now shows `Back to Retail Home` before `Edit submitted expense`, keeping the normal worker path home-first while preserving before-review edits.
- Retail dropdown controls now use phone-friendly height and text size, matching the worker input fields for category, payment method, item, outlet, and review/status selections.
- Retail numeric fields now request the phone decimal keyboard for sales, cash closing, expense amount, processing weight/quantity, wastage, and optional BOM yield fields.
- Processing now includes preset processing type buttons for `Minced Meat`, `Slice`, `Cut`, `Pack`, `Repack`, and `Other`, while keeping manual processing type entry.
- Processing now submits immediately as `SUBMITTED`; draft selection was removed from the worker path.
- Processing weight differences are display-only calculations and do not block or warn on the worker form.
- Processing after-submit guidance no longer prompts workers to print barcode labels; Retail V1 records processing only and finished stock inbound remains a separate stock step.
- Processing header remarks are now tucked behind `Processing remarks (optional)` so the main phone path stays focused on type, raw material, finished product, and wastage.
- Processing keeps the main Wastage step to total wastage weight first; optional reason, photo, and remarks are tucked behind `Wastage details (optional)` for phone use.
- Processing raw/finished line cards now show only item, manual item name, weight, and quantity; per-line remarks are removed from the worker phone path.
- Retail Processing Report no longer shows processing warning cards or warning export rows; yield, wastage, and unaccounted difference remain visible as calculations.
- Daily Sales now uses the page/form title `Daily Sales`, shows today's existing saved summary below the entry form, and offers `Go to Cash Closing` after a successful save.
- Cash Closing now shows the formula `Expected Cash = Opening Cash + Cash Sales - Cash Expenses` above the form.
- Cash Closing keeps bank transfer, e-wallet/DuitNow, and credit sales in a separate non-cash reference section so they are not confused with expected cash.
- Cash Closing non-zero variance now shows warning-only copy; remarks are not required before saving.
- Cash Closing remarks are visibly labeled optional, matching the warning-only variance rule.
- Cash Closing now submits as `SUBMITTED` without showing managers a Draft/Reviewed status choice on the one-task page.
- Cash Closing success now offers `Go to Outlet Report`.
- Cash Closing success no longer offers `Submit another closing`, because V1 allows one closing per outlet/date.
- Cash Closing now shows a final checklist after a successful save.
- `/retail/dashboard` now opens the manager Outlet Report checklist/report instead of a generic launcher.
- Manager Outlet Report now starts with a `Today checklist` card and sorts pending items first.
- Manager Today checklist now orders pending work as expenses, cleaning, then cash closing before other daily checks.
- Manager Today checklist now shows Daily Sales as `Draft` and pending until manager confirmation.
- Manager Today checklist cards now use simple icons for cash closing, cleaning, expenses, and Daily Sales.
- Admin/director report pages now put detailed tables before KPI cards.
- Admin/director now has a separate table-first Expenses report at `/retail/reports/expenses`.
- Review Expenses now shows a submitted-expense review queue with receipt links before the one-expense review form.
- Processing review route is now report-only. Managers can view yield, wastage, and unaccounted difference, but there is no review/reject workflow for Retail processing.
- Retail Processing now rejects direct-post draft status server-side; V1 processing records save as submitted immediately.
- Staging QA expectations now treat Retail processing as manager report evidence, not manager review/update evidence.
- Daily Sales QA expectations now match the current split: workers can save same-day drafts when allowed, but only retail manager/admin/director can confirm Daily Sales for Cash Closing.
- Cleaning Setup now shows the task master form plus a focused active/inactive task record list; worker cleaning completion remains separate.
- Outlet Report now includes a manager CSV export button scoped to the assigned outlet.
- Focused report routes were added so launcher buttons do not send users back to one crowded report page:
  - `/retail/reports/outlet`
  - `/retail/reports/all`
  - `/retail/reports/cash-variance`
  - `/retail/reports/missing-tasks`
  - `/retail/reports/processing`
  - `/retail/reports/expenses`
  - `/retail/reports/export`
- `/retail/reports` is now a role-based report launcher instead of the old all-in-one report dashboard; managers go to Outlet Report and admin/director users choose one focused report/export task.
- Admin/director Retail sub-navigation now also uses the focused report/export tasks: All Outlet Report, Cash Variance, Missing Tasks, Processing Yield, Expenses, and Export Center.
- `/retail/settings/audit` is now focused on the Retail audit trail only; the extra static manager-controls status panel was removed.
- Retail setup pages no longer combine setup forms with records tables; the records tables moved to separate focused settings records routes.
- Retail setup forms now keep optional/future setup details behind disclosures for BOM expected yield/wastage/remarks.
- Retail Settings uses icon action buttons for the remaining V1 setup tasks and no longer mentions hidden price setup.

## Validation Commands

Latest results after the role-based task launcher, one-task Retail UX simplification, optional processing-header/wastage detail cleanup, raw/finished processing line cleanup, phone-friendly dropdown cleanup, Retail numeric decimal-keyboard cleanup, Submit Expense field-order cleanup, Submit Expense receipt-label cleanup, fixed phone bottom action cleanup, Retail Home exact button-label cleanup, Processing preset cleanup, Expenses report split, Manager checklist pending-order cleanup, Today Summary missing-cleaning red status cleanup, Today Summary icon cleanup, Manager Today checklist icon cleanup, post-success submit-button cleanup, Cash Closing optional-remarks wording cleanup, Cash Closing status-choice cleanup, expense submit home-first cleanup, Daily Sales history redirect, worker expense outlet-context cleanup, processing review redirect cleanup, stale processing-review success-link cleanup, server-side processing review role cleanup, manager task-nav cleanup, and admin/director report-nav cleanup:

- `npm run lint` - passed.
- `node scripts\retail-module-v1-coverage.mjs` - passed.
- `node scripts\retail-v1-e2e-coverage.mjs` - passed.
- `node scripts\smoke-routes.mjs` - failed through `npm run smoke` on unrelated Order guard: `Order form UX guard missing: Order created. Next step:`.
- `npm run typecheck` - passed.
- `npm run smoke` - failed before Retail checks on unrelated Order guard: `Order form UX guard missing: Order created. Next step:`.
- `npm run build` - passed.
- `node scripts\retail-v1-staging-real-qa.mjs` - passed.

Note: ESLint now ignores local `.worktrees/**` build artifacts so the normal lint command checks source files instead of generated `.next` output from secondary worktrees.

## Final Recommendation

Retail V1 is not fully signed off for this latest working-logic refinement until the full `npm run smoke` gate is green again. Retail-specific coverage passed, but the required smoke command currently stops on an unrelated Order guard before completing the suite.

Required before broader staff rollout:

1. Fix or align the unrelated Order smoke guard: `Order form UX guard missing: Order created. Next step:`.
2. Rerun `npm run smoke`.
3. Run a focused real worker and manager phone/browser pass on the simplified one-task Retail pages during Limited UAT.
