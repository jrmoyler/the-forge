-- Preserve the existing private token and its redemption history.
-- Only the separately issued bootstrap owner invitation becomes permanent.
alter table public.invites add column if not exists reusable boolean not null default false;

do $$
begin
  if (select count(*) from public.invites where role = 'owner' and created_by is null) > 1 then
    raise exception 'Multiple bootstrap owner invitations found; identify the issued invitation before applying this migration';
  end if;
end $$;

update public.invites
set reusable = true, expires_at = 'infinity'::timestamptz
where role = 'owner' and created_by is null;

create or replace function public.inspect_invite(token text) returns text language sql security definer set search_path=public,extensions as $$ select role from invites where token_hash=encode(digest(token,'sha256'),'hex') and (reusable or used_at is null) and expires_at>now() $$;
create or replace function public.redeem_invite(token text,new_user uuid,display_name text) returns void language plpgsql security definer set search_path=public,extensions as $$ declare r text;begin
 update invites set used_by=new_user,used_at=now() where token_hash=encode(digest(token,'sha256'),'hex') and (reusable or used_at is null) and expires_at>now() returning role into r;
 if r is null then raise exception 'Invite expired or already used';end if;
 insert into members(id,name,role) values(new_user,display_name,r);end $$;
revoke all on function public.inspect_invite(text) from public,anon,authenticated;
revoke all on function public.redeem_invite(text,uuid,text) from public,anon,authenticated;
grant execute on function public.inspect_invite(text) to service_role;grant execute on function public.redeem_invite(text,uuid,text) to service_role;
