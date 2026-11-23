-- 1) Create your account through the RK Chat website first.
-- 2) In Supabase Dashboard > Authentication > Users, copy that account's UUID.
-- 3) Replace YOUR_AUTH_USER_UUID below and run this query in SQL Editor.
-- This is intentionally a manual owner action; users cannot grant themselves admin.

update public.profiles
set role = 'admin'
where id = 'YOUR_AUTH_USER_UUID';

-- Verify the change:
select id, username, full_name, role
from public.profiles
where id = 'YOUR_AUTH_USER_UUID';
