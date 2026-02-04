create table if not exists agent_memories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  text text not null,
  created_at timestamptz not null default now()
);

alter table agent_memories enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'agent_memories'
      and policyname = 'agent_memories_select_own'
  ) then
    create policy "agent_memories_select_own" on agent_memories
    for select
    using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'agent_memories'
      and policyname = 'agent_memories_insert_own'
  ) then
    create policy "agent_memories_insert_own" on agent_memories
    for insert
    with check (auth.uid() = user_id);
  end if;
end $$;
