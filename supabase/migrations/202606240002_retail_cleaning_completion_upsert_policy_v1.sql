drop policy if exists "retail users can update cleaning completions" on public.retail_cleaning_completions;
create policy "retail users can update cleaning completions"
on public.retail_cleaning_completions for update to authenticated
using (
  public.can_manage_retail()
  and (outlet_id is null or public.can_access_outlet(outlet_id))
  and completed_by = auth.uid()
)
with check (
  public.can_manage_retail()
  and (outlet_id is null or public.can_access_outlet(outlet_id))
  and completed_by = auth.uid()
);
