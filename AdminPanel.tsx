import { useCallback, useEffect, useState } from 'react'
import { AlertTriangle, Check, CheckCircle2, Clock3, LoaderCircle, RefreshCw, ShieldCheck, Trash2, Users, Image, Flag } from 'lucide-react'
import { supabase } from '../lib/supabase'

type ReportRow = {
  id: string
  target_kind: 'post' | 'profile'
  reason: string
  details: string | null
  status: 'open' | 'reviewed' | 'resolved' | 'dismissed'
  created_at: string
  post_id: string | null
  target_user_id: string | null
  reporter: { id: string; username: string; full_name: string; avatar_url: string } | null
  target: { id: string; username: string; full_name: string; avatar_url: string } | null
}

type Props = { userId: string; onToast: (message: string) => void }

function Stat({ icon: Icon, label, value }: { icon: typeof Users; label: string; value: number }) {
  return <div className="admin-stat"><span><Icon size={18} /></span><div><strong>{value.toLocaleString()}</strong><small>{label}</small></div></div>
}

export default function AdminPanel({ userId, onToast }: Props) {
  const [reports, setReports] = useState<ReportRow[]>([])
  const [stats, setStats] = useState({ users: 0, posts: 0, openReports: 0 })
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [filter, setFilter] = useState<'open' | 'all'>('open')
  const refresh = useCallback(async () => {
    if (!supabase) { setLoading(false); return }
    setLoading(true)
    const [reportRes, usersRes, postsRes, openRes] = await Promise.all([
      supabase.from('reports').select('id,target_kind,reason,details,status,created_at,post_id,target_user_id,reporter:profiles!reports_reporter_id_fkey(id,username,full_name,avatar_url),target:profiles!reports_target_user_id_fkey(id,username,full_name,avatar_url)').order('created_at', { ascending: false }).limit(100),
      supabase.from('profiles').select('id', { count: 'exact', head: true }),
      supabase.from('posts').select('id', { count: 'exact', head: true }),
      supabase.from('reports').select('id', { count: 'exact', head: true }).eq('status', 'open'),
    ])
    if (reportRes.error) onToast(reportRes.error.message)
    else setReports((reportRes.data || []) as unknown as ReportRow[])
    setStats({ users: usersRes.count || 0, posts: postsRes.count || 0, openReports: openRes.count || 0 })
    setLoading(false)
  }, [onToast])

  useEffect(() => { void refresh() }, [refresh, userId])

  async function setStatus(report: ReportRow, status: ReportRow['status']) {
    if (!supabase) return
    setBusyId(report.id)
    const { error } = await supabase.from('reports').update({ status }).eq('id', report.id)
    if (error) onToast(error.message)
    else { onToast(`Report ${status}.`); await refresh() }
    setBusyId(null)
  }

  async function removeReportedPost(report: ReportRow) {
    if (!supabase || !report.post_id) { onToast('This report has no linked post.'); return }
    if (!window.confirm('Permanently delete the reported post? This cannot be undone.')) return
    setBusyId(report.id)
    const { error } = await supabase.from('posts').delete().eq('id', report.post_id)
    if (error) onToast(error.message)
    else {
      const result = await supabase.from('reports').update({ status: 'resolved' }).eq('id', report.id)
      onToast(result.error ? result.error.message : 'Post deleted and report resolved.')
      await refresh()
    }
    setBusyId(null)
  }

  const displayed = filter === 'open' ? reports.filter((r) => r.status === 'open') : reports
  return <section className="admin-panel">
    <div className="page-heading"><div><span className="eyebrow">RK CHAT CONTROL ROOM</span><h1>Admin dashboard <ShieldCheck size={23} className="verified-icon" /></h1><p>Review community reports and keep the space welcoming.</p></div><button className="outline-btn" onClick={() => void refresh()} disabled={loading}><RefreshCw size={15} className={loading ? 'spin' : ''} /> Refresh</button></div>
    <div className="admin-stats"><Stat icon={Users} label="Registered members" value={stats.users} /><Stat icon={Image} label="Published posts" value={stats.posts} /><Stat icon={Flag} label="Open reports" value={stats.openReports} /></div>
    <div className="admin-list-card"><div className="admin-list-head"><div><h2>Community reports</h2><p>Reports submitted by signed-in members.</p></div><div className="admin-filter"><button className={filter === 'open' ? 'selected' : ''} onClick={() => setFilter('open')}>Open</button><button className={filter === 'all' ? 'selected' : ''} onClick={() => setFilter('all')}>All</button></div></div>
      {loading ? <div className="admin-loading"><LoaderCircle className="spin" /> Loading reports…</div> : displayed.length === 0 ? <div className="admin-empty"><CheckCircle2 size={28} /><strong>{filter === 'open' ? 'No open reports' : 'No reports yet'}</strong><p>New community reports will appear here.</p></div> : <div className="admin-report-list">{displayed.map((report) => <article className="admin-report" key={report.id}>
        <div className="admin-report-icon"><AlertTriangle size={18} /></div>
        <div className="admin-report-main"><div className="admin-report-top"><strong>{report.target_kind === 'post' ? 'Post report' : 'Profile report'}</strong><span className={`report-status status-${report.status}`}>{report.status}</span></div>
          <p><b>Reason:</b> {report.reason}</p>{report.details && <p><b>Details:</b> {report.details}</p>}
          <small>Reported by {report.reporter?.full_name || 'A member'} · {new Date(report.created_at).toLocaleString()}</small>
          {report.target && <small>Target profile: @{report.target.username}</small>}
          <div className="admin-report-actions">{report.status === 'open' && <button className="outline-btn" disabled={busyId === report.id} onClick={() => void setStatus(report, 'reviewed')}><Clock3 size={14} /> Mark reviewed</button>}{report.status !== 'resolved' && report.status !== 'dismissed' && <button className="outline-btn" disabled={busyId === report.id} onClick={() => void setStatus(report, 'dismissed')}>Dismiss</button>}{report.target_kind === 'post' && report.post_id && <button className="danger-btn" disabled={busyId === report.id} onClick={() => void removeReportedPost(report)}>{busyId === report.id ? <LoaderCircle size={14} className="spin" /> : <Trash2 size={14} />} Delete post</button>}</div>
        </div>
      </article>)}</div>}
    </div>
    <p className="admin-footnote"><ShieldCheck size={14} /> Admin access is assigned manually in Supabase. Never expose a service-role key in website code.</p>
  </section>
}
