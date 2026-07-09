alter table public.barcode_scan_logs
  add column if not exists issue_type text,
  add column if not exists item_id uuid references public.items(id) on delete set null,
  add column if not exists selected_item_id uuid references public.items(id) on delete set null,
  add column if not exists expected_location_id uuid references public.stock_locations(id) on delete set null,
  add column if not exists scanned_location_id uuid references public.stock_locations(id) on delete set null,
  add column if not exists expected_status text,
  add column if not exists scanned_status text,
  add column if not exists related_context jsonb not null default '{}'::jsonb,
  add column if not exists review_status text not null default 'OPEN',
  add column if not exists reviewed_by uuid references public.profiles(id) on delete set null,
  add column if not exists reviewed_at timestamptz,
  add column if not exists review_note text;

alter table public.barcode_scan_logs
  drop constraint if exists barcode_scan_logs_issue_type_check,
  add constraint barcode_scan_logs_issue_type_check
    check (
      issue_type is null or issue_type in (
        'DUPLICATE_BARCODE',
        'BARCODE_LENGTH_MISMATCH',
        'BARCODE_NOT_FOUND',
        'WRONG_LOCATION',
        'WRONG_ITEM',
        'UNAVAILABLE_STOCK',
        'BARCODE_RULE_DETECTION_FAILURE',
        'UNKNOWN_BARCODE_STOCK_TAKE',
        'STOCK_TAKE_MISMATCH',
        'TRANSFER_MISSING_ITEM',
        'TRANSFER_UNEXPECTED_ITEM',
        'SPOILED_DAMAGED_REVIEW'
      )
    );

alter table public.barcode_scan_logs
  drop constraint if exists barcode_scan_logs_review_status_check,
  add constraint barcode_scan_logs_review_status_check
    check (review_status in ('OPEN', 'APPROVED', 'REJECTED', 'CORRECTED'));

create index if not exists idx_barcode_scan_logs_issue_review
on public.barcode_scan_logs(issue_type, review_status, created_at desc);
