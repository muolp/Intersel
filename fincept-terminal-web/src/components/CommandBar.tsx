import { useState } from 'react'
import { useNow } from '../lib/hooks'

export function CommandBar({ onCommand }: { onCommand: (raw: string) => void }) {
  const [val, setVal] = useState('')
  const now = useNow()
  const submit = (e: React.FormEvent) => { e.preventDefault(); if (val.trim()) { onCommand(val.trim()); setVal('') } }
  const utc = now.toLocaleTimeString('en-GB', { hour12: false, timeZone: 'UTC' })
  return (
    <div className="cmdbar">
      <div className="brand">FINCEPT<span> TERMINAL</span></div>
      <form className="cmd-input-wrap" onSubmit={submit} style={{ flex: 1 }}>
        <span className="prompt">&gt;</span>
        <input
          className="cmd-input"
          value={val}
          onChange={e => setVal(e.target.value)}
          placeholder="Enter command — try AAPL, GP, N, ECO, PORT, HELP  (⏎ to run)"
          spellCheck={false}
          autoComplete="off"
        />
      </form>
      <div className="cmd-clock">
        <b>{now.toLocaleTimeString('en-US', { hour12: false })}</b> LOC · {utc} UTC
      </div>
    </div>
  )
}
