'use client'
import { useState, useEffect } from 'react'
import AdminShell from '@/components/layout/AdminShell'
import { supabase } from '@/lib/supabase'

function BarChart({ data, valueKey, labelKey, color = 'var(--primary-mid)', height = 140 }) {
  if (!data?.length) return <p className="text-xs py-8 text-center" style={{ color: '#9ca3af' }}>No data yet.</p>
  const max = Math.max(...data.map(d => d[valueKey]), 1)
  const barH = height - 42

  return (
    <div className="flex items-end gap-2" style={{ height }}>
      {data.map((d, i) => {
        const h = Math.max((d[valueKey] / max) * barH, 2)
        return (
          <div key={i} className="flex flex-col items-center gap-1 flex-1 min-w-0 group">
            <span className="text-xs font-semibold opacity-0 group-hover:opacity-100 transition"
              style={{ color, fontSize: 10 }}>
              {d[valueKey] > 9999 ? `${(d[valueKey]/1000).toFixed(1)}k` : d[valueKey].toLocaleString()}
            </span>
            <div className="w-full rounded-t transition-all duration-500 relative"
              style={{ height: h, backgroundColor: color, opacity: 0.75 + (i / (data.length - 1)) * 0.25 }}>
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 rounded text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition pointer-events-none"
                style={{ backgroundColor: 'var(--primary)', color: 'var(--sidebar-text)', fontSize: 10 }}>
                {d[valueKey].toLocaleString()}
              </div>
            </div>
            <span className="text-xs truncate w-full text-center" style={{ color: '#9ca3af', fontSize: 10 }}>
              {d[labelKey]}
            </span>
          </div>
        )
      })}
    </div>
  )
}

function KpiCard({ label, value, sub, delta }) {
  const up = (delta ?? 0) >= 0
  return (
    <div className="rounded-xl p-4" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
      <div className="text-xs font-medium uppercase tracking-wide mb-2" style={{ color: '#9ca3af' }}>{label}</div>
      <div className="font-serif text-2xl font-bold mb-1" style={{ color: 'var(--primary)' }}>{value}</div>
      <div className="flex items-center gap-2">
        {delta !== undefined && delta !== null && (
          <span className="text-xs px-1.5 py-0.5 rounded font-medium"
            style={{ backgroundColor: up ? 'var(--green-bg)' : 'var(--red-bg)', color: up ? 'var(--green-text)' : 'var(--red-text)' }}>
            {up ? '↑' : '↓'} {Math.abs(delta)}% MoM
          </span>
        )}
        {sub && <span className="text-xs" style={{ color: '#9ca3af' }}>{sub}</span>}
      </div>
    </div>
  )
}

function monthKey(iso) {
  const d = new Date(iso)
  return `${d.toLocaleString('en', { month: 'short' })}'${String(d.getFullYear()).slice(2)}`
}

function lastNMonths(n) {
  const out = []
  const now = new Date()
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    out.push(`${d.toLocaleString('en', { month: 'short' })}'${String(d.getFullYear()).slice(2)}`)
  }
  return out
}

