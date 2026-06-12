# CODEX HANDOFF

## Task Completed

- Verified priority A: mobile sidebar open/close on mobile.
  - `components/erp/app-shell.tsx` uses a controlled shadcn/Radix `Sheet`.
  - Mobile hamburger button is visible on mobile header, opens the sheet with `onClick={() => setOpen(true)}`.
  - Mobile navigation renders the same role-filtered `SidebarContent` as desktop.
  - Nav item clicks call `close={() => setOpen(false)}` so the drawer closes after navigation.
  - Desktop sidebar remains separate and unchanged.
- Verified priority B: item creation item-code workflow.
  - `components/stock/workflow-forms.tsx` generates `itemCode` from category, section, and name while the field has not been manually edited.
  - The generated item code is editable before creation.
  - Item edit form allows changing item code, category, section, name, barcode requirement, and active status.
  - `lib/stock/actions.ts` normalizes item codes and blocks duplicate `item_code` on create and update.

## Files Changed

- Added this handoff file: `CODEX_HANDOFF.md`.
- No additional app code changes were needed for priority A or B in this pass because both fixes already exist in the current worktree.

## Migration SQL Added

- None for this queued task.
- Existing current SQL Editor order remains:
  1. `supabase/migrations/202606100001_erp_core_stock_v1.sql`
  2. `supabase/migrations/202606100002_delivery_v1.sql`
  3. `supabase/migrations/202606100003_attendance_v1.sql`
  4. `supabase/migrations/202606100004_oa_actions_v1.sql`
  5. `supabase/migrations/202606100005_retail_v1.sql`
  6. `supabase/migrations/202606100006_finance_director_v1.sql`
  7. `supabase/migrations/202606100007_roles_scope_and_operations_v1.sql`
  8. `supabase/migrations/202606100008_team_rls_v1.sql`
  9. `supabase/migrations/202606100009_internal_qa_hardening_v1.sql`
  10. `supabase/migrations/202606100010_stock_inbound_workflow_v1.sql`
  11. `supabase/migrations/202606100011_outlet_module_access_v1.sql`
  12. `supabase/migrations/202606100012_delivery_workflow_status_v1.sql`
  13. `supabase/migrations/202606100013_oa_workflow_hardening_v1.sql`
  14. `supabase/migrations/202606100014_finance_invoice_aging_v1.sql`
  15. `supabase/migrations/202606100015_attendance_leave_sync_v1.sql`
  16. `supabase/migrations/202606100016_cleaning_completion_alerts_v1.sql`
  17. `supabase/migrations/202606100017_retail_expense_checker_payment_v1.sql`
  18. `supabase/migrations/202606100018_processing_stock_thresholds_v1.sql`
  19. `supabase/migrations/202606100019_delivery_source_proof_photo_v1.sql`
  20. `supabase/migrations/202606100020_attendance_no_clock_out_v1.sql`
  21. `supabase/migrations/202606100021_orders_workflow_v1.sql`
  22. `supabase/migrations/202606100022_order_outbound_batches_v1.sql`
  23. `supabase/migrations/202606100023_customer_order_delivery_proof_v1.sql`
  24. `supabase/migrations/202606100024_orders_module_access_v1.sql`
  25. `supabase/migrations/202606100025_orders_module_rls_v1.sql`
  26. `supabase/migrations/202606100026_customer_order_delivery_access_v1.sql`
  27. `supabase/migrations/202606100027_orders_delivery_role_tightening_v1.sql`
  28. `supabase/migrations/202606100028_order_outbound_atomic_rpc_v1.sql`
  29. `supabase/migrations/202606100029_order_workflow_guards_v1.sql`
  30. `supabase/migrations/202606100030_director_view_only_order_ops_v1.sql`
  31. `supabase/migrations/202606100031_stock_director_view_scope_v1.sql`
  32. `supabase/migrations/202606100032_admin_settings_customer_pricing_v1.sql`
  33. `supabase/seed.sql`

## Commands Run And Results

- `npm.cmd run lint` - passed.
- `npm.cmd run typecheck` - passed.
- `npm.cmd run smoke` - passed.
- `npm.cmd run build` - passed.

## Assumptions

- The current dirty worktree contains the intended prior ERP module work and should not be reverted.
- Priority A and B were considered complete because the required behavior is present in code and the validation commands passed.
- Browser/mobile click testing was not run in this pass; verification was by source inspection and automated checks.

## Remaining Issues

- Live mobile device/browser testing is still recommended to confirm the drawer opens at about 390px width with the real authenticated app shell.
- The repository has many pre-existing uncommitted changes and untracked files from earlier ERP work. I did not create a commit in this pass to avoid mixing a handoff-only update with broad unrelated worktree changes.

## Next Recommended Task

- Manually test mobile navigation on a phone-width viewport after signing in.
- Then test item creation in `/stock/items`:
  1. Type section and name.
  2. Confirm item code auto-fills.
  3. Edit the item code manually.
  4. Save.
  5. Try the same item code again and confirm duplicate validation blocks it.
