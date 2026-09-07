import { useState } from 'react'
import { useNow, useLiveStatus } from '../lib/hooks'
import { engine } from '../data/market'

export function CommandBar({ onCommand }: { onCommand: (raw: string) => void }) {
  const [val, setVal] = useState('')
  const now = useNow()
  const st = useLiveStatus()
  const submit = (e: React.FormEvent) => { e.preventDefault(); if (val.trim()) { onCommand(val.trim()); setVal('') } }
  const utc = now.toLocaleTimeString('en-GB', { hour12: false, timeZone: 'UTC' })

  const toggle = () => { void engine.setMode(st.mode === 'live' ? 'sim' : 'live') }
  const live = st.mode === 'live'
  const dotColor = st.connecting ? 'var(--amber)' : live && st.liveCount > 0 ? 'var(--green)' : live ? 'var(--red)' : 'var(--text-faint)'

  return (
    <div className="cmdbar">
      <div className="brand">FINCEPT<span> TERMINAL</span></div>
      <form className="cmd-input-wrap" onSubmit={submit} style={{ flex: 1 }}>
        <span className="prompt">&gt;</span>
        <input
          className="cmd-input"
          value={val}
          onChange={e => setVal(e.target.value)}
          placeholder="Enter command — try AAPL, GP, N, ECO, PORT, ALGO, AI, LIVE, HELP  (⏎ to run)"
          spellCheck={false}
          autoComplete="off"
        />
      </form>
      <button
        className={'btn ' + (live ? 'amber' : '')}
        onClick={toggle}
        title={live ? 'Live Yahoo data (falls back to simulated where unavailable). Click for simulated.' : 'Simulated data. Click to attempt live Yahoo data (needs npm run dev).'}
        style={{ whiteSpace: 'nowrap' }}
      >
        <span style={{ display: 'inline-block', width: 7, height: 7, borderRadius: '50%', background: dotColor, marginRight: 6, boxShadow: `0 0 6px ${dotColor}` }} />
        {st.connecting ? 'CONNECTING…' : live ? `LIVE ${st.liveCount}/${st.liveCount + st.simCount}` : 'SIM'}
      </button>
      <div className="cmd-clock">
        <b>{now.toLocaleTimeString('en-US', { hour12: false })}</b> LOC · {utc} UTC
      </div>
    </div>
  )
}