export default function AnalyticsPage() {
  const [range, setRange] = useState('6m')
  const [data, setData]   = useState(null)

  useEffect(() => {
    async function load() {
      const cutoff = new Date()
      if (range === '6m')  cutoff.setMonth(cutoff.getMonth() - 6)
      if (range === '12m') cutoff.setMonth(cutoff.getMonth() - 12)
      const cutStr = range === 'all' ? '2020-01-01' : cutoff.toISOString()

      const [
        { data: purchases },
        { data: profiles },
        { data: lessonAgg },
        { data: completedBookings },
        { count: totalStudents },
        { count: purchaserCount },
      ] = await Promise.all([
        supabase.from('lesson_purchases').select('amount_paid, purchased_at').gte('purchased_at', cutStr),
        supabase.from('profiles').select('created_at, role').gte('created_at', cutStr),
        supabase.from('lessons').select('subject, purchase_count').eq('status', 'active'),
        supabase.from('bookings').select('amount, scheduled_at').eq('status', 'completed').gte('scheduled_at', cutStr),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'student'),
        supabase.from('lesson_purchases').select('student_id', { count: 'exact', head: true }),
      ])

      const monthCount = range === '12m' ? 12 : range === 'all' ? 24 : 6
      const months = lastNMonths(monthCount)

      const revMap = {}; const sessMap = {}
      ;(purchases ?? []).forEach(p => {
        const k = monthKey(p.purchased_at)
        revMap[k] = (revMap[k] ?? 0) + (p.amount_paid ?? 0)
      })
      ;(completedBookings ?? []).forEach(b => {
        const k = monthKey(b.scheduled_at)
        sessMap[k] = (sessMap[k] ?? 0) + (b.amount ?? 0)
      })
      const revenueByMonth = months.map(m => ({ month: m, value: (revMap[m] ?? 0) + (sessMap[m] ?? 0) }))

      const signupMap = {}
      ;(profiles ?? []).forEach(p => {
        const k = monthKey(p.created_at)
        signupMap[k] = (signupMap[k] ?? 0) + 1
      })
      const signupByMonth = months.map(m => ({ month: m, value: signupMap[m] ?? 0 }))

      const subjMap = {}
      ;(lessonAgg ?? []).forEach(l => { subjMap[l.subject] = (subjMap[l.subject] ?? 0) + (l.purchase_count ?? 0) })
      const topSubjects = Object.entries(subjMap).sort((a, b) => b[1] - a[1]).slice(0, 8)
        .map(([subject, value]) => ({ subject: subject.split(' ')[0], value }))

      const totalRevenue = (purchases ?? []).reduce((s, p) => s + (p.amount_paid ?? 0), 0)
        + (completedBookings ?? []).reduce((s, b) => s + (b.amount ?? 0), 0)
      const conversion = totalStudents ? Math.round(((purchaserCount ?? 0) / totalStudents) * 100) : 0

      // FIX: use last two entries rather than hardcoded indices [5]/[4],
      // so MoM delta is correct for all range selections (6m, 12m, all-time)
      const last  = revenueByMonth[revenueByMonth.length - 1]?.value ?? 0
      const prev  = revenueByMonth[revenueByMonth.length - 2]?.value ?? 0
      const delta = prev > 0 ? Math.round(((last - prev) / prev) * 100) : null

      setData({ revenueByMonth, signupByMonth, topSubjects, totalRevenue, conversion, delta })
    }
    load()
  }, [range])

  // Revenue split removed — only show total revenue and student conversion
  const kpis = data ? [
    { label: 'Total revenue',      value: `K${data.totalRevenue.toLocaleString()}`, sub: 'lesson sales + completed sessions', delta: data.delta },
    { label: 'Student conversion', value: `${data.conversion}%`, sub: 'students who made a purchase' },
  ] : []

  return (
    <AdminShell>
      <div className="p-6 space-y-6">

        <div className="flex justify-end">
          <div className="flex rounded-xl p-1 gap-1" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
            {[{ v: '6m', l: '6 months' }, { v: '12m', l: '12 months' }, { v: 'all', l: 'All time' }].map(r => (
              <button key={r.v} onClick={() => setRange(r.v)}
                className="text-xs px-3 py-1.5 rounded-lg transition"
                style={range === r.v
                  ? { backgroundColor: 'var(--primary)', color: 'var(--sidebar-text)' }
                  : { color: '#6b7280' }}>
                {r.l}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {data ? kpis.map(k => <KpiCard key={k.label} {...k} />)
            : [1,2].map(i => <div key={i} className="h-24 rounded-xl animate-pulse" style={{ backgroundColor: 'var(--surface)' }} />)}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="rounded-xl p-5" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
            <h2 className="font-serif text-base mb-0.5" style={{ color: 'var(--primary)' }}>Revenue by month</h2>
            <p className="text-xs mb-5" style={{ color: '#9ca3af' }}>Lesson sales + completed sessions (ZMW)</p>
            {data ? <BarChart data={data.revenueByMonth} valueKey="value" labelKey="month" color="var(--primary-mid)" />
              : <div className="h-36 rounded animate-pulse" style={{ backgroundColor: 'var(--bg)' }} />}
          </div>
          <div className="rounded-xl p-5" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
            <h2 className="font-serif text-base mb-0.5" style={{ color: 'var(--primary)' }}>New signups by month</h2>
            <p className="text-xs mb-5" style={{ color: '#9ca3af' }}>Students and tutors registered</p>
            {data ? <BarChart data={data.signupByMonth} valueKey="value" labelKey="month" color="var(--accent-mid)" />
              : <div className="h-36 rounded animate-pulse" style={{ backgroundColor: 'var(--bg)' }} />}
          </div>
        </div>

        <div className="rounded-xl p-5" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
          <h2 className="font-serif text-base mb-0.5" style={{ color: 'var(--primary)' }}>Top subjects by purchases</h2>
          <p className="text-xs mb-5" style={{ color: '#9ca3af' }}>Total lesson purchases per subject</p>
          {data ? (
            <BarChart data={data.topSubjects} valueKey="value" labelKey="subject" color="var(--primary-lit)" height={160} />
          ) : <div className="h-40 rounded animate-pulse" style={{ backgroundColor: 'var(--bg)' }} />}
        </div>
      </div>
    </AdminShell>
  )
}
