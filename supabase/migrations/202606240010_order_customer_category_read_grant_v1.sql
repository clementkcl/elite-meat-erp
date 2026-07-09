grant select on public.customer_categories to authenticated;

drop policy if exists "users can read customer categories" on public.customer_categories;
create policy "users can read customer categories"
on public.customer_categories for select to authenticated
using (true);
