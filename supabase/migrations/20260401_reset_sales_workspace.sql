create or replace function public.reset_sales_workspace()
returns void
language plpgsql
security definer
as $$
begin
  truncate table
    public.activity_log,
    public.follow_up_tasks,
    public.message_generations,
    public.conversation_events,
    public.lead_import_runs,
    public.leads
  restart identity
  cascade;
end;
$$;
