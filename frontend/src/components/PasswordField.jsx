import { useState } from 'react'

export default function PasswordField({ className = '', visibilityLabel = 'password', onChange, ...props }) {
  const [visible, setVisible] = useState(false)
  const action = visible ? 'Hide' : 'Show'

  return (
    <div className="relative">
      <input {...props} type={visible ? 'text' : 'password'} className={`${className} !pr-[5.5rem]`}
        onChange={event => {
          if (!event.target.value) setVisible(false)
          onChange(event)
        }}
      />
      <button type="button" onClick={() => setVisible(value => !value)}
        aria-label={`${action} ${visibilityLabel}`}
        className="absolute right-1.5 top-1/2 flex min-h-9 -translate-y-1/2 items-center gap-1.5 rounded-md px-2 text-xs font-semibold text-violet-200 hover:bg-violet-400/15 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-200">
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          {visible ? <>
            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
            <path d="m1 1 22 22" />
          </> : <>
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z" />
            <circle cx="12" cy="12" r="3" />
          </>}
        </svg>
        {action}
      </button>
    </div>
  )
}
