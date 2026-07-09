-- WhatsApp CRM Phase 1.
-- Adds a mobile-first CRM data model for WhatsApp Cloud API inbox, simple chat orders,
-- AI suggestions that require staff approval, broadcasts, and later ERP handoff.

alter table public.roles drop constraint if exists roles_role_key_check;
alter table public.roles add constraint roles_role_key_check check (
  role_key in (
    'general_worker',
    'retail_team',
    'retail_team_general_worker',
    'retail_manager',
    'delivery_team_general_worker',
    'delivery_manager',
    'processing_team_general_worker',
    'processing_manager',
    'sales',
    'sales_staff',
    'customer_service',
    'account',
    'owner',
    'admin',
    'director'
  )
);

insert into public.roles (role_key, name) values
  ('owner', 'Owner'),
  ('sales', 'Sales'),
  ('sales_staff', 'Sales Staff'),
  ('customer_service', 'Customer Service')
on conflict (role_key) do update set name = excluded.name;

do $$
declare
  constraint_name text;
begin
  select con.conname
  into constraint_name
  from pg_constraint con
  join pg_class rel on rel.oid = con.conrelid
  join pg_namespace nsp on nsp.oid = rel.relnamespace
  where nsp.nspname = 'public'
    and rel.relname = 'outlet_module_access'
    and con.contype = 'c'
    and pg_get_constraintdef(con.oid) like '%module_key%'
  limit 1;

  if constraint_name is not null then
    execute format(
      'alter table public.outlet_module_access drop constraint if exists %I',
      constraint_name
    );
  end if;
end $$;

alter table public.outlet_module_access
  add constraint outlet_module_access_module_key_check
  check (
    module_key in (
      'stock',
      'orders',
      'whatsapp_crm',
      'retail',
      'processing',
      'delivery',
      'attendance',
      'cleaning',
      'oa_actions',
      'accounting_finance',
      'director_reports'
    )
  );

insert into public.outlet_module_access (outlet_id, module_key, is_enabled)
select outlet.id, 'whatsapp_crm', true
from public.outlets outlet
on conflict (outlet_id, module_key) do update set
  is_enabled = excluded.is_enabled,
  updated_at = now();

create or replace function public.can_manage_whatsapp_crm()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_role('owner')
    or public.has_role('sales')
    or public.has_role('sales_staff')
    or public.has_role('customer_service')
    or public.has_role('account')
    or public.has_role('admin')
    or public.has_role('director');
$$;

create or replace function public.can_reply_whatsapp_crm()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_role('owner')
    or public.has_role('sales')
    or public.has_role('sales_staff')
    or public.has_role('customer_service')
    or public.has_role('admin')
    or public.has_role('director');
$$;

create or replace function public.can_send_whatsapp_broadcast()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_role('owner')
    or public.has_role('admin')
    or public.has_role('director');
$$;

