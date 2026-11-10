import { useEffect, useState } from 'react'
import { API_BASE, authFetch } from '../../api/client'
import ModuleIcon from './ModuleIcon'
import { displayNumber as num, validateAnalytics } from './instructorReviewData'
import './InstructorInsights.css'

function Panel({ title, note, children }) {
  return <section className="ii-panel"><header className="ii-panel-heading"><h3>{title}</h3>{note && <p>{note}</p>}</header>{children}</section>
}
export default function Analytics({ classId }) {
  const [stats,setStats] = useState(null)
  const [loading,setLoading] = useState(true)
  const [error,setError] = useState('')
  const [reload,setReload] = useState(0)
  const [updated,setUpdated] = useState(null)
  useEffect(()=>{
    const controller=new AbortController()
    let current=true
    async function load(){
      setLoading(true);setError('')
      try{
        const res=await authFetch(`${API_BASE}/api/instructor/classes/${classId}/analytics`,{signal:controller.signal})
        if(!res.ok) throw new Error('Unable to load analytics for this class.')
        const data=validateAnalytics(await res.json())
        if(current){setStats(data);setUpdated(new Date())}
      }catch(err){if(current)setError(err.message)}
      finally{if(current)setLoading(false)}
    }
    load()
    return()=>{current=false;controller.abort()}
  },[classId,reload])
  const maxActivity=Math.max(1,...(stats?.activity_heatmap || []).map(h=>h.submissions))
  return <section className="ii" aria-label="Class analytics">
    <header className="ii-heading"><div><h2>Class analytics</h2><p>A snapshot of your enrolled students’ activity and account XP.</p></div><button className="ir-secondary" disabled={loading} onClick={()=>setReload(n=>n+1)}><ModuleIcon name="chart" />{loading?'Loading…':'Refresh analytics'}</button></header>
    <p className="ii-disclosure">The current report includes these students’ submissions across all quests, not just quests in this class. XP and solved counts are account-wide. {updated && <>Last loaded {updated.toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}.</>}</p>
    {error && <div className="ii-error" role="alert"><p>{error} {stats && 'Previously loaded data remains below.'}</p><button className="ir-secondary" onClick={()=>setReload(n=>n+1)} disabled={loading}>Retry analytics</button></div>}
    {loading && <p role="status">{stats?'Refreshing analytics…':'Loading analytics…'}</p>}
    {stats && <>
      <dl className="ii-metrics">{[
        ['users','Enrolled students',num(stats.total_students),'In this class'],
        ['file','Submissions',num(stats.total_submissions),'Across enrolled students’ quests'],
        ['chart','Accepted submissions',stats.total_submissions ? `${num(stats.success_rate)}%`:'—',stats.total_submissions ? `${num(stats.accepted_submissions)} of ${num(stats.total_submissions)} accepted`:'No submissions to calculate a rate'],
        ['chart','Average account XP',num(stats.avg_xp),'Across enrolled students'],
      ].map(([icon,label,value,note])=><div key={label}><dt><ModuleIcon name={icon} />{label}</dt><dd>{value}</dd><p>{note}</p></div>)}</dl>
      <div className="ii-analytics-grid">
        <Panel title="Top performers" note="Enrolled students ranked by account XP; solved quests are account-wide.">
          {!stats.top_performers.length ? <p className="ii-empty">No enrolled students to rank yet.</p> : <ol className="ii-ranks">{stats.top_performers.map((s,i)=><li key={s.id}><span className="ii-rank">#{i+1}</span><div><strong>{s.full_name || s.username}</strong><small>Level {num(s.level)} · {num(s.solved)} {s.solved === 1 ? 'quest' : 'quests'} solved</small></div><b>{num(s.xp)} <small>XP</small></b></li>)}</ol>}
        </Panel>
        <Panel title="Most challenging quests" note="Lowest accepted-submission rates, with at least three recorded attempts per quest.">
          {!stats.challenging_problems.length ? <p className="ii-empty">Not enough submission data yet. Quests appear after at least three recorded attempts.</p> : <div className="ii-challenges">{stats.challenging_problems.map(p=><article key={p.problem_id}><div><h4>{p.title}</h4><span className={`ii-difficulty ${String(p.difficulty).toLowerCase()}`}>{p.difficulty}</span></div><p>{num(p.attempts)} recorded attempts · {num(p.success_rate)}% accepted</p><meter min="0" max="100" value={p.success_rate} aria-label={`${p.title} accepted submission percentage`}>{p.success_rate}%</meter></article>)}</div>}
        </Panel>
        <Panel title="Submission activity" note="Selected UTC hours, all time. Each row is one exact hour, not a four-hour interval; other hours are omitted by the current report.">
          {!stats.activity_heatmap.length ? <p className="ii-empty">No hourly activity is available yet.</p> : <div className="ii-hours">{stats.activity_heatmap.map(h=><div key={h.hour}><span>{h.hour}</span><div className="ii-bar" aria-hidden="true"><span style={{width:`${Math.max(0,Math.min(100,h.submissions/maxActivity*100))}%`}} /></div><strong>{num(h.submissions)}</strong><span className="sr-only">submissions</span></div>)}{stats.activity_heatmap.every(h=>h.submissions===0) && <p>No submissions at these displayed hours.</p>}</div>}
        </Panel>
        <Panel title="Needs attention" note="Enrolled students with no recorded submissions in the past 14 days, across all quests. This differs from the header’s below-100-XP indicator.">
          {stats.total_students===0 ? <p className="ii-empty">No students are enrolled in this class.</p> : !stats.at_risk_students.length ? <p className="ii-empty">Every enrolled student has a recorded submission within the past 14 days.</p> : <ul className="ii-attention">{stats.at_risk_students.map(s=><li key={s.id}><ModuleIcon name="warning" /><div><strong>{s.full_name||s.username}</strong><small>Level {num(s.level)} · {num(s.xp)} account XP</small></div><span>No recent submission</span></li>)}</ul>}
        </Panel>
      </div>
      <Panel title="Teaching insights" note="Rule-based summaries of the same report; these are not AI-generated judgments."><ul className="ii-insights">
        {stats.at_risk_students.length>0 && <li><ModuleIcon name="warning" /><div><strong>{stats.at_risk_students.length} students may need a check-in</strong><p>No recorded submissions in 14 days. Consider their enrollment dates and class schedule before following up.</p></div></li>}
        {stats.challenging_problems[0] && <li><ModuleIcon name="book" /><div><strong>Review “{stats.challenging_problems[0].title}”</strong><p>{num(stats.challenging_problems[0].success_rate)}% of recorded attempts were accepted. Consider clarifying instructions or offering a supporting lesson.</p></div></li>}
        {stats.top_performers[0] && stats.top_performers[0].xp>0 && <li><ModuleIcon name="users" /><div><strong>Highest account XP: {stats.top_performers[0].full_name||stats.top_performers[0].username}</strong><p>{num(stats.top_performers[0].xp)} account XP · {num(stats.top_performers[0].solved)} {stats.top_performers[0].solved === 1 ? 'quest' : 'quests'} solved across the application.</p></div></li>}
        {stats.total_submissions===0 && <li><ModuleIcon name="file" /><div><strong>No submissions to summarize yet</strong><p>Submission-based insights will appear when enrolled students submit their work.</p></div></li>}
      </ul></Panel>
    </>}
  </section>
}
