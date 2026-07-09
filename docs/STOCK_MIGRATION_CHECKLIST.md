# Stock Migration Checklist

Target Supabase project:

`https://aikfqnbsshflbtuakwrz.supabase.co`

Do not run `npx.cmd supabase db push` until the project link is confirmed and you are ready to apply pending migrations to that exact project.

## Current Blocker

Supabase CLI needs login:

```bash
npx.cmd supabase login
```

Codex did not run live migrations, did not run `db push`, did not run seed, and did not deploy production.

## Migration 053 Through 250013 Purpose

Migration:

`supabase/migrations/202606100053_stock_inbound_session_undo_v1.sql`

`supabase/migrations/202606100054_stock_outbound_transfer_hardening_v1.sql`

`supabase/migrations/202606100055_stock_take_exceptions_v1.sql`

`supabase/migrations/202606230001_stock_schema_repair_v1.sql`

`supabase/migrations/202606230002_stock_mobile_worker_mvp_v1.sql`

`supabase/migrations/202606230003_stock_receive_transfer_wrong_location_block_v1.sql`

`supabase/migrations/202606230006_stock_transfer_any_location_v1.sql`

`supabase/migrations/202606230007_delivery_database_storage_rls_v1.sql`

`supabase/migrations/202606250004_stock_barcode_rule_sample_v1.sql`

`supabase/migrations/202606250008_stock_inbound_session_void_rpc_v1.sql`

`supabase/migrations/202606250010_stock_item_default_weight_v1.sql`

`supabase/migrations/202606250011_stock_item_display_name_v1.sql`

`supabase/migrations/202606250012_stock_manufacturer_merge_v1.sql`

`supabase/migrations/202606250013_stock_item_merge_v1.sql`

Purpose:

- Add stock unit status `VOIDED`.
- Add stock movement type `INBOUND_VOID`.
- Add RPC `public.void_inbound_stock_unit(uuid, text, text)`.
- Allow current-session inbound undo without deleting stock units or stock movements.
- Keep audit trail by writing `INBOUND_VOID` movement, barcode scan log, and `BARCODE_INBOUND_VOID` audit log.

Safety notes:

- No table drops.
- No truncates.
- No destructive data deletes.
- Uses `alter type ... add value if not exists`.
- Uses `drop function if exists` only for the RPC function definition, then recreates it.
- Grants execute to authenticated users, while the function still checks auth, stock role, stock location access, batch number, and original inbound movement.

Migration `054` adds:

- `HOLD_RETURN_SUPPLIER` stock-unit status.
- `OUTBOUND_SAMPLE_TESTING` stock movement type.
- Optional `stock_locations.outlet_id` mapping for outlet-default transfer destination behavior.
- `stock_locations.is_default_for_outlet`, with one default stock location per outlet.
- A transfer destination trigger that blocks `TRANSFER_PENDING` destination locations that are not the outlet default.
- Direct outbound remarks enforcement in the direct outbound RPC.
- Open damage/return-supplier request blocking inside direct outbound.
- Wrong-location receive-transfer exception audit logging.
- Return-supplier stock hold and hold-release RPCs.

Migration `055` adds:

- Stock-take line exception metadata for `UNKNOWN_BARCODE` and `WRONG_LOCATION`.
- Director approval handling that creates unknown barcode stock units only after approval.
- Director approval handling that moves wrong-location barcodes to the stock take location only after approval.
- `STOCK_TAKE_ADJUSTMENT` movement and barcode scan log writes for resolved exceptions.

Migration `202606230001` repairs/aligns Stock schema objects for fresh projects after the larger Stock module changes.

Migration `202606230002` adds:

- Worker-created scoped draft stock take sessions through the existing stock operator helper.
- Receive-transfer RPC hardening so wrong receiving locations are blocked instead of accepted as exceptions.
- Idempotent policy replacement using `DROP POLICY IF EXISTS` before `CREATE POLICY`.

Migration `202606230003` adds:

- Receive-transfer RPC replacement that keeps wrong-location receive blocked.
- Exact worker-safe error: `Wrong location. This barcode must be received at [destination location].`
- No wrong-location exception receive path for the mobile MVP.

Migration `202606230006` adds:

- Transfer destination support for any active, scoped stock location instead of only outlet-default stock locations.
- Direct transfer outbound RPC replacement that keeps active-location, duplicate, damage, return-supplier, same-location, and stock-take checks.
- Receive-transfer RPC replacement that keeps wrong-location receive blocked.
- Stock-unit trigger replacement that keeps open damage/return-supplier request blocking but removes default-location-only transfer blocking.

Migration `202606250004` adds:

- Supplier barcode rule sample fields for guided Stock Inbound.
- Barcode length and sample barcode persistence for item + manufacturer + origin rules.

Migration `202606250008` adds:

- Whole inbound session void RPC for manager/admin/director delete-session correction.
- Audit-preserving `INBOUND_VOID` handling for all eligible saved units in a batch.

Migration `202606250010` adds:

