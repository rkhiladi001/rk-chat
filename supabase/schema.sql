-- RK Chat database schema for Supabase (PostgreSQL)
-- Run this whole file in Supabase Dashboard > SQL Editor > New query.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique,
  full_name text not null default 'New member',
  avatar_url text not null default '',
  bio text not null default '',
  website text not null default '',
  role text not null default 'user' check (role in ('user', 'admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Safe migration for projects created with an earlier RK Chat schema.
alter table public.profiles add column if not exists role text not null default 'user';
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check check (role in ('user', 'admin'));

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  content text not null default '',
  media_url text,
  media_type text check (media_type in ('image', 'video') or media_type is null),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint posts_need_content_or_media check (length(trim(content)) > 0 or media_url is not null)
);

create table if not exists public.post_likes (
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (length(trim(body)) > 0 and length(body) <= 2000),
  created_at timestamptz not null default now()
);

create table if not exists public.bookmarks (
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create table if not exists public.follows (
  follower_id uuid not null references public.profiles(id) on delete cascade,
  following_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, following_id),
  constraint follows_not_self check (follower_id <> following_id)
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.profiles(id) on delete cascade,
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (length(trim(body)) > 0 and length(body) <= 5000),
  created_at timestamptz not null default now(),
  constraint messages_not_self check (sender_id <> recipient_id)
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  kind text not null check (kind in ('like', 'comment', 'follow')),
  post_id uuid references public.posts(id) on delete cascade,
  body text not null default '',
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null constraint reports_reporter_id_fkey references public.profiles(id) on delete cascade,
  target_kind text not null check (target_kind in ('post', 'profile')),
  post_id uuid constraint reports_post_id_fkey references public.posts(id) on delete set null,
  target_user_id uuid constraint reports_target_user_id_fkey references public.profiles(id) on delete cascade,
  reason text not null default 'Community guideline concern',
  details text not null default '',
  status text not null default 'open' check (status in ('open', 'reviewed', 'resolved', 'dismissed')),
  created_at timestamptz not null default now(),
  constraint reports_target_present check ((target_kind = 'post' and (post_id is not null or target_user_id is not null)) or (target_kind = 'profile' and target_user_id is not null))
);

create index if not exists reports_status_created_idx on public.reports (status, created_at desc);

create index if not exists posts_created_at_idx on public.posts (created_at desc);
create index if not exists posts_user_id_idx on public.posts (user_id);
create index if not exists comments_post_id_idx on public.comments (post_id, created_at);
create index if not exists messages_pair_idx on public.messages (sender_id, recipient_id, created_at);
create index if not exists notifications_user_created_idx on public.notifications (user_id, created_at desc);

-- Keep updated_at current for profile/post edits.
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists posts_set_updated_at on public.posts;
create trigger posts_set_updated_at before update on public.posts
for each row execute function public.set_updated_at();

-- A normal signed-in user cannot grant themselves admin privileges.
create or replace function public.prevent_self_role_change()
returns trigger language plpgsql as $$
begin
  if auth.uid() is not null and new.role is distinct from old.role then
    raise exception 'Profile roles can only be changed by the project owner in Supabase SQL Editor.';
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_prevent_self_role_change on public.profiles;
create trigger profiles_prevent_self_role_change before update of role on public.profiles
for each row execute function public.prevent_self_role_change();

-- Create a public profile automatically when a user signs up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  desired_username text;
begin
  desired_username := lower(regexp_replace(coalesce(new.raw_user_meta_data->>'username', split_part(coalesce(new.email, 'member'), '@', 1)), '[^a-z0-9_]', '', 'g'));
  if desired_username = '' then desired_username := 'member'; end if;
  insert into public.profiles (id, username, full_name, avatar_url)
  values (
    new.id,
    left(desired_username, 22) || '_' || left(replace(new.id::text, '-', ''), 5),
    coalesce(nullif(new.raw_user_meta_data->>'full_name', ''), split_part(coalesce(new.email, 'New member'), '@', 1)),
    ''
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
for each row execute procedure public.handle_new_user();

-- Notification helpers.
create or replace function public.notify_post_like()
returns trigger language plpgsql security definer set search_path = public as $$
declare owner_id uuid;
begin
  select user_id into owner_id from public.posts where id = new.post_id;
  if owner_id is not null and owner_id <> new.user_id then
    insert into public.notifications (user_id, actor_id, kind, post_id, body)
    values (owner_id, new.user_id, 'like', new.post_id, 'liked your post');
  end if;
  return new;
end;
$$;

drop trigger if exists post_like_notification on public.post_likes;
create trigger post_like_notification after insert on public.post_likes
for each row execute function public.notify_post_like();

create or replace function public.notify_new_comment()
returns trigger language plpgsql security definer set search_path = public as $$
declare owner_id uuid;
begin
  select user_id into owner_id from public.posts where id = new.post_id;
  if owner_id is not null and owner_id <> new.user_id then
    insert into public.notifications (user_id, actor_id, kind, post_id, body)
    values (owner_id, new.user_id, 'comment', new.post_id, 'commented on your post');
  end if;
  return new;
end;
$$;

drop trigger if exists comment_notification on public.comments;
create trigger comment_notification after insert on public.comments
for each row execute function public.notify_new_comment();

create or replace function public.notify_new_follow()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.notifications (user_id, actor_id, kind, body)
  values (new.following_id, new.follower_id, 'follow', 'started following you');
  return new;
end;
$$;

drop trigger if exists follow_notification on public.follows;
create trigger follow_notification after insert on public.follows
for each row execute function public.notify_new_follow();

-- Row Level Security: every write is tied to the signed-in user's identity.
alter table public.profiles enable row level security;
alter table public.posts enable row level security;
alter table public.post_likes enable row level security;
alter table public.comments enable row level security;
alter table public.bookmarks enable row level security;
alter table public.follows enable row level security;
alter table public.messages enable row level security;
alter table public.notifications enable row level security;
alter table public.reports enable row level security;

drop policy if exists "Profiles are visible to everyone" on public.profiles;
create policy "Profiles are visible to everyone" on public.profiles for select using (true);
drop policy if exists "Users can create their own profile" on public.profiles;
create policy "Users can create their own profile" on public.profiles for insert with check (auth.uid() = id);
drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "Posts are visible to everyone" on public.posts;
create policy "Posts are visible to everyone" on public.posts for select using (true);
drop policy if exists "Users can create their own posts" on public.posts;
create policy "Users can create their own posts" on public.posts for insert with check (auth.uid() = user_id);
drop policy if exists "Users can edit their own posts" on public.posts;
create policy "Users can edit their own posts" on public.posts for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "Users can delete their own posts" on public.posts;
create policy "Users can delete their own posts" on public.posts for delete using (auth.uid() = user_id);

drop policy if exists "Likes are visible to everyone" on public.post_likes;
create policy "Likes are visible to everyone" on public.post_likes for select using (true);
drop policy if exists "Users can like posts as themselves" on public.post_likes;
create policy "Users can like posts as themselves" on public.post_likes for insert with check (auth.uid() = user_id);
drop policy if exists "Users can remove their own likes" on public.post_likes;
create policy "Users can remove their own likes" on public.post_likes for delete using (auth.uid() = user_id);

drop policy if exists "Comments are visible to everyone" on public.comments;
create policy "Comments are visible to everyone" on public.comments for select using (true);
drop policy if exists "Users can add comments as themselves" on public.comments;
create policy "Users can add comments as themselves" on public.comments for insert with check (auth.uid() = user_id);
drop policy if exists "Users can delete their own comments" on public.comments;
create policy "Users can delete their own comments" on public.comments for delete using (auth.uid() = user_id);

drop policy if exists "Users can read their own bookmarks" on public.bookmarks;
create policy "Users can read their own bookmarks" on public.bookmarks for select using (auth.uid() = user_id);
drop policy if exists "Users can save their own bookmarks" on public.bookmarks;
create policy "Users can save their own bookmarks" on public.bookmarks for insert with check (auth.uid() = user_id);
drop policy if exists "Users can remove their own bookmarks" on public.bookmarks;
create policy "Users can remove their own bookmarks" on public.bookmarks for delete using (auth.uid() = user_id);

drop policy if exists "Follows are visible to everyone" on public.follows;
create policy "Follows are visible to everyone" on public.follows for select using (true);
drop policy if exists "Users can follow as themselves" on public.follows;
create policy "Users can follow as themselves" on public.follows for insert with check (auth.uid() = follower_id);
drop policy if exists "Users can unfollow as themselves" on public.follows;
create policy "Users can unfollow as themselves" on public.follows for delete using (auth.uid() = follower_id);

drop policy if exists "Only conversation participants can read messages" on public.messages;
create policy "Only conversation participants can read messages" on public.messages for select using (auth.uid() = sender_id or auth.uid() = recipient_id);
drop policy if exists "Users can send messages as themselves" on public.messages;
create policy "Users can send messages as themselves" on public.messages for insert with check (auth.uid() = sender_id);
drop policy if exists "Participants can delete messages" on public.messages;
create policy "Participants can delete messages" on public.messages for delete using (auth.uid() = sender_id or auth.uid() = recipient_id);

drop policy if exists "Users can read their notifications" on public.notifications;
create policy "Users can read their notifications" on public.notifications for select using (auth.uid() = user_id);
drop policy if exists "Users can mark their notifications read" on public.notifications;
create policy "Users can mark their notifications read" on public.notifications for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Reports: members can submit and view their own reports; admins can review all reports.
drop policy if exists "Members can submit reports" on public.reports;
create policy "Members can submit reports" on public.reports for insert to authenticated
with check (auth.uid() = reporter_id);
drop policy if exists "Reporters and admins can view reports" on public.reports;
create policy "Reporters and admins can view reports" on public.reports for select to authenticated
using (auth.uid() = reporter_id or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));
drop policy if exists "Admins can update reports" on public.reports;
create policy "Admins can update reports" on public.reports for update to authenticated
using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

-- Admin moderation can remove any reported post. Normal members retain owner-only deletion.
drop policy if exists "Admins can moderate posts" on public.posts;
create policy "Admins can moderate posts" on public.posts for delete to authenticated
using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

-- Storage buckets used by the app. Post media and avatars are publicly viewable;
-- only authenticated owners can upload, update, or delete files in their own folder.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('post-media', 'post-media', true, 104857600, array['image/jpeg','image/png','image/webp','image/gif','video/mp4','video/webm','video/quicktime'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 10485760, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Public can view post media" on storage.objects;
create policy "Public can view post media" on storage.objects for select using (bucket_id in ('post-media', 'avatars'));
drop policy if exists "Users can upload their own media" on storage.objects;
create policy "Users can upload their own media" on storage.objects for insert to authenticated with check (bucket_id in ('post-media', 'avatars') and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "Users can update their own media" on storage.objects;
create policy "Users can update their own media" on storage.objects for update to authenticated using (bucket_id in ('post-media', 'avatars') and (storage.foldername(name))[1] = auth.uid()::text) with check (bucket_id in ('post-media', 'avatars') and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "Users can delete their own media" on storage.objects;
create policy "Users can delete their own media" on storage.objects for delete to authenticated using (bucket_id in ('post-media', 'avatars') and (storage.foldername(name))[1] = auth.uid()::text);

-- Done. Auth trigger, RLS, notification triggers, and media buckets are configured.

-- Enable realtime change events for the app when the Supabase realtime publication exists.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'posts') then
      execute 'alter publication supabase_realtime add table public.posts';
    end if;
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'post_likes') then
      execute 'alter publication supabase_realtime add table public.post_likes';
    end if;
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'comments') then
      execute 'alter publication supabase_realtime add table public.comments';
    end if;
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'messages') then
      execute 'alter publication supabase_realtime add table public.messages';
    end if;
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'notifications') then
      execute 'alter publication supabase_realtime add table public.notifications';
    end if;
  end if;
end $$;
