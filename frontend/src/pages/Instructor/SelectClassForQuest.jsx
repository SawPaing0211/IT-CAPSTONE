// "pick a class first" flow before making a quest, for when you clicked
// Create Quest without already being inside a class (e.g. Dashboard Quick
// Actions). Thin wrapper around the shared ClassPicker — this file just
// supplies what happens once a class is picked (navigate to the quest
// builder for it).

import { useNavigate } from 'react-router-dom'
import ClassPicker from '../../components/ClassPicker'

export default function SelectClassForQuest() {
  const navigate = useNavigate()

  const pickClass = (cls, { auto = false } = {}) => {
    // an auto-skip (only one class exists — nothing was actually picked)
    // replaces this screen in history instead of stacking on top of it
    if (!cls.subjectId) {
      // safety net, a class without a subject can't be locked in next screen
      navigate(`/instructor/create-problem?from=${encodeURIComponent('/instructor/create-problem/pick-class')}`, { replace: auto })
      return
    }
    navigate(
      `/instructor/create-problem?subject_id=${cls.subjectId}&class_id=${cls.id}` +
      `&from=${encodeURIComponent(`/instructor/class/${cls.id}`)}`,
      { replace: auto }
    )
  }

  return (
    <ClassPicker
      onSelect={pickClass}
      onCancel={() => navigate(-1)}
      actionLabel="Create Quest — Choose a Class"
      actionIcon="⚔️"
      prompt="Which class is this for?"
    />
  )
}
