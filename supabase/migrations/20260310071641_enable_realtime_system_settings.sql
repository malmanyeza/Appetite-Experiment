-- Enable Realtime for the system_settings table
begin;
  -- Create the publication if it doesn't exist
  do $$
  begin
    if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
      create publication supabase_realtime;
    end if;
  end $$;
  
  -- Add the system_settings table to the publication
  do $$
  begin
    if not exists (
      select 1 from pg_publication_tables 
      where pubname = 'supabase_realtime' 
      and schemaname = 'public' 
      and tablename = 'system_settings'
    ) then
      alter publication supabase_realtime add table public.system_settings;
    end if;
  end $$;
commit;

-- Set replica identity to FULL so that updates/deletes contain all columns
alter table public.system_settings replica identity full;
