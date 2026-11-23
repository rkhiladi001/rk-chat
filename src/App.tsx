import { useEffect, useMemo, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import {
  Bell, Bookmark, Check, ChevronDown, ChevronRight, Compass, Ellipsis, Film,
  Hash, Heart, Home, ImagePlus, LogOut, MessageCircle, MessageSquare, MoreHorizontal,
  Pencil, Plus, Search, Send, Settings, Share2, Smile, Sparkles, UserRound, Users,
  X, Camera, Link as LinkIcon, Menu, Image as ImageIcon, Video, AtSign, LockKeyhole,
  BadgeCheck, TrendingUp, Sun, Moon, UploadCloud, ArrowRight, LoaderCircle, ShieldCheck,
} from 'lucide-react'
import { isSupabaseConfigured, supabase } from './lib/supabase'
import AdminPanel from './components/AdminPanel'

type Profile = {
  id: string
  username: string
  full_name: string
  avatar_url: string
  bio?: string
  website?: string
  role?: 'user' | 'admin'
}
type Comment = { id: string; body: string; created_at: string; profile: Profile }
type Post = {
  id: string
  user_id: string
  content: string
  media_url?: string | null
  media_type?: string | null
  created_at: string
  profile: Profile
  likes_count: number
  comments_count: number
  liked: boolean
  bookmarked: boolean
  comments?: Comment[]
}
type MessageItem = { id: string; sender_id: string; recipient_id: string; body: string; created_at: string }
type Notice = { id: string; kind: 'like' | 'comment' | 'follow'; body: string; is_read: boolean; created_at: string; actor: Profile | null }
type View = 'Home' | 'Explore' | 'Messages' | 'Notifications' | 'Bookmarks' | 'Profile' | 'Settings' | 'Admin'

const DEMO_USER: Profile = {
  id: 'demo-user', username: 'alexrivera', full_name: 'Alex Rivera',
  avatar_url: 'https://i.pravatar.cc/120?img=12',
  bio: 'Collecting little moments. Sharing big ideas. ✨', website: 'alexrivera.design',
}
const PEOPLE: Profile[] = [
  { id: 'p1', username: 'maya.j', full_name: 'Maya Johnson', avatar_url: 'https://i.pravatar.cc/120?img=47', bio: 'Creative soul • coffee first ☕' },
  { id: 'p2', username: 'noah.carter', full_name: 'Noah Carter', avatar_url: 'https://i.pravatar.cc/120?img=11', bio: 'Finding new trails and new stories.' },
  { id: 'p3', username: 'sofia.lee', full_name: 'Sofia Lee', avatar_url: 'https://i.pravatar.cc/120?img=44', bio: 'Design, art & slow mornings.' },
  { id: 'p4', username: 'theo.m', full_name: 'Theo Martin', avatar_url: 'https://i.pravatar.cc/120?img=13', bio: 'Music is my love language.' },
  { id: 'p5', username: 'amara.k', full_name: 'Amara Khan', avatar_url: 'https://i.pravatar.cc/120?img=49', bio: 'Photographer & weekend explorer.' },
]
const seedPosts: Post[] = [
  {
    id: 'post-1', user_id: 'p1', content: 'A little reminder to slow down and notice the good stuff. Sunday light, fresh flowers, and absolutely nowhere to be. 🌼',
    media_url: 'https://images.unsplash.com/photo-1490750967868-88aa4486c946?auto=format&fit=crop&w=1200&q=85', media_type: 'image',
    created_at: new Date(Date.now() - 1000 * 60 * 18).toISOString(), profile: PEOPLE[0], likes_count: 128, comments_count: 12, liked: false, bookmarked: false,
    comments: [{ id: 'c1', body: 'This is the energy I need today 🌷', created_at: new Date().toISOString(), profile: PEOPLE[2] }],
  },
  {
    id: 'post-2', user_id: 'p2', content: 'Weekend escape unlocked. The best views really do come after the hardest climbs. 🏔️',
    media_url: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1200&q=85', media_type: 'image',
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), profile: PEOPLE[1], likes_count: 86, comments_count: 8, liked: true, bookmarked: false,
    comments: [{ id: 'c2', body: 'Adding this trail to my list!', created_at: new Date().toISOString(), profile: PEOPLE[4] }],
  },
  {
    id: 'post-3', user_id: 'p3', content: 'A few frames from a project I have been quietly working on. Playing with warm tones and imperfect shapes. What do you think?',
    media_url: 'https://images.unsplash.com/photo-1494438639946-1ebd1d20bf85?auto=format&fit=crop&w=1200&q=85', media_type: 'image',
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(), profile: PEOPLE[2], likes_count: 214, comments_count: 24, liked: false, bookmarked: true,
    comments: [{ id: 'c3', body: 'The palette is everything!', created_at: new Date().toISOString(), profile: PEOPLE[0] }],
  },
]
const seedMessages: MessageItem[] = [
  { id: 'm1', sender_id: 'p1', recipient_id: DEMO_USER.id, body: 'Hey! Loved your latest post 🌼', created_at: new Date(Date.now() - 1000 * 60 * 55).toISOString() },
  { id: 'm2', sender_id: DEMO_USER.id, recipient_id: 'p1', body: 'Thank you! Hope you are having a good week.', created_at: new Date(Date.now() - 1000 * 60 * 48).toISOString() },
  { id: 'm3', sender_id: 'p4', recipient_id: DEMO_USER.id, body: 'Are you coming to the gig on Friday?', created_at: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString() },
]

function timeAgo(date: string) {
  const seconds = Math.max(1, Math.floor((Date.now() - new Date(date).getTime()) / 1000))
  if (seconds < 60) return `${seconds}s ago`
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  return `${Math.floor(seconds / 86400)}d ago`
}
function initials(name: string) { return name.split(' ').map((x) => x[0]).slice(0, 2).join('').toUpperCase() }
function Avatar({ profile, size = 'md', ring = false }: { profile: Profile; size?: 'xs' | 'sm' | 'md' | 'lg'; ring?: boolean }) {
  return <img className={`avatar avatar-${size} ${ring ? 'avatar-ring' : ''}`} src={profile.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.full_name)}&background=ece7ff&color=6941c6`} alt={profile.full_name} onError={(e) => { (e.currentTarget as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(initials(profile.full_name))}&background=ece7ff&color=6941c6` }} />
}

