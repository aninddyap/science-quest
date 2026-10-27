-- Run in Supabase SQL Editor on a NEW project.
create extension if not exists pgcrypto;
create table public.teacher_profiles(user_id uuid primary key references auth.users(id) on delete cascade);
create table public.groups(
 id uuid primary key default gen_random_uuid(),
 teacher_id uuid not null references auth.users(id),
 name text not null check(length(name) between 1 and 100),
 code text not null unique check(length(code) between 4 and 10),
 created_at timestamptz not null default now()
);
create table public.members(
 group_id uuid not null references public.groups(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 student_name text not null check(length(student_name) between 1 and 40),
 primary key(group_id,user_id)
);
create table public.answers(
 group_id uuid primary key references public.groups(id) on delete cascade,
 predict text not null default '',
 observe text not null default '',
 explain text not null default '',
 quiz_answer text not null default '',
 updated_at timestamptz not null default now()
);
create function public.is_teacher(p_group uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.groups where id=p_group and teacher_id=(select auth.uid()))
$$;
create function public.is_member(p_group uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.members where group_id=p_group and user_id=(select auth.uid()))
$$;
create function public.is_teacher_account() returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.teacher_profiles where user_id=(select auth.uid()))
$$;
create function public.create_group(p_name text) returns public.groups
 language plpgsql security definer set search_path='' as $$
declare g public.groups; c text; n int:=0;
begin
 if not public.is_teacher_account() then raise exception 'Akses guru diperlukan'; end if;
 if length(trim(p_name)) not between 1 and 100 then raise exception 'Nama kelompok tidak valid'; end if;
 loop
  c:=upper(substr(encode(gen_random_bytes(5),'hex'),1,7));
  exit when not exists(select 1 from public.groups where code=c);
  n:=n+1;if n>10 then raise exception 'Gagal membuat kode';end if;
 end loop;
 insert into public.groups(teacher_id,name,code) values(auth.uid(),trim(p_name),c) returning * into g;
 insert into public.answers(group_id) values(g.id);
 return g;
end$$;
create function public.join_group(p_code text,p_name text) returns public.groups
 language plpgsql security definer set search_path='' as $$
declare g public.groups;
begin
 if auth.uid() is null then raise exception 'Silakan login terlebih dahulu'; end if;
 if length(trim(p_name)) not between 1 and 40 then raise exception 'Nama murid tidak valid'; end if;
 select * into g from public.groups where code=upper(trim(p_code));
 if g.id is null then raise exception 'Kode kelompok tidak ditemukan'; end if;
 if not exists(select 1 from public.members where group_id=g.id and user_id=auth.uid()) and
    (select count(*) from public.members where group_id=g.id)>=5 then
    raise exception 'Kelompok sudah penuh (maksimal 5 murid)';
 end if;
 insert into public.members(group_id,user_id,student_name) values(g.id,auth.uid(),trim(p_name))
 on conflict(group_id,user_id) do update set student_name=excluded.student_name;
 return g;
end$$;
alter table public.teacher_profiles enable row level security;
alter table public.groups enable row level security;
alter table public.members enable row level security;
alter table public.answers enable row level security;
create policy "teacher self" on public.teacher_profiles for select to authenticated using(user_id=auth.uid());
create policy "group read" on public.groups for select to authenticated using(teacher_id=auth.uid() or public.is_member(id));
create policy "member read" on public.members for select to authenticated using(public.is_member(group_id) or public.is_teacher(group_id));
create policy "answer read" on public.answers for select to authenticated using(public.is_member(group_id) or public.is_teacher(group_id));
create policy "answer update" on public.answers for update to authenticated using(public.is_member(group_id)) with check(public.is_member(group_id));
grant execute on function public.create_group(text) to authenticated;
grant execute on function public.join_group(text,text) to authenticated;
grant execute on function public.is_teacher(uuid) to authenticated;
grant execute on function public.is_member(uuid) to authenticated;
grant execute on function public.is_teacher_account() to authenticated;
-- Enable real-time changes for these tables.
alter publication supabase_realtime add table public.answers;
alter publication supabase_realtime add table public.members;
alter publication supabase_realtime add table public.groups;
-- IMPORTANT: After creating an email/password user in Authentication > Users,
-- copy their UUID and run:
-- insert into public.teacher_profiles(user_id) values ('PASTE-TEACHER-UUID-HERE');