- Item master default fixed-weight support for products that do not carry weight in supplier barcodes.

Migration `202606250011` adds:

- Item display-name backfill and helpers so product and manufacturer stay separate while pages show manufacturer + product.

Migration `202606250012` adds:

- Admin/director `merge_stock_manufacturer` helper for duplicate manufacturer cleanup.

Migration `202606250013` adds:

- Admin/director `merge_stock_item` helper for duplicate product cleanup created through `Other / custom product`.
- Safe reference moves for stock, barcode rules, orders/reservations, retail price rules, processing records, and audit logs.
- The duplicate source product is deactivated and renamed instead of deleted.

## CLI Login And Link Sequence

Run these from the project root when you regain Supabase access:

```bash
npx.cmd supabase login
npx.cmd supabase link --project-ref aikfqnbsshflbtuakwrz
npx.cmd supabase migration list
```

Before any migration apply, confirm the linked project ref is:

`aikfqnbsshflbtuakwrz`

If and only if the link is confirmed and migration list shows pending migrations that you intend to apply:

```bash
npx.cmd supabase db push
```

Only run seed on a safe demo/staging database:

```bash
npx.cmd supabase db seed
```

## SQL Editor Run Order

If using SQL Editor instead of CLI:

1. Confirm the Supabase dashboard project is `https://aikfqnbsshflbtuakwrz.supabase.co`.
2. Run migrations in filename order.
3. Stop immediately if any migration fails.
4. Run through `supabase/migrations/202606100055_stock_take_exceptions_v1.sql`.
5. Run `supabase/migrations/202606230001_stock_schema_repair_v1.sql`.
6. Run `supabase/migrations/202606230002_stock_mobile_worker_mvp_v1.sql`.
7. Run `supabase/migrations/202606230003_stock_receive_transfer_wrong_location_block_v1.sql`.
8. Run `supabase/migrations/202606230004_delivery_module_v1.sql`.
9. Run `supabase/migrations/202606230006_stock_transfer_any_location_v1.sql`.
10. Run `supabase/migrations/202606230007_delivery_database_storage_rls_v1.sql`.
11. Continue running later migrations in filename order, including:
    - `supabase/migrations/202606250004_stock_barcode_rule_sample_v1.sql`
    - `supabase/migrations/202606250008_stock_inbound_session_void_rpc_v1.sql`
    - `supabase/migrations/202606250010_stock_item_default_weight_v1.sql`
    - `supabase/migrations/202606250011_stock_item_display_name_v1.sql`
    - `supabase/migrations/202606250012_stock_manufacturer_merge_v1.sql`
    - `supabase/migrations/202606250013_stock_item_merge_v1.sql`
12. Run `supabase/seed.sql` only for safe demo/staging data.

## Verify VOIDED Enum

Run after migration `053`:

```sql
select 'VOIDED'::public.stock_unit_status;
```

Expected result:

- Query succeeds and returns `VOIDED`.

If it fails:

- Migration `053` did not apply, or the enum type is not present in the target database.

## Verify INBOUND_VOID Enum

Run after migration `053`:

```sql
select 'INBOUND_VOID'::public.stock_movement_type;
```

Expected result:

- Query succeeds and returns `INBOUND_VOID`.

If it fails:

- Migration `053` did not apply, or the stock movement enum is not current.

## Verify void_inbound_stock_unit RPC

Run after migration `053`:

```sql
select
  n.nspname as schema_name,
  p.proname as function_name,
  pg_get_function_identity_arguments(p.oid) as arguments
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname = 'void_inbound_stock_unit';
```

Expected result:

- One row for `public.void_inbound_stock_unit`.
- Arguments include `p_stock_unit_id uuid, p_batch_no text, p_reason text`.

## Verify Migration 054 Stock Outbound Values

Run after migration `054`:

```sql
select 'HOLD_RETURN_SUPPLIER'::public.stock_unit_status;
select 'OUTBOUND_SAMPLE_TESTING'::public.stock_movement_type;
```

Expected result:

- Both queries succeed.

## Verify Outlet Default Stock Locations

Run after migration `054`:

```sql
select
  outlet.name as outlet_name,
  location.name as default_stock_location
from public.outlets outlet
join public.stock_locations location
  on location.outlet_id = outlet.id
where location.is_default_for_outlet
order by outlet.name;
```

Expected result:

- Each outlet used for stock transfer has one default stock location.

Also verify the helper:

```sql
select public.is_default_outlet_stock_location(id)
from public.stock_locations
where is_default_for_outlet
limit 1;
```

Expected result:

- Returns `true`.

## Verify Migration 054 RPCs

Run after migration `054`:

```sql
select proname
from pg_proc
where proname in (
  'confirm_direct_outbound_batch',
  'receive_stock_transfer',
  'hold_return_supplier_stock_unit',
  'release_return_supplier_stock_hold'
)
order by proname;
```

Expected result:

- All four function names return.

## Verify Migration 230005 Transfer Stock Locations

