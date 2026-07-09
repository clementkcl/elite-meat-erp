update public.retail_processing_batches
set warning_message = null
where warning_message is not null;

update public.retail_processing_records
set warning_flag = false
where warning_flag = true;
