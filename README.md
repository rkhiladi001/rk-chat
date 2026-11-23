# RK Chat — Social Network Starter

RK Chat is a responsive social-media web application built with React, TypeScript, Vite, and Supabase. Netlify serves the static frontend; Supabase handles sign-in, database records, media storage, and realtime events. The project intentionally uses **no Netlify Functions, Edge Functions, Netlify Database, or server-side compute** for normal social features.

## Features in this package

- Email/password account creation, sign-in, and sign-out through Supabase Auth.
- Member profiles with username, display name, bio, and website.
- Home feed, Explore/search, trending-topic shortcuts, and suggested accounts.
- Text, image, and video posts (uploads go to Supabase Storage).
- Like/unlike, comments, bookmarks, and follow/unfollow.
- One-to-one text messages and realtime refresh for posts, likes, comments, messages, and notifications.
- Notifications for likes, comments, and new follows; mark all as read.
- Profile editing, settings, light/dark appearance, responsive desktop/mobile layouts.
- Admin dashboard for member/post counts and report moderation (review, dismiss, or remove a reported post).
- Supabase Row Level Security (RLS), profile-role protection, storage policies, and SPA routing.
- Demo/preview mode when Supabase credentials are not configured.

**Scope note:** this is a complete social MVP/starter, not a claim of a fully scaled production social network. The visible story/community navigation is currently a UI preview, not persistent Stories or group/community infrastructure. Production launch still requires your own moderation policy, privacy/terms pages, email/SMTP setup, backups, monitoring, and load/security testing.

---

## 1. One-time Supabase setup

1. Create a project at <https://supabase.com/>.
2. In **Project Settings → API**, copy the project URL and the publishable/anon key.
3. In **SQL Editor → New query**, paste the complete file `supabase/schema.sql` and run it once. It creates/updates the required tables, triggers, RLS policies, notification automation, report moderation, and `post-media` / `avatars` storage buckets.
4. In **Authentication → URL Configuration**, set the Site URL to your eventual Netlify URL and add your local URL if you plan to test locally. Also add the Netlify URL to Redirect URLs.
5. In **Authentication → Providers → Email**, review confirmation settings. For reliable production email, configure a custom SMTP provider.

### Create the first admin

1. Sign up through the RK Chat website using your own account.
2. In Supabase **Authentication → Users**, copy your account UUID.
3. Open `ADMIN-SETUP.sql`, replace `YOUR_AUTH_USER_UUID`, and run that query in Supabase SQL Editor.
4. Sign out and sign in again. The **Admin** navigation item will appear.

The public website never receives a service-role key. Admin role changes are blocked for ordinary signed-in users and must be done by the project owner in the Supabase SQL Editor.

---

## 2. Configure the website once

Copy `.env.example` to `.env.local` and fill in your Supabase details:

```env
VITE_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_PUBLISHABLE_OR_ANON_KEY
```

Do not use a Supabase `service_role` key here. The public publishable/anon key is designed for browser use when RLS is enabled.

To preview locally (Node.js 20+):

```bash
npm install
npm run dev
```

For a production build:

```bash
npm install
npm run build
```

The generated static website is in `dist/`.

---

## 3. Upload to GitHub once

1. Extract this ZIP on your computer.
2. Create one empty repository at <https://github.com/new>.
3. Upload the extracted **project files and folders** to the repository root (not the ZIP file itself). Keep `.env.local` out of GitHub.
4. Commit/push the files once. No repeated uploads are required for normal website use.

The optional GitHub build-check workflow is manual-only (`workflow_dispatch`); it does not run on each push.

---

## 4. First and only routine Netlify deployment

1. Open <https://app.netlify.com/> → **Add new project → Import an existing project**.
2. Choose GitHub and select your RK Chat repository.
3. Confirm these settings (they are already in `netlify.toml`):
   - Build command: `npm run build`
   - Publish directory: `dist`
   - Node version: `22`
4. In Netlify **Project configuration → Environment variables**, add:
   - `VITE_SUPABASE_URL` = your Supabase project URL
   - `VITE_SUPABASE_ANON_KEY` = your Supabase publishable/anon key
5. Deploy the site once. Add the resulting `https://YOUR-SITE.netlify.app` URL to Supabase Auth redirect URLs and set it as the Site URL.

### Stop automatic redeploys after the first successful deploy

To avoid deployments for every later Git push:

1. Open the Netlify project.
2. Go to **Project configuration → Developer settings → Continuous deployment → Build settings**.
3. Choose **Stop builds**.

Your current live website remains available. GitHub remains your source-code backup. Because RK Chat posts, profiles, likes, comments, follows, messages, notifications, and reports live in Supabase, users and admins can use those features without changing GitHub or deploying the frontend again.

**Important:** if you later change the actual website code or add a new software feature, you must build and deploy that new version. Re-enable Netlify builds or perform a manual deploy for that one code release. No platform can publish changed frontend code without a deployment.

---

## 5. Netlify credit-saving design

- Static Vite frontend only; no Netlify Functions or Edge Functions are used.
- Supabase is the backend for authentication, database, storage, and realtime.
- Netlify is used only to deliver the website's static files.
- Long-lived immutable caching is set for generated `/assets/*`; the HTML shell is revalidated so users receive the latest app after a future deployment.
- The included GitHub build-check workflow is manual-only.
- Stop Netlify continuous builds after the initial deployment to prevent accidental production deploys from every Git push.

Netlify's current credit-based billing documentation lists **15 credits per production deploy**, **20 credits per GB of bandwidth**, and **2 credits per 10,000 web requests**. Traffic and asset downloads can therefore still use credits; no website can guarantee zero Netlify usage. Check your account's current plan/usage dashboard because plan allowances and prices can change.

For media-heavy use, keep large video files in Supabase Storage or another dedicated media service rather than committing them to GitHub or serving them from the Netlify repository. Supabase storage/bandwidth limits are separate from Netlify's.

---

## 6. Database and security notes

Tables include `profiles`, `posts`, `post_likes`, `comments`, `bookmarks`, `follows`, `messages`, `notifications`, and `reports`.

- RLS is enabled for application tables.
- Private messages are readable only by their sender or recipient.
- Members can only create content as their authenticated user ID.
- Reports are visible to their reporter and admins; only admins can update report status.
- Admins can delete reported posts. Role changes are protected by a database trigger.
- The post-media bucket is public for feed rendering; uploads are restricted to the signed-in user's own folder. Do not upload confidential/private files to it.
- Never expose `service_role` credentials in the frontend, GitHub, or Netlify public environment variables.

Before a public commercial launch, add independent penetration/security review, account deletion/export workflows, block/report enhancements, abuse/rate-limit controls, spam protection, privacy notice, terms, and backups.

---

## Project layout

```text
rkchat-social/
├── .github/workflows/netlify.yml  # manual-only build check
├── src/
│   ├── components/AdminPanel.tsx  # report moderation dashboard
│   ├── lib/supabase.ts
│   ├── App.tsx
│   ├── main.tsx
│   └── styles.css
├── supabase/schema.sql            # full one-time database setup
├── ADMIN-SETUP.sql                # promote first owner account
├── .env.example
├── netlify.toml
├── package.json
└── README.md
```
