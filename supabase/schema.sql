create extension if not exists pgcrypto with schema extensions;
create table public.members (id uuid primary key references auth.users on delete cascade,name text not null check(length(name) between 1 and 80),role text not null default 'learner' check(role in ('owner','mentor','learner')),created_at timestamptz default now());
create function public.is_member() returns boolean language sql stable security definer set search_path=public as $$ select exists(select 1 from members where id=auth.uid()) $$;
create function public.is_mentor() returns boolean language sql stable security definer set search_path=public as $$ select exists(select 1 from members where id=auth.uid() and role in ('owner','mentor')) $$;
create table public.curriculum (id int primary key default 1, content jsonb not null);
create table public.invites (id uuid primary key default gen_random_uuid(),token_hash text unique not null,role text not null check(role in ('owner','mentor','learner')),created_by uuid references public.members,expires_at timestamptz not null default now()+interval '7 days',used_by uuid references auth.users,used_at timestamptz);
create table public.progress (user_id uuid primary key references public.members on delete cascade, data jsonb not null default '{}',updated_at timestamptz default now());
create table public.assignments(id uuid primary key default gen_random_uuid(),user_id uuid not null references public.members on delete cascade,mission_id text not null check(mission_id ~ '^S(0[1-9]|1[0-2])$'),mentor_id uuid not null references public.members,due_date date,notes text default '',created_at timestamptz default now(),unique(user_id,mission_id));
create table public.submissions(id uuid primary key default gen_random_uuid(),user_id uuid not null references public.members on delete cascade,mission_id text not null check(mission_id ~ '^S(0[1-9]|1[0-2])$'),artifact text not null check(length(artifact) between 30 and 30000),evidence text not null check(length(evidence) between 20 and 20000),status text not null default 'pending' check(status in ('pending','revision','passed')),scores jsonb,critical_failure boolean,feedback text,reviewer_id uuid references public.members,created_at timestamptz default now(),reviewed_at timestamptz);
create table public.quiz_keys(mission_id text primary key,answers jsonb not null);
create table public.attempts(id uuid primary key default gen_random_uuid(),user_id uuid not null references public.members on delete cascade,mission_id text not null,score int not null,created_at timestamptz default now());
alter table members enable row level security;alter table curriculum enable row level security;alter table invites enable row level security;alter table progress enable row level security;alter table assignments enable row level security;alter table submissions enable row level security;alter table quiz_keys enable row level security;alter table attempts enable row level security;
create policy members_read on members for select to authenticated using(id=auth.uid() or is_mentor());
create policy curriculum_read on curriculum for select to authenticated using(is_member());
create policy progress_read on progress for select to authenticated using(user_id=auth.uid() or is_mentor());
create policy progress_insert on progress for insert to authenticated with check(user_id=auth.uid() and is_member());
create policy progress_update on progress for update to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
create policy assignment_read on assignments for select to authenticated using(user_id=auth.uid() or is_mentor());
create policy assignment_insert on assignments for insert to authenticated with check(is_mentor() and mentor_id=auth.uid());
create policy assignment_update on assignments for update to authenticated using(is_mentor()) with check(is_mentor() and mentor_id=auth.uid());
create policy submission_read on submissions for select to authenticated using(user_id=auth.uid() or is_mentor());
create policy submission_insert on submissions for insert to authenticated with check(user_id=auth.uid() and is_member() and status='pending' and scores is null and feedback is null and reviewer_id is null and reviewed_at is null and critical_failure is null);
create policy attempts_read on attempts for select to authenticated using(user_id=auth.uid() or is_mentor());
create function public.create_invite(member_role text default 'learner') returns text language plpgsql security definer set search_path=public,extensions as $$ declare token text;begin
 if not is_mentor() or member_role not in ('mentor','learner') then raise exception 'Not permitted';end if;
 if member_role='mentor' and not exists(select 1 from members where id=auth.uid() and role='owner') then raise exception 'Only the owner can invite mentors';end if;
 token:=encode(gen_random_bytes(24),'hex');insert into invites(token_hash,role,created_by) values(encode(digest(token,'sha256'),'hex'),member_role,auth.uid());return token;end $$;