create table if not exists public.whatsapp_accounts (
  id uuid primary key default gen_random_uuid(),
  display_name text not null,
  phone_number text not null,
  phone_number_id text not null unique,
  business_account_id text,
  outlet_id uuid references public.outlets(id) on delete set null,
  is_active boolean not null default true,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.crm_customers (
  id uuid primary key default gen_random_uuid(),
  erp_customer_id uuid references public.customers(id) on delete set null,
  whatsapp_account_id uuid references public.whatsapp_accounts(id) on delete set null,
  name text not null,
  phone text not null,
  address text,
  customer_type text not null default 'Retail'
    check (customer_type in ('Retail', 'Wholesale', 'VIP')),
  area text,
  tags text[] not null default '{}'::text[],
  remarks text,
  birthday date,
  company_name text,
  assigned_staff_id uuid references public.profiles(id) on delete set null,
  last_order_date date,
  latest_order_status text not null default 'New Order'
    check (
      latest_order_status in (
        'New Order',
        'Confirmed',
        'Preparing',
        'Ready for Pickup',
        'Out for Delivery',
        'Completed',
        'Failed',
        'Cancelled'
      )
    ),
  payment_reminder_status text not null default 'None'
    check (payment_reminder_status in ('None', 'Due soon', 'Overdue')),
  unread_count integer not null default 0 check (unread_count >= 0),
  minutes_since_last_inbound integer not null default 0 check (minutes_since_last_inbound >= 0),
  last_message text,
  last_message_at timestamptz not null default now(),
  has_open_complaint boolean not null default false,
  is_active boolean not null default true,
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (whatsapp_account_id, phone)
);

create table if not exists public.customer_tags (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.crm_customer_tag_links (
  customer_id uuid not null references public.crm_customers(id) on delete cascade,
  tag_id uuid not null references public.customer_tags(id) on delete cascade,
  primary key (customer_id, tag_id)
);

create table if not exists public.crm_conversations (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.crm_customers(id) on delete cascade,
  whatsapp_account_id uuid not null references public.whatsapp_accounts(id) on delete restrict,
  status text not null default 'OPEN' check (status in ('OPEN', 'PENDING', 'CLOSED')),
  assigned_staff_id uuid references public.profiles(id) on delete set null,
  last_message_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.crm_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid references public.crm_conversations(id) on delete set null,
  customer_id uuid references public.crm_customers(id) on delete set null,
  external_message_id text unique,
  whatsapp_phone_number_id text,
  customer_phone text,
  direction text not null check (direction in ('inbound', 'outbound')),
  sender_name text not null,
  message_type text not null default 'text'
    check (message_type in ('text', 'image', 'file', 'document', 'audio', 'location')),
  body text,
  media_label text,
  is_price_list boolean not null default false,
  status text not null default 'received'
    check (status in ('received', 'sent', 'delivered', 'read', 'failed')),
  approved_by_staff boolean not null default false,
  raw_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.crm_webhook_inbox (
  id uuid primary key default gen_random_uuid(),
  external_message_id text,
  whatsapp_phone_number_id text,
  customer_phone text,
  direction text not null default 'inbound',
  sender_name text not null,
  message_type text not null default 'text',
  body text,
  media_label text,
  is_price_list boolean not null default false,
  status text not null default 'received',
  raw_payload jsonb not null default '{}'::jsonb,
  processed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.crm_assignments (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.crm_customers(id) on delete cascade,
  staff_id uuid not null references public.profiles(id) on delete cascade,
  assignment_reason text not null default 'previous_handler',
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  erp_item_id uuid references public.items(id) on delete set null,
  sku text unique,
  name text not null,
  category text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.product_prices (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  customer_type text not null check (customer_type in ('Retail', 'Wholesale', 'VIP')),
  unit text not null default 'kg',
  price numeric(12, 2) not null check (price >= 0),
  effective_from date not null default current_date,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.crm_orders (
  id uuid primary key default gen_random_uuid(),
  erp_order_id uuid references public.customer_orders(id) on delete set null,
  customer_id uuid not null references public.crm_customers(id) on delete restrict,
  conversation_id uuid references public.crm_conversations(id) on delete set null,
  product_name text not null,
  weight_quantity text not null,
  price numeric(12, 2) not null default 0 check (price >= 0),
  fulfillment text not null check (fulfillment in ('Delivery', 'Pickup')),
  address text,
  order_date date not null default current_date,
  location text,
  remarks text,
  status text not null default 'New Order'
    check (
      status in (
        'New Order',
        'Confirmed',
        'Preparing',
        'Ready for Pickup',
        'Out for Delivery',
        'Completed',
        'Failed',
        'Cancelled'
      )
    ),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.crm_order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.crm_orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  product_name text not null,
  quantity numeric(12, 3) not null default 0 check (quantity >= 0),
  unit text not null default 'kg',
  unit_price numeric(12, 2) not null default 0 check (unit_price >= 0),
  line_total numeric(12, 2) generated always as (round(quantity * unit_price, 2)) stored
);

create table if not exists public.crm_broadcasts (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  image_label text,
  audience_summary text,
  filters jsonb not null default '{}'::jsonb,
  status text not null default 'Draft'
    check (status in ('Draft', 'Needs owner/admin approval', 'Sent', 'Cancelled')),
  recipient_count integer not null default 0 check (recipient_count >= 0),
  created_by uuid references public.profiles(id) on delete set null,
  approved_by uuid references public.profiles(id) on delete set null,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.crm_broadcast_recipients (
  id uuid primary key default gen_random_uuid(),
  broadcast_id uuid not null references public.crm_broadcasts(id) on delete cascade,
  customer_id uuid not null references public.crm_customers(id) on delete cascade,
  status text not null default 'PENDING'
    check (status in ('PENDING', 'SENT', 'FAILED', 'SKIPPED')),
  sent_at timestamptz,
  error_message text,
  unique (broadcast_id, customer_id)
);

create table if not exists public.crm_notifications (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references public.crm_customers(id) on delete cascade,
  notification_type text not null,
  title text not null,
  body text,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.crm_follow_ups (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.crm_customers(id) on delete cascade,
  assigned_staff_id uuid references public.profiles(id) on delete set null,
  due_at timestamptz not null,
  note text not null,
  status text not null default 'OPEN' check (status in ('OPEN', 'DONE', 'CANCELLED')),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.crm_ai_suggestions (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.crm_customers(id) on delete cascade,
  conversation_id uuid references public.crm_conversations(id) on delete cascade,
  suggestion_text text not null,
  reason text,
  status text not null default 'PENDING'
    check (status in ('PENDING', 'APPROVED', 'EDITED', 'REJECTED', 'SENT')),
  approved_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.crm_audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id) on delete set null,
  action text not null,
  table_name text not null,
  record_id uuid,
  detail jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_whatsapp_accounts_phone_number_id
on public.whatsapp_accounts(phone_number_id);
create index if not exists idx_crm_customers_assigned_last
on public.crm_customers(assigned_staff_id, last_message_at desc);
create index if not exists idx_crm_customers_account_phone
on public.crm_customers(whatsapp_account_id, phone);
create index if not exists idx_crm_messages_customer_time
on public.crm_messages(customer_id, created_at);
create index if not exists idx_crm_messages_external_id
on public.crm_messages(external_message_id);
create index if not exists idx_crm_webhook_inbox_processed
on public.crm_webhook_inbox(processed_at, created_at);
create index if not exists idx_crm_orders_customer_status
on public.crm_orders(customer_id, status);
create index if not exists idx_crm_follow_ups_due
on public.crm_follow_ups(assigned_staff_id, status, due_at);
create index if not exists idx_product_prices_lookup
on public.product_prices(product_id, customer_type, is_active, effective_from desc);

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'whatsapp_accounts',
    'crm_customers',
    'crm_conversations',
    'products',
    'product_prices',
    'crm_orders',
    'crm_broadcasts',
    'crm_follow_ups',
    'crm_ai_suggestions'
  ]
  loop
    execute format('drop trigger if exists set_%I_updated_at on public.%I', table_name, table_name);
    execute format(
      'create trigger set_%I_updated_at before update on public.%I for each row execute function public.set_updated_at()',
      table_name,
      table_name
    );
  end loop;
end $$;

alter table public.whatsapp_accounts enable row level security;
alter table public.crm_customers enable row level security;
alter table public.customer_tags enable row level security;
alter table public.crm_customer_tag_links enable row level security;
alter table public.crm_conversations enable row level security;
alter table public.crm_messages enable row level security;
alter table public.crm_webhook_inbox enable row level security;
alter table public.crm_assignments enable row level security;
alter table public.products enable row level security;
alter table public.product_prices enable row level security;
alter table public.crm_orders enable row level security;
alter table public.crm_order_items enable row level security;
alter table public.crm_broadcasts enable row level security;
alter table public.crm_broadcast_recipients enable row level security;
alter table public.crm_notifications enable row level security;
alter table public.crm_follow_ups enable row level security;
alter table public.crm_ai_suggestions enable row level security;
alter table public.crm_audit_logs enable row level security;

drop policy if exists "crm users read whatsapp accounts" on public.whatsapp_accounts;
create policy "crm users read whatsapp accounts"
on public.whatsapp_accounts for select to authenticated
using (public.can_manage_whatsapp_crm());

drop policy if exists "owner admin manage whatsapp accounts" on public.whatsapp_accounts;
create policy "owner admin manage whatsapp accounts"
on public.whatsapp_accounts for all to authenticated
using (public.can_send_whatsapp_broadcast())
with check (public.can_send_whatsapp_broadcast());

drop policy if exists "crm users read scoped customers" on public.crm_customers;
create policy "crm users read scoped customers"
on public.crm_customers for select to authenticated
using (
  public.can_send_whatsapp_broadcast()
  or public.has_role('account')
  or assigned_staff_id = auth.uid()
);

drop policy if exists "crm staff insert customers" on public.crm_customers;
create policy "crm staff insert customers"
on public.crm_customers for insert to authenticated
with check (public.can_reply_whatsapp_crm());

drop policy if exists "crm staff update scoped customers" on public.crm_customers;
create policy "crm staff update scoped customers"
on public.crm_customers for update to authenticated
using (
  public.can_send_whatsapp_broadcast()
  or assigned_staff_id = auth.uid()
)
with check (
  public.can_send_whatsapp_broadcast()
  or assigned_staff_id = auth.uid()
);

drop policy if exists "crm users read customer tags" on public.customer_tags;
create policy "crm users read customer tags"
on public.customer_tags for select to authenticated
using (public.can_manage_whatsapp_crm());

drop policy if exists "crm staff manage customer tags" on public.customer_tags;
create policy "crm staff manage customer tags"
on public.customer_tags for all to authenticated
using (public.can_reply_whatsapp_crm())
with check (public.can_reply_whatsapp_crm());

drop policy if exists "crm users read tag links" on public.crm_customer_tag_links;
create policy "crm users read tag links"
on public.crm_customer_tag_links for select to authenticated
using (public.can_manage_whatsapp_crm());

drop policy if exists "crm staff manage tag links" on public.crm_customer_tag_links;
create policy "crm staff manage tag links"
on public.crm_customer_tag_links for all to authenticated
using (public.can_reply_whatsapp_crm())
with check (public.can_reply_whatsapp_crm());

drop policy if exists "crm users read scoped conversations" on public.crm_conversations;
create policy "crm users read scoped conversations"
on public.crm_conversations for select to authenticated
using (
  public.can_send_whatsapp_broadcast()
  or public.has_role('account')
  or assigned_staff_id = auth.uid()
);

drop policy if exists "crm staff manage conversations" on public.crm_conversations;
create policy "crm staff manage conversations"
on public.crm_conversations for all to authenticated
using (
  public.can_send_whatsapp_broadcast()
  or assigned_staff_id = auth.uid()
)
with check (public.can_reply_whatsapp_crm());

drop policy if exists "crm users read scoped messages" on public.crm_messages;
create policy "crm users read scoped messages"
on public.crm_messages for select to authenticated
using (
  public.can_send_whatsapp_broadcast()
  or exists (
    select 1
    from public.crm_customers customer
    where customer.id = crm_messages.customer_id
      and customer.assigned_staff_id = auth.uid()
  )
);

drop policy if exists "crm staff insert approved messages" on public.crm_messages;
create policy "crm staff insert approved messages"
on public.crm_messages for insert to authenticated
with check (
  direction = 'outbound'
  and public.can_reply_whatsapp_crm()
  and approved_by_staff
  and exists (
    select 1
    from public.crm_customers customer
    where customer.id = crm_messages.customer_id
      and (
        public.can_send_whatsapp_broadcast()
        or customer.assigned_staff_id = auth.uid()
      )
  )
);

drop policy if exists "owner admin read webhook inbox" on public.crm_webhook_inbox;
create policy "owner admin read webhook inbox"
on public.crm_webhook_inbox for select to authenticated
using (public.can_send_whatsapp_broadcast());

drop policy if exists "service role manages webhook inbox" on public.crm_webhook_inbox;
create policy "service role manages webhook inbox"
on public.crm_webhook_inbox for all to service_role
using (true)
with check (true);

drop policy if exists "crm users read assignments" on public.crm_assignments;
create policy "crm users read assignments"
on public.crm_assignments for select to authenticated
using (
  public.can_send_whatsapp_broadcast()
  or public.has_role('account')
  or staff_id = auth.uid()
);

drop policy if exists "crm staff manage assignments" on public.crm_assignments;
create policy "crm staff manage assignments"
on public.crm_assignments for all to authenticated
using (public.can_reply_whatsapp_crm())
with check (public.can_reply_whatsapp_crm());

drop policy if exists "crm users read products" on public.products;
create policy "crm users read products"
on public.products for select to authenticated
using (public.can_manage_whatsapp_crm());

drop policy if exists "owner admin manage products" on public.products;
create policy "owner admin manage products"
on public.products for all to authenticated
using (public.can_send_whatsapp_broadcast())
with check (public.can_send_whatsapp_broadcast());

drop policy if exists "crm users read product prices" on public.product_prices;
create policy "crm users read product prices"
on public.product_prices for select to authenticated
using (public.can_manage_whatsapp_crm());

drop policy if exists "owner admin manage product prices" on public.product_prices;
create policy "owner admin manage product prices"
on public.product_prices for all to authenticated
using (public.can_send_whatsapp_broadcast())
with check (public.can_send_whatsapp_broadcast());

drop policy if exists "crm users read scoped orders" on public.crm_orders;
create policy "crm users read scoped orders"
on public.crm_orders for select to authenticated
using (
  public.can_send_whatsapp_broadcast()
  or public.has_role('account')
  or exists (
    select 1
    from public.crm_customers customer
    where customer.id = crm_orders.customer_id
      and customer.assigned_staff_id = auth.uid()
  )
);

drop policy if exists "crm staff manage scoped orders" on public.crm_orders;
create policy "crm staff manage scoped orders"
on public.crm_orders for all to authenticated
using (
  public.can_send_whatsapp_broadcast()
  or created_by = auth.uid()
  or exists (
    select 1
    from public.crm_customers customer
    where customer.id = crm_orders.customer_id
      and customer.assigned_staff_id = auth.uid()
  )
)
with check (public.can_reply_whatsapp_crm());

drop policy if exists "crm users read order items" on public.crm_order_items;
create policy "crm users read order items"
on public.crm_order_items for select to authenticated
using (
  exists (
    select 1
    from public.crm_orders crm_order
    where crm_order.id = crm_order_items.order_id
      and (
        public.can_send_whatsapp_broadcast()
        or public.has_role('account')
        or crm_order.created_by = auth.uid()
        or exists (
          select 1
          from public.crm_customers customer
          where customer.id = crm_order.customer_id
            and customer.assigned_staff_id = auth.uid()
        )
      )
  )
);

drop policy if exists "crm staff manage order items" on public.crm_order_items;
create policy "crm staff manage order items"
on public.crm_order_items for all to authenticated
using (
  public.can_send_whatsapp_broadcast()
  or exists (
    select 1
    from public.crm_orders crm_order
    join public.crm_customers customer on customer.id = crm_order.customer_id
    where crm_order.id = crm_order_items.order_id
      and (
        crm_order.created_by = auth.uid()
        or customer.assigned_staff_id = auth.uid()
      )
  )
)
with check (
  public.can_reply_whatsapp_crm()
  and (
    public.can_send_whatsapp_broadcast()
    or exists (
      select 1
      from public.crm_orders crm_order
      join public.crm_customers customer on customer.id = crm_order.customer_id
      where crm_order.id = crm_order_items.order_id
        and (
          crm_order.created_by = auth.uid()
          or customer.assigned_staff_id = auth.uid()
        )
    )
  )
);

drop policy if exists "crm users read broadcasts" on public.crm_broadcasts;
create policy "crm users read broadcasts"
on public.crm_broadcasts for select to authenticated
using (public.can_reply_whatsapp_crm());

drop policy if exists "owner admin send broadcasts" on public.crm_broadcasts;
create policy "owner admin send broadcasts"
on public.crm_broadcasts for all to authenticated
using (public.can_send_whatsapp_broadcast())
with check (public.can_send_whatsapp_broadcast());

drop policy if exists "crm users read broadcast recipients" on public.crm_broadcast_recipients;
create policy "crm users read broadcast recipients"
on public.crm_broadcast_recipients for select to authenticated
using (public.can_send_whatsapp_broadcast());

drop policy if exists "owner admin manage broadcast recipients" on public.crm_broadcast_recipients;
create policy "owner admin manage broadcast recipients"
on public.crm_broadcast_recipients for all to authenticated
using (public.can_send_whatsapp_broadcast())
with check (public.can_send_whatsapp_broadcast());

drop policy if exists "crm users read notifications" on public.crm_notifications;
create policy "crm users read notifications"
on public.crm_notifications for select to authenticated
using (public.can_manage_whatsapp_crm());

drop policy if exists "crm staff manage notifications" on public.crm_notifications;
create policy "crm staff manage notifications"
on public.crm_notifications for all to authenticated
using (public.can_reply_whatsapp_crm())
with check (public.can_reply_whatsapp_crm());

drop policy if exists "crm users read follow ups" on public.crm_follow_ups;
create policy "crm users read follow ups"
on public.crm_follow_ups for select to authenticated
using (
  public.can_send_whatsapp_broadcast()
  or public.has_role('account')
  or assigned_staff_id = auth.uid()
);

drop policy if exists "crm staff manage follow ups" on public.crm_follow_ups;
create policy "crm staff manage follow ups"
on public.crm_follow_ups for all to authenticated
using (
  public.can_send_whatsapp_broadcast()
  or assigned_staff_id = auth.uid()
  or created_by = auth.uid()
)
with check (public.can_reply_whatsapp_crm());

drop policy if exists "crm users read ai suggestions" on public.crm_ai_suggestions;
create policy "crm users read ai suggestions"
on public.crm_ai_suggestions for select to authenticated
using (public.can_reply_whatsapp_crm());

drop policy if exists "crm staff approve ai suggestions" on public.crm_ai_suggestions;
create policy "crm staff approve ai suggestions"
on public.crm_ai_suggestions for update to authenticated
using (public.can_reply_whatsapp_crm())
with check (public.can_reply_whatsapp_crm());

drop policy if exists "crm users read audit logs" on public.crm_audit_logs;
create policy "crm users read audit logs"
on public.crm_audit_logs for select to authenticated
using (public.can_send_whatsapp_broadcast());

drop policy if exists "crm users insert audit logs" on public.crm_audit_logs;
create policy "crm users insert audit logs"
on public.crm_audit_logs for insert to authenticated
with check (public.can_manage_whatsapp_crm());
