alter table public.retail_daily_sales
  add column if not exists cash_sales numeric(12, 2) not null default 0 check (cash_sales >= 0),
  add column if not exists bank_transfer_sales numeric(12, 2) not null default 0 check (bank_transfer_sales >= 0),
  add column if not exists ewallet_sales numeric(12, 2) not null default 0 check (ewallet_sales >= 0),
  add column if not exists credit_sales numeric(12, 2) not null default 0 check (credit_sales >= 0),
  add column if not exists total_sales numeric(12, 2) not null default 0 check (total_sales >= 0),
  add column if not exists autocount_attachment_url text,
  add column if not exists remarks text,
  add column if not exists created_by uuid references public.profiles(id) on delete set null,
  add column if not exists updated_by uuid references public.profiles(id) on delete set null;

with summary as (
  select
    outlet_id,
    sales_date,
    min(id::text)::uuid as keep_id,
    sum(
      case
        when upper(payment_code) = 'CASH' then coalesce(net_sales, gross_sales, 0)
        else coalesce(cash_sales, 0)
      end
    ) as cash_sales,
    sum(
      case
        when upper(payment_code) in ('BANK_TRANSFER', 'TRANSFER', 'BANK') then coalesce(net_sales, gross_sales, 0)
        else coalesce(bank_transfer_sales, 0)
      end
    ) as bank_transfer_sales,
    sum(
      case
        when upper(payment_code) in ('EWALLET', 'E_WALLET', 'DUITNOW', 'E-WALLET') then coalesce(net_sales, gross_sales, 0)
        else coalesce(ewallet_sales, 0)
      end
    ) as ewallet_sales,
    sum(
      case
        when upper(payment_code) = 'CREDIT' then coalesce(net_sales, gross_sales, 0)
        else coalesce(credit_sales, 0)
      end
    ) as credit_sales,
    min(recorded_by::text)::uuid as created_by,
    max(updated_by::text)::uuid as updated_by
  from public.retail_daily_sales
  group by outlet_id, sales_date
),
updated_summary as (
  update public.retail_daily_sales sale
  set
    payment_type_id = null,
    payment_code = 'SUMMARY',
    gross_sales =
      summary.cash_sales +
      summary.bank_transfer_sales +
      summary.ewallet_sales +
      summary.credit_sales,
    discount_amount = 0,
    cash_received = summary.cash_sales,
    cash_sales = summary.cash_sales,
    bank_transfer_sales = summary.bank_transfer_sales,
    ewallet_sales = summary.ewallet_sales,
    credit_sales = summary.credit_sales,
    total_sales =
      summary.cash_sales +
      summary.bank_transfer_sales +
      summary.ewallet_sales +
      summary.credit_sales,
    remarks = coalesce(sale.remarks, sale.notes),
    created_by = coalesce(sale.created_by, summary.created_by),
    updated_by = coalesce(sale.updated_by, summary.updated_by, summary.created_by),
    updated_at = now()
  from summary
  where sale.id = summary.keep_id
  returning sale.id
)
delete from public.retail_daily_sales sale
using summary
where sale.outlet_id = summary.outlet_id
  and sale.sales_date = summary.sales_date
  and sale.id <> summary.keep_id;

update public.retail_daily_sales
set
  total_sales = cash_sales + bank_transfer_sales + ewallet_sales + credit_sales,
  gross_sales = cash_sales + bank_transfer_sales + ewallet_sales + credit_sales,
  cash_received = cash_sales,
  payment_type_id = null,
  payment_code = 'SUMMARY',
  created_by = coalesce(created_by, recorded_by),
  updated_by = coalesce(updated_by, recorded_by);

alter table public.retail_daily_sales
  drop constraint if exists retail_daily_sales_total_matches_components;

alter table public.retail_daily_sales
  add constraint retail_daily_sales_total_matches_components
  check (total_sales = cash_sales + bank_transfer_sales + ewallet_sales + credit_sales);

alter table public.retail_daily_sales
  drop constraint if exists retail_daily_sales_outlet_id_sales_date_payment_code_key;

drop index if exists retail_daily_sales_one_summary_per_outlet_date;
create unique index retail_daily_sales_one_summary_per_outlet_date
on public.retail_daily_sales(outlet_id, sales_date);
