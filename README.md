# Elite Meat ERP

Core ERP foundation with Stock Module V1 built on Next.js App Router,
TypeScript, Supabase Auth, Supabase PostgreSQL, Supabase Storage, Tailwind CSS,
shadcn/ui, TanStack Table, and Recharts.

## Scope

Stock Module V1 is implemented. Other ERP modules are intentionally placeholder
pages: Delivery, Attendance, OA Actions, Retail, Accounting & Finance, Director
Reports, and Settings.

## Environment

Create `.env.local` with Supabase public project values:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://aikfqnbsshflbtuakwrz.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

Do not put service-role keys in frontend code. Server actions use the
authenticated user's Supabase session.

## Database Setup

Run the migration first, then seed data:

```bash
supabase db push
supabase db seed
```

If you are using the Supabase SQL editor instead of the CLI, run these files in
order:

1. `supabase/migrations/202606100001_erp_core_stock_v1.sql`
2. `supabase/seed.sql`

After creating your first Supabase Auth user, assign roles in SQL, for example:

```sql
insert into public.profile_roles (profile_id, role_key)
values ('USER_UUID_HERE', 'admin')
on conflict do nothing;
```

## Local Development

```bash
npm install
npm run dev
npm run lint
npm run build
```

Open `http://localhost:3000`.

## Stock Routes

- `/stock/dashboard`
- `/stock/items`
- `/stock/inbound`
- `/stock/outbound`
- `/stock/transfer`
- `/stock/receive-transfer`
- `/stock/return`
- `/stock/no-barcode-inbound`
- `/stock/balance`
- `/stock/movements`
- `/stock/stock-take`
- `/stock/reports`
- `/stock/settings`

## Seed Data

The seed adds:

- Locations: JALAN CHANNEL, SUNGAI MERAH, DIRECTOR
- Brands: TICAN, RIVASAM, SEABOARD, VAN ROOI, ABC, ICP, LOCKS
- Origins: DENMARK, SPAIN, USA, NETHERLAND, BELGIUM, CHINA
- Items:
  - MEAT / BELLY / BONELESS
  - MEAT / BELLY / BONE IN
  - MEAT / LOIN / BONELESS
  - ORGANS / COOKED / STOMACH
  - ORGANS / TONGUE / TONGUE
  - PROCESSED / MEATBALL / MEATBALL