create function public.inspect_invite(token text) returns text language sql security definer set search_path=public,extensions as $$ select role from invites where token_hash=encode(digest(token,'sha256'),'hex') and used_at is null and expires_at>now() $$;
create function public.redeem_invite(token text,new_user uuid,display_name text) returns void language plpgsql security definer set search_path=public,extensions as $$ declare r text;begin
 update invites set used_by=new_user,used_at=now() where token_hash=encode(digest(token,'sha256'),'hex') and used_at is null and expires_at>now() returning role into r;
 if r is null then raise exception 'Invite expired or already used';end if;
 insert into members(id,name,role) values(new_user,display_name,r);end $$;
revoke all on function public.inspect_invite(text) from public,anon,authenticated;
revoke all on function public.redeem_invite(text,uuid,text) from public,anon,authenticated;
grant execute on function public.inspect_invite(text) to service_role;grant execute on function public.redeem_invite(text,uuid,text) to service_role;
create function public.grade_quiz(mission text,responses jsonb) returns jsonb language plpgsql security definer set search_path=public as $$ declare key jsonb;correct int:=0;i int;total int;score int;begin
 if not is_member() then raise exception 'Membership required';end if;
 select answers into key from quiz_keys where mission_id=mission;if key is null then raise exception 'Unknown quiz';end if;
 total:=jsonb_array_length(key);if jsonb_typeof(responses)<>'array' or jsonb_array_length(responses)<>total then raise exception 'Answer every question';end if;
 for i in 0..total-1 loop if responses->i=key->i then correct:=correct+1;end if;end loop;
 score:=round(correct*100.0/total);insert into attempts(user_id,mission_id,score) values(auth.uid(),mission,score);return jsonb_build_object('score',score,'passed',score>=80);end $$;
create function public.review_submission(submission_id uuid,rubric jsonb,comments text,critical boolean) returns text language plpgsql security definer set search_path=public as $$ declare s submissions;total int:=0;v int;i int;limits int[]:=array[30,25,20,15,10];result text;begin
 if not is_mentor() then raise exception 'Mentor access required';end if;
 select * into s from submissions where id=submission_id for update;
 if s.id is null or s.user_id=auth.uid() then raise exception 'A different mentor must review this work';end if;
 if s.status<>'pending' then raise exception 'Already reviewed; submit a new revision';end if;
 if jsonb_typeof(rubric)<>'array' or jsonb_array_length(rubric)<>5 or length(trim(comments))<10 then raise exception 'Complete the rubric and feedback';end if;
 for i in 0..4 loop v:=(rubric->>i)::int;if v is null or v<0 or v>limits[i+1] then raise exception 'Invalid rubric score';end if;total:=total+v;end loop;
 result:=case when total>=80 and not critical then 'passed' else 'revision' end;
 update submissions set status=result,scores=rubric,critical_failure=critical,feedback=comments,reviewer_id=auth.uid(),reviewed_at=now() where id=submission_id;return result;end $$;
revoke all on function public.create_invite(text),public.grade_quiz(text,jsonb),public.review_submission(uuid,jsonb,text,boolean) from public,anon;
grant execute on function public.create_invite(text),public.grade_quiz(text,jsonb),public.review_submission(uuid,jsonb,text,boolean) to authenticated;
-- Enforce the same submission gate through direct API calls.
drop policy submission_insert on public.submissions;
create policy submission_insert on public.submissions for insert to authenticated with check(user_id=auth.uid() and is_member() and status='pending' and scores is null and feedback is null and reviewer_id is null and reviewed_at is null and critical_failure is null and exists(select 1 from public.attempts a where a.user_id=auth.uid() and a.mission_id=submissions.mission_id and a.score>=80));
create unique index one_pending_submission on public.submissions(user_id,mission_id) where status='pending';
