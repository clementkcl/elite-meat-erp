# Remote QA: Stock Inbound

Use this checklist from the deployed Vercel app:

https://elite-meat-erp.vercel.app

## Status Before Testing

- Local smoke, lint, typecheck, and build must pass before this document is handed off.
- Stock migration `supabase/migrations/202606100053_stock_inbound_session_undo_v1.sql` adds inbound undo support.
- Codex did not run live Supabase SQL. If the deployed database has not been migrated through `053`, the new undo action can fail even if the page loads.

## Pages To Test

- `/stock/inbound`
- `/stock/no-barcode-inbound`
- `/stock/units/[id]`
- `/stock/balance`
- `/stock/movements`

## Exact SQL Order

Run all pending migrations in filename order through:

`supabase/migrations/202606100053_stock_inbound_session_undo_v1.sql`

Then run:

`supabase/seed.sql`

Do this only on a safe staging/demo Supabase project unless you have already reviewed the migration order for production.

## First 10 Remote QA Steps

1. Sign in to the Vercel app as a user with Stock access.
2. Open `/stock/inbound`.
3. Confirm recent inbound templates appear first and show simple brand + product text, for example `Tican Belly Boneless`.
4. Select a template with a saved barcode rule and confirm the form keeps the scanner setup ready without a Start Batch step.
5. Confirm batch number is auto-filled, inbound source is Supplier/import, and location defaults to the user's assigned stock location while remaining editable.
6. Scan or manually enter a valid unique barcode with decodable weight and confirm it saves immediately.
7. Confirm saved scan count, saved total weight, previous scan weight, and recent scan row update after save.
8. Try the same barcode again and confirm duplicate barcode is blocked with a clear message.
9. Try a barcode with no confident weight and confirm the app blocks it and tells staff to use barcode label printing.
10. Click `Undo Last Scan` on the newest current-session scan, then confirm the row status becomes `VOIDED` and the session total updates.

## Additional Checks

- Click `Finish Session` and confirm summary shows total barcode units, total weight, item, brand, origin, location, scanned by, start/end time, and duplicate/error scans.
- After finishing, confirm normal worker undo controls are no longer available in that session.
- Open `/stock/movements` and verify inbound movements are visible.
- If undo was tested, verify an `INBOUND_VOID` movement appears.
- Open `/stock/balance` and confirm voided stock is not counted as available stock.
- Open `/stock/no-barcode-inbound` and confirm it redirects or guides staff back to Barcode Inbound.
- Open a stock unit detail page from `/stock/balance` and confirm label reprint still works.

## Expected Database Evidence

For a successful inbound scan:

- `stock_units` row exists.
- `stock_movements` has an `INBOUND` row.
- `barcode_scan_logs` has a successful `INBOUND` row.
- `audit_logs` has a `BARCODE_INBOUND` row.

For undo:

- Original `stock_units` row remains and status becomes `VOIDED`.
- Original `INBOUND` movement remains.
- New `stock_movements` row exists with `movement_type = INBOUND_VOID` and negative weight.
- New `barcode_scan_logs` row exists with `action = INBOUND_VOID`.
- New `audit_logs` row exists with `action = BARCODE_INBOUND_VOID`.

## Known Limitations

- Real phone camera behavior must be tested from the deployed HTTPS app.
- The separate barcode label printing page is not split out yet; label generation is still available inside `/stock/inbound`, and reprint is available from `/stock/units/[id]`.
- Worker undo after `Finish Session` is hidden in the UI, but full database enforcement across browser refreshes would need a persisted inbound-session table.
