# RK Chat ko ek baar deploy karne ki Hindi guide

## Package mein kya hai?
- Complete React + TypeScript website source code
- Supabase ke liye full database SQL
- Login/signup, feed, profile, post, image/video upload, like, comment, bookmark, follow, messages, notifications
- Admin dashboard aur post-report moderation
- Netlify configuration aur GitHub manual build workflow
- Demo mode aur deployment guide

## Step 1: Supabase sirf ek baar setup karein
1. https://supabase.com par project banayein.
2. Project Settings → API se Project URL aur publishable/anon key copy karein.
3. SQL Editor mein `supabase/schema.sql` ki poori file paste karke Run karein.
4. Authentication → URL Configuration mein apna Netlify URL Redirect URLs mein add karein.

## Step 2: Apna admin account banayein
1. Website par apne email se signup karein.
2. Supabase → Authentication → Users mein apne user ka UUID copy karein.
3. `ADMIN-SETUP.sql` mein `YOUR_AUTH_USER_UUID` ko apne UUID se replace karke Supabase SQL Editor mein run karein.
4. Website se logout/login karein. Admin menu dikhne lagega.

## Step 3: GitHub mein project ek baar upload karein
1. ZIP extract karein.
2. GitHub par ek blank repository banayein.
3. ZIP ke andar ke saare folders/files repository ke root mein upload karein.
4. `.env.local` ya secret key upload na karein.

## Step 4: Netlify par pehla deploy
1. Netlify par GitHub repository import karein.
2. Build command: `npm run build`
3. Publish directory: `dist`
4. Netlify Environment Variables mein ye do values add karein:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
5. Pehla Production deploy karein.
6. Netlify ka live URL Supabase Auth URL Configuration mein add karein.

## Step 5: Extra deploy aur credits bachayein
Pehla deploy successful hone ke baad Netlify mein:
Project configuration → Developer settings → Continuous deployment → Build settings → **Stop builds**.

Ab GitHub repository backup ki tarah rahegi; har push par Netlify build nahi chalega. Website ke normal operations—jaise posts, likes, comments, messages, profiles aur admin report moderation—Supabase mein save honge. Inke liye GitHub code ya Netlify redeploy ki zarurat nahi.

**Dhyan dein:** Website ke software/code mein koi naya feature ya design badalna ho, tab naya build/deploy karna zaruri hoga. Deploy ki zarurat ko poori tarah zero nahi kiya ja sakta. Current Netlify credit docs ke hisab se production deploy 15 credits leta hai; web traffic aur bandwidth bhi credits use karte hain. Apne Netlify dashboard mein current usage check karein.

## Local run (optional)
Node.js 20+ install hone ke baad project folder mein:

```bash
npm install
npm run dev
```

Production build ke liye:

```bash
npm run build
```

Output `dist` folder mein banega.