Run after migration `202606230006`:

```sql
select pg_get_functiondef('public.confirm_direct_outbound_batch(text, uuid, jsonb, text, text, text)'::regprocedure);
```

Expected result:

- Function definition includes `transferDestinationAnyActiveLocation`.
- Function definition does not include `Transfer destination must be the destination outlet default stock location`.

Also verify receive-transfer:

```sql
select pg_get_functiondef('public.receive_stock_transfer(text, uuid, text, text)'::regprocedure);
```

Expected result:

- Function definition includes `Wrong location. This barcode must be received at`.
- Function definition does not include `Receiving location must be the receiving outlet default stock location`.

## Verify Migration 055 Stock Take Exceptions

Run after migration `055`:

```sql
select column_name
from information_schema.columns
where table_schema = 'public'
  and table_name = 'stock_take_lines'
  and column_name in (
    'exception_type',
    'exception_status',
    'exception_location_id',
    'source_stock_unit_id',
    'resolved_stock_unit_id'
  )
order by column_name;
```

Expected result:

- All five exception columns return.

Also verify the stock take approval RPC was replaced:

```sql
select pg_get_functiondef('public.approve_stock_take_session(uuid, text)'::regprocedure);
```

Expected result:

- Function definition includes `UNKNOWN_BARCODE`.
- Function definition includes `WRONG_LOCATION`.
- Function definition includes `stockTakeExceptionsResolved`.

## Verify Undo Evidence After App Test

After using `/stock/inbound` to undo one current-session scan:

```sql
select id, barcode, status, batch_no
from public.stock_units
where status = 'VOIDED'
order by updated_at desc
limit 10;
```

```sql
select id, movement_type, barcode, weight_kg, reference_no, created_at
from public.stock_movements
where movement_type = 'INBOUND_VOID'
order by created_at desc
limit 10;
```

```sql
select id, action, entity_type, entity_id, changes, created_at
from public.audit_logs
where action = 'BARCODE_INBOUND_VOID'
order by created_at desc
limit 10;
```

Expected result:

- Voided stock unit remains in `stock_units`.
- `INBOUND_VOID` movement has negative weight.
- Audit log references original inbound movement and void movement.

## Verify Guided Inbound Product Naming Helpers

Run after migration `202606250011`:

```sql
select item_code, name, display_name
from public.stock_items
order by updated_at desc nulls last
limit 10;
```

Expected result:

- Product fields remain separate.
- `display_name` is available for generated manufacturer + product display.

## Verify Duplicate Cleanup RPCs

Run after migrations `202606250012` and `202606250013`:

```sql
select proname
from pg_proc
where proname in (
  'merge_stock_manufacturer',
  'merge_stock_item'
)
order by proname;
```

Expected result:

- Both function names return.

Live QA:

- Merge two safe demo duplicate manufacturers and confirm stock rows still resolve to the kept manufacturer.
- Merge two safe demo duplicate products and confirm stock units, movements, barcode rules, order reservations, retail price rules, reports, and audit logs still resolve to the kept product.

## Migration Safety Review

Before applying pending migrations:

1. Run local smoke checks.
2. Confirm `scripts/stock-migration-safety.mjs` passes.
3. Confirm no migration includes table drops, truncates, destructive deletes, or unprotected `CREATE POLICY`.
4. Confirm every new `CREATE POLICY` has a matching `DROP POLICY IF EXISTS`.
5. Confirm storage policies use `DROP POLICY IF EXISTS ... ON storage.objects`.

## Final Manual Gate

Do not continue to production data until these are true:

- Supabase CLI is logged in.
- Project ref is confirmed as `aikfqnbsshflbtuakwrz`.
- Migration list is reviewed.
- Migration `053` applies successfully.
- Migration `054` applies successfully.
- Migration `055` applies successfully.
- Migration `202606230001` applies successfully.
- Migration `202606230002` applies successfully.
- Migration `202606230003` applies successfully.
- Migration `202606230006` applies successfully.
- Migration `202606250004` applies successfully.
- Migration `202606250008` applies successfully.
- Migration `202606250010` applies successfully.
- Migration `202606250011` applies successfully.
- Migration `202606250012` applies successfully.
- Migration `202606250013` applies successfully.
- `/stock/inbound` undo test creates `VOIDED`, `INBOUND_VOID`, and `BARCODE_INBOUND_VOID`.
- `/stock/inbound` supplier-barcode rule stores barcode length and sample barcode.
- `/stock/settings` duplicate manufacturer and product merge tests preserve stock history and audit logs.
- `/stock/outbound` direct sample/testing creates `OUTBOUND_SAMPLE_TESTING`.
- `/stock/receive-transfer` wrong-location receive is blocked with `Wrong location. This barcode must be received at [destination location].`
- `/stock/transfer` destination dropdown shows stock locations and submits the selected active stock location.
- `/stock/stock-take` records unknown barcode and wrong-location barcode exceptions, then resolves them only after manager review and director approval.
