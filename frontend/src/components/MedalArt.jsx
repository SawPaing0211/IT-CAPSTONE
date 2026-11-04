import { medalKey } from '../utils/achievementView'
import firstSteps from '../assets/medals/first-steps.webp'
import questMaster from '../assets/medals/quest-master.webp'
import weekWarrior from '../assets/medals/week-warrior.webp'
import pythonNovice from '../assets/medals/python-novice.webp'
import javaApprentice from '../assets/medals/java-apprentice.webp'
import csharpWizard from '../assets/medals/csharp-wizard.webp'
import perfectScore from '../assets/medals/perfect-score.webp'
import sandboxWizard from '../assets/medals/sandbox-wizard.webp'
import leaderboardChamp from '../assets/medals/leaderboard-champ.webp'
import hardCoder from '../assets/medals/hard-coder.webp'
import debugMaster from '../assets/medals/debug-master.webp'
import marathonCoder from '../assets/medals/marathon-coder.webp'

// Keyed by medalKey(): category|requirement_type|requirement_value.
// Unknown achievement definitions retain the generic fallback below.
const ART = {
  'student|quest_count|1': firstSteps,
  'student|quest_count|10': questMaster,
  'student|streak|7': weekWarrior,
  'student|python_count|5': pythonNovice,
  'student|java_count|5': javaApprentice,
  'student|csharp_count|5': csharpWizard,
  'student|hard_count|5': hardCoder,
  'student|debug_count|5': debugMaster,
  'student|streak|30': marathonCoder,
  'student|perfect_hard|1': perfectScore,
  'student|sandbox_runs|10': sandboxWizard,
  'student|leaderboard|10': leaderboardChamp,
}

export function hasMedalArt(badge) {
  return !!ART[medalKey(badge)]
}

const Generic = ({ earned }) => (
  <span className={`flex h-full w-full items-center justify-center rounded-full border-2 ${
    earned ? 'border-amber-300 bg-amber-300/10 text-amber-200' : 'border-slate-600 bg-slate-800/40 text-slate-500'
  }`}>
    <svg viewBox="0 0 24 24" width="55%" height="55%" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="9" r="5" /><path d="m9 13-2 7 5-3 5 3-2-7" />
    </svg>
  </span>
)

// Earned = full colour. Locked / coming soon = silver (grayscale) and dimmed.
export default function MedalArt({ badge, earned, unavailable = false, className = '' }) {
  const src = ART[medalKey(badge)]
  if (!src) return <span className={`block ${className}`}><Generic earned={earned} /></span>
  return (
    <img
      src={src}
      alt=""
      aria-hidden="true"
      draggable="false"
      loading="lazy"
      className={`block object-contain ${earned ? '' : unavailable ? 'grayscale opacity-40' : 'grayscale opacity-60'} ${className}`}
    />
  )
}