function AuthScreen({ onDemo, onAuth }: { onDemo: () => void; onAuth: (email: string, password: string, username: string, fullName: string, signUp: boolean) => Promise<void> }) {
  const [signUp, setSignUp] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [fullName, setFullName] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  async function submit(e: FormEvent) {
    e.preventDefault(); setBusy(true); setError('')
    try { await onAuth(email, password, username, fullName, signUp) }
    catch (err) { setError(err instanceof Error ? err.message : 'Unable to continue. Please check your details.') }
    finally { setBusy(false) }
  }
  return <div className="auth-page">
    <div className="auth-art">
      <div className="auth-art-brand"><img className="auth-logo" src="/rk-chat-logo.jpg" alt="RK Chat" /></div>
      <div className="art-copy"><span className="eyebrow">YOUR WORLD, A LITTLE CLOSER</span><h1>Find your people.<br /><em>Share your story.</em></h1><p>A space for the moments, ideas, and connections that make life feel a little more you.</p></div>
      <div className="floating-card float-one"><div className="float-avatars"><img src={PEOPLE[0].avatar_url} /><img src={PEOPLE[1].avatar_url} /><img src={PEOPLE[2].avatar_url} /></div><div><strong>Good people, good energy</strong><small>Your community is waiting</small></div><Heart size={18} fill="#ff7a9f" color="#ff7a9f" /></div>
      <div className="floating-card float-two"><span className="float-icon"><MessageCircle size={19} /></span><div><strong>Stay in the loop</strong><small>Conversations that matter</small></div></div>
      <div className="art-orb orb-one" /><div className="art-orb orb-two" />
    </div>
    <div className="auth-form-wrap">
      <div className="auth-mobile-brand"><img className="auth-logo-mobile" src="/rk-chat-logo.jpg" alt="RK Chat" /></div>
      <div className="auth-form-card">
        <div className="auth-heading"><span className="eyebrow">WELCOME TO RK CHAT</span><h2>{signUp ? 'Create your account' : 'Welcome back'}</h2><p>{signUp ? 'A few details and you are part of the community.' : 'Sign in to catch up with your people.'}</p></div>
        <form onSubmit={submit} className="auth-form">
          {signUp && <><label>Your name<input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Alex Rivera" required /></label><label>Username<input value={username} onChange={(e) => setUsername(e.target.value.replace(/\s/g, '').toLowerCase())} placeholder="alexrivera" required minLength={3} /></label></>}
          <label>Email address<div className="input-icon"><AtSign size={17} /><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required /></div></label>
          <label>Password<div className="input-icon"><LockKeyhole size={17} /><input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 6 characters" required minLength={6} /></div></label>
          {error && <div className="form-error">{error}</div>}
          <button className="primary-btn auth-submit" disabled={busy}>{busy ? <LoaderCircle size={18} className="spin" /> : null}{signUp ? 'Create account' : 'Sign in'} <ArrowRight size={17} /></button>
        </form>
        <div className="auth-switch">{signUp ? 'Already have an account?' : 'New around here?'} <button onClick={() => { setSignUp(!signUp); setError('') }}>{signUp ? 'Sign in' : 'Create an account'}</button></div>
        {!isSupabaseConfigured && <div className="demo-note"><div><Sparkles size={17} /><span><strong>Preview mode</strong><small>Explore with sample content. Connect Supabase for real accounts.</small></span></div><button onClick={onDemo}>Enter demo <ChevronRight size={15} /></button></div>}
      </div>
      <div className="auth-footer">By continuing, you agree to keep RK Chat kind and welcoming. <span>© 2026 RK Chat</span></div>
    </div>
  </div>
}

export default function App() {
  const [currentUser, setCurrentUser] = useState<Profile | null>(isSupabaseConfigured ? null : DEMO_USER)
  const [authLoading, setAuthLoading] = useState(isSupabaseConfigured)
  const [view, setView] = useState<View>('Home')
  const [posts, setPosts] = useState<Post[]>(seedPosts)
  const [people, setPeople] = useState<Profile[]>(PEOPLE)
  const [messages, setMessages] = useState<MessageItem[]>(seedMessages)
  const [notifications, setNotifications] = useState<Notice[]>([])
  const [followed, setFollowed] = useState<string[]>(['p1', 'p3'])
  const [query, setQuery] = useState('')
  const [composerOpen, setComposerOpen] = useState(false)
  const [postText, setPostText] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [filePreview, setFilePreview] = useState('')
  const [posting, setPosting] = useState(false)
  const [expandedComments, setExpandedComments] = useState<string | null>(null)
  const [commentText, setCommentText] = useState('')
  const [selectedChat, setSelectedChat] = useState<string>('p1')
  const [messageText, setMessageText] = useState('')
  const [mobileMenu, setMobileMenu] = useState(false)
  const [toast, setToast] = useState('')
  const [editingProfile, setEditingProfile] = useState(false)
  const [profileName, setProfileName] = useState('')
  const [profileBio, setProfileBio] = useState('')
  const [profileWebsite, setProfileWebsite] = useState('')
  const [darkMode, setDarkMode] = useState(false)

  useEffect(() => {
    if (!supabase) { setAuthLoading(false); return }
    let alive = true
    supabase.auth.getSession().then(async ({ data }) => {
      if (!alive) return
      if (data.session?.user) await hydrateUser(data.session.user.id, data.session.user.email || '')
      else { setCurrentUser(null); setAuthLoading(false) }
    })
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!alive) return
      if (session?.user) { void hydrateUser(session.user.id, session.user.email || '') }
      else { setCurrentUser(null); setAuthLoading(false) }
    })
    return () => { alive = false; listener.subscription.unsubscribe() }
  }, [])

  useEffect(() => {
    if (currentUser && supabase) { void loadRemoteFeed(); void loadRemotePeople(); void loadRemoteMessages(); void loadRemoteNotifications() }
  }, [currentUser?.id])

  useEffect(() => {
    if (!currentUser || !supabase) return
    const channel = supabase.channel(`rkchat-live-${currentUser.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'posts' }, () => { void loadRemoteFeed() })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'post_likes' }, () => { void loadRemoteFeed() })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'comments' }, () => { void loadRemoteFeed() })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
        const message = payload.new as MessageItem
        if (message.recipient_id === currentUser.id || message.sender_id === currentUser.id) void loadRemoteMessages()
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${currentUser.id}` }, () => { void loadRemoteNotifications() })
      .subscribe()
    return () => { void supabase.removeChannel(channel) }
  }, [currentUser?.id])

  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(''), 2600)
    return () => window.clearTimeout(timer)
  }, [toast])

  useEffect(() => {
    if (filePreview.startsWith('blob:')) return () => URL.revokeObjectURL(filePreview)
  }, [filePreview])

  async function hydrateUser(id: string, email: string) {
    if (!supabase) return
    const { data: row } = await supabase.from('profiles').select('*').eq('id', id).maybeSingle()
    let profile = row as Profile | null
    if (!profile) {
      const name = email.split('@')[0] || 'New member'
      const { data: created } = await supabase.from('profiles').upsert({ id, username: `${name.toLowerCase().replace(/[^a-z0-9_]/g, '')}_${id.slice(0, 4)}`, full_name: name, avatar_url: '' }).select().single()
      profile = created as Profile | null
    }
    setCurrentUser(profile || { ...DEMO_USER, id, username: email.split('@')[0] || 'member', full_name: email.split('@')[0] || 'Member' })
    setAuthLoading(false)
  }

  async function loadRemoteFeed() {
    if (!supabase || !currentUser) return
    const { data, error } = await supabase.from('posts').select('*, profiles(id, username, full_name, avatar_url, bio, website)').order('created_at', { ascending: false }).limit(50)
    if (error || !data) { setToast('Could not load posts. Check your Supabase tables.'); return }
    const ids = data.map((p: any) => p.id)
    const [likesRes, commentsRes, savesRes] = await Promise.all([
      supabase.from('post_likes').select('post_id,user_id').in('post_id', ids),
      supabase.from('comments').select('id,post_id,body,created_at,user_id,profiles(id,username,full_name,avatar_url)').in('post_id', ids).order('created_at', { ascending: true }),
      supabase.from('bookmarks').select('post_id').eq('user_id', currentUser.id).in('post_id', ids),
    ])
    const likes = likesRes.data || []; const comments = commentsRes.data || []; const saves = new Set((savesRes.data || []).map((x: any) => x.post_id))
    setPosts(data.map((p: any) => {
      const postComments = comments.filter((c: any) => c.post_id === p.id)
      return { ...p, profile: p.profiles || DEMO_USER, likes_count: likes.filter((l: any) => l.post_id === p.id).length, comments_count: postComments.length, liked: likes.some((l: any) => l.post_id === p.id && l.user_id === currentUser.id), bookmarked: saves.has(p.id), comments: postComments.map((c: any) => ({ id: c.id, body: c.body, created_at: c.created_at, profile: c.profiles || DEMO_USER })) }
    }))
  }
  async function loadRemotePeople() {
    if (!supabase || !currentUser) return
    const { data } = await supabase.from('profiles').select('id,username,full_name,avatar_url,bio,website').neq('id', currentUser.id).order('created_at', { ascending: false }).limit(30)
    if (data) {
      setPeople(data as Profile[])
      if (data.length) setSelectedChat((current) => data.some((person: any) => person.id === current) ? current : data[0].id)
    }
    const { data: f } = await supabase.from('follows').select('following_id').eq('follower_id', currentUser.id)
    if (f) setFollowed(f.map((x: any) => x.following_id))
  }
  async function loadRemoteMessages() {
    if (!supabase || !currentUser) return
    const { data } = await supabase.from('messages').select('*').or(`sender_id.eq.${currentUser.id},recipient_id.eq.${currentUser.id}`).order('created_at', { ascending: true }).limit(300)
    if (data) setMessages(data as MessageItem[])
  }
  async function loadRemoteNotifications() {
    if (!supabase || !currentUser) return
    const { data } = await supabase.from('notifications').select('id,kind,body,is_read,created_at,actor:profiles!notifications_actor_id_fkey(id,username,full_name,avatar_url,bio,website)').eq('user_id', currentUser.id).order('created_at', { ascending: false }).limit(50)
    if (data) setNotifications(data.map((n: any) => ({ ...n, actor: n.actor || null })) as Notice[])
  }
  async function markNotificationsRead() {
    if (supabase && currentUser) {
      const { error } = await supabase.from('notifications').update({ is_read: true }).eq('user_id', currentUser.id).eq('is_read', false)
      if (error) { setToast(error.message); return }
      setNotifications((all) => all.map((n) => ({ ...n, is_read: true })))
    }
    setToast('Notifications marked as read')
  }

  async function handleAuth(email: string, password: string, username: string, fullName: string, signUp: boolean) {
    if (!supabase) { setToast('Add your Supabase keys to enable account sign-in.'); return }
    if (signUp) {
      const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { username, full_name: fullName } } })
      if (error) throw error
      if (data.user && data.session) await hydrateUser(data.user.id, email)
      else setToast('Account created. Check your email to confirm, then sign in.')
    } else {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error
      if (data.user) await hydrateUser(data.user.id, email)
    }
  }
  function enterDemo() { setCurrentUser(DEMO_USER); setView('Home'); setToast('Welcome to your RK Chat demo!') }
  async function signOut() {
    if (supabase) await supabase.auth.signOut()
    else { setCurrentUser(null); setToast('You left the demo.') }
  }

  async function createPost(e: FormEvent) {
    e.preventDefault()
    if (!currentUser || (!postText.trim() && !selectedFile)) return
    setPosting(true)
    try {
      let mediaUrl: string | null = null
      let mediaType: string | null = null
      if (selectedFile) {
        mediaType = selectedFile.type.startsWith('video/') ? 'video' : 'image'
        if (supabase) {
          const path = `${currentUser.id}/${Date.now()}-${selectedFile.name.replace(/[^a-zA-Z0-9._-]/g, '-')}`
          const { error } = await supabase.storage.from('post-media').upload(path, selectedFile, { upsert: false })
          if (error) throw error
          mediaUrl = supabase.storage.from('post-media').getPublicUrl(path).data.publicUrl
        } else mediaUrl = filePreview
      }
      if (supabase) {
        const { error } = await supabase.from('posts').insert({ user_id: currentUser.id, content: postText.trim(), media_url: mediaUrl, media_type: mediaType })
        if (error) throw error
        await loadRemoteFeed()
      } else {
        const newPost: Post = { id: `local-${Date.now()}`, user_id: currentUser.id, content: postText.trim(), media_url: mediaUrl, media_type: mediaType, created_at: new Date().toISOString(), profile: currentUser, likes_count: 0, comments_count: 0, liked: false, bookmarked: false, comments: [] }
        setPosts((p) => [newPost, ...p])
      }
      setPostText(''); setSelectedFile(null); setFilePreview(''); setComposerOpen(false); setToast('Your post is live!')
    } catch (err) { setToast(err instanceof Error ? err.message : 'Could not publish your post.') }
    finally { setPosting(false) }
  }

  async function toggleLike(post: Post) {
    if (!currentUser) return
    const next = !post.liked
    setPosts((all) => all.map((p) => p.id === post.id ? { ...p, liked: next, likes_count: Math.max(0, p.likes_count + (next ? 1 : -1)) } : p))
    if (supabase) {
      const result = next
        ? await supabase.from('post_likes').insert({ post_id: post.id, user_id: currentUser.id })
        : await supabase.from('post_likes').delete().eq('post_id', post.id).eq('user_id', currentUser.id)
      if (result.error) { setToast('Like could not be saved.'); void loadRemoteFeed() }
    }
  }
  async function toggleBookmark(post: Post) {
    if (!currentUser) return
    const next = !post.bookmarked
    setPosts((all) => all.map((p) => p.id === post.id ? { ...p, bookmarked: next } : p))
    if (supabase) {
      const result = next
        ? await supabase.from('bookmarks').insert({ post_id: post.id, user_id: currentUser.id })
        : await supabase.from('bookmarks').delete().eq('post_id', post.id).eq('user_id', currentUser.id)
      if (result.error) { setToast('Bookmark could not be saved.'); void loadRemoteFeed() }
    }
    setToast(next ? 'Saved to your bookmarks' : 'Removed from bookmarks')
  }
  async function addComment(post: Post) {
    if (!currentUser || !commentText.trim()) return
    const body = commentText.trim()
    if (supabase) {
      const { error } = await supabase.from('comments').insert({ post_id: post.id, user_id: currentUser.id, body })
      if (error) { setToast(error.message); return }
      void loadRemoteFeed()
    } else {
      const comment: Comment = { id: `comment-${Date.now()}`, body, created_at: new Date().toISOString(), profile: currentUser }
      setPosts((all) => all.map((p) => p.id === post.id ? { ...p, comments: [...(p.comments || []), comment], comments_count: p.comments_count + 1 } : p))
    }
    setCommentText(''); setToast('Comment added')
  }
  async function toggleFollow(person: Profile) {
    if (!currentUser) return
    const next = !followed.includes(person.id)
    setFollowed((f) => next ? [...f, person.id] : f.filter((id) => id !== person.id))
    if (supabase) {
      const result = next ? await supabase.from('follows').insert({ follower_id: currentUser.id, following_id: person.id }) : await supabase.from('follows').delete().eq('follower_id', currentUser.id).eq('following_id', person.id)
      if (result.error) { setToast(result.error.message); void loadRemotePeople(); return }
    }
    setToast(next ? `Following ${person.full_name}` : `Unfollowed ${person.full_name}`)
  }
  async function reportPost(post: Post) {
    if (!currentUser) return
    if (!supabase) { setToast('Demo mode: reports are saved after connecting Supabase.'); return }
    if (!window.confirm('Report this post to RK Chat moderators for review?')) return
    const { error } = await supabase.from('reports').insert({ reporter_id: currentUser.id, target_kind: 'post', post_id: post.id, target_user_id: post.user_id, reason: 'Community guideline concern' })
    setToast(error ? error.message : 'Report sent to moderators. Thank you.')
  }

  async function sendMessage(e: FormEvent) {
    e.preventDefault()
    if (!currentUser || !messageText.trim()) return
    const item: MessageItem = { id: `msg-${Date.now()}`, sender_id: currentUser.id, recipient_id: selectedChat, body: messageText.trim(), created_at: new Date().toISOString() }
    if (supabase) {
      const { error } = await supabase.from('messages').insert({ sender_id: currentUser.id, recipient_id: selectedChat, body: messageText.trim() })
      if (error) { setToast(error.message); return }
      await loadRemoteMessages()
    } else setMessages((all) => [...all, item])
    setMessageText('')
  }
  async function saveProfile(e: FormEvent) {
    e.preventDefault()
    if (!currentUser) return
    const updated = { ...currentUser, full_name: profileName.trim() || currentUser.full_name, bio: profileBio.trim(), website: profileWebsite.trim() }
    if (supabase) {
      const { error } = await supabase.from('profiles').update({ full_name: updated.full_name, bio: updated.bio, website: updated.website }).eq('id', currentUser.id)
      if (error) { setToast(error.message); return }
    }
    setCurrentUser(updated); setEditingProfile(false); setToast('Profile updated')
  }

  const visiblePosts = useMemo(() => {
    let list = view === 'Bookmarks' ? posts.filter((p) => p.bookmarked) : posts
    if (view === 'Profile' && currentUser) list = list.filter((p) => p.user_id === currentUser.id)
    if (query.trim() && (view === 'Explore' || view === 'Home')) {
      const q = query.toLowerCase()
      list = list.filter((p) => `${p.content} ${p.profile.full_name} ${p.profile.username}`.toLowerCase().includes(q))
    }
    return list
  }, [posts, view, currentUser, query])

  if (authLoading) return <div className="loading-screen"><span className="brand-mark"><Sparkles /></span><p>Getting RK Chat ready…</p></div>
  if (!currentUser) return <AuthScreen onDemo={enterDemo} onAuth={handleAuth} />

  const activePerson = people.find((p) => p.id === selectedChat) || PEOPLE[0]
  const chatMessages = messages.filter((m) => (m.sender_id === currentUser.id && m.recipient_id === selectedChat) || (m.sender_id === selectedChat && m.recipient_id === currentUser.id))
  const navItems: { name: View; icon: typeof Home }[] = [
    { name: 'Home', icon: Home }, { name: 'Explore', icon: Compass }, { name: 'Messages', icon: MessageCircle },
    { name: 'Notifications', icon: Bell }, { name: 'Bookmarks', icon: Bookmark }, { name: 'Profile', icon: UserRound },
    ...(currentUser.role === 'admin' ? [{ name: 'Admin' as View, icon: ShieldCheck }] : []),
  ]
  const startProfileEdit = () => { setProfileName(currentUser.full_name); setProfileBio(currentUser.bio || ''); setProfileWebsite(currentUser.website || ''); setEditingProfile(true) }

  return <div className={`app ${darkMode ? 'dark-mode' : ''}`}>
    <header className="topbar">
      <button className="mobile-menu-btn icon-btn" onClick={() => setMobileMenu(!mobileMenu)} aria-label="Open navigation"><Menu size={21} /></button>
      <button className="brand" onClick={() => setView('Home')} aria-label="RK Chat home"><img className="brand-logo" src="/rk-chat-logo.jpg" alt="RK Chat" /></button>
      <div className="top-search"><Search size={18} /><input value={query} onChange={(e) => { setQuery(e.target.value); if (e.target.value) setView('Explore') }} placeholder="Search people, posts, and tags..." /><kbd>⌘ K</kbd></div>
      <div className="top-actions"><button className="icon-btn notification-top" onClick={() => setView('Notifications')} aria-label="Notifications"><Bell size={20} /><i /></button><button className="top-create" onClick={() => setComposerOpen(true)}><Plus size={17} /> <span>Create post</span></button><button className="top-avatar-btn" onClick={() => setView('Profile')}><Avatar profile={currentUser} size="sm" /></button></div>
    </header>

    <div className="workspace">
      <aside className={`sidebar ${mobileMenu ? 'sidebar-open' : ''}`}>
        <div className="sidebar-profile"><Avatar profile={currentUser} size="lg" /><div><strong>{currentUser.full_name}</strong><span>@{currentUser.username}</span></div><button className="tiny-more" onClick={() => setView('Settings')}><ChevronDown size={16} /></button></div>
        <div className="nav-label">MENU</div>
        <nav className="main-nav">{navItems.map(({ name, icon: Icon }) => <button key={name} className={`nav-link ${view === name ? 'active' : ''}`} onClick={() => { setView(name); setMobileMenu(false) }}><Icon size={19} strokeWidth={view === name ? 2.4 : 1.9} /><span>{name}</span>{name === 'Notifications' && <i className="nav-dot" />}{name === 'Messages' && <small>2</small>}</button>)}</nav>
        <div className="sidebar-community"><div className="nav-label">YOUR COMMUNITIES</div><button className="community-link" onClick={() => { setQuery('design'); setView('Explore') }}><span className="community-icon peach"><Camera size={15} /></span><span>Creative minds</span><small>8</small></button><button className="community-link" onClick={() => { setQuery('wellness'); setView('Explore') }}><span className="community-icon mint"><TrendingUp size={15} /></span><span>Daily wellness</span><small>3</small></button><button className="community-link" onClick={() => { setQuery('movie'); setView('Explore') }}><span className="community-icon lilac"><Film size={15} /></span><span>Movie lovers</span><small>12</small></button><button className="discover-link" onClick={() => setView('Explore')}><Plus size={15} /> Discover communities</button></div>
        <div className="sidebar-bottom"><button className={`nav-link ${view === 'Settings' ? 'active' : ''}`} onClick={() => setView('Settings')}><Settings size={19} /><span>Settings</span></button><button className="nav-link" onClick={signOut}><LogOut size={19} /><span>{isSupabaseConfigured ? 'Sign out' : 'Exit demo'}</span></button><div className="sidebar-version"><span className="online-dot" /> All systems feeling social <small>v1.0.0</small></div></div>
      </aside>

      <main className="main-content">
        {view === 'Home' && <>
          <div className="page-heading"><div><span className="eyebrow">MONDAY, NOVEMBER 23</span><h1>Your feed <span className="heading-sparkle">✦</span></h1><p>Here is what your people have been up to.</p></div><button className="filter-btn"><Sparkles size={16} /> For you <ChevronDown size={15} /></button></div>
          <div className="stories-row"><div className="story add-story" onClick={() => setComposerOpen(true)}><div className="story-ring add-ring"><Avatar profile={currentUser} size="lg" /><span><Plus size={16} /></span></div><small>Your story</small></div>{people.slice(0, 5).map((p, i) => <div className="story" key={p.id} onClick={() => setToast(`Viewing ${p.full_name}'s story`)}><div className={`story-ring ring-${i}`}><Avatar profile={p} size="lg" /></div><small>{p.full_name.split(' ')[0]}</small></div>)}</div>
          <div className="quick-composer" onClick={() => setComposerOpen(true)}><Avatar profile={currentUser} size="md" /><button>Share something with your circle...</button><span className="quick-composer-icon"><ImageIcon size={18} /></span><button className="quick-share">Post</button></div>
          <div className="feed-list">{visiblePosts.length ? visiblePosts.map((post) => <PostCard key={post.id} post={post} currentUser={currentUser} onLike={toggleLike} onBookmark={toggleBookmark} onCommentOpen={() => setExpandedComments(expandedComments === post.id ? null : post.id)} expanded={expandedComments === post.id} commentText={commentText} setCommentText={setCommentText} onComment={() => void addComment(post)} onProfile={() => setToast(`@${post.profile.username}'s profile`)} onShare={() => { void navigator.clipboard?.writeText(window.location.href); setToast('Link copied to clipboard') }} onReport={reportPost} />) : <EmptyState title="Nothing here yet" body="Try another search or be the first to share a moment." action="Create a post" onAction={() => setComposerOpen(true)} />}</div>
        </>}

        {view === 'Explore' && <>
          <div className="page-heading"><div><span className="eyebrow">FRESH IDEAS & NEW CONNECTIONS</span><h1>Explore <span className="heading-sparkle">✦</span></h1><p>Find inspiration, creators, and conversations.</p></div><div className="explore-pill"><TrendingUp size={16} /> Trending today</div></div>
          <div className="explore-search"><Search size={18} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search posts, people, topics..." /></div>
          <div className="topic-chips">{['For you', 'Photography', 'Design', 'Travel', 'Wellness', 'Music', 'Food'].map((tag, i) => <button key={tag} className={i === 0 ? 'selected' : ''} onClick={() => setQuery(i === 0 ? '' : tag)}>{i > 0 && <Hash size={13} />}{tag}</button>)}</div>
          <div className="explore-grid">{visiblePosts.map((post) => <button className="explore-tile" key={post.id} onClick={() => { setView('Home'); setExpandedComments(post.id) }}>{post.media_url ? <img src={post.media_url} alt="Post" /> : <div className="tile-text">{post.content}</div>}<div className="tile-overlay"><span><Heart size={16} fill="white" /> {post.likes_count}</span><span><MessageCircle size={16} fill="white" /> {post.comments_count}</span></div></button>)}</div>
          <div className="section-title-row"><div><span className="eyebrow">PEOPLE TO KNOW</span><h2>Suggested for you</h2></div><button className="text-btn" onClick={() => setToast('You are all caught up!')}>See all <ArrowRight size={15} /></button></div>
          <div className="people-grid">{people.slice(0, 4).map((p) => <PersonCard key={p.id} person={p} following={followed.includes(p.id)} onFollow={() => void toggleFollow(p)} />)}</div>
        </>}

        {view === 'Messages' && <>
          <div className="page-heading messages-heading"><div><span className="eyebrow">YOUR PRIVATE SPACE</span><h1>Messages <span className="heading-sparkle">✦</span></h1><p>Good conversations make good days.</p></div><button className="round-soft" onClick={() => setToast('Start a new conversation by choosing a person below.')}><Pencil size={17} /></button></div>
          <div className="messages-panel"><div className="chat-list"><div className="chat-list-head"><strong>Inbox</strong><button className="icon-btn" onClick={() => setToast('Your inbox is up to date.')}><Ellipsis size={20} /></button></div><div className="chat-search"><Search size={16} /><input placeholder="Search messages" /></div>{people.map((p) => { const last = messages.filter((m) => m.sender_id === p.id || m.recipient_id === p.id).slice(-1)[0]; return <button className={`chat-person ${selectedChat === p.id ? 'selected' : ''}`} key={p.id} onClick={() => setSelectedChat(p.id)}><Avatar profile={p} size="md" /><span className="chat-person-copy"><strong>{p.full_name}</strong><small>{last?.body || 'Start a conversation'}</small></span><small className="chat-time">{last ? timeAgo(last.created_at) : ''}</small></button> })}{!people.length && <p className="muted-empty">No people to message yet.</p>}</div>
            <div className="chat-window"><div className="chat-header"><Avatar profile={activePerson} size="md" /><div><strong>{activePerson.full_name}</strong><small><i className="online-dot" /> Active in your circle</small></div><button className="icon-btn"><MoreHorizontal size={21} /></button></div><div className="chat-messages"><div className="chat-date">TODAY</div>{chatMessages.map((m) => <div key={m.id} className={`message-line ${m.sender_id === currentUser.id ? 'mine' : ''}`}>{m.sender_id !== currentUser.id && <Avatar profile={activePerson} size="xs" />}<div className="message-bubble">{m.body}<small>{new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</small></div></div>)}{!chatMessages.length && <div className="chat-empty"><span><MessageCircle size={24} /></span><strong>Say hello to {activePerson.full_name.split(' ')[0]}</strong><p>Your next great conversation starts here.</p></div>}</div><form className="chat-compose" onSubmit={sendMessage}><button type="button" className="icon-btn" onClick={() => setToast('File sharing can be added with a private storage bucket.')}><Plus size={19} /></button><input value={messageText} onChange={(e) => setMessageText(e.target.value)} placeholder="Write a message..." /><button type="button" className="icon-btn" onClick={() => setMessageText((m) => m + ' 😊')}><Smile size={19} /></button><button className="send-btn" disabled={!messageText.trim()}><Send size={17} /></button></form></div>
          </div>
        </>}

        {view === 'Notifications' && <>
          <div className="page-heading"><div><span className="eyebrow">LITTLE MOMENTS OF CONNECTION</span><h1>Notifications <span className="heading-sparkle">✦</span></h1><p>See what is happening around you.</p></div><button className="text-btn" onClick={() => void markNotificationsRead()}>Mark all as read</button></div>
          <div className="notification-card">{supabase ? (notifications.length ? notifications.map((n) => <NotificationRow key={n.id} avatar={n.actor || DEMO_USER} icon={n.kind === 'like' ? 'heart' : n.kind === 'comment' ? 'message' : 'user'} text={<><strong>{n.actor?.full_name || 'An RK Chat member'}</strong> {n.body}.</>} time={timeAgo(n.created_at)} />) : <div className="empty-state compact-empty"><span className="empty-icon"><Bell size={22} /></span><h3>You are all caught up</h3><p>New likes, comments, and follows will appear here.</p></div>) : <><div className="notification-section-label">TODAY</div><NotificationRow avatar={PEOPLE[0]} icon="heart" text={<><strong>Maya Johnson</strong> and <strong>12 others</strong> liked your photo.</>} time="18 min ago" /><NotificationRow avatar={PEOPLE[2]} icon="message" text={<><strong>Sofia Lee</strong> commented: “The palette is everything!”</>} time="1 hour ago" /><NotificationRow avatar={PEOPLE[1]} icon="user" text={<><strong>Noah Carter</strong> started following you.</>} time="3 hours ago" /><div className="notification-section-label older">YESTERDAY</div><NotificationRow avatar={PEOPLE[3]} icon="heart" text={<><strong>Theo Martin</strong> liked your post.</>} time="Yesterday" /><NotificationRow avatar={PEOPLE[4]} icon="message" text={<><strong>Amara Khan</strong> mentioned you in a comment.</>} time="Yesterday" /></>}</div>
        </>}

        {view === 'Bookmarks' && <>
          <div className="page-heading"><div><span className="eyebrow">A LITTLE COLLECTION OF YOUR FAVOURITES</span><h1>Saved posts <span className="heading-sparkle">✦</span></h1><p>All the things you want to come back to.</p></div></div>
          <div className="feed-list">{visiblePosts.length ? visiblePosts.map((post) => <PostCard key={post.id} post={post} currentUser={currentUser} onLike={toggleLike} onBookmark={toggleBookmark} onCommentOpen={() => setExpandedComments(expandedComments === post.id ? null : post.id)} expanded={expandedComments === post.id} commentText={commentText} setCommentText={setCommentText} onComment={() => void addComment(post)} onProfile={() => setView('Profile')} onShare={() => setToast('Link copied')} onReport={reportPost} />) : <EmptyState title="Your collection is waiting" body="Tap the bookmark on any post to save it here." action="Explore posts" onAction={() => setView('Explore')} />}</div>
        </>}

        {view === 'Profile' && <>
          <div className="profile-cover"><div className="cover-decoration cover-d1" /><div className="cover-decoration cover-d2" /><span className="cover-caption">A SPACE TO BE YOURSELF</span></div>
          <div className="profile-details"><Avatar profile={currentUser} size="xl" /><button className="outline-btn edit-profile-btn" onClick={startProfileEdit}><Pencil size={15} /> Edit profile</button><h1>{currentUser.full_name} <BadgeCheck size={19} className="verified-icon" /></h1><span className="profile-handle">@{currentUser.username}</span><p>{currentUser.bio || 'Still writing my story...'}</p>{currentUser.website && <a className="profile-website" href={currentUser.website.startsWith('http') ? currentUser.website : `https://${currentUser.website}`} target="_blank" rel="noreferrer"><LinkIcon size={15} /> {currentUser.website}</a>}<div className="profile-stats"><span><strong>{posts.filter((p) => p.user_id === currentUser.id).length}</strong> posts</span><span><strong>{followed.length}</strong> following</span><span><strong>128</strong> followers</span></div></div>
          <div className="profile-tabs"><button className="active"><ImageIcon size={16} /> Posts</button><button onClick={() => setView('Bookmarks')}><Bookmark size={16} /> Saved</button></div>
          <div className="feed-list">{visiblePosts.length ? visiblePosts.map((post) => <PostCard key={post.id} post={post} currentUser={currentUser} onLike={toggleLike} onBookmark={toggleBookmark} onCommentOpen={() => setExpandedComments(expandedComments === post.id ? null : post.id)} expanded={expandedComments === post.id} commentText={commentText} setCommentText={setCommentText} onComment={() => void addComment(post)} onProfile={() => setView('Profile')} onShare={() => setToast('Link copied')} onReport={reportPost} />) : <EmptyState title="Your story starts here" body="Share your first post and let your people in." action="Create your first post" onAction={() => setComposerOpen(true)} />}</div>
        </>}

        {view === 'Admin' && currentUser.role === 'admin' && <AdminPanel userId={currentUser.id} onToast={setToast} />}

        {view === 'Settings' && <>
          <div className="page-heading"><div><span className="eyebrow">MAKE RK CHAT FEEL LIKE YOURS</span><h1>Settings <span className="heading-sparkle">✦</span></h1><p>Manage your profile and preferences.</p></div></div>
          <div className="settings-layout"><div className="settings-menu"><button className="active"><UserRound size={18} /> Account</button><button onClick={() => setDarkMode(!darkMode)}><Sun size={18} /> Appearance <span className="settings-trailing">{darkMode ? 'Dark' : 'Light'}</span></button><button onClick={() => setToast('Notification preferences saved')}><Bell size={18} /> Notifications</button><button onClick={() => setToast('Privacy settings are controlled by your Supabase policies.')}><LockKeyhole size={18} /> Privacy & security</button></div><div className="settings-card"><div className="settings-card-head"><h2>Account information</h2><p>Update the details people see on your profile.</p></div><div className="settings-avatar-row"><Avatar profile={currentUser} size="xl" /><div><strong>Your profile photo</strong><small>Avatar uploads can be enabled with the avatars storage bucket.</small></div><button className="outline-btn" onClick={() => setToast('Avatar upload is ready to wire to the avatars bucket.')}>Change</button></div><form className="settings-form" onSubmit={saveProfile}><label>Display name<input value={profileName || currentUser.full_name} onChange={(e) => setProfileName(e.target.value)} /></label><label>Username<input value={currentUser.username} disabled /></label><label>Bio<textarea rows={3} maxLength={160} value={profileBio} onChange={(e) => setProfileBio(e.target.value)} placeholder="A few words about you..." /></label><label>Website<input value={profileWebsite} onChange={(e) => setProfileWebsite(e.target.value)} placeholder="yourwebsite.com" /></label><button className="primary-btn">Save changes <Check size={16} /></button></form><div className="settings-divider" /><div className="settings-card-head"><h2>Connected services</h2><p>{isSupabaseConfigured ? 'Your Supabase project is connected.' : 'You are currently using local demo mode.'}</p></div><div className="connection-row"><span className="connection-icon"><Sparkles size={18} /></span><div><strong>{isSupabaseConfigured ? 'Supabase connected' : 'Supabase not configured'}</strong><small>{isSupabaseConfigured ? 'Authentication and database are enabled.' : 'Add your project URL and anon key to .env.local.'}</small></div><span className={`connection-status ${isSupabaseConfigured ? 'connected' : ''}`}>{isSupabaseConfigured ? 'Connected' : 'Demo mode'}</span></div><button className="signout-btn" onClick={signOut}><LogOut size={17} /> {isSupabaseConfigured ? 'Sign out of RK Chat' : 'Exit demo session'}</button></div></div>
        </>}
      </main>

      <aside className="rightbar">
        <div className="right-widget welcome-widget"><div className="welcome-blob" /><span className="eyebrow">YOUR DAILY DOSE</span><h3>Make today<br />a little more <em>social.</em></h3><p>Share a moment, cheer someone on, or discover something new.</p><button onClick={() => setComposerOpen(true)}>Share a moment <ArrowRight size={15} /></button></div>
        <div className="right-widget"><div className="widget-heading"><h3>People to follow</h3><button onClick={() => setView('Explore')}>See all</button></div>{people.slice(0, 3).map((p) => <div className="suggestion" key={p.id}><Avatar profile={p} size="sm" /><div className="suggestion-info"><strong>{p.full_name}</strong><small>@{p.username}</small></div><button className={`follow-mini ${followed.includes(p.id) ? 'following' : ''}`} onClick={() => void toggleFollow(p)}>{followed.includes(p.id) ? <Check size={15} /> : <Plus size={15} />}</button></div>)}</div>
        <div className="right-widget trending-widget"><div className="widget-heading"><h3>Trending topics</h3><TrendingUp size={17} color="#8c70e8" /></div>{[['#SlowLiving','2.4k posts'],['#CreativeCorner','1.8k posts'],['#WeekendWanders','986 posts'],['#MindfulMoments','764 posts']].map(([tag, count]) => <button className="trend-row" key={tag} onClick={() => { setQuery(tag.replace('#', '')); setView('Explore') }}><span><strong>{tag}</strong><small>Community conversation</small></span><small>{count}</small></button>)}</div>
        <div className="right-footer"><a href="#about" onClick={(e) => { e.preventDefault(); setToast('RK Chat — a community-first social space.') }}>About</a><a href="#guidelines" onClick={(e) => { e.preventDefault(); setToast('Be kind. Be curious. Keep it welcoming.') }}>Guidelines</a><a href="#help" onClick={(e) => { e.preventDefault(); setToast('Help: see README.md for setup and support.') }}>Help</a><span>© 2026 RK Chat</span></div>
      </aside>
    </div>

    <nav className="mobile-bottom-nav">{[{ name: 'Home' as View, icon: Home }, { name: 'Explore' as View, icon: Compass }, { name: 'Messages' as View, icon: MessageCircle }, { name: 'Notifications' as View, icon: Bell }, { name: 'Profile' as View, icon: UserRound }].map(({ name, icon: Icon }) => <button key={name} className={view === name ? 'active' : ''} onClick={() => setView(name)}><Icon size={21} /><small>{name}</small></button>)}</nav>

    {composerOpen && <div className="modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) setComposerOpen(false) }}><form className="composer-modal" onSubmit={createPost}><div className="modal-head"><div><span className="eyebrow">YOUR CIRCLE IS LISTENING</span><h2>Create a post</h2></div><button type="button" className="icon-btn close-btn" onClick={() => setComposerOpen(false)}><X size={21} /></button></div><div className="composer-user"><Avatar profile={currentUser} size="md" /><div><strong>{currentUser.full_name}</strong><small><Users size={13} /> Share with everyone</small></div></div><textarea autoFocus value={postText} onChange={(e) => setPostText(e.target.value)} placeholder="What is happening in your world?" rows={5} /><div className="composer-attach">{filePreview ? <div className="upload-preview">{selectedFile?.type.startsWith('video/') ? <video src={filePreview} controls /> : <img src={filePreview} alt="Upload preview" />}<button type="button" onClick={() => { setSelectedFile(null); setFilePreview('') }}><X size={15} /></button></div> : <label className="attach-option"><ImagePlus size={19} /><span>Photo / video</span><input type="file" accept="image/*,video/*" onChange={(e) => { const f = e.target.files?.[0]; if (f) { setSelectedFile(f); setFilePreview(URL.createObjectURL(f)) } }} /></label>}<button type="button" className="attach-option" onClick={() => setPostText((t) => `${t}${t ? ' ' : ''}#goodvibes`)}><Hash size={18} /><span>Add a hashtag</span></button><span className="composer-privacy"><LockKeyhole size={14} /> Public</span></div><button className="primary-btn publish-btn" disabled={posting || (!postText.trim() && !selectedFile)}>{posting ? <LoaderCircle className="spin" size={18} /> : <Sparkles size={17} />}{posting ? 'Publishing...' : 'Publish post'} <ArrowRight size={16} /></button></form></div>}

    {editingProfile && <div className="modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) setEditingProfile(false) }}><form className="edit-modal" onSubmit={saveProfile}><div className="modal-head"><div><span className="eyebrow">YOUR PROFILE, YOUR STORY</span><h2>Edit profile</h2></div><button type="button" className="icon-btn" onClick={() => setEditingProfile(false)}><X size={20} /></button></div><div className="edit-avatar"><Avatar profile={currentUser} size="xl" /><button type="button" className="camera-badge" onClick={() => setToast('Avatar storage upload can be enabled in Supabase.')}><Camera size={15} /></button></div><label>Display name<input value={profileName} onChange={(e) => setProfileName(e.target.value)} /></label><label>Bio<textarea rows={3} maxLength={160} value={profileBio} onChange={(e) => setProfileBio(e.target.value)} /></label><label>Website<input value={profileWebsite} onChange={(e) => setProfileWebsite(e.target.value)} placeholder="yourwebsite.com" /></label><button className="primary-btn">Save profile <Check size={16} /></button></form></div>}
    {toast && <div className="toast"><span><Check size={16} /></span>{toast}</div>}
  </div>
}

function PostCard({ post, currentUser, onLike, onBookmark, onCommentOpen, expanded, commentText, setCommentText, onComment, onProfile, onShare, onReport }: {
  post: Post; currentUser: Profile; onLike: (p: Post) => void; onBookmark: (p: Post) => void; onCommentOpen: () => void; expanded: boolean; commentText: string; setCommentText: (v: string) => void; onComment: () => void; onProfile: () => void; onShare: () => void; onReport?: (p: Post) => void
}) {
  return <article className="post-card"><div className="post-header"><button className="post-author" onClick={onProfile}><Avatar profile={post.profile} size="md" /><span><strong>{post.profile.full_name} <BadgeCheck size={13} className="verified-icon" /></strong><small>@{post.profile.username} <i>·</i> {timeAgo(post.created_at)}</small></span></button><button className="icon-btn post-more" aria-label="Report post" title="Report post" onClick={() => onReport?.(post)}><MoreHorizontal size={21} /></button></div>{post.content && <p className="post-copy">{post.content}</p>}{post.media_url && <div className={`post-media ${post.media_type === 'video' ? 'post-video' : ''}`}>{post.media_type === 'video' ? <video src={post.media_url} controls /> : <img src={post.media_url} alt="Shared post" loading="lazy" />}</div>}<div className="post-meta"><span><span className="like-dot"><Heart size={10} fill="white" /></span> {post.likes_count.toLocaleString()} likes</span><span>{post.comments_count} comments <i>·</i> 3 shares</span></div><div className="post-actions"><button className={post.liked ? 'liked' : ''} onClick={() => onLike(post)}><Heart size={19} fill={post.liked ? 'currentColor' : 'none'} /> <span>Like</span></button><button onClick={onCommentOpen}><MessageCircle size={19} /> <span>Comment</span></button><button onClick={onShare}><Share2 size={18} /> <span>Share</span></button><button className={`save-action ${post.bookmarked ? 'saved' : ''}`} onClick={() => onBookmark(post)} aria-label="Save post"><Bookmark size={19} fill={post.bookmarked ? 'currentColor' : 'none'} /></button></div>{expanded && <div className="comments-panel">{(post.comments || []).map((c) => <div className="comment-row" key={c.id}><Avatar profile={c.profile} size="xs" /><div><strong>{c.profile.full_name}</strong><p>{c.body}</p><small>{timeAgo(c.created_at)} · Reply</small></div></div>)}<form className="comment-compose" onSubmit={(e) => { e.preventDefault(); onComment() }}><Avatar profile={currentUser} size="xs" /><input value={commentText} onChange={(e) => setCommentText(e.target.value)} placeholder="Write a comment..." /><button disabled={!commentText.trim()}><Send size={16} /></button></form></div>}</article>
}
function PersonCard({ person, following, onFollow }: { person: Profile; following: boolean; onFollow: () => void }) {
  return <div className="person-card"><Avatar profile={person} size="lg" /><strong>{person.full_name}</strong><small>@{person.username}</small><p>{person.bio || 'Sharing a little inspiration every day.'}</p><button className={following ? 'outline-btn' : 'primary-btn'} onClick={onFollow}>{following ? <><Check size={15} /> Following</> : <><Plus size={15} /> Follow</>}</button></div>
}
function NotificationRow({ avatar, icon, text, time }: { avatar: Profile; icon: 'heart' | 'message' | 'user'; text: ReactNode; time: string }) {
  return <div className="notification-row"><div className="notification-avatar"><Avatar profile={avatar} size="md" /><span className={`notification-icon ${icon}`}>{icon === 'heart' ? <Heart size={11} fill="white" /> : icon === 'message' ? <MessageSquare size={11} /> : <UserRound size={11} />}</span></div><div className="notification-copy"><p>{text}</p><small>{time}</small></div><span className="unread-indicator" /></div>
}
function EmptyState({ title, body, action, onAction }: { title: string; body: string; action: string; onAction: () => void }) {
  return <div className="empty-state"><span className="empty-icon"><Sparkles size={24} /></span><h3>{title}</h3><p>{body}</p><button className="primary-btn" onClick={onAction}>{action} <ArrowRight size={16} /></button></div>
}
