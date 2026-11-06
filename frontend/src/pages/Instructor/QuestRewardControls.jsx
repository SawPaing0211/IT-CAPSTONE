import { useEffect, useId, useRef, useState } from 'react'

const choices = ['Easy', 'Medium', 'Hard']
const caps = { Easy: 100, Medium: 250, Hard: 500 }

// A keyboard-operable listbox keeps the open menu consistent with the editor.
export function QuestDifficulty({ value, onChange }) {
  const id = useId()
  const root = useRef(null)
  const trigger = useRef(null)
  const list = useRef(null)
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  useEffect(() => {
    if (!open) return
    list.current?.focus()
    const dismiss = e => { if (!root.current?.contains(e.target)) setOpen(false) }
    document.addEventListener('pointerdown', dismiss)
    return () => document.removeEventListener('pointerdown', dismiss)
  }, [open])
  const show = () => { setActive(Math.max(0, choices.indexOf(value))); setOpen(true) }
  const choose = choice => { onChange(choice); setOpen(false); trigger.current?.focus() }
  return <div className="qe-field qe-difficulty" ref={root}>
    <span id={`${id}-label`}>Difficulty</span>
    <button ref={trigger} type="button" className="qe-select-trigger" aria-labelledby={`${id}-label ${id}-value`} aria-haspopup="listbox" aria-expanded={open} aria-controls={`${id}-list`} onClick={() => open ? setOpen(false) : show()} onKeyDown={e => {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); show() }
    }}><span id={`${id}-value`}><i className={`qe-difficulty-dot qe-difficulty-${value.toLowerCase()}`} aria-hidden="true" />{value}</span><svg viewBox="0 0 20 20" aria-hidden="true"><path d="m5 7 5 5 5-5" /></svg></button>
    {open && <div ref={list} id={`${id}-list`} className="qe-select-menu" role="listbox" tabIndex={-1} aria-labelledby={`${id}-label`} aria-activedescendant={`${id}-${active}`} onKeyDown={e => {
      if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(e.key)) {
        e.preventDefault()
        setActive(i => e.key === 'Home' ? 0 : e.key === 'End' ? choices.length - 1 : (i + (e.key === 'ArrowDown' ? 1 : -1) + choices.length) % choices.length)
      } else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); choose(choices[active]) }
      else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); setOpen(false); trigger.current?.focus() }
      else if (e.key === 'Tab') setOpen(false)
    }} onBlur={e => { if (!root.current?.contains(e.relatedTarget)) setOpen(false) }}>
      {choices.map((choice, i) => <div key={choice} id={`${id}-${i}`} role="option" aria-selected={value === choice} className={active === i ? 'is-active' : ''} onPointerMove={() => setActive(i)} onClick={() => choose(choice)}><span><i className={`qe-difficulty-dot qe-difficulty-${choice.toLowerCase()}`} aria-hidden="true" />{choice}</span><small>Up to {caps[choice]} XP</small>{value === choice && <svg viewBox="0 0 20 20" aria-hidden="true"><path d="m4 10 4 4 8-8" /></svg>}</div>)}
    </div>}
  </div>
}

export function QuestReward({ value, difficulty, onChange }) {
  const id = useId()
  const max = caps[difficulty]
  const step = delta => onChange(Math.min(max, Math.max(0, (Number(value) || 0) + delta)))
  return <div className="qe-field qe-reward">
    <label htmlFor={id}>XP reward *</label>
    <div className="qe-reward-control">
      <input id={id} type="number" inputMode="numeric" min={0} max={max} step={1} value={value} aria-describedby={`${id}-help`} onChange={e => onChange(e.target.value === '' ? '' : Number(e.target.value))} />
      <span className="qe-reward-unit" aria-hidden="true">XP</span>
      <div className="qe-reward-arrows">
        <button type="button" aria-label="Increase XP reward" title="Increase XP reward" disabled={Number(value) >= max} onClick={() => step(1)}><svg viewBox="0 0 20 20" aria-hidden="true"><path d="m5 12 5-5 5 5" /></svg></button>
        <button type="button" aria-label="Decrease XP reward" title="Decrease XP reward" disabled={Number(value) <= 0} onClick={() => step(-1)}><svg viewBox="0 0 20 20" aria-hidden="true"><path d="m5 8 5 5 5-5" /></svg></button>
      </div>
    </div>
    <small id={`${id}-help`}>Maximum for {difficulty}: {max} XP</small>
  </div>
}
