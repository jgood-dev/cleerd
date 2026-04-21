'use client'

import { useState } from 'react'
import { ChevronLeft, ChevronRight, AlertTriangle } from 'lucide-react'
import { Button } from './button'

export type TimelineJob = {
  id: string
  scheduled_at: string
  duration_minutes: number | null
  team_id: string | null
  property_name: string
  status: string
}

function startOfWeek(date: Date) {
  const d = new Date(date)
  const day = d.getDay()
  d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day))
  d.setHours(0, 0, 0, 0)
  return d
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

function fmtDuration(mins: number) {
  const h = Math.floor(mins / 60)
  const m = mins % 60
  if (h === 0) return `${m}m`
  return m ? `${h}h ${m}m` : `${h}h`
}

function hasOverlap(jobs: TimelineJob[]) {
  for (let i = 0; i < jobs.length; i++) {
    for (let j = i + 1; j < jobs.length; j++) {
      const aStart = new Date(jobs[i].scheduled_at).getTime()
      const aEnd = aStart + (jobs[i].duration_minutes ?? 60) * 60000
      const bStart = new Date(jobs[j].scheduled_at).getTime()
      const bEnd = bStart + (jobs[j].duration_minutes ?? 60) * 60000
      if (aStart < bEnd && bStart < aEnd) return true
    }
  }
  return false
}

interface TeamTimelineProps {
  jobs: TimelineJob[]
  teams: { id: string; name: string }[]
}

export function TeamTimeline({ jobs, teams }: TeamTimelineProps) {
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()))

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart)
    d.setDate(d.getDate() + i)
    return d
  })

  const rows = [
    ...teams.map(t => ({ id: t.id as string | null, name: t.name })),
    { id: null as string | null, name: 'Unassigned' },
  ]

  function jobsForCell(teamId: string | null, day: Date) {
    const s = day.getTime()
    const e = s + 86400000
    return jobs
      .filter(j => {
        const t = new Date(j.scheduled_at).getTime()
        return t >= s && t < e && j.team_id === teamId
      })
      .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime())
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const prevWeek = () => { const d = new Date(weekStart); d.setDate(d.getDate() - 7); setWeekStart(d) }
  const nextWeek = () => { const d = new Date(weekStart); d.setDate(d.getDate() + 7); setWeekStart(d) }

  return (
    <div className="rounded-xl border border-white/10 bg-[#161b27] overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
        <span className="text-sm font-semibold text-gray-200">Team Availability</span>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-7 w-7 text-gray-400" onClick={prevWeek}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-xs text-gray-400 w-36 text-center">
            {weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            {' – '}
            {days[6].toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </span>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-gray-400" onClick={nextWeek}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" className="text-xs h-7 px-2 text-gray-500 hover:text-gray-300 ml-1"
            onClick={() => setWeekStart(startOfWeek(new Date()))}>
            Today
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[680px] text-xs border-collapse">
          <thead>
            <tr className="border-b border-white/10">
              <th className="w-24 px-3 py-2 text-left text-gray-500 font-medium">Team</th>
              {days.map(d => {
                const isToday = d.getTime() === today.getTime()
                return (
                  <th key={d.toISOString()} className={`px-2 py-2 text-center font-medium min-w-[90px] ${isToday ? 'text-blue-400' : 'text-gray-400'}`}>
                    <div>{d.toLocaleDateString('en-US', { weekday: 'short' })}</div>
                    <div className={`text-[11px] ${isToday ? 'text-blue-400' : 'text-gray-600'}`}>
                      {d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </div>
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIdx) => (
              <tr key={row.id ?? 'unassigned'} className={rowIdx < rows.length - 1 ? 'border-b border-white/5' : ''}>
                <td className="px-3 py-2 text-gray-400 font-medium align-top whitespace-nowrap">{row.name}</td>
                {days.map(d => {
                  const cellJobs = jobsForCell(row.id, d)
                  const overlap = hasOverlap(cellJobs)
                  const isToday = d.getTime() === today.getTime()
                  return (
                    <td key={d.toISOString()} className={`px-1.5 py-2 align-top ${isToday ? 'bg-blue-500/5' : ''}`}>
                      {overlap && (
                        <div className="flex items-center gap-1 text-yellow-400 mb-1">
                          <AlertTriangle className="h-3 w-3" />
                          <span>Overlap</span>
                        </div>
                      )}
                      <div className="space-y-1">
                        {cellJobs.length === 0
                          ? <div className="h-5" />
                          : cellJobs.map(job => {
                              const done = job.status === 'done'
                              return (
                                <div key={job.id}
                                  className={`rounded px-1.5 py-1 leading-tight ${done ? 'bg-white/5 text-gray-600' : 'bg-blue-500/20 text-blue-200'}`}>
                                  <div className="font-medium truncate max-w-[100px]">{job.property_name}</div>
                                  <div className="text-gray-400 mt-0.5">
                                    {fmtTime(job.scheduled_at)}
                                    {job.duration_minutes ? ` · ${fmtDuration(job.duration_minutes)}` : ''}
                                  </div>
                                </div>
                              )
                            })}
                      </div>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
